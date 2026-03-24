# Eden Autonomy Boundary Model

Last updated: 2026-03-23

## Purpose

Define the exact boundary between what Claude (or any Eden control agent) may do
automatically and what must remain owner-reviewed or fully blocked — based on the
active environment scope and the operational stage.

This spec is the canonical reference for autonomy mode decisions.
It must be loaded by any Eden control agent before performing any write action.

---

## Environment Scope Classification

Eden recognizes two named environment scopes:

### PRIVATE_DEV

- Identifier: `PRIVATE_DEV`
- What it is: The owner's local development environment (`C:\dev\Eden\eden-v1`).
  No public traffic. No real user data at risk. No edencloud.app traffic.
- Database: The developer Postgres instance configured in `.env` (local or hosted dev DB).
- Domain: localhost / no public domain.
- Stage: **Stage A — higher autonomy permitted within policy.**

### PUBLIC_PROD

- Identifier: `PUBLIC_PROD`
- What it is: The live production environment at edencloud.app.
  Real users, real auth, real payment flows, real Prisma migrations against production DB.
- Domain: edencloud.app
- Stage: **Stage B — all writes are review-gated. No autonomous execution.**

---

## How Environment Scope Is Detected

Environment scope is determined at runtime by reading:

1. `process.env.EDEN_ENVIRONMENT_SCOPE` — explicit override (`PRIVATE_DEV` | `PUBLIC_PROD`)
2. Fallback: `process.env.NODE_ENV`
   - `development` → `PRIVATE_DEV`
   - `production` → `PUBLIC_PROD`
   - anything else → `PRIVATE_DEV` (conservative default for unknown envs)

This logic lives in `modules/core/agents/eden-autonomy-boundary.ts`.

---

## Stage A: PRIVATE_DEV Autonomy Permissions

What Claude or an Eden control agent MAY do automatically in `PRIVATE_DEV`:

### Allowed automatic actions

- Read all Eden system memory files (specs, state, logs)
- Create sandbox tasks in the owner-only internal sandbox runtime
- Write task audit log entries
- Write agent run records
- Write dispatch records and execution session records
- Write runtime audit log entries
- Update runtime lifecycle metadata (status, statusDetail, lastHealthCheckAt)
- Update launch intent metadata
- Add deployment history notes
- Update secret boundary status metadata (no raw secret values)
- Update provider approval gates
- Queue the next approved self-work item from `EDEN_SELF_WORK_QUEUE.json`
- Execute through the governed OpenAI sandbox path when:
  - provider is approved
  - secret boundary is `CONFIGURED`
  - `OPENAI_API_KEY` is available in the server runtime
  - task was prepared through the provider adapter path
- Generate new Prisma migration files (additive only — does not apply them)
- Update `eden-system/state/` and `eden-system/logs/` files

### Blocked even in PRIVATE_DEV (always requires human action)

- Applying Prisma migrations (`prisma migrate deploy` / `prisma migrate resolve`)
- Dropping tables or resetting the database
- Running `prisma migrate dev` against any live database
- Modifying existing migration SQL files in the migrations chain
- Pushing to any remote git branch
- Making changes to auth configuration or credential handling
- Broadening the scope of the owner-only sandbox beyond its current access policy

---

## Stage B: PUBLIC_PROD Autonomy Permissions

What Claude or an Eden control agent may do in `PUBLIC_PROD`:

### Allowed read-only actions

- Read Eden system memory files (specs, state, logs)
- Read runtime registry state
- Read sandbox task state

### Blocked in PUBLIC_PROD (requires explicit owner action)

- All write operations to the production database
- Provider execution (no automatic OpenAI or Anthropic calls against prod)
- Updating runtime status, config, or secret boundaries in prod
- Updating launch intent or deployment history in prod
- Adding or removing provider approvals in prod
- Queuing self-work items in prod
- Any schema or migration changes in prod

### Why this boundary exists

Production writes affect real users. edencloud.app serves real consumers, business owners,
and payment flows. Any autonomous write could corrupt the ledger, break auth, or expose
unintended behavior to users. All prod writes must be deliberate owner decisions.

---

## DB Action Risk Classification

Every DB action Eden might take is classified by risk level:

| Action | Risk Level | PRIVATE_DEV | PUBLIC_PROD |
|--------|-----------|-------------|-------------|
| Read any table | low | auto-allowed | auto-allowed |
| Write sandbox task | low | auto-allowed | blocked |
| Write task/runtime audit log | low | auto-allowed | blocked |
| Write agent run / dispatch / session | low | auto-allowed | blocked |
| Update runtime lifecycle metadata | low | auto-allowed | blocked |
| Update launch intent / deployment history | low | auto-allowed | blocked |
| Update secret boundary status | medium | auto-allowed | blocked |
| Update provider approval | medium | auto-allowed | blocked |
| Update runtime config policy | medium | auto-allowed | blocked |
| Register sandbox runtime | medium | auto-allowed | blocked |
| Generate migration file | medium | auto-allowed (additive only) | blocked |
| Apply migration (deploy/resolve) | **high** | **human required** | **human required** |
| Drop table / reset DB | **destructive** | **human required** | **human required** |
| Modify migration SQL chain | **destructive** | **human required** | **human required** |
| Write to user billing / payment tables | **high** | blocked | **human required** |
| Write to business / service records | **high** | limited (sandbox only) | **human required** |

---

## Owner Acknowledgement Requirements

The following actions require explicit owner acknowledgement before proceeding,
regardless of environment scope:

1. Any migration apply (`prisma migrate deploy`)
2. Any database reset
3. Any provider credential change
4. Any change that widens the access policy beyond `OWNER_ONLY` for internal sandbox
5. Any action that would publish content to edencloud.app
6. Any action that would provision or destroy a real runtime target
7. Any action that would send outbound API calls outside the governed OpenAI sandbox path

---

## Autonomy Mode in the Owner Control Surface

The owner can view the current autonomy mode status at `/owner/runtimes`.

The autonomy mode panel shows:
- Active environment scope (PRIVATE_DEV or PUBLIC_PROD)
- Current stage (A or B)
- What is currently allowed automatically
- Current blockers preventing auto-execution
- Next approved self-work item

---

## Notes

- This spec must be updated when new capabilities are added or when the environment model changes.
- `PUBLIC_PROD` was never intended to be fully autonomous. Stage B is permanent review-gate mode.
- Stage A autonomy applies only to the internal sandbox scope. It does not apply to business,
  consumer, or payment flows even in `PRIVATE_DEV`.
- edencloud.app is always `PUBLIC_PROD` regardless of any env var setting.
