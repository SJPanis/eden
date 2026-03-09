# Release 001: Launchable Eden

## Milestone

Release 001 defines the first launch-ready Eden milestone:
- builders can create and price services
- builders can move services through a mocked publish pipeline
- consumers can discover published services with visible pricing
- consumers can top up Eden Credits and run services
- owner/admin surfaces can inspect payments, payouts, and platform operations

## Systems Already Implemented

### Public and Consumer Flow
- public entry and onboarding flow
- consumer marketplace and Ask Eden discovery
- wallet-aware service discovery and affordability guidance
- service detail pages with explicit pricing and wallet context
- Eden Credits wallet history, top-up flow, and receipt-style visibility

### Builder Flow
- business creation flow
- service builder with pricing and AI-assisted draft generation
- interactive build, test, ready, and publish pipeline
- business AI assistant with persisted per-business history
- workspace analytics for service performance, customer value, and earnings

### Owner and Platform Flow
- owner control room with platform metrics
- payment inspection and webhook event visibility
- payout accounting and payout settlement history
- business-level payout reconciliation
- user inspection with linked payment history

### Backend Foundations
- Prisma schema and PostgreSQL wiring
- hybrid mock plus Prisma read and write boundaries
- canonical mock-data sync tooling
- Auth.js migration scaffolding behind the session boundary
- persistent usage, payment, and payout records

## Why This Milestone Matters

Release 001 proves the core Eden loop in one product shell:
- a builder can publish value
- a consumer can discover and use it
- the platform can account for money-in, usage, and builder liability

That is the minimum credible base for wider release planning and future agent-driven automation.
