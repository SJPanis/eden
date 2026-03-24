# Task Queue

## Chapter 01 - MVP Foundation

### Now

- [x] Audit repo structure, routes, auth, Prisma, business/project paths, and current health.
- [x] Add canonical internal build-memory structure under `eden-system/`.
- [x] Replace default README boilerplate with an accurate repo overview.
- [x] Audit active owner, runtime, and consumer surfaces for misleading mock/demo wording in visible product flows.
- [x] Relabel active owner and consumer surfaces so metadata-only and overlay-backed behavior stays honest.
- [ ] Mark `eden-system/` as the canonical planning/state location and treat `eden-dev/` as legacy planning context.
- [ ] Replace deprecated Next.js `middleware.ts` usage with the current `proxy` convention and re-verify route protection.
- [ ] Add a lightweight automated smoke check for public, consumer, business, and owner route guards.
- [ ] Resolve persistent database permission issues so ledger verification is real, not warning-skipped.

### Soon

- [ ] Remove or clearly quarantine remaining legacy Eden AI helper paths once the newer Ask Eden tool-routed layer fully covers required behavior.
- [ ] Document the hybrid mock/persistent migration boundary per domain so future work does not accidentally re-mock persistent paths.
- [ ] Add a canonical environment/setup document covering auth, database, Stripe, and owner bootstrap requirements.

### Later

- [ ] Remove mock-first compatibility layers after persistent parity is proven.
- [ ] Add release checkpoint automation tied to chapter/task completion.

## Chapter 02 - Project Isolation

### Now

- [x] Add a new runtime metadata model separate from `ProjectBlueprint`.
- [x] Model runtime type values for internal sandbox, internal preview, Eden-managed instance, and linked external domain.
- [x] Model environment targets such as `development`, `staging`, and `production`.
- [x] Add an owner-only access policy for internal Eden sandbox runtimes.
- [x] Distinguish project blueprint status from runtime/deployment status in read models and owner UI.
- [x] Define the minimum runtime record needed to launch an owner-only private "Eden inside Eden" sandbox.
- [x] Add an owner-only runtime registry surface at `/owner/runtimes`.
- [x] Generate a Prisma migration for the runtime control-plane schema.
- [x] Create a baseline pre-runtime Prisma migration earlier than the runtime migration.
- [x] Verify the live database matches the pre-runtime schema before baselining.
- [x] Add a sandbox runtime task model tied to `ProjectRuntime`.
- [x] Add owner-only sandbox task list/create APIs scoped to the Eden Internal Sandbox Runtime.
- [x] Add a minimal owner UI for sandbox task creation, status inspection, and stored results inside the runtime registry surface.
- [x] Add a deterministic Lead/Planner plus Worker execution record loop for sandbox tasks.
- [x] Generate a Prisma migration for the internal sandbox task runner schema.
- [x] Add owner actions to update runtime status, status detail, and last health check without touching project blueprint status.
- [x] Add runtime lifecycle audit logging for status changes, status detail changes, and health check updates.
- [x] Add recent runtime audit visibility to `/owner/runtimes`.
- [x] Generate a Prisma migration for runtime lifecycle audit logging.
- [x] Add structured runtime launch-intent metadata separate from lifecycle status fields.
- [x] Add deployment-history metadata records for runtime control-plane events.
- [x] Add owner-only launch-intent update APIs and UI inside `/owner/runtimes`.
- [x] Add owner-only deployment-history visibility and manual record creation inside `/owner/runtimes`.
- [x] Generate a Prisma migration for runtime launch-intent and deployment-history metadata.
- [x] Fix the shared homepage currency wording so public entry uses "Leaves" instead of the broken "Leaf's" label.
- [x] Add runtime config-policy metadata for scope, execution mode, provider policy, and budget guardrails.
- [x] Add runtime secret-boundary metadata without storing raw secrets.
- [x] Add provider adapter scaffolding for approved Eden AI providers.
- [x] Add an owner constitution/control-agent scaffold tied to canonical Eden memory files.
- [x] Add owner-only config/provider/secret-boundary visibility inside `/owner/runtimes`.
- [x] Generate a Prisma migration for runtime config and secret-boundary metadata.
- [x] Add owner-managed secret-boundary status updates so missing vs configured vs pending vs reserved can be maintained without exposing raw values.
- [x] Add a provider approval gate that works with runtime config policy and future adapter execution.
- [x] Add first-class agent run execution records for sandbox/provider governance attempts.
- [x] Extend sandbox task records with explicit result capture for preflight, plan, and review outcomes.
- [x] Add owner-only provider approval and secret readiness update APIs and UI inside `/owner/runtimes`.
- [x] Generate a Prisma migration for provider approval gates, secret readiness detail, agent runs, and sandbox result capture.
- [ ] Run `prisma migrate resolve --applied 20260311120000_pre_runtime_baseline` on the active database.
- [ ] Run `prisma migrate deploy` so `20260311143000_project_runtime_control_plane`, `20260311190000_internal_sandbox_task_runner_v1`, `20260311213000_owner_runtime_lifecycle_audit_v1`, `20260311233000_runtime_launch_intent_deployment_history_v1`, `20260311235500_runtime_config_secret_boundary_provider_scaffold_v1`, `20260311235930_provider_approval_secret_status_agent_run_v1`, `20260311235959_openclaw_execution_interface_scaffolding_v1`, `20260312003000_live_provider_execution_path_v1`, and `20260323010000_sandbox_task_lifecycle_audit_v1` create the runtime, task, audit, launch-intent, deployment-history, config-policy, secret-boundary, provider-approval, agent-run, execution-session, dispatch, honest live-provider labeling, and task lifecycle audit log updates.
- [ ] Execute the owner-only sandbox initializer against the migrated database and confirm the registry loads persistent data.
- [ ] Create a sandbox task against the migrated database and confirm planner/worker outputs persist.
- [ ] Create a sandbox task with provider preflight metadata against the migrated database and confirm agent-run and explicit result-capture records persist.
- [ ] Save a runtime lifecycle update against the migrated database and confirm audit entries persist.
- [ ] Save a runtime launch-intent update against the migrated database and confirm the generated deployment-history record persists.
- [ ] Add a manual deployment-history entry against the migrated database and confirm it persists.
- [ ] Save a runtime config-policy update against the migrated database and confirm secret-boundary metadata is created or refreshed.
- [ ] Save a provider approval update against the migrated database and confirm compatibility plus audit entries persist.
- [ ] Save a secret-boundary readiness update against the migrated database and confirm status detail plus last-checked metadata persist.
- [ ] Trigger one owner-only live OpenAI sandbox task execution against the migrated database and confirm the agent run, dispatch record, and stored provider result persist honestly.
- [ ] Create a sandbox task with tool-adapter dispatch selected against the migrated database and confirm `ProjectRuntimeExecutionSession` plus `ProjectRuntimeDispatchRecord` rows persist.
- [ ] Create a sandbox task with browser-adapter dispatch selected against the migrated database and confirm the dispatch record stops in `review required` state without implying live browser automation.

### Soon

- [x] Add an explicit async task dispatch boundary so sandbox tasks can graduate from synchronous metadata-only execution when real workers exist.
- [ ] Add runtime launch/read actions that operate on runtime metadata instead of direct project blueprint state.
- [ ] Add domain/link metadata for external domains and Eden-managed hosted URLs.
- [ ] Add project secret/config storage boundaries outside general business metadata.
- [ ] Add launch-intent change auditing if launch metadata needs its own immutable audit stream beyond deployment-history records.
- [ ] Expand runtime audit logging to cover runtime creation, visibility/access policy changes, target changes, and launch-related events.
- [ ] Add a runtime-aware filter or drill-down from the owner control room into `/owner/runtimes`.

### Later

- [ ] Introduce isolated workers or containers for project execution.
- [ ] Introduce runtime artifact storage and real deployment execution history sourced from actual jobs.
- [ ] Support multi-project businesses with multiple environments and domain mappings.

## Chapter 03 - AI Orchestration

### Now

- [x] Add a deterministic owner-only Lead/Planner and Worker execution record loop inside the internal sandbox runtime.
- [x] Add an owner-aligned constitution scaffold for future Eden supervisory control agents.
- [x] Add a control-agent input loader for Eden specs, state, queue, and changelog.
- [x] Add scaffolded approved-provider metadata for future runtime-scoped agent execution.
- [x] Create a canonical owner-approved Eden self-work queue for post-deploy Eden-core work.
- [x] Add a canonical post-deploy timeline file readable by future Eden control agents.
- [x] Add an owner-only self-work panel inside `/owner/runtimes`.
- [x] Let the internal sandbox queue the next approved Eden self-work item into real `ProjectRuntimeTask` records.
- [x] Add an owner-gated Eden Build Supervisor layer for next-task selection and Codex packet generation.
- [x] Add a canonical Codex execution packet file and build-supervisor state file under `eden-system/state/`.
- [x] Add post-execution ingestion support that can refresh managed sections in `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG_AGENT.md`, and `HUMAN_ACTIONS_REQUIRED.md`.
- [x] Add an owner-only build-supervisor panel inside `/owner/runtimes`.
- [x] Define scoped execution roles that operate on project runtime context instead of Eden core assumptions.
- [x] Add owner-visible execution console/history for governed dispatch, sessions, and recent run state.
- [x] Add browser/tool/provider execution adapter scaffolding for governed dispatch preflight.
- [x] Wire one guarded live OpenAI provider execution path for owner-only internal sandbox tasks.
- [x] Route the live provider path through existing policy, secret-boundary, dispatch, session, and agent-run governance checks.
- [x] Add an owner-only execute action plus stored live result capture for eligible sandbox tasks.
- [x] Generate a Prisma migration for honest live-provider adapter-mode and result-type labeling.
- [x] Add sandbox task lifecycle audit logging for creation, completion, failure, and dispatch preparation.
- [x] Add a clear autonomy boundary model for PRIVATE_DEV vs PUBLIC_PROD scope.
- [x] Add owner-visible autonomy-mode status panel to `/owner/runtimes`.
- [x] Add safe DB-action policy scaffolding with per-scope allowed/blocked/review-required classification.
- [x] Tighten the self-work loop to queue + execute via governed OpenAI path when policy allows, stop cleanly for review.
- [x] Require every future Codex task to update `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG_AGENT.md`, and `HUMAN_ACTIONS_REQUIRED.md`.
- [ ] Add explicit owner review-acknowledgement step before the next build-supervisor packet is considered actionable.
- [ ] Add planner/router, worker, QA, and ledger agent boundaries in implementation.

### Soon

- [ ] Add planner/router, worker, QA, and ledger agent boundaries in implementation.
- [ ] Connect the owner constitution scaffold to a real Eden control-agent task flow without granting broad unsafe execution.
- [ ] Add explicit review-required, blocked, and waiting transitions for the Eden self-work loop beyond the file-backed queue state.
- [ ] Add persistent execution logs and state checkpoints for agent work units.

### Later

- [ ] Add asynchronous orchestration, retries, budgets, and approval gates for agent systems.

## Build Supervisor Digest

<!-- EDEN_BUILD_SUPERVISOR:START -->
- Review mode: Owner review required after each self-work task.
- Recently completed: sandbox_task_lifecycle_audit_logging, autonomy_boundary_model, db_action_policy_scaffold, self_work_loop_tightening (2026-03-23).
- Current recommended task: owner_review_acknowledgement_step or planner_router_worker_boundary_wiring.
- Highest blocked approved task: Apply live runtime control-plane migrations (now includes 20260323010000_sandbox_task_lifecycle_audit_v1) and verify persistent runtime records.
- Build-supervisor packet ready: no (awaiting owner review).
<!-- EDEN_BUILD_SUPERVISOR:END -->
