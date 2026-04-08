// One-time migration: copy existing edenBalanceCredits into promoBalance.
// Assumption: nothing has been purchased through Stripe in production yet.
// If you (Sonny) have purchased Leafs personally, move yours to realBalance
// manually after this script runs.
//
// Run once: npx tsx scripts/migrate-existing-balances.ts

import { getPrismaClient } from "@/modules/core/repos/prisma-client";

async function main() {
  const prisma = getPrismaClient();

  // Use raw SQL because Prisma can't reference another column in updateMany
  const updated = await prisma.$executeRaw`
    UPDATE "User"
    SET "promoBalance" = "edenBalanceCredits",
        "realBalance" = 0,
        "withdrawableBalance" = 0
    WHERE "promoBalance" = 0
      AND "realBalance" = 0
      AND "withdrawableBalance" = 0
  `;

  console.log(`[migrate-balances] updated ${updated} user rows`);
}

main()
  .catch((err) => {
    console.error("[migrate-balances] failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
