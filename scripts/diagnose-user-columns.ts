// Diagnostic: enumerate which columns actually exist on the prod "User" table,
// compared against what Prisma's schema.prisma declares. Prod was built with
// patchwork raw-SQL migrations (see PR #130 notes), so Prisma's model and the
// physical table may diverge. This script prints the gap so we can add missing
// columns before running the balance migration.
//
// Usage:
//   railway run npx tsx scripts/diagnose-user-columns.ts

import { getPrismaClient } from "@/modules/core/repos/prisma-client";

const EXPECTED = [
  "id",
  "username",
  "email",
  "displayName",
  "passwordHash",
  "role",
  "status",
  "summary",
  "edenBalanceCredits",
  "promoBalance",
  "realBalance",
  "withdrawableBalance",
  "lifetimePromoSpent",
  "lifetimeRealSpent",
  "stripeConnectAccountId",
  "payoutEnabled",
  "createdAt",
  "updatedAt",
  "accessCodeId",
  "referralCode",
  "totpSecret",
  "totpEnabled",
  "totpVerifiedAt",
  "welcomeGranted",
  "onboardingCompletedAt",
  "avatarConfig",
  "lastPosition",
  "lastOnline",
];

async function main() {
  const prisma = getPrismaClient();

  const rows = await prisma.$queryRawUnsafe<
    Array<{ column_name: string; data_type: string; is_nullable: string }>
  >(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'User'
     ORDER BY column_name`,
  );

  const actual = new Set(rows.map((r) => r.column_name));

  console.log(`[diagnose] prod User columns (${rows.length}):`);
  for (const row of rows) {
    const flag = EXPECTED.includes(row.column_name) ? "    " : " !! ";
    console.log(
      `${flag}${row.column_name.padEnd(28)} ${row.data_type}${row.is_nullable === "YES" ? " NULL" : ""}`,
    );
  }

  const missing = EXPECTED.filter((c) => !actual.has(c));
  const extra = rows
    .map((r) => r.column_name)
    .filter((c) => !EXPECTED.includes(c));

  console.log(`\n[diagnose] expected ${EXPECTED.length} columns per schema.prisma`);
  console.log(`[diagnose] missing on prod (${missing.length}):`);
  for (const c of missing) console.log(`    - ${c}`);
  console.log(`[diagnose] extra on prod (${extra.length}):`);
  for (const c of extra) console.log(`    - ${c}`);
}

main()
  .catch((err) => {
    console.error("[diagnose] fatal:", err);
    process.exit(1);
  })
  .finally(() => process.exit(process.exitCode ?? 0));
