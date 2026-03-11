# Task Queue

## Chapter 01 - MVP Foundation

### Now

- [x] Audit repo structure, routes, auth, Prisma, business/project paths, and current health.
- [x] Add canonical internal build-memory structure under `eden-system/`.
- [x] Replace default README boilerplate with an accurate repo overview.
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
- [ ] Run `prisma migrate resolve --applied 20260311120000_pre_runtime_baseline` on the active database.
- [ ] Run `prisma migrate deploy` so `20260311143000_project_runtime_control_plane` creates the runtime tables.
- [ ] Execute the owner-only sandbox initializer against the migrated database and confirm the registry loads persistent data.

### Soon

- [ ] Add owner actions to update runtime status, status detail, and last health check without touching project blueprint status.
- [ ] Add runtime launch/read actions that operate on runtime metadata instead of direct project blueprint state.
- [ ] Add domain/link metadata for external domains and Eden-managed hosted URLs.
- [ ] Add project secret/config storage boundaries outside general business metadata.
- [ ] Add audit logging for runtime creation, status transitions, and visibility changes.
- [ ] Add a runtime-aware filter or drill-down from the owner control room into `/owner/runtimes`.

### Later

- [ ] Introduce isolated workers or containers for project execution.
- [ ] Introduce runtime artifact storage and deployment history.
- [ ] Support multi-project businesses with multiple environments and domain mappings.

## Chapter 03 - AI Orchestration

### Now

- [ ] Define scoped agent roles that operate on project runtime context instead of Eden core assumptions.
- [ ] Require every future Codex task to update `CURRENT_STATE.md`, `TASK_QUEUE.md`, `CHANGELOG_AGENT.md`, and `HUMAN_ACTIONS_REQUIRED.md`.

### Soon

- [ ] Add planner/router, worker, QA, and ledger agent boundaries in implementation.
- [ ] Add persistent execution logs and state checkpoints for agent work units.

### Later

- [ ] Add asynchronous orchestration, retries, budgets, and approval gates for agent systems.
