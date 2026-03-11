# Change Log - Agent

## 2026-03-11

### Audit completed

- Confirmed the active git repo is `C:\dev\Eden\eden-v1`, not the parent `C:\dev\Eden`.
- Audited route structure, auth/session boundaries, middleware protection, Prisma schema, business/project code paths, and existing planning docs.
- Confirmed the codebase is a hybrid transition system with real Prisma-backed features layered under mock-first UI and session compatibility paths.

### Verification completed

- `npm run lint` passed.
- `npm run build` passed.
- `cmd /c npx prisma validate` passed after allowing Prisma to fetch its validation engine.
- `npm run acceptance:verify-ledger` ran, but persistent model checks were skipped with Prisma `EACCES` warnings, so ledger health is not fully confirmed.
- `npm run dev` probing showed an existing Next dev process or lock; isolated fresh startup verification was not fully confirmed.

### Cleanup completed

- Replaced the default README with a repo-specific overview and command guide.
- Fixed one corrupted Leaf's label in `modules/core/services/service-usage-service.ts`.

### Eden system created

- `eden-system/specs/EDEN_MASTER_SPEC.md`
- `eden-system/specs/PROJECT_ISOLATION_MODEL.md`
- `eden-system/specs/AI_ORCHESTRATION_MODEL.md`
- `eden-system/state/CURRENT_STATE.md`
- `eden-system/state/TASK_QUEUE.md`
- `eden-system/state/HUMAN_ACTIONS_REQUIRED.md`
- `eden-system/chapters/CHAPTER_01_MVP_FOUNDATION.md`
- `eden-system/chapters/CHAPTER_02_PROJECT_ISOLATION.md`
- `eden-system/prompts/CODEX_TASK_EXECUTOR.md`

### Main findings

- The repo is structurally usable for forward development, but not yet safe to call "runtime-isolated."
- Project blueprints, hosting balance, and agent runs exist, but they are not real isolated business runtimes.
- Docs and planning context were fragmented across `docs/`, `eden-dev/`, and default root files before this pass.

### Still requires validation

- persistent database permissions for acceptance verification
- clean dev-server startup without pre-existing lock/process state
- future runtime isolation model implementation

### Runtime control-plane foundation completed

- Re-read the Eden system spec, project isolation spec, AI orchestration spec, current state, task queue, human actions, changelog, and Codex executor prompt before changing code.
- Audited the current Prisma schema, `ProjectBlueprint` flow, owner/business routes, middleware, and existing "hosting/publishing" concepts to confirm there was no real runtime layer yet.
- Added Prisma enums for runtime type, environment, target, access policy, visibility, status, and runtime domain link type.
- Added Prisma models:
  - `ProjectRuntime`
  - `ProjectRuntimeDomainLink`
- Linked runtime metadata to `ProjectBlueprint` and `User` without altering existing blueprint behavior.
- Added `modules/core/projects/project-runtime-shared.ts` for runtime record types and stable internal sandbox IDs.
- Added `modules/core/services/project-runtime-service.ts` for:
  - owner runtime registry reads
  - idempotent owner internal sandbox registration
  - schema/database failure reporting so the owner page degrades clearly if the migration is not applied
- Added owner-only API route `app/api/owner/project-runtimes/route.ts`.
- Added owner-only UI:
  - `/owner/runtimes`
  - `ui/owner/owner-runtime-registry.tsx`
- Added an owner dashboard link to the runtime registry from `app/(owner)/owner/page.tsx`.
- Extended protected route enforcement for `/api/owner/project-runtimes` in `modules/core/session/access-control.ts` and `middleware.ts`.

### Migration and verification completed

- Generated Prisma client after the schema change.
- Validated the schema successfully.
- Ran `prisma format` successfully by pointing Prisma at the local schema engine binary.
- Generated migration:
  - `prisma/migrations/20260311143000_project_runtime_control_plane/migration.sql`
  - `prisma/migrations/migration_lock.toml`
- Verified the repo still passes:
  - `npm run lint`
  - `npm run build`

### Important limits after this session

- The runtime control-plane layer is metadata only. It does not provision or launch a real isolated runtime.
- The migration was generated but not applied in this session.
- The internal sandbox business/project/runtime records will not exist in the database until the owner-only initializer is executed after migration.
- Existing Prisma permission uncertainty remains for some acceptance verification paths.

### Migration audit diagnosis

- Audited `prisma/schema.prisma` and the full on-disk migration chain in chronological order.
- Confirmed there is only one migration directory on disk:
  - `prisma/migrations/20260311143000_project_runtime_control_plane`
- Confirmed that migration creates only:
  - `ProjectRuntime`
  - `ProjectRuntimeDomainLink`
- Confirmed that migration adds a foreign key from `ProjectRuntime.projectId` to `ProjectBlueprint.id` before any migration in the chain creates `ProjectBlueprint`.
- Confirmed there is no migration on disk that creates `ProjectBlueprint`, `ProjectAgent`, `ProjectAgentRun`, `User`, or `Business`.
- Confirmed the live PostgreSQL database already contains:
  - `User`
  - `Business`
  - `ProjectBlueprint`
  - `ProjectAgent`
  - `ProjectAgentRun`
- Confirmed the live PostgreSQL database does not contain:
  - `_prisma_migrations`
  - `ProjectRuntime`
  - `ProjectRuntimeDomainLink`
- Confirmed `prisma migrate status` sees one unapplied migration and no earlier migration history.
- Confirmed repo docs and scripts historically instructed `npx prisma db push`, which explains how the live schema exists without a Prisma migration baseline.

### Root cause

- `prisma migrate dev` fails with `P3006 / P1014` because Prisma replays the migration chain into a fresh shadow database.
- The current chain starts with the runtime migration, but that migration assumes `ProjectBlueprint` already exists.
- `ProjectBlueprint` exists only in the live database, likely because the schema was created earlier via `prisma db push`, not via Prisma Migrate.
- This is therefore both:
  - a missing baseline migration problem
  - a migration-history mismatch between the live database and the on-disk migration chain

### Least-destructive repair plan

- Do not reset the live database as the first fix.
- Add a baseline initial migration that creates the pre-runtime schema, including `ProjectBlueprint` and all earlier core tables already present in the live database.
- Name that baseline migration earlier than `20260311143000_project_runtime_control_plane` so Prisma applies it first in the chain.
- On the existing live database, mark the baseline migration as already applied with `prisma migrate resolve --applied <baseline_migration_name>` instead of re-running its SQL, because those tables already exist.
- After the baseline is resolved, apply the runtime migration normally so Prisma can create `ProjectRuntime` and `ProjectRuntimeDomainLink`.

### Reset guidance

- A reset is not the least-destructive repair because it would discard existing persisted data while still not fixing the missing baseline in the migration chain by itself.
- A full reset only makes sense for a disposable local/dev database after the baseline migration has been added to the repo.

### Baseline migration repair completed

- Re-read `CURRENT_STATE.md`, `HUMAN_ACTIONS_REQUIRED.md`, `CHANGELOG_AGENT.md`, and `EDEN_MASTER_SPEC.md` before making migration-history changes.
- Identified the pre-runtime schema boundary from `HEAD:prisma/schema.prisma`, which excludes:
  - `ProjectRuntime`
  - `ProjectRuntimeDomainLink`
- Created baseline migration:
  - `prisma/migrations/20260311120000_pre_runtime_baseline/migration.sql`
- Left the runtime migration unchanged:
  - `prisma/migrations/20260311143000_project_runtime_control_plane/migration.sql`
- Confirmed the baseline covers the pre-runtime schema objects:
  - enums: `EdenRole`, `UserStatus`, `BusinessStatus`, `BusinessVisibility`, `BusinessMemberRole`, `PipelineStatus`, `CreditsTopUpPaymentStatus`, `PaymentEventLogStatus`, `PayoutSettlementStatus`, `ProjectBlueprintStatus`
  - tables/models: `User`, `AuthProviderAccount`, `Business`, `ProjectBlueprint`, `ProjectAgent`, `ProjectAgentRun`, `BusinessMember`, `Service`, `ServiceUsage`, `CreditsTopUpPayment`, `PaymentEventLog`, `PayoutSettlement`, `InternalLeavesUsage`, `OwnerLeavesGrant`, `PipelineRecord`, `PipelineEvent`
- Confirmed the live database matches the pre-runtime schema exactly by running Prisma diff from the configured datasource to the pre-runtime schema:
  - `No difference detected.`
- Resulting migration-chain status:
  - shadow replay should now have a valid `ProjectBlueprint` predecessor in principle
  - the remaining work is the manual `migrate resolve` plus `migrate deploy` sequence on the live database

### Remaining manual sequence

- Record the baseline as applied on the live database:
  - `prisma migrate resolve --applied 20260311120000_pre_runtime_baseline`
- Apply pending migrations:
  - `prisma migrate deploy`
- Then verify the owner runtime registry against the migrated database.

### Internal sandbox task runner v1 completed

- Re-read `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG_AGENT.md`, and `EDEN_MASTER_SPEC.md` before extending the runtime control-plane work.
- Extended Prisma schema with:
  - enums: `ProjectRuntimeTaskType`, `ProjectRuntimeTaskStatus`
  - model: `ProjectRuntimeTask`
  - reverse relations from `User` and `ProjectRuntime`
- Added shared runtime task types and stable sandbox Lead/Planner and Worker labels in `modules/core/projects/project-runtime-shared.ts`.
- Extended `modules/core/services/project-runtime-service.ts` with:
  - sandbox task state reads
  - owner-only sandbox task creation
  - deterministic Lead/Planner execution record building
  - deterministic Worker result generation
  - sandbox task failure handling and schema-unavailable reporting
- Added owner-only API route:
  - `app/api/owner/project-runtimes/internal-sandbox/tasks/route.ts`
- Added minimal owner UI:
  - `ui/owner/internal-sandbox-task-runner.tsx`
  - integrated into `ui/owner/owner-runtime-registry.tsx`
  - wired through `app/(owner)/owner/runtimes/page.tsx`
- Extended middleware matching so nested owner runtime API paths remain protected:
  - `/api/owner/project-runtimes/:path*`
- Generated additive migration:
  - `prisma/migrations/20260311190000_internal_sandbox_task_runner_v1/migration.sql`

### Verification completed for sandbox task runner v1

- `cmd /c npx prisma format` passed when pointed at the local schema engine binary.
- `cmd /c npx prisma generate` passed.
- `cmd /c npx prisma validate` passed.
- `npm run lint` passed.
- `npm run build` passed.

### Important limits after sandbox task runner v1

- The sandbox task runner is metadata only and synchronous in v1.
- No real container execution, background queue, preview deploy, or isolated runtime provisioning happens when a task is created.
- The runtime and task runner migrations were generated but not applied in this session.
- Persistent database verification of the sandbox task runner still depends on resolving the existing Prisma/database access issues and running the pending migration commands on the live database.

### Owner runtime lifecycle actions and audit logging v1 completed

- Re-read `EDEN_MASTER_SPEC.md`, `PROJECT_ISOLATION_MODEL.md`, `AI_ORCHESTRATION_MODEL.md`, `CURRENT_STATE.md`, `TASK_QUEUE.md`, `HUMAN_ACTIONS_REQUIRED.md`, `CHANGELOG_AGENT.md`, and `CODEX_TASK_EXECUTOR.md` before extending runtime control.
- Inspected the current runtime schema, `project-runtime-service.ts`, owner runtime API routes, and `/owner/runtimes` UI before making changes.
- Extended Prisma schema with:
  - model: `ProjectRuntimeAuditLog`
  - reverse relations from `User` and `ProjectRuntime`
- Extended runtime shared types with:
  - `EdenProjectRuntimeAuditLogRecord`
  - owner runtime lifecycle status options
  - owner runtime health-check action options
- Extended `modules/core/services/project-runtime-service.ts` with:
  - recent audit log loading on runtime registry records
  - owner runtime lifecycle update handling
  - per-field audit entry creation for `status`, `statusDetail`, and `lastHealthCheckAt`
  - audit-aware runtime record mapping for `/owner/runtimes`
- Added owner-only lifecycle update API route:
  - `app/api/owner/project-runtimes/[runtimeId]/route.ts`
- Added owner-only lifecycle and audit UI:
  - `ui/owner/owner-runtime-lifecycle-panel.tsx`
  - integrated into `ui/owner/owner-runtime-registry.tsx`
- Preserved:
  - existing `ProjectBlueprint` behavior
  - existing runtime registry behavior
  - existing internal sandbox task runner behavior
- Generated additive migration:
  - `prisma/migrations/20260311213000_owner_runtime_lifecycle_audit_v1/migration.sql`

### Verification completed for runtime lifecycle and audit logging v1

- `cmd /c npx prisma format` passed when pointed at the local schema engine binary.
- `cmd /c npx prisma generate` passed.
- `cmd /c npx prisma validate` passed.
- `npm run lint` passed.
- `npm run build` passed.

### Important limits after runtime lifecycle and audit logging v1

- Runtime lifecycle actions are still metadata-only control-plane writes.
- No container execution, health probe, deploy job, preview activation, or domain handoff happens when lifecycle metadata is updated.
- The new lifecycle audit migration was generated but not applied in this session.
- Persistent verification of runtime lifecycle updates and audit entries still depends on resolving the existing Prisma/database access issues and running the pending migration commands on the live database.

### Runtime launch-intent and deployment-history metadata v1 completed

- Re-read `EDEN_MASTER_SPEC.md`, `PROJECT_ISOLATION_MODEL.md`, `AI_ORCHESTRATION_MODEL.md`, `CURRENT_STATE.md`, `TASK_QUEUE.md`, `HUMAN_ACTIONS_REQUIRED.md`, `CHANGELOG_AGENT.md`, and `CODEX_TASK_EXECUTOR.md` before extending runtime control.
- Inspected the current runtime schema, runtime service layer, audit-log flow, and `/owner/runtimes` UI before changing code.
- Extended Prisma schema with:
  - enums: `ProjectRuntimeLaunchIntentType`, `ProjectRuntimeLaunchMode`
  - enums: `ProjectRuntimeDeploymentEventType`, `ProjectRuntimeDeploymentEventStatus`
  - models: `ProjectRuntimeLaunchIntent`, `ProjectRuntimeDeploymentRecord`
  - reverse relation from `User` to deployment-history records
- Extended runtime shared types with:
  - launch-intent option lists and types
  - deployment-history option lists and types
  - `EdenProjectRuntimeLaunchIntentRecord`
  - `EdenProjectRuntimeDeploymentRecord`
- Extended `modules/core/services/project-runtime-service.ts` with:
  - launch-intent loading on runtime registry records
  - recent deployment-history loading on runtime registry records
  - owner launch-intent update handling
  - manual deployment-history record creation
  - default internal sandbox launch-intent creation during sandbox registration
- Added owner-only API routes:
  - `app/api/owner/project-runtimes/[runtimeId]/launch-intent/route.ts`
  - `app/api/owner/project-runtimes/[runtimeId]/deployment-history/route.ts`
- Added owner-only UI:
  - `ui/owner/owner-runtime-launch-panel.tsx`
  - integrated into `ui/owner/owner-runtime-registry.tsx`
- Preserved:
  - existing `ProjectBlueprint` behavior
  - existing runtime registry behavior
  - existing sandbox task runner behavior
  - existing lifecycle controls and audit entry behavior
- Generated additive migration:
  - `prisma/migrations/20260311233000_runtime_launch_intent_deployment_history_v1/migration.sql`

### Verification completed for runtime launch-intent and deployment-history v1

- `cmd /c npx prisma format` passed when pointed at the local schema engine binary.
- `cmd /c npx prisma generate` passed.
- `cmd /c npx prisma validate` passed.
- `npm run lint` passed.
- `npm run build` passed.

### Important limits after runtime launch-intent and deployment-history v1

- Launch intent and deployment history are still metadata-only control-plane records.
- No container provisioning, preview deployment, Eden-managed host launch, or external domain handoff happens when these records are updated.
- Saving launch intent creates a deployment-history record, but that record describes owner intent only and not a real deploy action.
- The new launch-intent/deployment-history migration was generated but not applied in this session.
- Persistent verification of launch intent and deployment-history records still depends on resolving the existing Prisma/database access issues and running the pending migration commands on the live database.
