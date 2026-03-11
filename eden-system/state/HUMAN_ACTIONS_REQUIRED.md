# Human Actions Required

## Immediate

- Confirm the intended repo root convention. The real git repo is currently `C:\dev\Eden\eden-v1`, while `C:\dev\Eden` is only a wrapper folder.
- Resolve database access permissions for the configured Prisma environment. On 2026-03-11, `npm run acceptance:verify-ledger` reported Prisma `EACCES` warnings for `CreditsTopUpPayment`, `ServiceUsage`, `ProjectAgentRun`, and `InternalLeavesUsage`.
- Confirm whether an existing `next dev` process should remain running. Audit startup checks detected port usage and `.next/dev/lock` contention.
- Do not run `prisma migrate dev` against the live database for this repair.
- Current diagnosis:
  - the live database already has `ProjectBlueprint` and related core tables
  - there is no `_prisma_migrations` table
  - the on-disk migration chain starts with the runtime migration, which references `ProjectBlueprint` but does not create it
- Required repair sequence:
  - baseline migration is now present on disk: `20260311120000_pre_runtime_baseline`
  - pending additive migrations are now on disk:
    - `20260311143000_project_runtime_control_plane`
    - `20260311190000_internal_sandbox_task_runner_v1`
  - mark the baseline as applied on the existing live database
  - then run `prisma migrate deploy` so Prisma can apply both pending migrations in order
- Exact next commands from `C:\dev\Eden\eden-v1`:
  - `$env:PRISMA_SCHEMA_ENGINE_BINARY=(Resolve-Path 'node_modules/@prisma/engines/schema-engine-windows.exe')`
  - `cmd /c npx prisma migrate resolve --applied 20260311120000_pre_runtime_baseline`
  - `cmd /c npx prisma migrate deploy`
  - `cmd /c npx prisma migrate status`
- After the baseline and pending migrations are in place:
  - manually verify `/owner/runtimes`
  - trigger the owner-only internal sandbox registration flow once in the intended environment
  - create one sandbox task and confirm Lead/Planner plus Worker output is stored persistently

## Needed Before Production-Like Flows

- Provide production-safe auth configuration and confirm the authorized owner username.
- Provide Stripe production credentials and webhook configuration if real payment flows are expected.
- Confirm Google auth provider setup if OAuth should remain enabled.

## Needed Before Project Isolation Rollout

- Approve the runtime strategy for isolated project execution.
- Decide whether the first isolated runtime target is container-based, workspace-based, repo-based, or another sandbox model.
- Approve the owner-only internal "Eden inside Eden" sandbox as a formal product concept.
- Decide where runtime secrets/config will live before any real runtime provisioning begins.
