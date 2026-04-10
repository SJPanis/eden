# Eden Operational Scripts

> **Never run these scripts locally against the production database.**
> Always run via Railway dashboard.

## How to run in production

1. Open [Railway dashboard](https://railway.app) → Eden service
2. Click the three-dot menu → **"Run Command"**
3. Paste the command and run

If a migration needs to run first, chain with `&&`:
```
npx prisma migrate deploy && npx tsx scripts/<script-name>.ts <args>
```

---

## Available Scripts

### `migrate-existing-balances.ts`

**One-time backfill** for the three-bucket Leaf balance system (PR #123).
Copies existing `edenBalanceCredits` into `promoBalance` for all users.

```
npx tsx scripts/migrate-existing-balances.ts
```

Run once after deploying the `add_leaf_buckets_and_onboarding` migration.
Safe to run multiple times (only updates users where all buckets are 0).

---

### `credit-user-promo-leafs.ts`

**Generic promo balance credit tool.** Credit free (non-withdrawable) Leafs to any user.

**Find a user first:**
```
npx tsx scripts/credit-user-promo-leafs.ts --find nate
```
Fuzzy searches email, username, and display name. Prints matching users with balances.

**Credit Leafs:**
```
npx tsx scripts/credit-user-promo-leafs.ts \
  --identifier nate@example.com \
  --amount 500 \
  --memo "manual-promo-credit-nate-500-2026-04-09"
```

- Looks up by email → username → user ID (tries all three)
- **Idempotent:** if a grant with the same `--memo` exists, skips
- Credits `promoBalance` (non-withdrawable), keeps `edenBalanceCredits` in sync
- Creates `OwnerLeavesGrant` ledger entry for audit trail
- Prints before/after balances

---

### `migrate-balances-to-eden-wallet.ts`

**One-shot Phase 01 balance reconciliation.** Consolidates the legacy three-bucket `User.*Balance` columns (and the oldest `edenBalanceCredits` column) into `EdenWallet.leafsBalance` so the Unity client can read a single source of truth. See `docs/PHASE_01_API_CONTRACT.md §13`.

**Dry run first:**
```
npx tsx scripts/migrate-balances-to-eden-wallet.ts --dry-run
```
Prints a plan summary (create / update / skip counts, totals) plus the first 20 actionable rows. Makes no writes.

**Apply:**
```
npx tsx scripts/migrate-balances-to-eden-wallet.ts
```

- Pulls every `User` + any existing `EdenWallet` + both lifetime-spent columns.
- **Creates** an `EdenWallet` row for users without one, seeded with `legacyTotal` and `lifetimeSpent`.
- **Increments** existing wallets (doesn't overwrite) so users who've already topped up via Stripe don't lose those Leafs.
- Writes a stable `EdenTransaction` audit row per reconciled user (`MANUAL_ADJUSTMENT`, description `"Migration from legacy User.*Balance columns (phase-01 cutover)"`, metadata with every legacy column value). Re-runs skip users who already have this row.
- Per-user transactions — a single failure doesn't abort the batch; exits non-zero if any row failed.
- **Pre-condition:** the Phase 01 schema migration (`20260410120000_phase_01_unity_foundation`) must already be deployed. That migration ships via the normal Railway deploy flow (`npx prisma migrate deploy` in `railway.json` startCommand), so just making sure the latest main is deployed is enough.
- Run the existing `verify-ledger-consistency.ts` afterwards to confirm `EdenWallet.leafsBalance` reconciles against the `EdenTransaction` ledger.
