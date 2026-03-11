# Eden v1 Acceptance Checklist

This checklist is for the current Eden v1 MVP only:

1. user signs up / signs in
2. user buys Eden Leaves
3. user spends Leaves on AI services
4. service execution is recorded
5. builder earnings are recorded
6. Eden platform fee is recorded
7. owner can inspect the accounting trail

## Local prep

Use these commands from `C:\dev\Eden\eden-v1`:

```powershell
cmd /c npx prisma generate
cmd /c npx prisma validate
cmd /c npx prisma db push
cmd /c npm run acceptance:reset -- --with-seed
cmd /c npm run acceptance:verify-ledger
cmd /c npm run lint
cmd /c npm run build
cmd.exe /c npx next dev --webpack
```

## Acceptance path

### 1. Non-owner auth and owner protection

1. Sign in as a normal consumer account.
2. Confirm `/consumer` loads.
3. Confirm `/business` and `/owner` redirect away or block access.
4. Sign in as the authorized owner account.
5. Confirm `/owner`, `/business`, and `/consumer` all load.

### 2. Leaves top-up checkout launch

1. Open `/consumer`.
2. Select:
   - Starter
   - Balanced
   - High Balance
3. Confirm the selected pack enables a checkout CTA.
4. Click the CTA.
5. Confirm `POST /api/credits/top-up/checkout` returns `ok: true` and a Stripe Checkout URL.

### 3. Webhook-authoritative Leaves minting exactly once

1. Complete one Stripe test payment.
2. Confirm the Stripe webhook delivers `checkout.session.completed`.
3. Confirm the wallet Leaves amount increases once.
4. Refresh the wallet surface and confirm the amount does not mint again.
5. Run `npm run acceptance:verify-ledger`.

### 4. Project creation in Business workspace

1. Sign in as a business user.
2. Open `/business`.
3. Create a project blueprint with:
   - title
   - description
   - goal
4. Confirm the project appears in the project list.

### 5. Agent run in project workspace

1. Add at least one agent to the project.
2. Run the agent with a prompt from the `Runnable project agent` panel.
3. Confirm output appears in the workspace.
4. Confirm the run is added to `Recent agent runs`.

### 6. Internal Leaves usage recording

1. After the agent run, confirm the available internal-use Leaves amount decreases once.
2. Open `/owner`.
3. Confirm the internal Leaves history shows a `project_agent_run`-style record.

### 7. Paid consumer service execution

1. Sign in as a different consumer user.
2. Ensure that user has spendable Leaves.
3. Open one published service detail page.
4. Run the live service once.
5. Confirm output is returned to the user.

### 8. Exact-once debit / usage / builder earnings / Eden fee recording

1. Confirm the consumer wallet shows a single debit for the run.
2. Confirm one `ServiceUsage` record exists for that execution.
3. Confirm builder earnings increase once.
4. Confirm Eden fee accounting increases once.
5. Run `npm run acceptance:verify-ledger`.

### 9. Owner reconciliation visibility

1. Open `/owner`.
2. Confirm the payment, usage, and builder/platform accounting surfaces reflect the same trail.
3. Open the relevant payment or payout detail routes if needed.

### 10. Replay protection using the same execution key

1. Re-send the same live service execution request body with the same `executionKey`.
2. Confirm:
   - no second consumer debit
   - no second `ServiceUsage`
   - no second builder/platform accounting event
3. Run `npm run acceptance:verify-ledger`.

## Notes

- `npm run acceptance:reset -- --with-seed` is destructive. It clears mutable payment, usage, project, pipeline, and accounting records, then restores canonical marketplace data.
- `npm run acceptance:verify-ledger` checks the current persisted ledger for:
  - settled payment consistency
  - stored service usage economics consistency
  - project agent run to internal Leaves usage consistency
