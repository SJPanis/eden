// Phase 01 balance reconciliation.
//
// Consolidates every legacy User balance column into EdenWallet.leafsBalance
// so the Unity client can read a single source of truth. See
// docs/PHASE_01_API_CONTRACT.md §13 and docs/PHASE_01_AUDIT.md §5 for the
// reasoning. This is the first half of the cutover — the code that still reads
// the legacy columns must be flipped over *before* those columns are dropped in
// a follow-up migration (§13.4).
//
// Execution (Railway-only — see scripts/README.md):
//
//   # Via Railway CLI
//   railway run npx tsx scripts/migrate-balances-to-eden-wallet.ts --dry-run
//   railway run npx tsx scripts/migrate-balances-to-eden-wallet.ts
//
//   # Or paste into Railway dashboard → Eden service → Run Command
//   npx tsx scripts/migrate-balances-to-eden-wallet.ts --dry-run
//   npx tsx scripts/migrate-balances-to-eden-wallet.ts
//
// Eden runs on Railway. Prisma *schema* migrations apply automatically on every
// deploy via the `npx prisma migrate deploy && node server.js` startCommand in
// railway.json. This is NOT a schema migration — it's a one-shot data script,
// so it has to be triggered explicitly against the Railway environment. There
// is no local-DB workflow for this script.
//
// The script is idempotent: it writes a reconciliation EdenTransaction row with
// a stable description and skips users who already have that row.

import { getPrismaClient } from "@/modules/core/repos/prisma-client";

const RECONCILE_DESCRIPTION =
  "Migration from legacy User.*Balance columns (phase-01 cutover)";

type PlanEntry = {
  userId: string;
  username: string;
  legacyEden: number;
  legacyPromo: number;
  legacyReal: number;
  legacyWithdrawable: number;
  legacyTotal: number;
  lifetimeSpent: number;
  walletExists: boolean;
  existingWalletBalance: number;
  alreadyReconciled: boolean;
  action: "skip_zero" | "skip_already_reconciled" | "create_wallet" | "update_wallet";
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrismaClient();

  console.log(
    `[migrate-balances] mode=${dryRun ? "DRY_RUN" : "APPLY"}  description="${RECONCILE_DESCRIPTION}"`,
  );

  // Pull every user with their legacy balances and current wallet. We don't
  // page the query — even at 100k users this is <100MB of row data.
  //
  // We deliberately DO NOT read edenBalanceCredits here. The 3-bucket
  // migration (20260409000000_add_leaf_buckets_and_onboarding) defined
  // promoBalance/realBalance/withdrawableBalance as the post-3-bucket source
  // of truth, and a seed UPDATE in phase-01-migrations.ts (effectively
  // re-running the old migrate-existing-balances.ts) already copied
  // edenBalanceCredits into promoBalance for every user whose buckets were
  // all zero. Reading edenBalanceCredits here would double-count those
  // users' Leafs in the EdenWallet total.
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      edenBalanceCredits: true, // kept for audit metadata only
      promoBalance: true,
      realBalance: true,
      withdrawableBalance: true,
      lifetimePromoSpent: true,
      lifetimeRealSpent: true,
      wallet: {
        select: { id: true, leafsBalance: true, totalSpentLeafs: true },
      },
    },
  });

  // Build the plan first so --dry-run can print it without touching anything.
  const plan: PlanEntry[] = [];
  const reconciledUserIds = new Set<string>();

  if (users.length > 0) {
    const existingReconciles = await prisma.edenTransaction.findMany({
      where: {
        description: RECONCILE_DESCRIPTION,
        transactionType: "MANUAL_ADJUSTMENT",
      },
      select: { actorUserId: true },
    });
    for (const row of existingReconciles) reconciledUserIds.add(row.actorUserId);
  }

  for (const user of users) {
    // Only the 3-bucket columns are summed — see the comment on the findMany
    // select above. edenBalanceCredits is captured in the audit metadata for
    // hand-reversal but not counted toward the migrated total.
    const legacyTotal =
      user.promoBalance + user.realBalance + user.withdrawableBalance;
    const lifetimeSpent = user.lifetimePromoSpent + user.lifetimeRealSpent;
    const alreadyReconciled = reconciledUserIds.has(user.id);
    const walletExists = !!user.wallet;

    let action: PlanEntry["action"];
    if (alreadyReconciled) {
      action = "skip_already_reconciled";
    } else if (legacyTotal === 0 && lifetimeSpent === 0 && walletExists) {
      // Nothing to migrate and the wallet already exists.
      action = "skip_zero";
    } else if (!walletExists) {
      action = "create_wallet";
    } else {
      action = "update_wallet";
    }

    plan.push({
      userId: user.id,
      username: user.username,
      legacyEden: user.edenBalanceCredits,
      legacyPromo: user.promoBalance,
      legacyReal: user.realBalance,
      legacyWithdrawable: user.withdrawableBalance,
      legacyTotal,
      lifetimeSpent,
      walletExists,
      existingWalletBalance: user.wallet?.leafsBalance ?? 0,
      alreadyReconciled,
      action,
    });
  }

  // Summary first so dry-run output is useful even when truncated.
  const summary = {
    users: plan.length,
    totalLegacyLeafs: plan.reduce((s, p) => s + p.legacyTotal, 0),
    totalLifetimeSpent: plan.reduce((s, p) => s + p.lifetimeSpent, 0),
    create: plan.filter((p) => p.action === "create_wallet").length,
    update: plan.filter((p) => p.action === "update_wallet").length,
    skipZero: plan.filter((p) => p.action === "skip_zero").length,
    skipReconciled: plan.filter((p) => p.action === "skip_already_reconciled").length,
  };
  console.log("[migrate-balances] plan summary:", summary);

  // Always show the first 20 actionable rows so a dry run is legible.
  const sample = plan
    .filter((p) => p.action === "create_wallet" || p.action === "update_wallet")
    .slice(0, 20);
  for (const row of sample) {
    console.log(
      `[migrate-balances]   ${row.action.padEnd(13)} user=${row.username} ` +
        `legacy(eden=${row.legacyEden} promo=${row.legacyPromo} real=${row.legacyReal} ` +
        `withdraw=${row.legacyWithdrawable}) total=${row.legacyTotal} ` +
        `spent=${row.lifetimeSpent} existingWallet=${row.existingWalletBalance}`,
    );
  }

  if (dryRun) {
    console.log("[migrate-balances] dry run — no writes performed");
    return;
  }

  // Real execution. Per-user transaction so a single failure doesn't abort the
  // whole batch — we log the failure and move on, then exit non-zero if any
  // failed so CI catches it.
  let applied = 0;
  let failed = 0;

  for (const row of plan) {
    if (row.action === "skip_zero" || row.action === "skip_already_reconciled") {
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const wallet =
          row.action === "create_wallet"
            ? await tx.edenWallet.create({
                data: {
                  userId: row.userId,
                  leafsBalance: row.legacyTotal,
                  totalSpentLeafs: row.lifetimeSpent,
                },
                select: { id: true },
              })
            : await tx.edenWallet.update({
                where: { userId: row.userId },
                data: {
                  leafsBalance: { increment: row.legacyTotal },
                  totalSpentLeafs: { increment: row.lifetimeSpent },
                },
                select: { id: true },
              });

        // Stable audit row keyed on the description so repeat runs are safe.
        await tx.edenTransaction.create({
          data: {
            walletId: wallet.id,
            actorUserId: row.userId,
            transactionType: "MANUAL_ADJUSTMENT",
            status: "COMPLETED",
            leafsAmount: row.legacyTotal,
            description: RECONCILE_DESCRIPTION,
            metadata: {
              legacyEden: row.legacyEden,
              legacyPromo: row.legacyPromo,
              legacyReal: row.legacyReal,
              legacyWithdrawable: row.legacyWithdrawable,
              lifetimeSpent: row.lifetimeSpent,
              existingWalletBalance: row.existingWalletBalance,
              action: row.action,
            },
          },
        });
      });
      applied += 1;
    } catch (err) {
      failed += 1;
      console.error(
        `[migrate-balances] FAIL user=${row.username} err=${err instanceof Error ? err.message : err}`,
      );
    }
  }

  console.log(
    `[migrate-balances] applied=${applied} failed=${failed} skipped=${summary.skipZero + summary.skipReconciled}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("[migrate-balances] fatal:", err);
    process.exit(1);
  })
  .finally(() => process.exit(process.exitCode ?? 0));
