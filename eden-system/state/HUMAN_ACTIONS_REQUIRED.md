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
    - `20260311213000_owner_runtime_lifecycle_audit_v1`
    - `20260311233000_runtime_launch_intent_deployment_history_v1`
    - `20260311235500_runtime_config_secret_boundary_provider_scaffold_v1`
    - `20260311235930_provider_approval_secret_status_agent_run_v1`
  - mark the baseline as applied on the existing live database
  - then run `prisma migrate deploy` so Prisma can apply all pending migrations in order
- Exact next commands from `C:\dev\Eden\eden-v1`:
  - `$env:PRISMA_SCHEMA_ENGINE_BINARY=(Resolve-Path 'node_modules/@prisma/engines/schema-engine-windows.exe')`
  - `cmd /c npx prisma migrate resolve --applied 20260311120000_pre_runtime_baseline`
  - `cmd /c npx prisma migrate deploy`
  - `cmd /c npx prisma migrate status`
- After the baseline and pending migrations are in place:
  - manually verify `/owner/runtimes`
  - trigger the owner-only internal sandbox registration flow once in the intended environment
  - create one sandbox task and confirm Lead/Planner plus Worker output is stored persistently
  - save one runtime lifecycle update and confirm a recent audit entry is stored persistently
  - save one runtime launch-intent update and confirm a deployment-history entry is stored persistently
  - add one manual deployment-history record and confirm it is visible in `/owner/runtimes`
  - save one runtime config-policy update and confirm secret-boundary metadata is created or refreshed
  - save one provider approval update and confirm runtime compatibility plus audit entries persist
  - save one secret-boundary readiness update and confirm `statusDetail` plus `lastCheckedAt` persist
  - create one sandbox task with provider preflight selected and confirm agent-run plus explicit result-capture records persist
  - confirm the owner control-agent panel loads the new owner constitution file in the intended environment
  - confirm the new Eden self-work panel loads `EDEN_SELF_WORK_QUEUE.json` and `EDEN_POST_DEPLOY_TIMELINE.md` in `/owner/runtimes`
  - queue one approved Eden self-work item and confirm a real internal sandbox task row is created with the `[eden-self-work:<id>]` title prefix
  - confirm the new build-supervisor panel can prepare `EDEN_CODEX_EXECUTION_PACKET.json`
  - ingest one completed supervisor result and confirm the managed sections in `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG_AGENT.md`, and `HUMAN_ACTIONS_REQUIRED.md` refresh correctly

## Needed Before Production-Like Flows

- Provide production-safe auth configuration and confirm the authorized owner username.
- Provide Stripe production credentials and webhook configuration if real payment flows are expected.
- Confirm Google auth provider setup if OAuth should remain enabled.

## Needed Before Project Isolation Rollout

- Approve the runtime strategy for isolated project execution.
- Decide whether the first isolated runtime target is container-based, workspace-based, repo-based, or another sandbox model.
- Approve the owner-only internal "Eden inside Eden" sandbox as a formal product concept.
- Decide where runtime secrets/config will live before any real runtime provisioning begins.
- Decide whether future secret status updates should stay owner-mediated in Eden or move to an external secret manager control surface.

## Build Supervisor Tracked Actions

<!-- EDEN_BUILD_SUPERVISOR:START -->
- No new supervisor-recorded human-required actions yet.
- Current blocked-task count: 1.
<!-- EDEN_BUILD_SUPERVISOR:END -->
