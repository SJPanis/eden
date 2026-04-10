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
