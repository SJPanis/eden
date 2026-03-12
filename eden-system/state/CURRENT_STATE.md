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
- project runtime launch intent metadata and deployment history records
- project runtime config policies and secret boundary metadata
- project runtime provider approval gates and agent run execution records
- project runtime execution sessions and dispatch records
- project runtime tasks for owner-only sandbox execution records
- project runtime audit logs for owner lifecycle control actions

### Business/project flows

- business creation flow exists
- workspace service drafting exists
- project blueprint creation exists
- project agent creation exists
- project agent run recording exists
- Ask Eden can propose and create project artifacts
- owner-only runtime registry surface exists at `/owner/runtimes`
- owner-only internal sandbox runtime initializer exists at `/api/owner/project-runtimes`
- owner-only internal sandbox task runner exists inside `/owner/runtimes`
- owner-only sandbox task API exists at `/api/owner/project-runtimes/internal-sandbox/tasks`
- owner-only runtime lifecycle update API exists at `/api/owner/project-runtimes/[runtimeId]`
- owner-only runtime launch-intent API exists at `/api/owner/project-runtimes/[runtimeId]/launch-intent`
- owner-only runtime deployment-history API exists at `/api/owner/project-runtimes/[runtimeId]/deployment-history`
- owner-only runtime config policy API exists at `/api/owner/project-runtimes/[runtimeId]/config`
- owner-only runtime provider approval API exists at `/api/owner/project-runtimes/[runtimeId]/provider-approvals`
- owner-only runtime secret-boundary readiness API exists at `/api/owner/project-runtimes/[runtimeId]/secret-boundaries`
- owner runtime control page now shows an owner constitution/control-agent scaffold panel
- owner runtime control page now shows an execution console for dispatch/session history

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
- sandbox task execution is synchronous deterministic metadata only; it stores Lead/Planner and Worker outputs but does not run a real agent worker or isolated runtime
- runtime lifecycle controls and audit logs are now modeled, but they still do not drive infrastructure actions
- runtime launch intent and deployment history are now modeled, but they still do not represent real provisioning, release jobs, or domain activation
- runtime config policy, secret boundaries, provider compatibility, and owner control doctrine are now modeled, but they still do not unlock real provider execution, secret storage, or autonomous runtime operations
- provider approval gates, secret readiness detail, agent run records, and sandbox result capture are now modeled, but they still do not execute live provider calls or isolated runtime jobs
- Ask Eden has both a newer tool-routed layer and a legacy Eden AI helper layer

## Biggest Gaps Against Intended Eden Direction

1. True project runtime isolation still does not exist yet.
2. Runtime metadata, lifecycle audit logs, launch intent, deployment history, config policy, and secret boundaries exist, but runtime provisioning, lifecycle execution, deployment execution, and provider execution do not.
3. Business/project code still conceptually lives inside the same app instead of separate runtimes.
4. "Hosted inside Eden" is still modeled as balance/status metadata plus runtime registry metadata, not as a real isolated runtime system.
5. Sandbox task execution records exist, but they are not a real queued worker system or runtime-backed execution engine.
6. Runtime lifecycle changes are auditable, but they are still only metadata writes with no launch/deploy side effects.
7. Persistent operational verification is incomplete because current database access is not fully confirmable from the audit environment.

## Current Blockers

- Prisma-backed acceptance verification cannot fully confirm ledger state because model queries returned `EACCES`.
- Dev-server validation is noisy because another Next dev instance or lock already exists.
- The live database still has no recorded Prisma migration history until the new baseline is marked as applied.
- The runtime, sandbox task runner, runtime lifecycle audit, launch-intent/deployment-history, config/secret-boundary, and execution-governance migrations still have not been applied to the active database.
- The new execution-interface migration for dispatch records and execution sessions also still has not been applied to the active database.
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

## Current Internal Sandbox Task Runner

- `ProjectRuntimeTask` now exists in Prisma schema and migration output.
- Sandbox tasks are tied to `ProjectRuntime`, not to Eden core UI state.
- The owner can create and inspect sandbox tasks from the internal sandbox runtime card inside `/owner/runtimes`.
- Task records capture:
  - task title and input
  - task type and status
  - Lead/Planner summary plus structured planning payload
  - Worker summary plus stored result payload
  - output lines, artifacts, and failure detail when needed
- The v1 execution loop is intentionally minimal:
  - Lead/Planner converts owner input into a structured execution record
  - Worker produces a deterministic implementation plan, analysis record, or QA review plan
  - outputs are stored in the control plane only
- No background queue, container dispatch, code execution, preview deployment, or domain activation is performed by this task runner.

## Current Runtime Lifecycle Controls

- The owner can now update runtime `status`, `statusDetail`, and `lastHealthCheckAt` from `/owner/runtimes`.
- Lifecycle updates are owner-only control-plane actions exposed through `/api/owner/project-runtimes/[runtimeId]`.
- Recent per-field audit entries are displayed inside each runtime card.
- Audit records capture:
  - the runtime field that changed
  - previous and next values where available
  - who performed the change
  - when the change happened
  - a short human-readable detail message
- These lifecycle actions do not trigger a container, health probe, deployment job, preview publish, or linked domain action.

## Current Launch Intent And Deployment History

- `ProjectRuntimeLaunchIntent` now exists in Prisma schema and migration output.
- `ProjectRuntimeDeploymentRecord` now exists in Prisma schema and migration output.
- The internal sandbox runtime is seeded with a default internal preview launch intent when it is first registered.
- The owner can now open `/owner/runtimes` and:
  - view current launch-intent fields
  - update launch intent type, target, mode, destination label, and notes
  - inspect recent deployment-history entries
  - add a manual deployment-history record
- Saving launch intent currently creates a control-plane deployment-history record describing the intent change.
- These records are metadata only:
  - no container or preview environment is provisioned
  - no Eden-managed host is launched
  - no external domain handoff or DNS action is executed

## Current Runtime Config And Secret Boundaries

- `ProjectRuntimeConfigPolicy` now exists in Prisma schema and migration output.
- `ProjectRuntimeSecretBoundary` now exists in Prisma schema and migration output.
- The owner can now open `/owner/runtimes` and:
  - define runtime config scope
  - define execution mode
  - define provider policy mode and provider allowlist
  - define budget guardrails and model-policy notes
  - view secret-boundary metadata status without exposing raw secrets
  - view provider compatibility against the current runtime policy
- The internal sandbox runtime now seeds a default config policy and secret-boundary metadata when it is registered.
- Secret boundaries remain metadata-only:
  - no raw secret values are stored in Eden
  - no secret manager is implemented
  - secret visibility is limited to labels, policy references, and configured/missing status

## Current Execution Governance Layer

- `ProjectRuntimeProviderApproval` now exists in Prisma schema and migration output.
- `ProjectRuntimeAgentRun` now exists in Prisma schema and migration output.
- `ProjectRuntimeSecretBoundary` now carries explicit `statusDetail` and `lastCheckedAt` metadata.
- `ProjectRuntimeTask` now carries:
  - optional provider and model labels
  - requested action type
  - explicit result type, result status, result summary, and result payload
- `/owner/runtimes` now lets the owner:
  - update per-runtime provider approval gates
  - update secret-boundary readiness status without exposing raw secret values
  - inspect recent governed agent-run records
  - create sandbox tasks that optionally record a provider preflight instead of implying live provider execution
- The internal sandbox task runner now:
  - records governed provider preflight compatibility against allowlist, approval, and secret readiness
  - writes first-class `ProjectRuntimeAgentRun` records
  - stores explicit task result capture for plan, QA/review, or provider-preflight outcomes
- These execution-governance records remain honest control-plane data only:
  - no live OpenAI or Anthropic call is made
  - no container or workspace is started
  - no hosted preview or deploy job is triggered

## Current Execution Interface Layer

- `ProjectRuntimeExecutionSession` now exists in Prisma schema and migration output.
- `ProjectRuntimeDispatchRecord` now exists in Prisma schema and migration output.
- `/owner/runtimes` now exposes an owner-visible execution console for:
  - governed dispatch history
  - session-isolated execution role records
  - recent governed run history
- The internal sandbox task runner now records:
  - intended execution role
  - intended adapter path (`tool`, `browser`, or `provider`)
  - explicit dispatch status (`ready`, `blocked`, or `review required`)
  - session-scoped capability sets
  - adapter/detail text explaining what is still scaffolded
- Eden now has OpenClaw-style execution-interface scaffolding without claiming live execution:
  - tool dispatch can be marked ready at the async boundary
  - browser dispatch remains review-gated
  - provider dispatch reuses approval and secret-boundary governance, then stops at preflight/review
- These records remain governance and history only:
  - no live browser automation runs
  - no live tool execution runs
  - no live provider call is made
  - no async worker queue or container worker exists yet

## Current Owner Control-Agent Scaffold

- `eden-system/specs/OWNER_CONTROL_CONSTITUTION.md` now defines the first owner-aligned constitutional directive layer.
- The owner runtime page now shows a control-agent scaffold panel that loads:
  - Eden master spec
  - project isolation model
  - AI orchestration model
  - current state
  - task queue
  - changelog
  - owner constitution
- Approved provider scaffolds now exist for:
  - OpenAI
  - Anthropic
- Current provider adapters are scaffold-only:
  - no live outbound model calls
  - no autonomous runtime execution
  - no provider execution without future policy, secret, and adapter implementation

## Active Surface Honesty Audit

- Active owner/runtime surfaces are now more explicit about current reality:
  - `/owner/runtimes` presents runtime, task, lifecycle, launch, deployment-history, config, and self-work controls as control-plane records
  - the owner dashboard now uses overlay/seeded language instead of presenting older hybrid paths as production-real
  - active consumer pricing fallbacks now say pricing is not finalized or pending instead of calling the visible value a placeholder or mock rate
- Public-facing Leaves terminology is now consistent across the active homepage, consumer wallet, consumer service flows, and owner dashboard surfaces.
- The legacy `ui/entry/eden-entry-panel.tsx` still contains older mock-session onboarding language, but it is not the live homepage surface. The active homepage uses `ui/entry/eden-public-auth-panel.tsx`.
- Remaining hybrid/mock-first routes still exist and are not hidden:
  - `/api/mock-*` routes
  - mock-session compatibility helpers
  - owner/business/consumer overlay paths that still feed older pages
- Current rule for active surfaces:
  - if a feature is only metadata or overlay-backed, the active UI should label it that way instead of implying real infrastructure exists

## Current Eden Self-Work Loop

- Canonical queue file now exists at `eden-system/state/EDEN_SELF_WORK_QUEUE.json`.
- Canonical post-deploy timeline now exists at `eden-system/state/EDEN_POST_DEPLOY_TIMELINE.md`.
- `/owner/runtimes` now shows an owner-only Eden self-work panel that:
  - reads canonical owner-control inputs
  - shows readiness and review-required mode
  - lists approved Eden-core self-work items
  - queues the next approved item into the real internal sandbox task runner
- The self-work loop is intentionally narrow:
  - scope is Eden-core work only
  - queue state is file-backed and owner-approved
  - execution records are stored in real `ProjectRuntimeTask` rows
  - the loop stops for owner review when the queue requires it
- The self-work loop does not:
  - deploy Eden
  - bypass runtime boundaries
  - execute real containers
  - call live AI providers
  - mutate arbitrary repo areas outside the queued task scope

## Current Build Supervisor

- `eden-system/specs/EDEN_BUILD_SUPERVISOR.md` now defines the owner-gated build-supervisor model.
- `eden-system/state/EDEN_BUILD_SUPERVISOR_STATE.json` now tracks completed supervisor task ids, packet state, and supervisor history.
- `eden-system/state/EDEN_CODEX_EXECUTION_PACKET.json` now stores the latest canonical Codex execution packet.
- `/owner/runtimes` now shows an owner-only build-supervisor panel that can:
  - load the current supervisor state
  - select the next Codex-ready Eden self-work task
  - prepare a structured Codex packet
  - ingest a completed task result
  - refresh managed summary sections in the canonical state/log/action files
- The supervisor is file-backed and owner-gated:
  - it does not execute Codex directly
  - it does not deploy Eden
  - it does not call live providers
  - it does not bypass human-required actions
- Current supervisor reality:
  - highest-priority approved task remains blocked by manual migration and database work
  - the next Codex-ready implementation task is the first unblocked approved queue item after that human-gated blocker

## What "Eden V1 Complete" Means Now

- Eden v1 is complete when the active control-plane surfaces are honest, persistent, owner-auditable, and scoped correctly.
- This means Eden v1 should have:
  - real runtime, task, lifecycle, audit, launch-intent, deployment-history, config-policy, secret-boundary, provider-approval, and agent-run records
  - real execution-session and dispatch-boundary records for owner-governed sandbox work
  - an owner-only internal sandbox runtime and task workflow
  - an owner-approved Eden self-work queue and review loop
  - no active UI that presents mock or metadata-only behavior as real infrastructure
- This does not mean Eden v1 already has:
  - container orchestration
  - real hosted preview boot
  - external-domain activation
  - unrestricted autonomous self-modification
  - live provider execution without policy and secret gates

## Migration Chain Repair Status

- Baseline migration created:
  - `prisma/migrations/20260311120000_pre_runtime_baseline/migration.sql`
- Runtime migration retained unchanged:
  - `prisma/migrations/20260311143000_project_runtime_control_plane/migration.sql`
- Sandbox task runner migration created:
  - `prisma/migrations/20260311190000_internal_sandbox_task_runner_v1/migration.sql`
- Runtime lifecycle audit migration created:
  - `prisma/migrations/20260311213000_owner_runtime_lifecycle_audit_v1/migration.sql`
- Launch-intent and deployment-history migration created:
  - `prisma/migrations/20260311233000_runtime_launch_intent_deployment_history_v1/migration.sql`
- Runtime config and secret-boundary migration created:
  - `prisma/migrations/20260311235500_runtime_config_secret_boundary_provider_scaffold_v1/migration.sql`
- Execution-governance migration created:
  - `prisma/migrations/20260311235930_provider_approval_secret_status_agent_run_v1/migration.sql`
- Execution-interface migration created:
  - `prisma/migrations/20260311235959_openclaw_execution_interface_scaffolding_v1/migration.sql`
- The baseline covers the pre-runtime schema only and excludes:
  - `ProjectRuntime`
  - `ProjectRuntimeDomainLink`
- The task runner migration remains additive and depends on the runtime migration:
  - `ProjectRuntimeTask`
  - `ProjectRuntimeTaskType`
  - `ProjectRuntimeTaskStatus`
- The lifecycle audit migration remains additive and depends on the runtime migration:
  - `ProjectRuntimeAuditLog`
- The launch-intent and deployment-history migration remains additive and depends on the runtime migration:
  - `ProjectRuntimeLaunchIntent`
  - `ProjectRuntimeDeploymentRecord`
- The config and secret-boundary migration remains additive and depends on the runtime migration:
  - `ProjectRuntimeConfigPolicy`
  - `ProjectRuntimeSecretBoundary`
- Verified by Prisma diff that the live database matches the pre-runtime schema exactly:
  - `No difference detected.`
- Result:
  - the migration chain now has a valid predecessor on disk for `ProjectBlueprint`
- the remaining work is manual migration-history reconciliation plus applying the runtime, task runner, lifecycle audit, launch/deployment-history, config/secret-boundary, execution-governance, and execution-interface migrations to the live database

## Next Recommended Implementation Target

Use the new build supervisor to separate human-gated operational work from Codex-ready implementation work.

Build next:

1. owner still needs to run the manual migration reconciliation and deploy sequence on the active database
2. after that, verify `/owner/runtimes` can persist the runtime registry, lifecycle audit, launch intent, deployment history, config policy, provider approvals, secret readiness updates, agent runs, sandbox result capture, self-work queue pulls, and build-supervisor packet flow against the live database
3. the next Codex-ready implementation target is `sandbox_task_lifecycle_audit_logging`
4. after that, add immutable sandbox task lifecycle audit records so the self-work and supervisor layers can point to concrete queue, dispatch-preparation, completion, and failure evidence

## Build Supervisor Digest

<!-- EDEN_BUILD_SUPERVISOR:START -->
- Supervisor status: Packet needed.
- Status detail: The next Codex-ready task is "Add sandbox task lifecycle audit logging", but the packet still needs to be prepared.
- Next Codex-ready task: sandbox_task_lifecycle_audit_logging - Add sandbox task lifecycle audit logging.
- Packet state: not_prepared.
- Last completed supervised task: None recorded yet.
<!-- EDEN_BUILD_SUPERVISOR:END -->
