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
- `modules/core/session/authjs-runtime.ts`
  - Auth.js env seam for optional JWT-token resolution
- `modules/core/session/authjs-config.ts`
  - Auth.js config scaffold with a gated development credentials provider and JWT callbacks that preserve provider and provider-subject claims
- `modules/core/session/authjs-provider-adapter.ts`
  - first real Auth.js-based provider adapter, resolving Auth.js JWT claims through persisted provider-account mappings before falling back to compatibility lookup
- `app/api/auth/[...nextauth]/route.ts`
  - minimal Auth.js route handler scaffold wired to the shared Auth.js config
- `modules/core/session/prisma-cookie-auth-provider-adapter.ts`
  - first auth provider adapter, resolving persisted provider-account mappings before falling back to compatibility lookups
- `modules/core/session/prisma-auth-identity-adapter.ts`
  - first real identity adapter, reading persisted users and `BusinessMember` relationships from Prisma

Current safety notes:

- UI pages and guards still consume the same session shape they already used
- mock fallback remains authoritative if no persisted auth identity is available
- the persistent resolver now attempts an Auth.js JWT-backed provider adapter first, then falls back to the current Eden development cookie adapter
- a development-only Auth.js credentials provider can sign into existing persisted Eden users by username and persist `AuthProviderAccount` mappings at sign-in
- the mock session switcher still works and now seeds development-only provider-style claims for adapter testing
- persisted provider-account mappings can now be stored in Prisma through the `AuthProviderAccount` model
- persisted auth memberships now come from Prisma-backed `BusinessMember` relationships, with owned businesses added as owner claims when needed
- older local auth cookies that still store a raw user id are accepted temporarily through a compatibility parser inside the provider adapter

Set `EDEN_AUTH_SESSION_MODE="hybrid"` to exercise the new server-side resolver seam without removing mock fallback.
Set `EDEN_ENABLE_AUTHJS_PROVIDER_ADAPTER="true"` together with `NEXTAUTH_SECRET` to let the boundary inspect Auth.js JWT session cookies before the current Eden compatibility cookie path.
Set `EDEN_ENABLE_AUTHJS_CREDENTIALS_PROVIDER="true"` to expose the minimal development credentials provider. It resolves existing persisted Prisma users by username only and is intended for local integration testing, not production auth.
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
- development provider-account mappings for canonical users
- businesses
- owner business memberships
- services
- pipeline records used for release visibility and marketplace testing

The canonical sync script now imports the shared Prisma runtime client directly, so local `.env` loading and PostgreSQL adapter setup follow the same path used by the running app.

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

## Credits Top-Up Payment Slice

The consumer wallet now has a first real payment-backed top-up seam layered onto the existing mocked credits architecture.

What exists now:

- `modules/core/payments/payment-runtime.ts`
  - shared mode and offer runtime for credits top-ups
- `modules/core/payments/stripe-client.ts`
  - server-only Stripe client singleton
- `modules/core/payments/credits-topup-payment-service.ts`
  - persistent top-up payment service that maps settled Stripe sessions into the existing wallet transaction shape
- `modules/core/services/payment-inspection-service.ts`
  - owner-facing payment inspection summary and recent top-up reconciliation feed
- `modules/core/services/payout-accounting-service.ts`
  - adjusted builder payout/accounting summaries built from priced usage analytics plus persistent payout settlements
- `modules/core/services/payout-settlement-service.ts`
  - persistent payout settlement history loading plus internal settlement recording
- `modules/core/repos/credits-topup-payment-repo.ts`
  - payment-ledger repository contract
- `modules/core/repos/prisma-credits-topup-payment-repo.ts`
  - Prisma-backed persistent payment/top-up record implementation
- `modules/core/repos/payout-settlement-repo.ts`
  - payout settlement repository contract
- `modules/core/repos/prisma-payout-settlement-repo.ts`
  - Prisma-backed payout settlement/history implementation
- `modules/core/payments/stripe-topup-service.ts`
  - package-aware Checkout-session creation plus verified Stripe webhook handling for top-up settlement
- `modules/core/services/payment-event-log-service.ts`
  - best-effort persistent payment lifecycle and webhook event logging
- `modules/core/repos/payment-event-log-repo.ts`
  - payment lifecycle event log repository contract
- `modules/core/repos/prisma-payment-event-log-repo.ts`
  - Prisma-backed payment/webhook event log implementation
- `modules/core/credits/server.ts`
  - server wallet-transaction loader that merges cookie-backed mock transactions with settled persistent top-up records
- `app/api/credits/top-up/checkout/route.ts`
  - creates a one-time Stripe Checkout session for the selected Eden Credits package
- `app/api/credits/top-up/confirm/route.ts`
  - non-authoritative browser return confirmation that reads persistent settlement status
- `app/api/stripe/webhook/route.ts`
  - verified Stripe webhook endpoint that authoritatively settles successful top-ups
- `app/(owner)/owner/payments/[paymentId]/page.tsx`
  - owner-facing payment drill-down route with a compact payment summary strip, related user context, lifecycle events, and settlement audit visibility
- `app/(owner)/owner/users/[id]/page.tsx`
  - owner user inspection now includes a compact payment summary strip plus linked persistent top-up history rows that drill back into the payment detail route
- `ui/owner/components/owner-reconciliation-filters.tsx`
  - shared lightweight filter tabs with count badges used across owner money-ops surfaces

Current top-up mode seam:

- `mock_only`
- `hybrid`
- `payment_only`

Current safety notes:

- mock wallet behavior remains available in `mock_only` and `hybrid`
- Checkout creation now persists a pending payment record in Prisma
- the Stripe webhook is the authoritative settlement path and maps settled payments back into Eden's existing wallet transaction architecture
- checkout creation, webhook receipt, settlement, skipped duplicate settlement, and settlement failures now write best-effort persistent payment event logs for owner inspection
- the browser return confirmation UX is preserved, but it now reads settlement status instead of mutating wallet cookies directly
- consumer wallet top-up surfaces now share clearer package selection states plus structured cancel, processing, and settlement messaging without changing the underlying payment flow
- consumer wallet history now emphasizes the latest money movement, keeps top-ups vs service charges visually grouped, and uses consistent related-service links across `/consumer` and service detail
- settled top-ups are merged into server-side wallet reads, so existing wallet history and receipt surfaces can stay unchanged
- owner control-room payment visibility now reads the same persistent top-up records for reconciliation across pending, settled, failed, and canceled states
- owner reconciliation surfaces now include lightweight status filters and compact summary strips so payment and payout inspection stay aligned without introducing a new data path
- this slice still does not add subscriptions or builder payouts yet

## Builder Payout Accounting Slice

The business and owner layers now expose a mock payout/accounting foundation on top of the existing pricing-aware `ServiceUsage` analytics.

What exists now:

- builder earnings accrual from priced usage
- persistent payout settlement history per business
- adjusted unpaid earnings visibility after settled payout records
- owner payout detail now includes a compact summary strip above the full settlement history and payout breakdown
- owner payout reconciliation surfaces now include lightweight status filters for settlement history without changing the underlying accounting service boundary
- payout-ready balance using the current internal reserve holdback
- Eden fee-share visibility beside builder liability
- top earning business summaries in the owner control room
- owner-triggered internal payout settlement recording through `app/api/mock-payout-settlements/route.ts`
- owner business-level payout reconciliation route at `app/(owner)/owner/payouts/[businessId]/page.tsx`

Current safety notes:

- payout accounting remains derived from the current usage and pricing data
- persistent payout settlement records now reduce paid-out, unpaid, and payout-ready balances
- actual payout rails are still not implemented; the owner settlement action is internal-only and only records payout history
- there is still no Stripe Connect or external builder payout execution in this slice

Required env for the Stripe-backed path:

- `EDEN_CREDITS_TOPUP_MODE`
- `NEXT_PUBLIC_EDEN_CREDITS_TOPUP_MODE`
- `EDEN_STRIPE_TOPUP_CURRENCY`
- `NEXT_PUBLIC_EDEN_STRIPE_TOPUP_CURRENCY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Top-up package note:

- the current top-up package catalog is defined in `modules/core/payments/payment-runtime.ts`
- the initial package set is 250, 1000, and 2500 credits
- both mock top-ups and Stripe Checkout now resolve through the same package ids

Local Stripe verification note:

- point Stripe webhooks at `/api/stripe/webhook`
- for local development, use a Stripe CLI forwarder that provides the `whsec_...` signing secret for `STRIPE_WEBHOOK_SECRET`
