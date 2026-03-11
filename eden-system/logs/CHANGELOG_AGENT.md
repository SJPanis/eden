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
