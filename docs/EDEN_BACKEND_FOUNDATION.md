# Eden Backend Foundation

This pass adds the first real backend foundation files without changing the current mocked UI behavior.

## Added

- `prisma/schema.prisma`
  - initial PostgreSQL schema for `User`, `Business`, `BusinessMember`, `Service`, `PipelineRecord`, and `PipelineEvent`
- `prisma.config.ts`
  - Prisma 7 datasource configuration using `DATABASE_URL`
- `.env.example`
  - placeholder `DATABASE_URL` for local PostgreSQL configuration
- `modules/core/repos/`
  - repository contracts, a Prisma client singleton, and builder-loop write repositories
- `modules/core/services/`
  - service-layer stubs that future database migrations can target
- `modules/core/services/builder-loop-write-service.ts`
  - hybrid write scaffold for business creation, service draft creation, pipeline record upserts, and pipeline event appends
- `modules/core/repos/builder-loop-write-repo.ts`
  - persistent write interface for the first builder-to-marketplace slice
- `modules/core/repos/prisma-builder-loop-write-repo.ts`
  - first Prisma-backed implementation of the builder-loop write contract
- `package.json` Prisma scripts
  - `prisma:format`
  - `prisma:generate`
  - `prisma:validate`

## Intent

The current mocked platform remains the active source of truth. These new files exist to establish:

- a real database schema boundary
- stable repository contracts
- stable service-layer entry points

This lets future migration work replace mock reads and writes incrementally instead of forcing a UI rewrite.

## Builder Write Slice

The current mock API routes still own cookie updates and remain the active write path.

They now call a shared hybrid write service first, which means the next migration step can inject a real repository behind the same command boundary for:

- create business
- create service draft
- upsert pipeline record
- append pipeline event

The default mode remains `mock_only`, so current UI behavior is unchanged.

Current mode seam:

- `mock_only`
- `dual_write`
- future `real_only`

The current routes are unchanged. The hybrid write service now auto-resolves the Prisma-backed repo only when `EDEN_BUILDER_LOOP_WRITE_MODE` requests persistence, and otherwise stays in pure mock mode.

Current safety notes:

- dual-write upserts a shadow owner `User` record from the shared mock dataset so the builder loop can persist businesses without changing the auth/session system
- business source metadata and service `projectId` are still mocked at the service boundary and need schema follow-up before full cutover.
- in `dual_write`, persistent write failures are warned and swallowed so cookie-backed mock behavior stays unchanged
- set `EDEN_LOG_DUAL_WRITE="true"` to log successful dual-write operations during migration testing

## Builder Read Slice

The synchronous mock read helpers still exist and remain the default path used across the app.

An async read layer now exists behind the same service boundary for the core builder-to-marketplace loop:

- `getBusinessById`
- `getServiceById`
- `listPublishedServices`
- `listPublishedBusinesses`
- `buildDiscoverySnapshot`

Current read-mode seam:

- `mock_only`
- `hybrid`
- future `real_only`

`EDEN_BUILDER_LOOP_READ_MODE="hybrid"` enables Prisma-backed reads for server-side marketplace and detail-route entry points while preserving:

- local created-business and workspace-service overlays first
- mock catalog fallback if the database is empty or unavailable
- unchanged UI components and route behavior

Set `EDEN_LOG_HYBRID_READS="true"` to log successful persistent read operations during migration testing.

## Auth Session Boundary

The current mock session and route-guard behavior remain active, but the server-side session boundary now has a first migration seam for future real auth.

Current auth-session mode seam:

- `mock_only`
- `hybrid`
- future `real_only`

What exists now:

- `modules/core/session/server.ts`
  - central server session resolver and access guard boundary
- `modules/core/session/auth-runtime.ts`
  - auth mode, persistent cookie name, and debug logging seam
- `modules/core/session/persistent-session-server.ts`
  - server-side persistent session resolver that chains a provider adapter into the Prisma identity adapter and maps the result into the current session shape
- `modules/core/session/auth-provider-adapter.ts`
  - provider-session cookie contract plus parser/serializer for provider-style claims
- `modules/core/session/prisma-cookie-auth-provider-adapter.ts`
  - first auth provider adapter, mapping provider-style session claims to persisted users before the Prisma identity adapter runs
- `modules/core/session/prisma-auth-identity-adapter.ts`
  - first real identity adapter, reading persisted users and `BusinessMember` relationships from Prisma

Current safety notes:

- UI pages and guards still consume the same session shape they already used
- mock fallback remains authoritative if no persisted auth identity is available
- the mock session switcher still works and now seeds development-only provider-style claims for adapter testing
- persisted auth memberships now come from Prisma-backed `BusinessMember` relationships, with owned businesses added as owner claims when needed
- older local auth cookies that still store a raw user id are accepted temporarily through a compatibility parser inside the provider adapter

Set `EDEN_AUTH_SESSION_MODE="hybrid"` to exercise the new server-side resolver seam without removing mock fallback.
Set `EDEN_LOG_AUTH_SESSION_RESOLUTION="true"` to log whether server sessions resolved through the persistent compatibility path or fell back to mock cookies.
Set `EDEN_SHOW_AUTH_SESSION_DIAGNOSTICS="true"` to render a development-only shell panel showing the resolved session source, resolver, role, memberships, and whether owned-business fallback claims were used.

## Canonical Marketplace Sync

For hybrid Prisma read testing, a development-only sync script can populate PostgreSQL with the current canonical marketplace records from the shared mock dataset.

Recommended local flow:

1. `npx prisma db push`
2. `npm run db:sync:canonical-marketplace`

Useful option:

- `npm run db:sync:canonical-marketplace -- --dry-run`

The sync is idempotent and currently upserts:

- users needed for business ownership relationships
- businesses
- owner business memberships
- services
- pipeline records used for release visibility and marketplace testing

## Hybrid Read Divergence Verification

For development-only verification against intentionally diverged PostgreSQL records, use:

1. `npm run db:sync:canonical-marketplace`
2. `npm run db:diverge:hybrid-read`
3. `npm run db:verify:hybrid-read`

Useful option:

- `npm run db:diverge:hybrid-read -- --dry-run`

This flow keeps the mock dataset unchanged and only mutates PostgreSQL so the existing hybrid read path can be checked safely.

Reset the database view back to canonical values by re-running:

- `npm run db:sync:canonical-marketplace`

Reference:

- `docs/EDEN_HYBRID_READ_VERIFICATION.md`
