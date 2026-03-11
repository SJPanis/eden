# Current State

Last verified: 2026-03-11

## Repo Snapshot

- Active git repo root: `C:\dev\Eden\eden-v1`
- Parent folder `C:\dev\Eden` is not the git repo root
- Framework: Next.js App Router with TypeScript and Prisma
- Current planning/docs are still split across `docs/`, `eden-dev/`, and `eden-system/`, but `eden-system/` now exists as the canonical build-memory location for forward work

## Verified Health

Verified:

- `cmd /c npx prisma format` passed when pointed at the local schema engine binary
- `cmd /c npx prisma generate` passed
- `npm run lint` passed
- `npm run build` passed
- `cmd /c npx prisma validate` passed

Partially verified only:

- `npm run acceptance:verify-ledger` completed, but all persistent-model checks were skipped with Prisma `EACCES` warnings. Persistent ledger health is not confirmed.
- A short `npm run dev` startup probe reached Next.js, but an existing port/process or `.next/dev/lock` prevented a clean isolated startup verification.
- Prisma Migrate was repaired on disk by adding a baseline migration, but the live database still needs the manual `migrate resolve` plus `migrate deploy` sequence.

## What Exists Right Now

### Platform surfaces

- `/` public entry and auth surface
- `/consumer` consumer discovery and wallet surface
- `/business` builder workspace
- `/business/create` staged business creation flow
- `/owner` owner control room
- detail routes for services, businesses, owner payments, owner payouts, and owner users

### Auth and access

- Auth.js is wired
- username/password sign-up and credentials sign-in exist
- middleware-based route protection exists
- server-side access helpers exist
- owner access is still additionally tied to configured owner username logic

### Data model

Prisma models exist for:

- users and auth provider accounts
- businesses and memberships
- services and usage
- credits top-up payments and payment event logs
- payout settlements
- internal leaves usage and owner grants
- pipeline records and events
- project blueprints, project agents, and project agent runs
- project runtimes and runtime domain links

### Business/project flows

- business creation flow exists
- workspace service drafting exists
- project blueprint creation exists
- project agent creation exists
- project agent run recording exists
- Ask Eden can propose and create project artifacts
- owner-only runtime registry surface exists at `/owner/runtimes`
- owner-only internal sandbox runtime initializer exists at `/api/owner/project-runtimes`

## Architectural Reality

The repo is a hybrid transition system with the first runtime control-plane layer added, not a cleanly isolated platform yet.

What is structurally good:

- route groups and role surfaces are clear
- `modules/core` provides service and repo seams
- Prisma schema covers a meaningful amount of product state
- owner/business/consumer layers are separated in UI
- runtime metadata is now modeled separately from `ProjectBlueprint`

What is still mixed or transitional:

- mock session compatibility and persistent auth coexist
- mock business/workspace overlays and persistent reads coexist
- some ledger and usage paths are persistent while UI fallbacks remain mock-authoritative
- project "hosting" and "publishing" still remain metadata/accounting concepts, not isolated runtime deployment
- project runtime records are control-plane metadata only; they do not provision real containers, sandboxes, previews, or deploy targets
- Ask Eden has both a newer tool-routed layer and a legacy Eden AI helper layer

## Biggest Gaps Against Intended Eden Direction

1. True project runtime isolation still does not exist yet.
2. Runtime metadata exists, but runtime provisioning, lifecycle execution, and deployment history do not.
3. Business/project code still conceptually lives inside the same app instead of separate runtimes.
4. "Hosted inside Eden" is still modeled as balance/status metadata plus runtime registry metadata, not as a real isolated runtime system.
5. Persistent operational verification is incomplete because current database access is not fully confirmable from the audit environment.

## Current Blockers

- Prisma-backed acceptance verification cannot fully confirm ledger state because model queries returned `EACCES`.
- Dev-server validation is noisy because another Next dev instance or lock already exists.
- The live database still has no recorded Prisma migration history until the new baseline is marked as applied.
- The runtime migration still has not been applied to the active database.
- `middleware.ts` still uses the deprecated Next.js middleware convention instead of `proxy`.

## Minimal Cleanup Completed In This Session

- replaced default README boilerplate with repo-specific guidance
- fixed one corrupted Leaf's label in the service usage mapper
- created `eden-system/` as the canonical build-memory location
- added the first runtime control-plane schema/service/UI layer without changing existing project blueprint behavior

## Current Runtime Control-Plane Foundation

- `ProjectRuntime` and `ProjectRuntimeDomainLink` now exist in Prisma schema and migration output.
- Project runtime records are linked to `ProjectBlueprint`, not merged into blueprint status fields.
- The owner can open `/owner/runtimes` to inspect runtime records and register the first internal sandbox record.
- The first sandbox use case creates or reconciles:
  - internal business: `business-eden-internal-sandbox`
  - internal project blueprint: `project-eden-internal-sandbox`
  - internal runtime: `runtime-eden-internal-sandbox`
  - internal preview link placeholder: `sandbox.eden.internal/owner-sandbox`
- The runtime record is explicitly metadata-only and marks no real isolated runtime as deployed.

## Migration Chain Repair Status

- Baseline migration created:
  - `prisma/migrations/20260311120000_pre_runtime_baseline/migration.sql`
- Runtime migration retained unchanged:
  - `prisma/migrations/20260311143000_project_runtime_control_plane/migration.sql`
- The baseline covers the pre-runtime schema only and excludes:
  - `ProjectRuntime`
  - `ProjectRuntimeDomainLink`
- Verified by Prisma diff that the live database matches the pre-runtime schema exactly:
  - `No difference detected.`
- Result:
  - the migration chain now has a valid predecessor on disk for `ProjectBlueprint`
  - the remaining work is manual migration-history reconciliation plus applying the runtime migration to the live database

## Next Recommended Implementation Target

Reconcile the live database with the repaired migration history, then apply the runtime migration.

Build next:

1. mark `20260311120000_pre_runtime_baseline` as applied on the live database with Prisma Migrate
2. run `prisma migrate deploy` so `20260311143000_project_runtime_control_plane` creates the runtime tables
3. verify `/owner/runtimes` can register the internal sandbox against the live database
4. then add explicit runtime status transition actions and audit logging
