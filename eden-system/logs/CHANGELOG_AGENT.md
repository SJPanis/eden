# Change Log - Agent

## 2026-03-23

### Sandbox task lifecycle audit logging implemented

- Added `ProjectRuntimeTaskAuditEventType` enum to Prisma schema with 9 event types.
- Added `ProjectRuntimeTaskAuditLog` model to Prisma schema with indexes on runtimeId, taskId, actorUserId, and eventType.
- Added `taskAuditLogs` relation to `User`, `ProjectRuntime`, and `ProjectRuntimeTask`.
- Created migration: `prisma/migrations/20260323010000_sandbox_task_lifecycle_audit_v1/migration.sql`.
- Added `EdenProjectRuntimeTaskAuditLogRecord` type to `modules/core/projects/project-runtime-shared.ts`.
- Added `taskAuditEntries` field to `EdenProjectRuntimeTaskRecord`.
- Added `mapProjectRuntimeTaskAuditLogRecord` and `formatTaskAuditEventTypeLabel` helpers in `project-runtime-service.ts`.
- Added `taskAuditLogs` to `projectRuntimeTaskInclude` so audit entries are loaded with every task.
- Added fire-and-forget `writeTaskAuditLog` helper in service layer — audit failures never break primary task operations.
- Wired all 9 event types at correct points in the task creation and execution flow.
- Added "Task lifecycle audit" section to each task card in `ui/owner/internal-sandbox-task-runner.tsx`.

### Autonomy boundary model added

- Created `eden-system/specs/EDEN_AUTONOMY_BOUNDARY.md` defining two-scope (PRIVATE_DEV / PUBLIC_PROD) two-stage (A / B) autonomy model.
- Created `modules/core/agents/eden-autonomy-boundary.ts` (pure, no server-only imports):
  - `resolveEnvironmentScope()` with detection priority: env var → NODE_ENV → default PRIVATE_DEV
  - `edencloud.app` always forces PUBLIC_PROD regardless of env vars
  - `resolveAutonomyStage()` mapping scope to Stage A or B
  - 17 DB action policies with per-scope allowed/blocked/review-required flags
  - `checkDbActionAllowed()` for single policy lookups
  - `buildAutonomyModeState()` assembling the full owner-visible state struct
- Created `modules/core/agents/eden-db-action-policy.ts` (server-only DB-reading wrapper):
  - `loadAutonomyModeState()` reads live Prisma state and degrades safely on error

### Owner-visible autonomy-mode panel added

- Created `app/api/owner/project-runtimes/internal-sandbox/autonomy/route.ts` — owner-only GET route.
- Created `ui/owner/owner-autonomy-mode-panel.tsx` — client component with:
  - Stage A/B badge, PRIVATE_DEV/PUBLIC_PROD scope badge
  - live OpenAI path enabled/blocked indicator with current blockers
  - public prod always-gated notice
  - expandable DB action policy table
  - refresh button
- Integrated `OwnerAutonomyModePanel` as the first panel after the page header in `app/(owner)/owner/runtimes/page.tsx`.
- Added `loadAutonomyModeState()` to the `Promise.all` in `OwnerRuntimesPage`.

### Self-work loop tightened

- Added `queueAndExecuteNextApprovedEdenSelfWorkTask()` to `modules/core/agents/eden-self-work-loop.ts`:
  - queues the task via the existing safe path
  - checks review-required mode and per-task review flag — stops with explicit reason if set
  - checks autonomy policy via `loadAutonomyModeState()` — stops with explicit reason if blocked
  - attempts live execution via `executeOwnerInternalSandboxTaskLiveProvider` if policy permits
  - returns explicit `queued`, `executed`, `autoExecutionSkipped`, `stopReason` fields
- Updated `app/api/owner/project-runtimes/internal-sandbox/self-work/route.ts`:
  - `?mode=queue_and_execute` triggers the new governed auto-execute path
  - default (no mode) remains queue-only, safe
  - split into explicit branches to resolve TypeScript type narrowing error

### Autonomy state surfaced in loadEdenSelfWorkState

- `loadEdenSelfWorkState()` now loads `autonomyMode` in parallel and includes:
  - `autonomyStage`, `autonomyScopeLabel`, `autonomyAllowsExecution`, `autonomyBlockers` fields

### Build and lint verified

- `npm run lint` — exit 0, no errors.
- `npm run build` — exit 0, clean compile, all 33 pages built successfully.
- TypeScript `tsc --noEmit` — exit 0, no type errors.

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

### Runtime config, secret-boundary, provider scaffold, and owner constitution v1 completed

- Re-read `EDEN_MASTER_SPEC.md`, `PROJECT_ISOLATION_MODEL.md`, `AI_ORCHESTRATION_MODEL.md`, `CURRENT_STATE.md`, `TASK_QUEUE.md`, `HUMAN_ACTIONS_REQUIRED.md`, `CHANGELOG_AGENT.md`, and `CODEX_TASK_EXECUTOR.md` before extending the control-plane layer.
- Inspected the current runtime schema, runtime service layer, owner runtime UI, lifecycle flow, launch-intent flow, deployment-history flow, and internal sandbox task runner before changing code.
- Fixed the homepage/public-entry wording source so the shared public-facing terminology now uses `Leaves` instead of the broken `Leaf's` label in shared currency and launch-label surfaces.
- Extended Prisma schema with:
  - enums: `EdenAiProvider`, `ProjectRuntimeConfigScope`, `ProjectRuntimeExecutionMode`, `ProjectRuntimeProviderPolicyMode`
  - enums: `ProjectRuntimeSecretType`, `ProjectRuntimeSecretScope`, `ProjectRuntimeSecretVisibilityPolicy`, `ProjectRuntimeSecretStatus`
  - models: `ProjectRuntimeConfigPolicy`, `ProjectRuntimeSecretBoundary`
- Extended runtime shared types with:
  - config-scope, execution-mode, provider-policy, and provider option lists
  - `EdenProjectRuntimeConfigRecord`
  - `EdenProjectRuntimeSecretBoundaryRecord`
  - `EdenProjectRuntimeProviderCompatibilityRecord`
- Added provider adapter scaffolding in:
  - `modules/core/agents/eden-provider-adapters.ts`
  - approved providers are currently `OpenAI` and `Anthropic`
  - adapter execution remains scaffold-only and returns honest "not wired yet" responses
- Added the owner constitution/control-agent scaffold in:
  - `eden-system/specs/OWNER_CONTROL_CONSTITUTION.md`
  - `modules/core/agents/eden-owner-constitution.ts`
- Added owner-only runtime config policy handling in `modules/core/services/project-runtime-service.ts`:
  - runtime config-policy updates
  - secret-boundary synchronization
  - provider compatibility evaluation
  - default config policy and secret-boundary seeding for the internal sandbox runtime
- Added owner-only API route:
  - `app/api/owner/project-runtimes/[runtimeId]/config/route.ts`
- Added owner-only UI:
  - `ui/owner/owner-runtime-config-panel.tsx`
  - `ui/owner/owner-control-agent-panel.tsx`
  - integrated into `app/(owner)/owner/runtimes/page.tsx`
  - integrated into `ui/owner/owner-runtime-registry.tsx`
- Preserved:
  - existing `ProjectBlueprint` behavior
  - existing runtime registry behavior
  - existing sandbox task runner behavior
  - existing lifecycle controls and audit entry behavior
  - existing launch-intent and deployment-history behavior
- Generated additive migration:
  - `prisma/migrations/20260311235500_runtime_config_secret_boundary_provider_scaffold_v1/migration.sql`

### Verification completed for runtime config, secret boundaries, and control-agent scaffold v1

- `cmd /c npx prisma format` passed when pointed at the local schema engine binary.
- `cmd /c npx prisma generate` passed.
- `cmd /c npx prisma validate` passed.
- `npm run lint` passed.
- `npm run build` passed.

### Important limits after runtime config, secret boundaries, and control-agent scaffold v1

- Runtime config policy and secret boundaries are metadata only.
- No raw secret values are stored or exposed by this implementation.
- Provider adapters are scaffold-only and do not make live outbound model calls.
- The owner constitution/control-agent layer reads canonical Eden files, but it does not execute unrestricted supervisory actions.
- The new config/secret-boundary migration was generated but not applied in this session.
- Persistent verification of config-policy and secret-boundary records still depends on resolving the existing Prisma/database access issues and running the pending migration commands on the live database.

### Active-surface honesty pass and Eden self-work loop completed

- Re-read `EDEN_MASTER_SPEC.md`, `PROJECT_ISOLATION_MODEL.md`, `AI_ORCHESTRATION_MODEL.md`, `CURRENT_STATE.md`, `TASK_QUEUE.md`, `HUMAN_ACTIONS_REQUIRED.md`, `CHANGELOG_AGENT.md`, and `CODEX_TASK_EXECUTOR.md` before extending the control-plane layer again.
- Audited active owner, runtime, consumer, and public-entry surfaces for remaining mock, placeholder, seeded, or misleading wording in the visible product flow.
- Audit classification:
  - safe to keep as clearly labeled control-plane or overlay state:
    - `/owner/runtimes` runtime/task/lifecycle/launch/deployment/config surfaces
    - owner overlay and seeded-feed indicators in older owner dashboard sections
    - `/api/mock-*` compatibility routes that are still explicit about being mock or overlay paths
  - should be relabeled to remain honest:
    - owner release history wording that still said "mocked"
    - active consumer pricing fallbacks that still said "placeholder" or "mock fallback"
    - remaining active `Leaf's`/`Leaf’s` wording inconsistencies in the homepage and current product surfaces
  - should be isolated behind legacy or non-active status for now:
    - `ui/entry/eden-entry-panel.tsx`, which still contains older mock-session onboarding text but is not the active homepage
  - preserved in this pass because they still support hybrid compatibility:
    - mock-session, mock-transaction, and mock-pipeline service layers that older owner/business/consumer routes still depend on
- Added canonical Eden self-work files:
  - `eden-system/state/EDEN_SELF_WORK_QUEUE.json`
  - `eden-system/state/EDEN_POST_DEPLOY_TIMELINE.md`
- Added owner-only Eden self-work implementation:
  - `modules/core/agents/eden-self-work-shared.ts`
  - `modules/core/agents/eden-self-work-loop.ts`
  - `app/api/owner/project-runtimes/internal-sandbox/self-work/route.ts`
  - `ui/owner/owner-eden-self-work-panel.tsx`
  - integrated into `app/(owner)/owner/runtimes/page.tsx`
- The self-work loop now:
  - reads canonical owner-control inputs and the new self-work queue/timeline files
  - evaluates whether the internal sandbox runtime is ready
  - queues the next approved Eden-core work item into the real internal sandbox task runner
  - records output in normal `ProjectRuntimeTask` rows instead of a separate fake queue table
- Performed focused honesty cleanup on active surfaces:
  - removed the unused `nextApprovedItems` variable from `ui/owner/owner-eden-self-work-panel.tsx`
  - relabeled owner release activity wording in `ui/owner/owner-dashboard.tsx`
  - relabeled active consumer pricing fallbacks in `ui/consumer/consumer-home.tsx`, `ui/consumer/components/service-usage-panel.tsx`, and `app/(consumer)/services/[id]/page.tsx`
- Verified after the honesty pass and self-work loop additions:
  - `cmd /c npx prisma generate`
  - `cmd /c npx prisma validate`
  - `npm run lint`
  - `npm run build`

### Important limits after the honesty pass and self-work loop

- Eden self-work remains owner-approved and queue-scoped; it is not unrestricted autonomy.
- The self-work loop reuses real internal sandbox task records, but it does not execute real providers, containers, deployments, or background workers.
- Active surfaces are more honest about overlay-backed behavior, but hybrid mock-first compatibility paths still exist in older flows until they are replaced or quarantined further.

### Eden Build Supervisor v1 completed

- Re-read `EDEN_MASTER_SPEC.md`, `PROJECT_ISOLATION_MODEL.md`, `AI_ORCHESTRATION_MODEL.md`, `CURRENT_STATE.md`, `TASK_QUEUE.md`, `HUMAN_ACTIONS_REQUIRED.md`, `EDEN_POST_DEPLOY_TIMELINE.md`, `EDEN_SELF_WORK_QUEUE.json`, `CHANGELOG_AGENT.md`, and `CODEX_TASK_EXECUTOR.md` before extending the control loop.
- Inspected the current self-work loop, owner control panel, owner runtime page, and sandbox task flow before adding the supervisor layer.
- Added build-supervisor spec and state files:
  - `eden-system/specs/EDEN_BUILD_SUPERVISOR.md`
  - `eden-system/state/EDEN_BUILD_SUPERVISOR_STATE.json`
  - `eden-system/state/EDEN_CODEX_EXECUTION_PACKET.json`
- Added build-supervisor shared types and server logic:
  - `modules/core/agents/eden-build-supervisor-shared.ts`
  - `modules/core/agents/eden-build-supervisor.ts`
- The build-supervisor layer now:
  - reads canonical Eden control inputs, self-work queue state, task queue context, human-required actions, and stop conditions
  - identifies the next approved Codex-ready task while refusing tasks blocked by human-required action
  - prepares a structured Codex execution packet in repo state
  - ingests a completed supervisor task result
  - refreshes managed summary sections in `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG_AGENT.md`, and `HUMAN_ACTIONS_REQUIRED.md`
- Added owner-only API and UI:
  - `app/api/owner/project-runtimes/internal-sandbox/build-supervisor/route.ts`
  - `ui/owner/owner-build-supervisor-panel.tsx`
  - integrated into `app/(owner)/owner/runtimes/page.tsx`
- Extended the owner control-input loader so the new build-supervisor spec, state, and packet files are tracked in the control-agent scaffold.
- Verified after the build-supervisor implementation:
  - `cmd /c npx prisma generate`
  - `cmd /c npx prisma validate`
  - `npm run lint`
  - `npm run build`

### Important limits after Eden Build Supervisor v1

- The build supervisor is still supervised orchestration only. It does not execute Codex directly.
- The build supervisor does not perform autonomous deployment, autonomous provider execution, or autonomous runtime provisioning.
- Post-execution ingestion updates managed file sections, but it does not replace disciplined human review of the broader repo state.

### Execution governance layer v1 completed

- Re-read `EDEN_MASTER_SPEC.md`, `PROJECT_ISOLATION_MODEL.md`, `AI_ORCHESTRATION_MODEL.md`, `CURRENT_STATE.md`, `TASK_QUEUE.md`, `HUMAN_ACTIONS_REQUIRED.md`, `EDEN_POST_DEPLOY_TIMELINE.md`, `EDEN_SELF_WORK_QUEUE.json`, `CHANGELOG_AGENT.md`, and `CODEX_TASK_EXECUTOR.md` before extending the control plane again.
- Inspected the current runtime schema, runtime service layer, provider scaffold, sandbox task runner, owner runtime UI, and owner-only APIs before changing code.
- Extended Prisma schema with:
  - enum: `ProjectRuntimeProviderApprovalStatus`
  - enum: `ProjectRuntimeAgentActionType`
  - enum: `ProjectRuntimeAgentRunStatus`
  - enum: `ProjectRuntimeTaskResultType`
  - enum: `ProjectRuntimeTaskResultStatus`
  - enum update: `ProjectRuntimeSecretStatus` now includes `PENDING`
  - model: `ProjectRuntimeProviderApproval`
  - model: `ProjectRuntimeAgentRun`
  - field additions on `ProjectRuntimeSecretBoundary` for `statusDetail` and `lastCheckedAt`
  - field additions on `ProjectRuntimeTask` for provider metadata, requested action type, and explicit result capture
- Extended provider adapter scaffolding in `modules/core/agents/eden-provider-adapters.ts` with:
  - runtime approval-aware compatibility evaluation
  - secret-readiness-aware compatibility evaluation
  - provider execution preflight generation
  - continued honest scaffold-only execution responses for live adapters
- Extended `modules/core/services/project-runtime-service.ts` with:
  - provider approval syncing from runtime allowlists
  - owner-only provider approval updates
  - owner-only secret-boundary readiness updates
  - recent agent-run loading on runtime records
  - sandbox task creation that can record governed provider preflight metadata
  - first-class `ProjectRuntimeAgentRun` creation
  - explicit sandbox task result capture
- Added owner-only API routes:
  - `app/api/owner/project-runtimes/[runtimeId]/provider-approvals/route.ts`
  - `app/api/owner/project-runtimes/[runtimeId]/secret-boundaries/route.ts`
- Extended owner-only UI:
  - `ui/owner/owner-runtime-config-panel.tsx` now shows and updates provider approval gates and secret readiness, plus recent governed runs
  - `ui/owner/internal-sandbox-task-runner.tsx` now accepts optional provider/model/action inputs and shows explicit result capture plus governed run summaries
  - `ui/owner/owner-runtime-registry.tsx` now refreshes the runtime config panel on provider/secret updates
- Generated additive migration:
  - `prisma/migrations/20260311235930_provider_approval_secret_status_agent_run_v1/migration.sql`
- Verified after the execution-governance implementation:
  - `cmd /c npx prisma format`
  - `cmd /c npx prisma generate`
  - `cmd /c npx prisma validate`
  - `npm run lint`
  - `npm run build`

### Important limits after execution governance layer v1

- Provider approval gates, secret readiness, agent runs, and sandbox results are still control-plane records only.
- No raw provider secret is stored or exposed.
- No live provider execution was wired in this session.
- No real isolated runtime, container, deploy job, or hosted preview was started by these changes.
- Persistent verification of the new governance records still depends on applying the new migration to the active database and testing `/owner/runtimes` in that environment.

### OpenClaw-style execution interface scaffolding v1 completed

- Re-read the canonical Eden specs, state files, self-work queue, build-supervisor state, and Codex executor prompt before extending the runtime layer again.
- Inspected the current runtime schema, sandbox task runner, provider-governance flow, owner runtime UI, self-work loop, and build-supervisor state before changing code.
- Extended Prisma schema with:
  - enums: `ProjectRuntimeDispatchStatus`, `ProjectRuntimeDispatchMode`
  - enums: `ProjectRuntimeExecutionRole`, `ProjectRuntimeExecutionSessionType`, `ProjectRuntimeExecutionSessionStatus`
  - enums: `ProjectRuntimeExecutionAdapterKind`, `ProjectRuntimeExecutionAdapterMode`
  - models: `ProjectRuntimeExecutionSession`, `ProjectRuntimeDispatchRecord`
- Added Eden-native execution adapter scaffolding in:
  - `modules/core/agents/eden-execution-adapters.ts`
  - tool, browser, and provider adapters now have honest scaffold/preflight metadata and runtime-boundary checks
- Extended shared runtime types in:
  - `modules/core/projects/project-runtime-shared.ts`
  - added execution role options, adapter options, execution-session records, and dispatch-record read models
- Extended `modules/core/services/project-runtime-service.ts` so the sandbox task runner now:
  - computes an execution-governance snapshot from runtime policy, provider approvals, and secret readiness
  - resolves an intended execution role and adapter path for each sandbox task
  - records `ProjectRuntimeExecutionSession` rows
  - records `ProjectRuntimeDispatchRecord` rows
  - writes agent-run summaries from governed dispatch preflight instead of implying live execution
- Added owner-only execution console UI:
  - `ui/owner/owner-runtime-execution-console.tsx`
  - integrated into `ui/owner/owner-runtime-registry.tsx`
- Extended the internal sandbox task runner UI in:
  - `ui/owner/internal-sandbox-task-runner.tsx`
  - task creation now captures execution role and adapter intent
  - stored task cards now show dispatch-boundary metadata alongside planner/worker output
- Extended the owner-only sandbox task API in:
  - `app/api/owner/project-runtimes/internal-sandbox/tasks/route.ts`
- Generated additive migration:
  - `prisma/migrations/20260311235959_openclaw_execution_interface_scaffolding_v1/migration.sql`
- Updated canonical queue/state/timeline files so:
  - the previous combined dispatch/audit queue item now honestly reflects the completed execution-interface scope
  - sandbox task lifecycle audit logging is separated into its own follow-up task

### Verification completed for execution interface scaffolding v1

- `cmd /c npx prisma format` passed when pointed at the local schema engine binary.
- `cmd /c npx prisma generate` passed.
- `cmd /c npx prisma validate` passed.
- `npm run lint` passed.
- `npm run build` passed.

### Important limits after execution interface scaffolding v1

- Dispatch records and execution sessions are still control-plane metadata only.
- Tool adapter, browser adapter, and provider adapter execution remain scaffolded or preflight-only.
- No live browser automation, tool execution, provider execution, async worker queue, or container runtime was added in this session.
- Persistent verification of the new execution-interface records still depends on applying the new migration to the active database and testing `/owner/runtimes` in that environment.

### First live provider execution path v1 completed

- Re-read the canonical Eden specs, state files, queue/timeline files, build-supervisor state, changelog, and Codex executor prompt before changing the runtime execution path.
- Inspected the current provider approval gates, secret-boundary status flow, provider adapter scaffold, sandbox task runner, dispatch/session/run records, and owner runtime UI before wiring a live call path.
- Chose one narrow live provider path:
  - provider: `OpenAI`
  - scope: owner-only internal sandbox tasks only
  - trigger: explicit owner action from `/owner/runtimes`
- Extended Prisma schema with honest additive enum values:
  - `ProjectRuntimeExecutionAdapterMode.LIVE_GUARDED`
  - `ProjectRuntimeTaskResultType.LIVE_PROVIDER_RESULT`
- Added additive migration:
  - `prisma/migrations/20260312003000_live_provider_execution_path_v1/migration.sql`
- Upgraded `modules/core/agents/eden-provider-adapters.ts` so:
  - `OpenAI` is now marked `live_guarded`
  - `Anthropic` remains scaffold-only
  - Eden can perform one real outbound OpenAI Responses API call when the owner-only sandbox task passes governance checks and the active server runtime exposes `OPENAI_API_KEY`
  - provider failures, missing credentials, and scaffold-only providers now return honest structured results instead of fake success
- Extended `modules/core/services/project-runtime-service.ts` with an owner-only live provider execution flow that:
  - re-checks runtime/provider approval governance
  - re-checks secret-boundary metadata
  - requires the task to have been prepared through the provider adapter path
  - enforces provider model-scope constraints when they exist
  - creates or updates real execution-session, dispatch, agent-run, and task-result records for blocked, failed, or completed attempts
- Added owner-only API route:
  - `app/api/owner/project-runtimes/internal-sandbox/tasks/[taskId]/execute/route.ts`
- Extended owner UI:
  - `ui/owner/internal-sandbox-task-runner.tsx` now exposes `Run live OpenAI path` for eligible sandbox tasks
  - `ui/owner/owner-runtime-execution-console.tsx` now labels the OpenAI sandbox path as the only live execution path in v1
  - `ui/owner/owner-control-agent-panel.tsx` now distinguishes the guarded OpenAI path from still-scaffolded providers
- Added `.env.example` entries for:
  - `OPENAI_API_KEY`
  - `EDEN_SANDBOX_OPENAI_MODEL`

### Verification completed for the first live provider path

- `cmd /c npx prisma format` passed when pointed at the local schema engine binary.
- `cmd /c npx prisma generate` passed.
- `cmd /c npx prisma validate` passed.
- `npm run lint` passed.
- `npm run build` passed.

### Important limits after the first live provider path

- Only one live provider path exists:
  - `OpenAI`
  - owner-only internal sandbox tasks only
  - explicit owner trigger only
- Live execution still depends on a real server credential:
  - `OPENAI_API_KEY`
- The active repo environment does not currently expose `OPENAI_API_KEY`, so end-to-end live provider verification did not occur in this session.
- Browser execution, tool execution, deployment/provisioning, and general runtime autonomy remain scaffolded or metadata-only.
- The new live-provider-labeling migration was generated but not applied in this session.

### Build Supervisor Latest Result

<!-- EDEN_BUILD_SUPERVISOR:START -->
- No completed supervised task has been ingested yet.
- Summary: No supervisor-ingested completion summary is recorded yet.
- Next recommended task: Add sandbox task lifecycle audit logging.
<!-- EDEN_BUILD_SUPERVISOR:END -->
