// Credit promoBalance Leafs to a user. Idempotent via --memo flag.
//
// Usage:
//   npx tsx scripts/credit-user-promo-leafs.ts --identifier nate@example.com --amount 500 --memo "manual-promo-credit-nate-500-2026-04-09"
//
// Dry-run find:
//   npx tsx scripts/credit-user-promo-leafs.ts --find nate
//
// Lookup order: email → username → user ID
// Idempotency: if a OwnerLeavesGrant with the same memo (note) already exists, skips.
// Runs against the production DB via Railway's existing DATABASE_URL env var.

import { getPrismaClient } from "@/modules/core/repos/prisma-client";

function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      result[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return result;
}

async function findUsers(partial: string) {
  const prisma = getPrismaClient();
  const pattern = `%${partial}%`;

  // Prisma doesn't support ILIKE in findMany easily, use raw query
  const users = await prisma.$queryRaw<
    Array<{
      id: string;
      email: string | null;
      username: string;
      displayName: string;
      promoBalance: number;
      realBalance: number;
      withdrawableBalance: number;
      edenBalanceCredits: number;
    }>
  >`
    SELECT id, email, username, "displayName", "promoBalance", "realBalance", "withdrawableBalance", "edenBalanceCredits"
    FROM "User"
    WHERE LOWER(email) LIKE LOWER(${pattern})
       OR LOWER(username) LIKE LOWER(${pattern})
       OR LOWER("displayName") LIKE LOWER(${pattern})
    LIMIT 10
  `;

  return users;
}

async function lookupUser(identifier: string) {
  const prisma = getPrismaClient();

  // Try email
  const byEmail = await prisma.user.findUnique({
    where: { email: identifier },
    select: { id: true, email: true, username: true, displayName: true, promoBalance: true, realBalance: true, edenBalanceCredits: true },
  });
  if (byEmail) return byEmail;

  // Try username
  const byUsername = await prisma.user.findUnique({
    where: { username: identifier },
    select: { id: true, email: true, username: true, displayName: true, promoBalance: true, realBalance: true, edenBalanceCredits: true },
  });
  if (byUsername) return byUsername;

  // Try user ID
  const byId = await prisma.user.findUnique({
    where: { id: identifier },
    select: { id: true, email: true, username: true, displayName: true, promoBalance: true, realBalance: true, edenBalanceCredits: true },
  });
  if (byId) return byId;

  return null;
}

async function main() {
  const args = parseArgs();
  const prisma = getPrismaClient();

  // --find mode: fuzzy search
  if (args.find) {
    console.log(`\n🔍 Searching for users matching "${args.find}"...\n`);
    const users = await findUsers(args.find);
    if (users.length === 0) {
      console.log("No users found.");
    } else {
      for (const u of users) {
        console.log(`  ID:       ${u.id}`);
        console.log(`  Username: ${u.username}`);
        console.log(`  Email:    ${u.email ?? "(none)"}`);
        console.log(`  Name:     ${u.displayName}`);
        console.log(`  Balances: promo=${u.promoBalance} real=${u.realBalance} withdrawable=${u.withdrawableBalance} total=${u.edenBalanceCredits}`);
        console.log("  ---");
      }
    }
    process.exit(0);
  }

  // --identifier + --amount + --memo mode: credit
  const { identifier, amount: amountStr, memo } = args;
  if (!identifier || !amountStr || !memo) {
    console.error("Usage: npx tsx scripts/credit-user-promo-leafs.ts --identifier <email|username|id> --amount <number> --memo <unique-memo>");
    console.error("  Or:  npx tsx scripts/credit-user-promo-leafs.ts --find <partial-name>");
    process.exit(1);
  }

  const amount = parseInt(amountStr, 10);
  if (!amount || amount <= 0 || amount > 100000) {
    console.error("Amount must be a positive integer up to 100,000.");
    process.exit(1);
  }

  // Look up user
  console.log(`\n🔍 Looking up user: "${identifier}"...`);
  const user = await lookupUser(identifier);
  if (!user) {
    console.error(`\n❌ No user found for identifier "${identifier}".`);
    console.log("\nTry --find to search:");
    console.log(`  npx tsx scripts/credit-user-promo-leafs.ts --find ${identifier.split("@")[0]}`);
    process.exit(1);
  }

  console.log(`\n✅ Found user:`);
  console.log(`   ID:       ${user.id}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Email:    ${user.email ?? "(none)"}`);
  console.log(`   Name:     ${user.displayName}`);
  console.log(`   Before:   promo=${user.promoBalance} real=${user.realBalance} total=${user.edenBalanceCredits}`);

  // Idempotency check — look for existing grant with same memo
  const existing = await prisma.ownerLeavesGrant.findFirst({
    where: { userId: user.id, note: memo },
  });
  if (existing) {
    console.log(`\n⏭️  Already credited (grant ID: ${existing.id}). Skipping.`);
    process.exit(0);
  }

  // Apply credit
  console.log(`\n💸 Crediting ${amount} promoBalance Leafs...`);

  // We need a "grantor" user for OwnerLeavesGrant.grantedByUserId.
  // Use the platform owner, or fall back to the target user's own ID.
  const ownerUsername = process.env.EDEN_OWNER_USERNAME ?? process.env.OWNER_USERNAME ?? null;
  let grantorId = user.id;
  if (ownerUsername) {
    const owner = await prisma.user.findUnique({ where: { username: ownerUsername }, select: { id: true } });
    if (owner) grantorId = owner.id;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        promoBalance: { increment: amount },
        edenBalanceCredits: { increment: amount },
      },
    }),
    prisma.ownerLeavesGrant.create({
      data: {
        userId: user.id,
        grantedByUserId: grantorId,
        amountCredits: amount,
        note: memo,
      },
    }),
  ]);

  // Verify
  const after = await prisma.user.findUnique({
    where: { id: user.id },
    select: { promoBalance: true, realBalance: true, edenBalanceCredits: true },
  });

  console.log(`   After:    promo=${after?.promoBalance} real=${after?.realBalance} total=${after?.edenBalanceCredits}`);
  console.log(`\n✅ Done. Grant recorded with memo: "${memo}"`);
}

main()
  .catch((err) => {
    console.error("\n❌ Script failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
