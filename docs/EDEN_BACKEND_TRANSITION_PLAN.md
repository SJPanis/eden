# Eden v1 Backend Transition Plan

## Purpose

This document defines a practical migration path from the current local mock architecture in Eden v1 to a real backend-backed platform. The goal is to replace persistence, auth, and operational workflows without breaking the existing UI architecture, route structure, or cross-layer platform model.

This is a transition blueprint, not an implementation spec. It assumes the current app remains usable during migration and that mock and real systems may coexist behind adapters for a period of time.

## Current Architecture Snapshot

Eden v1 is already structured in a way that supports incremental backend replacement:

- `app/` contains route-level pages and API endpoints.
- `modules/core/` contains shared platform concerns.
- `modules/eden-ai/` contains Eden AI routing, typing, and generation adapters.
- `ui/` contains dashboard and panel components for consumer, business, and owner layers.

The app currently behaves like a full platform, but most state is local and mocked:

- shared platform records live in `modules/core/mock-data/`
- session and onboarding are mock cookie-driven in `modules/core/session/`
- credits are mock ledger records in `modules/core/credits/`
- pipeline state and release events are mock cookie-backed in `modules/core/pipeline/`
- business creation and workspace service creation use local overlay state in `modules/core/business/`
- assistant history is cookie-backed in `modules/core/assistant/`
- admin controls are cookie-backed in `modules/core/admin/`
- Eden AI uses local generators behind `modules/eden-ai/`

This is the correct shape for transition. The system already has seams. The migration should preserve those seams and replace implementations behind them.

## Current Mocked Systems and Recommended Replacements

### 1. Session, role access, and onboarding

Current mock system:

- `modules/core/session/mock-session.ts`
- `modules/core/session/server.ts`
- `modules/core/session/mock-onboarding.ts`
- mock cookies define active user, role, and onboarding state

Recommended replacement:

- real auth provider for identity and session handling
- server-side session resolution layer that preserves the current `server.ts` guard pattern
- role and membership data stored in the database

Recommended stack:

- `Auth.js` if minimal control and App Router alignment is preferred
- `Better Auth` if stronger typed control is preferred
- `Clerk` only if the team wants hosted auth and accepts vendor coupling

Recommendation:

- use `Auth.js` with database-backed sessions and OAuth or email support
- keep `modules/core/session/server.ts` as the stable entry point for access checks

### 2. Shared mock platform data

Current mock system:

- `modules/core/mock-data/platform-data.ts`
- `modules/core/mock-data/platform-types.ts`
- canonical arrays for users, businesses, services, projects, transactions, and logs

Recommended replacement:

- PostgreSQL-backed domain data
- repository or service layer per domain
- selectors rebuilt to read from repositories instead of in-memory arrays

Recommendation:

- use PostgreSQL
- use Prisma or Drizzle for schema and query access
- keep TypeScript domain models and selector interfaces independent of ORM models

### 3. Discovery snapshot and marketplace selectors

Current mock system:

- `modules/core/mock-data/discovery-selectors.ts`
- builds a discovery snapshot from shared mock data, pipeline state, and workspace overlays
- powers Ask Eden, recommended services, trending businesses, and detail lookups

Recommended replacement:

- discovery service layer that composes database reads plus publish state
- optional cache layer for hot discovery views

Recommendation:

- keep the `buildDiscoverySnapshot(...)` style API
- swap its inputs from arrays and cookies to repositories and persisted release state
- optionally add Redis or response caching later for consumer performance

### 4. Credits and transaction simulation

Current mock system:

- `modules/core/credits/mock-credits.ts`
- transaction simulation through local API routes and cookies

Recommended replacement:

- ledger-based accounting service
- append-only transaction records
- derived balances or balance snapshots

Recommendation:

- model credits as a ledger, not a mutable balance field
- persist every credit event with actor, source, reason, and reference object
- expose balance selectors through a dedicated credits service

### 5. Pipeline state and release history

Current mock system:

- `modules/core/pipeline/mock-pipeline.ts`
- pipeline overrides and release event history stored locally
- statuses already modeled as `draft`, `testing`, `ready`, `published`

Recommended replacement:

- persistent pipeline records per release target
- append-only pipeline event table
- publish read models that drive discovery visibility

Recommendation:

- keep the existing status model
- store current state separately from the event stream
- derive owner and business release views from the same persisted event history

### 6. Business creation and local workspace overlays

Current mock system:

- `modules/core/business/mock-created-business.ts`
- `modules/core/business/mock-workspace-services.ts`
- session-local overlays make a newly created business or service feel active immediately

Recommended replacement:

- database-backed create flows
- drafts stored immediately as first-class business and service records
- workspace context resolved from memberships and active business selection

Recommendation:

- keep the overlay-style interface during migration
- first swap the storage engine from cookie to database, then remove the "overlay" distinction once creation is durable

### 7. Business AI Assistant history

Current mock system:

- `modules/core/assistant/mock-business-assistant-history.ts`
- assistant runs and patch previews stored per business in cookies

Recommended replacement:

- persisted assistant run history table
- structured payload storage for generated suggestions and patch data
- optional later job orchestration for slower AI tasks

Recommendation:

- persist both summary metadata and structured payloads
- keep assistant output shape stable so the Business Dashboard UI does not need a rewrite

### 8. Owner admin controls

Current mock system:

- `modules/core/admin/mock-admin-state.ts`
- frozen users, frozen businesses, and maintenance mode stored locally

Recommended replacement:

- admin state stored in database tables or dedicated control records
- audit log for every admin action

Recommendation:

- all admin actions should become auditable write operations
- maintenance mode should be a system-wide configuration value, not a client-side toggle

### 9. Eden AI generation layer

Current mock system:

- `modules/eden-ai/eden-agent.ts`
- `modules/eden-ai/eden-router.ts`
- `modules/eden-ai/eden-types.ts`
- local structured generation for Ask Eden and Business AI Assistant

Recommended replacement:

- provider adapters behind the same router and typed contracts
- background job support for long-running AI operations
- moderation, rate limits, logging, and retries

Recommendation:

- keep `eden-router.ts` and `eden-types.ts` as the architectural contract
- replace only adapter implementations, not UI-facing result types

## What UI Can Remain Unchanged

The current UI structure is strong enough to survive backend replacement with minimal surface changes.

These areas should remain mostly unchanged:

- App Router route structure
- consumer homepage and Ask Eden response panel
- service detail and business detail pages
- Business Dashboard layout and sections
- Owner Dashboard layout and sections
- role-based shell and navigation
- Service Builder UI and variant comparison flow
- Business AI Assistant UI and history panel
- pipeline controls and release activity feeds

The UI should continue to consume typed server data, selectors, and action endpoints. Avoid pulling ORM results directly into components.

## Service Layers to Introduce

Introduce explicit backend-facing service modules before replacing every mock implementation. The goal is to replace data sources without rewriting pages.

Recommended service boundaries:

- `session-service`
  - resolve current user
  - resolve current role
  - resolve active business context
  - enforce access rules

- `user-service`
  - user lookup
  - profile data
  - balances and membership summary

- `business-service`
  - create business
  - update business profile
  - get business overview
  - get business memberships

- `service-catalog-service`
  - create service drafts
  - update service metadata
  - fetch service detail
  - fetch business services

- `project-service`
  - create and update projects
  - link projects to businesses and services

- `discovery-service`
  - build marketplace snapshot
  - search services
  - rank recommended businesses and services

- `credits-ledger-service`
  - append ledger events
  - get balance
  - get usage history
  - get fee breakdown

- `pipeline-service`
  - read current release state
  - transition release state
  - generate and fetch pipeline events
  - compute readiness status

- `assistant-history-service`
  - store assistant runs
  - fetch assistant history by business
  - reopen structured outputs

- `admin-control-service`
  - freeze or unfreeze user
  - freeze or unfreeze business
  - toggle maintenance mode
  - read system state

- `audit-log-service`
  - record admin actions
  - record high-value platform events
  - fetch owner-facing logs

- `eden-ai-service`
  - route requests by task type
  - call provider adapters
  - persist AI run metadata where needed

These services can start as wrappers around the current mock modules, then switch internally to real repositories.

## Recommended Production Stack

This stack fits the current Next.js and TypeScript architecture and allows incremental migration:

- frontend and server framework: Next.js App Router
- language: TypeScript
- database: PostgreSQL
- ORM or query layer: Prisma first choice, Drizzle acceptable if lower-level SQL control is preferred
- auth: Auth.js with database sessions
- background jobs: Inngest or Trigger.dev
- cache and queue support: Redis, only where needed
- observability: Sentry plus structured server logs
- deployment: Vercel for app delivery, managed Postgres provider for data

Why this stack fits:

- it preserves the current full-stack TypeScript flow
- it supports route handlers and server components cleanly
- it aligns with the existing modular server helper pattern
- it does not force a rewrite of page architecture

## Data Persistence Model

The current mock entities should map to durable records with explicit relationships.

### Users

Persist:

- user id
- auth identity mapping
- username and display profile
- role or roles
- onboarding preferences

Suggested tables:

- `users`
- `auth_accounts`
- `user_roles`
- `user_preferences`

### Businesses

Persist:

- business id
- owner or primary manager
- description
- category and tags
- visibility
- current status

Suggested tables:

- `businesses`
- `business_members`
- `business_tags`
- `business_settings`

### Services

Persist:

- service id
- business id
- name
- description
- category
- tags
- pricing model
- automation summary
- publish status

Suggested tables:

- `services`
- `service_tags`
- `service_versions` or `service_drafts` if version history is needed

### Projects

Persist:

- project id
- business id
- linked service id if applicable
- build status
- summary data

Suggested tables:

- `projects`

### Assistant history

Persist:

- run id
- business id
- action type
- timestamp
- summary title
- preview text
- full structured output payload
- structured patch payload

Suggested tables:

- `assistant_runs`

### Credits and transactions

Persist:

- ledger entry id
- actor user id or business id
- transaction type
- amount
- direction
- fee breakdown
- related service or business reference
- timestamp

Suggested tables:

- `credit_ledger_entries`
- optional `credit_balance_snapshots`

### Pipeline state and events

Persist:

- target business id
- target service id
- current status
- checklist state
- actor
- transition history

Suggested tables:

- `pipeline_records`
- `pipeline_events`

### Logs and admin events

Persist:

- event id
- actor
- target
- action type
- severity
- timestamp

Suggested tables:

- `audit_logs`
- `system_events`

## Transition from Mock Session to Real Auth

This is one of the highest-risk transitions because it touches every layer. Do not replace UI access logic and auth provider logic at the same time.

Recommended approach:

1. Keep the current access contract intact.
   - `modules/core/session/server.ts` should remain the boundary used by pages and route handlers.

2. Introduce a real session resolver behind the same boundary.
   - replace `resolveMockSession` with `resolveSession`
   - keep the returned session shape close to the current mock session shape during migration

3. Store real role and membership data in the database.
   - consumer access remains broadly public
   - business access maps to business membership
   - owner access maps to explicit admin role

4. Preserve the development session switcher separately.
   - keep it in development only
   - do not mix it with production auth controls

5. Migrate onboarding preferences into real user records.
   - onboarding can still be a lightweight wizard
   - only persistence changes

What should not change in the UI:

- route layout guards
- access-denied flow
- role-aware shell rendering

## Transition from Shared Mock Data to Database-Backed Services

The current shared mock data is useful because it already centralizes domain shape. Replace the source of truth, not the whole consumption pattern.

Recommended approach:

1. Keep `platform-types.ts` as the domain contract or evolve it into shared domain types.

2. Introduce repository functions that mirror current selectors.
   - `getUserById`
   - `getBusinessById`
   - `getServiceById`
   - list and relationship lookups

3. Refactor selectors to depend on repositories instead of arrays.
   - the discovery layer should ask for data through services, not import raw ORM queries

4. Migrate read paths before write paths where possible.
   - pages can render from the database while interactive controls still write to mock storage during transitional phases

5. After read stability is confirmed, switch mutation endpoints.
   - business creation
   - service creation
   - assistant history writes
   - credits writes
   - pipeline transitions
   - admin actions

6. Remove fallback mock reads only after parity is verified.

## Migration Order

This order minimizes user-facing breakage and keeps the current architecture intact.

### Phase 0: Stabilize contracts

- freeze and document current domain types
- confirm stable service boundaries
- keep UI and route contracts unchanged

### Phase 1: Introduce database schema and repositories

- add PostgreSQL
- add ORM schema
- create repository modules for users, businesses, services, projects, ledger, pipeline, assistant history, and logs
- do not switch UI yet

### Phase 2: Migrate read models

- replace shared mock data reads with repository-backed service reads
- replace discovery snapshot inputs with repository queries
- keep current pages, selectors, and components stable

### Phase 3: Migrate session and auth

- introduce real auth provider
- resolve session in `modules/core/session/server.ts`
- map roles and business access from database memberships

### Phase 4: Migrate business and service creation

- persist created businesses and workspace services directly in the database
- keep the current Business Workspace and Service Builder UI
- preserve local-feeling responsiveness with optimistic updates if needed

### Phase 5: Migrate pipeline and publish state

- persist pipeline records and events
- make consumer discovery read only published database records
- keep the existing publish flow and status UI

### Phase 6: Migrate credits and billing

- introduce persistent ledger writes
- expose balance and transaction summaries through the credits service
- make owner transaction flow and business billing read from the same ledger

### Phase 7: Migrate assistant history and Eden AI orchestration

- persist assistant runs
- optionally add background execution for slower AI tasks
- keep Business AI Assistant and Ask Eden UI contracts stable

### Phase 8: Migrate admin controls and audit logging

- persist freeze state and maintenance mode
- add auditable admin action records
- keep owner controls and platform indicators unchanged

## Publish and Discovery Transition

The publish-to-discovery path is already modeled correctly in the mock system. Preserve that shape.

Current flow:

- business creates service
- service moves through pipeline states
- published service enters discovery snapshot
- Ask Eden and consumer discovery read from the same source

Real flow should keep the same behavior:

- `pipeline-service` writes new status and event
- `discovery-service` reads only services with effective published visibility
- consumer homepage, Ask Eden, and service detail pages use that same discovery service

Do not:

- hardcode published services directly into consumer views
- let Ask Eden build separate discovery truth outside the canonical snapshot

## Persisting Key Platform Records

### Businesses

Persist immediately on creation. Do not keep newly created businesses as a separate temporary concept once the database exists.

### Services

Persist drafts immediately. A service can exist before it is visible in consumer discovery.

### Projects

Persist as business-scoped work items or build artifacts. Keep them linked to the relevant business and optionally the relevant service.

### Assistant history

Persist every AI run that should be reopenable by the business. Store structured outputs so patch application still works after refresh.

### Credits

Persist as immutable ledger entries. Derive balances from ledger state or balance projections.

### Pipeline events

Persist every status transition as an event row. Keep a separate current-state table for fast lookups.

## Risks to Avoid

### 1. Rewriting UI and backend at the same time

Do not replace page architecture while replacing data sources. Keep UI stable and swap implementations underneath it.

### 2. Coupling components to ORM models

Components should consume domain view models, not raw Prisma or Drizzle records.

### 3. Mixing mock ids and real ids without a plan

If the app temporarily supports both mock and real sources, define clear id namespaces or migration rules.

### 4. Replacing auth and permissions in a single uncontrolled step

Move auth behind the existing session helper boundary first. Then validate role access behavior route by route.

### 5. Making credits mutable instead of ledger-based

Balances should be derived from recorded transactions. Direct balance mutation will create accounting drift.

### 6. Treating pipeline status as a UI-only field

Release state should be durable and event-backed. The consumer marketplace should depend on it.

### 7. Letting AI providers leak into UI code

Keep provider-specific logic inside `modules/eden-ai/` or service adapters. UI should stay provider-agnostic.

### 8. Skipping audit trails for admin controls

Freeze actions and maintenance mode must be traceable.

## Development and Rollout Strategy

Use a dual-mode approach during migration:

- keep mock adapters available in development
- add real adapters behind configuration flags
- switch one domain at a time

Suggested environment strategy:

- local development can support `mock`, `hybrid`, and `real` data modes
- staging should run against real auth and real persistence before production

This allows:

- UI continuity
- regression comparison
- safe rollout of persistence-heavy features

## Definition of Done for the Transition

Eden is ready to leave the mock prototype stage when:

- sessions and roles are backed by real identity and membership records
- businesses, services, and projects persist in PostgreSQL
- credits are stored as a ledger
- pipeline state and events are durable
- consumer discovery reads from published persisted services
- assistant history persists per business
- owner actions are auditable
- the UI still uses the same route structure and core interaction model

## Recommended First Implementation Slice

The most pragmatic first real slice is:

1. add PostgreSQL and ORM schema
2. add repository layer for users, businesses, services, and pipeline records
3. replace discovery reads with repository-backed selectors
4. replace business and service creation writes
5. then introduce real auth

Reason:

- it converts Eden into a real builder-to-marketplace loop first
- it preserves the strongest existing product flow
- it avoids starting with the most sensitive auth migration before data models exist

## Summary

Eden v1 does not need a full rewrite. The current modular structure is already suitable for a real backend transition. The correct strategy is to preserve the current UI, route structure, selectors, and AI contracts while progressively replacing cookie-backed and in-memory mock implementations with:

- database-backed repositories
- a stable service layer
- real auth and membership resolution
- ledger-based credits
- durable pipeline records and events
- persisted assistant history
- auditable admin controls

If this plan is followed, Eden can move from prototype to real platform without losing the current product shape.
