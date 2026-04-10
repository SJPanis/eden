# PHASE 01 — CODEBASE AUDIT

> Eden v1 (Next.js) state on 2026-04-10, prior to Eden World (Unity client) refactor.
> Source of truth for what exists, what works, and what must be built to satisfy `EDEN_WORLD_SPEC.md` §8 (network protocol) and §9 (data models).
> Scope: `prisma/schema.prisma`, `app/api/**/route.ts`, `lib/**`, `modules/**`, `server.js`.

---

## §0 — Executive summary

Eden v1 is a **Next.js web app** with ~88 API routes, a single large Prisma schema (53 models, ~50 enums), Stripe-backed Leaf top-up, three live Claude-powered services, and a heavily **scaffolded-but-not-live** agent pipeline. It has no WebSocket server, no version endpoint, no world state, and no Unity-facing JWT auth.

**What's production-ready and can be reused by the Unity client as-is:**
- Auth.js + Prisma cookie sessions (email/password + Google).
- Stripe Checkout → webhook → wallet credit pipeline.
- Three flagship services (Market Lens, Spot Splore, Imagine Auto visualize) with real Claude Sonnet calls.
- Leaf spend + 70/15/15 revenue split at `/api/wallet/spend`.
- Service usage tracking in `ServiceUsage` model.
- Health check at `/api/health`.

**What's in-flight and needs disambiguation before Unity integration:**
- **Dual wallet schema.** `User` has `edenBalanceCredits`, `promoBalance`, `realBalance`, `withdrawableBalance` (Int columns), *and* a separate `EdenWallet` model with `leafsBalance`, `lockedLeafs`, etc. Two sources of truth. `/api/wallet/balance` and `/api/health` read the old columns; `eden-economy-service.ts` writes the new `EdenWallet`. This must be reconciled before Unity reads "Leaf balance."
- **Dual agent schemas.** `AgentBuild`/`AgentTask` (used by `/api/agents/orchestrate|execute|status|history`) are the currently-wired agent runtime. `EdenAgent` (used by `Garden`-linked spatial agents) is a separate minimal model. `ProjectRuntimeAgentRun` is a third parallel runtime for owner-internal sandbox. The Eden World spec §9.1 `Agent` model overlaps all three and doesn't match any.
- **Three agent/AI namespaces**: `lib/adam-eve-loop.ts` (in-memory schedulers), `modules/core/agents/*` (build supervisor, execution adapters — marked `preflight_only`/`scaffold_only`), `modules/eden-ai/*` (Ask Eden tool-call router). None of these spawn real background processes; they are request-scoped LLM chains.

**What is entirely missing vs. spec:**
- `GET /api/version` — no version endpoint for Unity auto-update.
- `GET /api/world/state` — no canonical world snapshot.
- `GET /api/avatar/config` + `PUT` — no avatar model.
- `POST /api/auth/login` returning JWT — current auth uses Auth.js cookie session; no JWT issuance for a non-browser client.
- WebSocket / Socket.io server — `server.js` is a plain Next HTTP adapter; no upgrade handler.
- `ClientVersion`, `WorldSession`, `VisualAsset`, `Garden`-positioned avatars, `Agent` (spec shape) — none of these spec §9.1 models exist.
- `/api/governance/*` — no on-chain or off-chain governance routes.

---

## §1 — Prisma models

`prisma/schema.prisma` is 1409 lines. **53 models**, organized into 7 functional groups. Enums omitted below unless they affect spec alignment.

### §1.1 Identity & access

| Model | Purpose | Notes |
|---|---|---|
| `User` | Core identity: username, email, displayName, passwordHash, role, status | Holds 4 legacy balance fields (`edenBalanceCredits`, `promoBalance`, `realBalance`, `withdrawableBalance`) *and* 2 lifetime counters (`lifetimePromoSpent`, `lifetimeRealSpent`). Also owns TOTP fields, Stripe Connect account id, referral code. Has 35+ relation fields — this model is the hub. |
| `AuthProviderAccount` | NextAuth/Auth.js provider link (Google, credentials) | `@@unique([provider, providerSubject])` |
| `EarlyAccessCode` | EDEN-XXXX-XXXX invite codes | `maxUses` / `useCount` gating |
| `WaitlistEntry` | Email waitlist | Unique email |
| `Referral` | Referrer→referred link | `commissionRate` (default 0.01), `totalEarned` |

### §1.2 Wallet / economy (two parallel systems)

**Legacy (on `User`):** `edenBalanceCredits`, `promoBalance`, `realBalance`, `withdrawableBalance`. This is what `/api/wallet/balance`, `/api/wallet/spend`, `/api/user/welcome-grant` read/write and what `/api/health` validates. The 3-bucket model (promo → real → withdrawable).

**New (`EdenWallet` + `EdenTransaction`):**

| Model | Fields |
|---|---|
| `EdenWallet` | `userId` unique, `leafsBalance`, `lockedLeafs`, `totalPurchasedLeafs`, `totalGrantedLeafs`, `totalSpentLeafs`, `contributionScore` |
| `EdenTransaction` | `walletId`, `actorUserId`, `businessId?`, `runtimeId?`, `transactionType` (enum: `LEAFS_TOPUP`, `LEAFS_DEDUCTION`, `LEAFS_GRANT`, `SERVICE_PURCHASE`, `BUILDER_PAYOUT`, `CONTRIBUTION_BONUS`, `PLATFORM_FEE`, `PROVIDER_RESERVE`, `CONTRIBUTION_POOL`, `MANUAL_ADJUSTMENT`), `status`, `cashAmountCents?`, `leafsAmount?`, split buckets `builderEarningsLeafs?` / `platformFeeLeafs?` / `providerReserveLeafs?` / `contributionPoolLeafs?`, `description`, `metadata` |

This split (builder / platform / provider / contribution) is **4-way** at the schema level, not the 3-way (70/15/15) currently implemented in `/api/wallet/spend`. The split actually used in code is 70/15/15 (builder/platform/contribution pool). The enum hints at a future 4-way split including provider reserve.

### §1.3 Payments

| Model | Purpose |
|---|---|
| `CreditsTopUpPayment` | Stripe checkout session record — provider, sessionId, paymentIntent, credits, cents, currency, status (PENDING/SETTLED/FAILED/CANCELED) |
| `PaymentEventLog` | Stripe webhook audit trail |
| `PayoutSettlement` | Business-level payout settlement (not user) |
| `PayoutRecord` | User-level Stripe Connect payout — `leafsAmount`, `cashAmountCents`, `stripeTransferId`, `status` |
| `PlatformRevenue` | Platform-fee audit row — `amountLeafs`, `usdValue`, `sourceService`, `userId`, `swept` flag |
| `ContributionPool` | Contribution-pool bucket row — `amountLeafs`, `sourceService`, `distributed` flag |
| `OwnerLeavesGrant` | Manual owner → user grant with note |
| `InternalLeavesUsage` | Business-internal Leaf burn (hosting, runtime ops) |

### §1.4 Business / marketplace / services

| Model | Purpose |
|---|---|
| `Business` | Workspace unit — owner, members, category, tags, visibility, credit balance, publish readiness |
| `BusinessMember` | RBAC (OWNER/ADMIN/EDITOR/MEMBER) |
| `Service` | Business-scoped service — title, category, pricing (`pricePerUse`), `PipelineStatus` (DRAFT/TESTING/READY/PUBLISHED), `publishedAt` |
| `PipelineRecord` + `PipelineEvent` | State-machine history for a Service going through the build pipeline |
| `ServiceUsage` | Execution log — `serviceId`, `userId?`, `executionKey` unique, `usageType`, `creditsUsed`, `grossCredits`, `platformFeeCredits`, `builderEarningsCredits` |
| `EdenService` | **Separate** slug-based service registry — `slug` unique, `name`, `leafCost`, `pricingModel`, `serviceType` (default "claude"), `systemPrompt`, `inputSchema`, `outputFormat`, `status`, `visibility`, `creatorId`. Has `isActive` + `contributionsEnabled`. |
| `ServiceRelease` | Version history for `EdenService` |
| `ContributionRequest` + `Contribution` | Community contribution intake/review flow attached to `EdenService` |

Note: `Service` (business-scoped) and `EdenService` (slug-based) are **two parallel service catalogs**. Routes use different ones: `/api/business/projects` touches `Service`; `/api/services/list` + `/api/services/[slug]` + `/api/services/execute` query `EdenService`.

### §1.5 Project runtime (owner internal sandbox)

Large subsystem — 11 models, ~600 lines of schema. Governs the owner-internal sandbox where Eden itself can build and preview projects.

| Model | Purpose |
|---|---|
| `ProjectBlueprint` | Project template — status, `hostingBalanceLeaves` |
| `ProjectRuntime` | Deployable instance of a blueprint — `runtimeType` (INTERNAL_SANDBOX / INTERNAL_PREVIEW / EDEN_MANAGED_INSTANCE / EXTERNAL_LINKED_DOMAIN), `environment`, `target`, `accessPolicy`, `visibility`, `status` |
| `ProjectRuntimeDomainLink` | Domain mapping per runtime |
| `ProjectRuntimeLaunchIntent` | Deployment target + mode |
| `ProjectRuntimeConfigPolicy` | Provider allowlist, budgets, owner/internal enforcement |
| `ProjectRuntimeSecretBoundary` | Secret scope + visibility policy |
| `ProjectRuntimeProviderApproval` | Per-provider approval state |
| `ProjectRuntimeTask` | A build/analysis/QA task — `taskType`, `status` (PLANNING/RUNNING/COMPLETED/FAILED), planner/worker payloads, result |
| `ProjectRuntimeAgentRun` | Individual agent step on a task — `requestedActionType`, `runStatus`, result payload |
| `ProjectRuntimeExecutionSession` | Tool/browser/provider execution context |
| `ProjectRuntimeDispatchRecord` | Task → adapter dispatch record |
| `ProjectRuntimeAuditLog` + `ProjectRuntimeTaskAuditLog` + `ProjectRuntimeDeploymentRecord` | Audit trails |
| `ProjectAgent` + `ProjectAgentRun` | Per-blueprint agent definition + run history (parallel to `ProjectRuntimeAgentRun`) |

### §1.6 Current agent runtime (wired to `/api/agents/*`)

| Model | Purpose |
|---|---|
| `AgentBuild` | Top-level build request — `userId`, `request` (prompt), `status` (string, default "pending"), `totalLeafs`, `context` (JSON string) |
| `AgentTask` | One step of an `AgentBuild` — `buildId`, `index`, `type`, `description`, `status`, `result`, `leafCost`, `startedAt`, `completedAt` |

### §1.7 Spatial / garden (minimal, unused by current web app)

| Model | Purpose |
|---|---|
| `Garden` | One per user — `name`, `isPublic`, `leafsEarned`, `level`. No position, no zones. |
| `EdenAgent` | `userId`, `name`, `type`, `animal`, `status` (IDLE/RUNNING/PAUSED/ERROR), `currentTask`, `heartbeatAt`. No position, no owner visibility beyond `userId`. |

**This is the closest existing analogue to the Eden World spec §9.1 `Agent` model, but it lacks: `zoneTarget`, `position`, `progress`, `result`, `leafCost`, `leafReward`, `prTag`, `prUrl`, `spawnedAt/completedAt/terminatedAt`, the full state machine enum, and any link to a task.** Will require either extension or replacement.

### §1.8 Misc

| Model | Purpose |
|---|---|
| `Download` | Desktop-app download log — `platform`, `userAgent`, `ip` |
| `ContributionPeriod` + `ContributionAllocation` + `ContributionRecord` | Long-form community contribution program (code/design/docs improvements, quarterly pool distribution) |

---

## §2 — API routes

**88 route files** under `app/api/**/route.ts`. Organized by functional area below. Status legend:

- **WORKING** — real implementation, hits real service or repo, integrated with a live dependency.
- **STUB** — returns mock data, cookie-backed, or placeholder logic.
- **UNREAD** — file exists but was not opened during this audit; treat as unknown until verified.

### §2.1 Auth / session

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/auth/[...nextauth]` | all | WORKING | Auth.js handler. Credentials + Google. Cookie session only — no JWT issued for non-browser clients. |
| `/api/auth/sign-up` | POST | WORKING | Username/password sign-up. Validates early-access code, wires referral, mints welcome grant (500L referred / 200L code). |
| `/api/auth/join-waitlist` | POST | WORKING | Creates `WaitlistEntry`. 3/hr rate limit. |
| `/api/auth/validate-invite` | POST | WORKING | Read-only check of `EarlyAccessCode`. |
| `/api/auth/totp/setup` | GET/POST | WORKING | Owner-only TOTP enrollment. `otpauth` QR generation. |
| `/api/auth/totp/verify` | POST | WORKING | Verifies TOTP, issues 15-minute command token via `lib/command-tokens.ts`. |
| `/api/auth/totp/status` | GET | UNREAD | Likely returns `totpEnabled`. |

### §2.2 User / profile

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/settings` | PATCH | WORKING | Update displayName / username / password. |
| `/api/user/update-email` | POST | WORKING | Unique-email guarded update. |
| `/api/user/onboarding-complete` | POST | WORKING | Sets `onboardingCompletedAt`. |
| `/api/user/welcome-grant` | POST | WORKING | Idempotent 50-Leaf grant (writes `promoBalance` + `welcomeGranted` flag). |
| `/api/user/contribution-stats` | GET | UNREAD | |
| `/api/referrals/stats` | GET | WORKING | Returns referral code, link, last 50 earnings. |

### §2.3 Wallet, credits, Stripe, payouts

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/wallet/balance` | GET | WORKING | Reads `User.promoBalance`, `realBalance`, `withdrawableBalance`, `edenBalanceCredits` (legacy columns). |
| `/api/wallet/spend` | POST | WORKING | Core Leaf-debit + 70/15/15 split. Writes `User` balances, `EdenService.totalEarned`, `PlatformRevenue`, `ContributionPool`, `Referral.totalEarned`. **Does not touch `EdenWallet` / `EdenTransaction`.** |
| `/api/credits/top-up/checkout` | POST | WORKING | → `createCreditsTopUpCheckoutSession()` → Stripe Checkout URL. |
| `/api/credits/top-up/confirm` | POST | WORKING | Polls Stripe session; credits wallet on success. |
| `/api/stripe/checkout` | POST | WORKING | Alternative entrypoint — hard-coded 275L/$10, 1150L/$35, 3250L/$80 packages. |
| `/api/stripe/webhook` | POST | WORKING | Verifies signature, delegates to `handleStripeTopUpWebhookEvent()`. Credits user via `recordLeafsTopup()` → writes to `EdenWallet` + `EdenTransaction`. |
| `/api/payouts/connect/onboard` | POST | WORKING | Stripe Connect Express onboarding init. Writes `User.stripeConnectAccountId`. |
| `/api/payouts/connect/return` | GET | WORKING | Completion handler, sets `payoutEnabled`. |
| `/api/payouts/history` | GET | WORKING | Lists `PayoutRecord` rows. |
| `/api/payouts/request` | POST | UNREAD | Presumably user-initiated payout request. |
| `/api/topup/*` | — | — | No `/api/topup` routes — handled by `/api/credits/top-up/*` and `/api/stripe/*`. |

**Schema coherence problem.** `/api/stripe/webhook` credits `EdenWallet`, but `/api/wallet/balance` reads legacy `User` columns. A user who tops up will see their `EdenWallet.leafsBalance` rise but their `/api/wallet/balance` response unchanged unless something else syncs them. This is either (a) a bug, (b) an in-flight migration, or (c) evidence that multiple codepaths exist for the same action. Must be resolved for Unity client.

### §2.4 Services marketplace + execution

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/services/list` | GET | WORKING | Lists `EdenService` rows where `status='published'` OR `isActive=true`. |
| `/api/services/[slug]` | GET | WORKING | Single `EdenService` by slug, 503 fallback if table missing. |
| `/api/services/[slug]/run` | POST | UNREAD | |
| `/api/services/execute` | POST | WORKING | Slug-dispatched execution with Leaf charge via cookie transaction. |
| `/api/services/publish` | POST | UNREAD | |
| `/api/services/earnings` | GET | UNREAD | |
| `/api/services/simonos/search` | POST | UNREAD | |
| `/api/innovator/services/create` | POST | UNREAD | |
| `/api/innovator/services/[slug]/releases` | POST | UNREAD | |
| `/api/innovator/services/[slug]/contribution-requests` | GET/POST | UNREAD | |
| `/api/contributions/[id]/submit` | POST | UNREAD | |
| `/api/contributions/[id]/review` | POST | UNREAD | |
| `/api/contributions/earnings` | GET | UNREAD | |
| `/api/embed/[serviceId]/config` | GET | STUB | Returns hardcoded `SERVICE_REGISTRY` object for `imagine-auto` / `market-lens` / `spot-splore`. |
| `/api/embed/[serviceId]/snippet` | GET | UNREAD | |

### §2.5 Core services (Claude-powered)

| Route | Verbs | Status | Backend |
|---|---|---|---|
| `/api/services/market-lens/analyze` | POST | WORKING | Claude Sonnet 4 + `web_search_20250305` tool. Returns full JSON: price history, analyst consensus, catalysts, risks. |
| `/api/services/spot-splore/discover` | POST | WORKING | Claude Sonnet 4 + web search. Returns tracks/artists/places matched to vibe+location. |
| `/api/services/imagine-auto/visualize` | POST | WORKING | Claude generates image prompt → Pollinations.ai renders image URL → returns `{imageUrl, prompt, vehicle}`. |
| `/api/services/imagine-auto/parts` | POST | UNREAD | |
| `/api/services/imagine-auto/purchase` | POST | UNREAD | |
| `/api/claude/imagine-auto` | POST | STUB | Generic 1024-token Claude Haiku prompt/response — no specialized automotive logic. Probably a dev stub predating the `/services/imagine-auto/visualize` route. |

### §2.6 Agents & AI

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/agents/orchestrate` | POST | WORKING | Claude Sonnet breaks user request into 5–8 `AgentTask` rows attached to a new `AgentBuild`. |
| `/api/agents/execute` | POST | WORKING | Runs a single `AgentTask` via Claude Haiku, persists result, marks completed. |
| `/api/agents/status` | GET | WORKING | Progress % + completed/total counts for an `AgentBuild`. |
| `/api/agents/history` | GET | WORKING | Last 20 builds flattened. |
| `/api/agents/spawn` | POST | STUB | Returns mock agent id. |
| `/api/agents/adam` | POST | UNREAD | Hooked by `lib/adam-eve-loop.ts` in-memory scheduler. |
| `/api/agents/architect` | POST | UNREAD | |
| `/api/agents/eve` | POST | UNREAD | |
| `/api/agents/eve/evaluate` | POST | UNREAD | Hooked by `lib/adam-eve-loop.ts`. |
| `/api/agents/loop-status` | GET | UNREAD | In-memory scheduler status. |
| `/api/agents/trigger` | POST | UNREAD | |
| `/api/agents/commit` | POST | UNREAD | |
| `/api/ai/chat` | POST | WORKING | OpenAI GPT-4o-mini. 1 Leaf / 500 tokens. Promo-first spend, records `ServiceUsage`. |
| `/api/eden-ai` | POST | WORKING | `modules/eden-ai/eden-router.ts` → tool-context chain (search services, inspect wallet, search businesses, etc). |
| `/api/eden-guide/chat` | POST | UNREAD | |

### §2.7 Owner / admin / layer2 (internal sandbox control plane)

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/owner/access-codes` | GET/POST/PATCH | WORKING | Create/list/toggle `EarlyAccessCode` rows. |
| `/api/owner/leaves-grants` | POST | WORKING | Manual `OwnerLeavesGrant` with note, updates `User` balance. |
| `/api/owner/project-runtimes` | POST | WORKING | Initialize sandbox runtime via `project-runtime-service.ts`. |
| `/api/owner/project-runtimes/[runtimeId]` | PATCH | WORKING | Runtime lifecycle (status, health check). |
| `/api/owner/project-runtimes/[runtimeId]/config` | PATCH | WORKING | Provider policy, budgets, secret policy. |
| `/api/owner/project-runtimes/[runtimeId]/launch-intent` | PATCH | WORKING | Deployment target + mode. |
| `/api/owner/project-runtimes/[runtimeId]/deployment-history` | GET | UNREAD | |
| `/api/owner/project-runtimes/[runtimeId]/provider-approvals` | PATCH | UNREAD | |
| `/api/owner/project-runtimes/[runtimeId]/secret-boundaries` | PATCH | UNREAD | |
| `/api/owner/project-runtimes/internal-sandbox/build-supervisor` | POST | UNREAD | Ties into `modules/core/agents/eden-build-supervisor.ts`. |
| `/api/owner/project-runtimes/internal-sandbox/tasks` | GET/POST | UNREAD | |
| `/api/owner/project-runtimes/internal-sandbox/tasks/[taskId]/execute` | POST | UNREAD | |
| `/api/owner/project-runtimes/internal-sandbox/autonomy` | GET/PATCH | UNREAD | |
| `/api/owner/project-runtimes/internal-sandbox/self-work` | POST | UNREAD | Ties into `modules/core/agents/eden-self-work-loop.ts`. |
| `/api/layer2/status` | GET | WORKING | Pending `AgentBuild` counts, running build id, last completion. |
| `/api/layer2/pending` | GET | UNREAD | |
| `/api/layer2/submit` | POST | UNREAD | |
| `/api/layer2/approve` | POST | UNREAD | |
| `/api/admin/migrate` | POST | UNREAD | |
| `/api/admin/sweep-revenue` | POST | UNREAD | Presumably processes `PlatformRevenue` rows with `swept=false`. |

### §2.8 Business / workspace

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/business/projects` | POST/PATCH/DELETE | WORKING | Blueprint, agent, test, publish, fund hosting lifecycle via `builder-loop-write-service.ts`. |

### §2.9 Mock / dev-only

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/mock-admin` | POST | STUB | Freeze/unfreeze via cookie-backed `MockAdminState`. |
| `/api/mock-state` | DELETE | STUB | Clears all mock cookies. |
| `/api/mock-session` | POST | STUB | Test fixture session. |
| `/api/mock-services` | POST | WORKING | Actually wired to `builderLoopWriteService` for draft service creation. |
| `/api/mock-pipeline` | POST/DELETE | WORKING | Pipeline state transitions. |
| `/api/mock-business` | POST/DELETE | WORKING (hybrid) | Can create a real `Business` row in `real_only` auth mode. |
| `/api/mock-assistant-history` | POST | STUB | Cookie-backed. |
| `/api/mock-transactions` | POST/DELETE | STUB | Simulated wallet transactions in a cookie — records `ServiceUsage` too. |
| `/api/mock-internal-leaves-usage` | GET | UNREAD | |
| `/api/mock-payout-settlements` | GET | UNREAD | |

### §2.10 Other

| Route | Verbs | Status | Notes |
|---|---|---|---|
| `/api/health` | GET | WORKING | DB ping + legacy wallet columns probe + Stripe env check. |
| `/api/download/[platform]` | GET | WORKING | Redirects to GitHub releases for `windows`/`mac`. Logs `Download` row. |
| `/api/stats/live` | GET | UNREAD | |
| `/api/activity/feed` | GET | UNREAD | |

**Route count:** WORKING ≈ 48 · STUB ≈ 8 · UNREAD ≈ 32. (UNREAD does not mean missing — the files exist; they just weren't opened in this audit pass and should be verified before being counted on by the Unity client.)

---

## §3 — Services and lib modules

Only 3 files live under `lib/` — everything else is namespaced under `modules/core/*` and `modules/eden-ai/*`.

### §3.1 `lib/`

- **`lib/github-service.ts`** — Octokit wrapper. `getMainSHA()`, `createBranch()`, `commitFile()` (base64), `openPR()`. Repo hardcoded to `SJPanis/eden`. Uses `GITHUB_TOKEN`. **Not imported by any `app/api` route found in this pass.** Likely plumbing for a future agent-PR pipeline.
- **`lib/adam-eve-loop.ts`** — In-memory scheduler stubs:
  - `startAdamScheduler()` — every 5 min, POSTs `/api/agents/adam`, passes Eve's last feedback.
  - `startEveScheduler()` — every 2 hours, POSTs `/api/agents/eve/evaluate`.
  - State held in module variables; lost on redeploy. Triggered by `/api/agents/loop-status`. **This is the entire extent of the "Artist/Architect" runtime today.** It does not spawn OS processes, generate PRs, or mutate files.
- **`lib/command-tokens.ts`** — Ephemeral 32-byte hex tokens keyed by userId with 15-minute TTL, stored in an in-memory `Map`. Issued by `/api/auth/totp/verify`; intended for owner-gated destructive actions.

### §3.2 `modules/core/session/` — auth runtime

Multi-mode auth:

- **`authjs-runtime.ts` / `authjs-provider-adapter.ts`** — Auth.js (NextAuth v5) config factory. Google + credentials providers.
- **`password-auth.ts` + `password-auth-shared.ts`** — bcrypt hash/verify, username normalization.
- **`prisma-auth-identity-adapter.ts` + `auth-identity-adapter.ts`** — Auth.js ↔ Prisma `User`/`AuthProviderAccount` mapping.
- **`prisma-cookie-auth-provider-adapter.ts` + `auth-provider-adapter.ts`** — Custom cookie-based session provider used when Auth.js is not in play.
- **`persistent-session-server.ts`** — The canonical resolver: try Auth.js, then Prisma cookie provider, then fall back to mock session (dev only). Used by protected routes.
- **`server.ts`** — Thin re-export surface; `getServerSession()` is the helper API routes call.
- **`auth-runtime.ts`** — Reads env flags to pick between `mock_only` / `hybrid` / `real_only` auth modes.
- **`mock-session.ts` + `mock-onboarding.ts`** — Dev cookie fixtures.
- **`access-control.ts`** — Role checks (`CONSUMER` / `BUSINESS` / `OWNER`).

**Key finding for Unity:** every protected route reads the session via a cookie helper. There is **no JWT issued anywhere**. Unity will need either (a) a new JWT-issuing endpoint + middleware, or (b) a session token scheme it can carry in `Authorization: Bearer`.

### §3.3 `modules/core/payments/` — Stripe integration

- **`stripe-client.ts`** — Lazy-loaded Stripe SDK from `STRIPE_SECRET_KEY`.
- **`stripe-topup-service.ts`** — Core top-up service:
  - `createCreditsTopUpCheckoutSession()` — builds Stripe Checkout session with metadata (userId, package id, Leaf amount).
  - `constructStripeWebhookEvent()` — signature verification.
  - `handleStripeTopUpWebhookEvent()` — dispatch on event type.
  - `settleCreditsTopUpPaymentFromCheckoutSession()` — creates `CreditsTopUpPayment` row (status `SETTLED`), credits wallet via `recordLeafsTopup()` in `eden-economy-service.ts`.

No Stripe Connect service file was opened in this pass — the routes `/api/payouts/connect/*` exist; the underlying helpers likely live in this namespace.

### §3.4 `modules/core/economy/` (inferred) / `modules/core/services/service-pricing.ts`

- **`service-pricing.ts`** — `computeFeeSplit()` — in code, the live split at `/api/wallet/spend` is **70% builder / 15% platform / 15% contribution pool**. The `EdenTransaction` model allows a 4-way split with a provider reserve bucket, but no live code populates it.
- **`eden-economy-service.ts`** (referenced from routes; full contents not opened in this pass) — exports `getOrCreateWallet`, `recordLeafsTopup`, `deductLeafs`, `recordServicePurchase`, `grantLeafs`, `approveContribution`. **Writes `EdenWallet` and `EdenTransaction`.** The only route that currently reaches this service is the Stripe webhook settlement path.

### §3.5 `modules/core/repos/` — Prisma access

- **`prisma-client.ts`** — Singleton lazy Prisma client (pg adapter), throws if `DATABASE_URL` not set, normalizes `sslmode=require`.
- Per-aggregate repos: `prisma-user-repo.ts`, `prisma-business-repo.ts`, `prisma-service-repo.ts`, `prisma-service-usage-repo.ts`, `prisma-discovery-repo.ts`, `prisma-credits-topup-payment-repo.ts`, `prisma-payment-event-log-repo.ts`, `prisma-payout-settlement-repo.ts`, `prisma-internal-leaves-usage-repo.ts`, `prisma-builder-loop-write-repo.ts`, `prisma-read-mappers.ts`.
- Repo interfaces: matching `*-repo.ts` files defining types.
- **Pattern:** services *sometimes* use repos, *sometimes* call `getPrismaClient()` directly. Not strictly enforced. Acceptable but something to note — there's no single database-access boundary to swap out.

### §3.6 `modules/core/services/` — application services

High-fan-out namespace; 20+ files. The ones cross-referenced from working routes:

| File | Used by |
|---|---|
| `service-catalog-service.ts` | Services list/detail (plus `EdenService` discovery). |
| `service-usage-service.ts` | `/api/services/execute`, `/api/ai/chat`, `/api/wallet/spend` support. |
| `service-pricing.ts` | Revenue split computation. |
| `leaves-grant-service.ts` | `/api/owner/leaves-grants`. |
| `builder-loop-write-service.ts` + `builder-loop-write-types.ts` | `/api/mock-services`, `/api/mock-pipeline`, `/api/business/projects`. Core "builder workspace" logic. |
| `business-service.ts` | `/api/mock-business`, `/api/business/projects`. |
| `project-runtime-service.ts` | `/api/owner/project-runtimes/*`. |
| `project-workspace-service.ts` | Workspace/business bridge. |
| `dashboard-read-service.ts` | Dashboard/overview data assembly. |
| `discovery-service.ts` | Service discovery (Eden AI tool + marketplace list). |
| `pipeline-service.ts` | Business pipeline state transitions. |
| `payment-event-log-service.ts`, `payment-inspection-service.ts` | Stripe webhook + admin inspection. |
| `payout-accounting-service.ts`, `payout-settlement-service.ts` | Business-level payouts. |
| `internal-leaves-usage-service.ts` | Hosting/runtime Leaf burn. |
| `read-service-runtime.ts` + `read-record-mappers.ts` + `read-service-types.ts` | Read-model projections. |
| `user-service.ts` | User CRUD wrappers. |

### §3.7 `modules/core/agents/` — "Eden" internal agent framework (scaffolded)

- **`eden-owner-constitution.ts`** — Static constitution / policy for owner-internal autonomy.
- **`eden-autonomy-boundary.ts`** — Autonomy mode gates (owner-only, internal-only, etc.).
- **`eden-db-action-policy.ts`** — Guardrails on database mutations from agents.
- **`eden-build-supervisor.ts` + `eden-build-supervisor-shared.ts`** — Reads/writes file-system state in `eden-system/state/`. Tracks task queue lifecycle. **No actual code generation or shell execution.**
- **`eden-execution-adapters.ts`** — Registry of adapters (`tool`, `browser`, `provider`). Marked `preflight_only`, `scaffold_only`, or `live_guarded`. Only `provider_adapter` for OpenAI via owner-internal sandbox is `live_guarded`. Comment in source: *"No live tool execution is wired in v1."*
- **`eden-provider-adapters.ts`** — Provider-side (OpenAI/Anthropic) adapter shims.
- **`eden-self-work-loop.ts` + `eden-self-work-shared.ts`** — Reads task queue file, executes tasks via owner-internal sandbox create-task flow.

**Summary.** This is the closest thing to an Artist/Architect pipeline in the codebase, but **it is owner-internal and does not map to the user-facing agent flow** from the Eden World spec (where any user spawns an Artist to build a feature visible in the world).

### §3.8 `modules/eden-ai/` — "Ask Eden" assistant

- **`eden-router.ts` + `eden-agent.ts`** — Intent router. Picks a handler based on user utterance.
- **`intents.ts` / `schema.ts` / `types.ts` / `eden-types.ts`** — Shared schemas.
- **`router-urls.ts`** — Known service URLs the assistant can link to.
- **`tool-registry.ts`** — Builds `EdenAiToolContext` with user session, wallet balance, discovery snapshot, workspace services, etc.
- **`tools/`** — Individual tool implementations:
  - `inspect-wallet.ts` — read balance.
  - `search-businesses.ts`, `search-published-services.ts` — marketplace search.
  - `create-project-blueprint.ts`, `create-project-agent.ts`, `run-project-agent.ts` — project creation (LLM chain).
  - `get-platform-status.ts` — mock platform health.
  - `project-draft-shared.ts` — shared types.

**This is a request-scoped LLM router, not a persistent agent system.** It's what powers `/api/eden-ai` (the "Ask Eden" bar).

### §3.9 Other `modules/core/*` namespaces (not fully opened)

- `modules/core/admin/` — `server.ts`, `mock-admin-state.ts` (cookie-backed admin state).
- `modules/core/assistant/` — `server.ts`, `mock-business-assistant-history.ts`.
- `modules/core/business/` — `server.ts`, `workspace-services-server.ts`, mock workspace services, mock created business.
- `modules/core/credits/` — `index.ts`, `mock-credits.ts`, `server.ts`. Credit read path.
- `modules/core/mock-data/` — Platform fixtures used in non-real-only auth modes.
- `modules/core/pipeline/` — `server.ts`, `index.ts`. Workspace pipeline state machine.
- `modules/core/projects/` — `project-blueprint-shared.ts`, `project-runtime-shared.ts`. Shared project types.

---

## §4 — Auth flow trace (for Unity integration planning)

Current flow (web browser):

1. User submits form to NextAuth credentials endpoint (or Google OAuth).
2. `modules/core/session/authjs-runtime.ts` validates against `User` + `AuthProviderAccount` via Prisma adapter (`prisma-auth-identity-adapter.ts`).
3. Auth.js writes an **encrypted cookie session** (no JWT returned to the client).
4. Every protected route calls `getServerSession()` → `persistent-session-server.ts` resolver.
5. Resolver returns `{ user: { id, username, role }, auth: { source, resolver }, memberships }`.

**Gap for Unity:** Unity cannot carry cookies well, and there is no `POST /api/auth/login` that returns a `{ token }` pair. Phase 01 deliverable must include one of:

- **Option A:** New `POST /api/auth/login` + `/api/auth/refresh` that mint short-lived JWTs from the existing `User` + `passwordHash` records, and a middleware that accepts `Authorization: Bearer <jwt>` alongside cookie sessions.
- **Option B:** Use Auth.js's built-in session-token endpoint (v5 supports `session` callbacks) and have Unity hold the session cookie directly. More fragile.

Option A is the recommended path and requires **no schema change** — it just reuses `User.passwordHash`.

---

## §5 — Leaf economy trace

The live path today (from `/api/wallet/spend` source):

```
client → POST /api/wallet/spend { amount, serviceSlug }
         ├─ getServerSession() → userId
         ├─ prisma.user.findUnique → read legacy balance columns
         ├─ compute promo vs real spend (promo first)
         ├─ prisma.user.update → decrement balances, increment lifetime counters
         ├─ prisma.edenService.findUnique → load creator
         ├─ prisma.edenService.update → totalEarned += 70%
         ├─ prisma.platformRevenue.create → 15%
         ├─ prisma.contributionPool.create → 15%
         └─ prisma.referral.update → referrer commission (if set)
```

The Stripe top-up path (from `/api/stripe/webhook`):

```
Stripe → POST /api/stripe/webhook (signed)
         └─ handleStripeTopUpWebhookEvent
            └─ settleCreditsTopUpPaymentFromCheckoutSession
               ├─ prisma.creditsTopUpPayment.upsert (status SETTLED)
               └─ eden-economy-service.recordLeafsTopup
                  ├─ prisma.edenWallet.upsert (increment leafsBalance)
                  └─ prisma.edenTransaction.create (LEAFS_TOPUP)
```

**Inconsistency.** The spend path reads/writes `User` legacy columns. The top-up path writes `EdenWallet` + `EdenTransaction`. A topped-up user has Leafs in `EdenWallet` but **cannot spend them via `/api/wallet/spend`** because that route only sees `User.promoBalance` / `User.realBalance`. Either:

- There is a reconciliation step we haven't seen (e.g., a sync service or a trigger).
- Or top-up also updates the legacy `User` columns somewhere else.
- Or this is genuinely broken and works only in dev where balances are seeded via `/api/owner/leaves-grants` (which writes `User` columns directly).

**This must be resolved before the Unity client trusts any balance endpoint.** Follow-up action: read `eden-economy-service.ts` and `recordLeafsTopup()` in full, then search for any code path that copies values between the two systems.

---

## §6 — Artist / Architect pipeline state (vs spec §5)

Spec expectation: user spawns an Artist (gold) or Architect (blue) agent, the agent walks to a zone, performs a task, emits a PR, user gets Leaf reward.

Reality today:

| Spec concept | Current status | Location |
|---|---|---|
| Artist agent | **Not implemented as a user-facing flow.** Closest analogue: `/api/agents/adam` (stub) + `lib/adam-eve-loop.ts` (in-memory scheduler polling every 5 min). | `lib/adam-eve-loop.ts` |
| Architect agent | Ditto — `/api/agents/architect`, `/api/agents/eve`, `/api/agents/eve/evaluate` (all UNREAD or stub), scheduled every 2 hours. | `lib/adam-eve-loop.ts` |
| Agent state machine (SPAWNING → TERMINATED) | Not present. `EdenAgent.status` has IDLE/RUNNING/PAUSED/ERROR only. `AgentTask.status` is an untyped string column. | `EdenAgent` model, `AgentTask` model |
| Agent position / zone | Not present. | — |
| PR emission on completion | `lib/github-service.ts` exists with Octokit wrappers but is not wired to any agent route. | `lib/github-service.ts` |
| Leaf cost on spawn | `AgentTask.leafCost` exists but `/api/agents/orchestrate` does not deduct it. `AgentBuild.totalLeafs` is set but not charged. | `AgentBuild` / `AgentTask` |
| Tree glow / activity metric | Not present. No aggregation of active agents into a broadcast-able tree state. | — |
| Visible to all users | Not present. No listing endpoint for "all active agents across all users." | — |
| Closest real agent system | `modules/core/agents/*` — owner-internal build supervisor + execution adapters, marked `preflight_only` / `scaffold_only`. **Owner only, not user-facing.** | `modules/core/agents/*` |

**Conclusion.** The spec's Artist/Architect system must be **newly built**, using existing building blocks:

- `AgentBuild` + `AgentTask` as the task skeleton (extend with state enum + position + zone).
- Or a new `Agent` model matching spec §9.1 exactly, with migration from `EdenAgent`.
- `lib/github-service.ts` wired into the completion hook.
- A real scheduler process (not the in-memory `setInterval` stubs in `adam-eve-loop.ts`).
- A broadcast layer (WebSocket) to push state changes to all clients.

---

## §7 — Gap analysis vs. Eden World spec

### §7.1 REST contract (spec §8.2)

| Spec route | Exists? | Current equivalent | Action |
|---|---|---|---|
| `POST /api/auth/login` → `{token, user, avatar}` | **No** | `/api/auth/[...nextauth]` (cookie only) | New route required. |
| `POST /api/auth/refresh` | **No** | — | New route required. |
| `GET /api/auth/me` | **No** | `getServerSession()` helper only | New route required. |
| `GET /api/world/state` | **No** | — | New route required. |
| `GET /api/version` | **No** | — | New route required. |
| `POST /api/agents/spawn` | STUB | `/api/agents/spawn` returns mock id | Rewrite. |
| `GET /api/agents/mine` | **No** | `/api/agents/history` returns last 20 of own | Rename or add. |
| `GET /api/agents/:id` | **No** | `/api/agents/status?buildId=X` is close | Add. |
| `DELETE /api/agents/:id` | **No** | — | New route required. |
| `POST /api/services/market-lens` | Close | `/api/services/market-lens/analyze` | Rename or alias. |
| `POST /api/services/imagine-auto` | Partial | `/api/services/imagine-auto/visualize` (+ parts/purchase UNREAD) | Rename or alias. |
| `POST /api/services/spot-splore` | Close | `/api/services/spot-splore/discover` | Rename or alias. |
| `GET /api/leaf/balance` | Close | `/api/wallet/balance` | Rename or alias. |
| `POST /api/leaf/topup` | Close | `/api/credits/top-up/checkout` or `/api/stripe/checkout` | Rename or alias. |
| `POST /api/leaf/webhook` | Close | `/api/stripe/webhook` | Rename or alias. |
| `GET /api/governance/proposals` | **No** | — | New route required. |
| `POST /api/governance/vote` | **No** | — | New route required. |
| `GET /api/avatar/config` | **No** | — | New route + model required. |
| `PUT /api/avatar/config` | **No** | — | New route required. |

**Summary:** ~13 new endpoints required, 6 existing endpoints need aliasing or renaming, 1 existing endpoint (`agents/spawn`) needs a real implementation.

### §7.2 Data model (spec §9.1)

| Spec model | Exists? | Notes |
|---|---|---|
| `User` + `avatarConfig`/`lastPosition`/`lastOnline` | Partial | `User` exists; spec fields missing. Additive migration. |
| `Agent` (full state machine) | **No equivalent** | `EdenAgent` has wrong shape; `AgentBuild`/`AgentTask` are task-scoped not agent-scoped. Needs new model or major extension. |
| `WorldSession` | **No** | Needed for presence tracking + client-version audit. |
| `VisualAsset` | **No** | Needed for self-improving graphics pipeline. |
| `ClientVersion` | **No** | Needed for auto-update. |
| `AgentType` enum (ARTIST/ARCHITECT) | **No** | Needed. |
| `AgentState` enum (SPAWNING→TERMINATED) | **No** | Needed. |

### §7.3 WebSocket protocol (spec §8.1)

- **No WebSocket server exists.** `server.js` is a stock Next.js HTTP adapter with no upgrade handler.
- No `socket.io`, `ws`, or `WebSocket` import anywhere in `lib/`, `modules/`, or `app/api`.
- **Phase 01 task:** add a Socket.io server alongside the Next.js process (either embedded in `server.js` or a sidecar), authenticated via the same session mechanism Unity uses.

### §7.4 Auto-update / client version

- No `ClientVersion` model, no `/api/version` route, no SHA verification, no download manifest.
- `/api/download/[platform]` exists but only redirects to GitHub releases — it does not return a version or hash.
- **Phase 01 task:** build the full version endpoint + model.

---

## §8 — Phase 01 remaining work

From `EDEN_WORLD_SPEC.md` §14 — Phase 01 remaining items after this audit:

1. ~~Full codebase evaluation of current Eden on edencloud.app~~ ✅ this document
2. ~~Document every working API route, Prisma model, service~~ ✅ this document
3. **Map auth flow, Leaf economy, Stripe integration** ✅ §4, §5 above — with open question flagged about dual-wallet reconciliation
4. **Identify Artist/Architect pipeline state** ✅ §6 above — needs fresh build
5. **Create API contract document (what Unity needs from backend)** — next deliverable, derived from §7 gap analysis
6. **Set up Socket.io server on Railway alongside existing app** — not started
7. **Test WS connectivity from local Unity test scene** — not started
8. **DELIVERABLE: API contract doc + WS echo test** — partially complete (this audit); still need contract doc + WS echo

### Open questions to resolve before the contract doc

1. **Wallet reconciliation.** Which of `User.*Balance` columns vs. `EdenWallet.leafsBalance` is the source of truth going forward? Unity will read exactly one.
2. **Auth token format.** JWT vs. Auth.js session cookie. Strong recommendation: JWT via a new `/api/auth/login`.
3. **Agent model.** Extend `AgentBuild`/`AgentTask`, extend `EdenAgent`, or create a new `Agent` model matching spec §9.1 exactly. Strong recommendation: new `Agent` model, keep legacy tables until migration is complete.
4. **Service naming.** Alias `/api/leaf/*` → `/api/wallet/*` etc., or rename wholesale. Aliasing is safer.
5. **WebSocket hosting.** Embed in `server.js`, run as sidecar on Railway, or Railway Function. Affects `railway.json`.
6. **Governance.** The spec calls for `/api/governance/*` but the current code has nothing. Scope this out of Phase 01?

---

*End of Phase 01 audit. Next deliverable: `docs/PHASE_01_API_CONTRACT.md` — concrete request/response shapes for each endpoint the Unity client needs.*
