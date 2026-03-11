# Eden v1 Status

## Verified active

- Public username/password auth is active through Auth.js CredentialsProvider.
- Role protection is active for `consumer`, `business`, and `owner` routes through middleware plus server-side access helpers.
- Owner access is still gated by persisted role plus `EDEN_OWNER_USERNAME`.
- The Leaf's wallet flow is active:
  - pack selection
  - checkout launch
  - webhook-authoritative settlement
  - owner payment inspection
- Consumer service discovery is active and wallet-aware.
- Paid consumer service execution is active through the live execution route and uses exact-once `executionKey` handling.
- Business project creation is active in the Business workspace.
- Project agent creation and controlled agent execution are active in the Business workspace.
- Internal earned-Leaf's usage is active and visible in business and owner accounting.
- The new Ask Eden operator layer is active on the consumer side through:
  - `app/api/eden-ai/route.ts`
  - `modules/eden-ai/*`

## Present and still in use, but not the active Ask Eden path

- `modules/eden-ai/eden-agent.ts`
- `modules/eden-ai/eden-router.ts`
- `modules/eden-ai/eden-types.ts`

These legacy Eden AI files still support business-side AI assistant and service-builder flows. They are not the active consumer Ask Eden operator route, but they should not be removed yet.

## Verified in this audit pass

- Auth/session routing:
  - `/`
  - `/consumer`
  - `/business`
  - `/owner`
- Checkout and settlement route wiring:
  - `/api/credits/top-up/checkout`
  - `/api/credits/top-up/confirm`
  - `/api/stripe/webhook`
- Consumer paid execution route:
  - `/api/services/execute`
- Business workspace project route:
  - `/api/business/projects`
- Owner Leaves grant route:
  - `/api/owner/leaves-grants`
- Consumer Ask Eden route:
  - `/api/eden-ai`

## Still mocked / simulated / proposed

- Some owner/business/detail surfaces still use placeholder presentation components even when backed by real records.
- Consumer business and service detail pages now use real route wiring and real pricing/availability where available, but they still include preview-oriented fallback content when a canonical record is incomplete.
- Business-side AI assistant and service builder remain simulated/generative helpers rather than grounded operator tooling.
- Some owner/business metrics still read from mixed persistent plus simulated datasets by design.

## Drift / cautions

### Non-blocking drift

- There are currently two Eden AI layers:
  - the new consumer Ask Eden operator layer in `modules/eden-ai/*`
  - the older business-side AI helper path in `modules/eden-ai/eden-agent.ts`
- This is acceptable for now, but it is the main architectural drift to resolve before broader Eden AI expansion.

### Presentation cautions

- Detail routes and accounting surfaces are not all purely live-state UIs yet. Some still blend real platform state with preview/fallback copy.
- That is acceptable for v1, but any future claims of autonomy or full platform truth should stay grounded to the actual service/repo data paths.

## What should not be touched yet

- Payout rails
- Stripe Connect
- Hosting subscriptions
- Broad schema redesign
- Eden v2 expansion
- Desktop shell / local browser mode
- Hardware auth / USB / passkeys beyond the current auth system

## Next exact build step

Advance the consumer-to-builder paid loop by verifying one published service end to end in production:

1. consumer buys Leaf's
2. consumer runs one real priced service
3. one exact-once debit is recorded
4. one exact-once usage event is recorded
5. builder earnings and Eden fee are recorded from the same run
6. owner can inspect the full trail

That is the cleanest next advancement step from the current repo state.
