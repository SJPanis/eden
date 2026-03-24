# Eden — Antigravity Handoff

This file is the briefing for any Antigravity agent working inside this repo.
Read it before touching anything.

---

## What Eden is

Eden is an **AI service launchpad platform** — a marketplace where builders publish AI-powered
services with visible pricing, and consumers discover and run them funded by Eden Leaves (platform
credits). The owner layer is a private control plane for governing runtimes, sandbox execution,
and autonomous agents.

Public URL: **edencloud.app**

---

## What is real right now

- Auth.js credential sign-in and sign-up (username/password)
- Role-separated surfaces: consumer (`/consumer`), business (`/business`), owner (`/owner`)
- Prisma-backed Postgres data model for users, businesses, services, credits, runtimes, and tasks
- Owner-only internal sandbox runtime with task execution, lifecycle audit, and dispatch governance
- Owner-only autonomy boundary model (PRIVATE_DEV vs PUBLIC_PROD, Stage A/B policy)
- One live provider execution path: OpenAI, owner-only, gated by policy + secret boundary checks
- Eden Leaves credit system (top-up, billing, visible pricing before run)
- Eden self-work loop: owner-approved queue of Eden-core improvement tasks

---

## What is scaffolded (not yet real)

- Container/preview provisioning — modeled as metadata only, no real runtime isolation
- Deployment-history records — control-plane labels, not real deployment jobs
- Browser/tool execution adapters — governance structure exists, no live execution
- Anthropic provider path — modeled, not live
- Secret storage — status metadata only, no secret manager
- External domain activation — DNS/domain fields are placeholders

---

## Architecture you must not touch

These are owner-governed backend systems. Antigravity should not modify these files:

- `prisma/schema.prisma` and `prisma/migrations/`
- `modules/core/agents/` (autonomy boundary, self-work loop, build supervisor)
- `modules/core/services/project-runtime-service.ts`
- `modules/core/session/` (auth, access control, server session)
- `app/api/owner/` (all owner-only API routes)
- `eden-system/` (canonical specs, state, and logs)

If you are unsure whether a file is backend/control-plane: **do not touch it, ask first.**

---

## What Antigravity is cleared to work on

- `ui/entry/eden-public-auth-panel.tsx` — the public homepage and auth panel
- `app/globals.css` — design tokens (eden-ink, eden-accent, eden-edge, etc.)
- `ui/consumer/` — consumer-facing UI components
- `app/layout.tsx` (if it exists) — global layout wrapper
- New files inside `ui/` for visual-only components (no backend imports)
- Static assets in `public/`

**Primary assignment: redesign the public homepage (`/`) for premium visual quality.**

---

## Design system

Eden's design tokens (defined in `app/globals.css`):

```
--eden-bg:          #f2f7fb   (light blue-grey background)
--eden-bg-alt:      #e6f0f8
--eden-ink:         #10253a   (dark navy text)
--eden-muted:       #597087   (secondary text)
--eden-edge:        #d2dfeb   (border colour)
--eden-accent:      #14989a   (teal primary accent)
--eden-accent-soft: #ddf8f6   (light teal background)
--eden-ring:        #7bc9cf   (focus ring / highlight)
```

Fonts:
- Body/UI: Space Grotesk (`--font-space-grotesk`)
- Mono labels: IBM Plex Mono (`--font-ibm-plex-mono`)

Tailwind CSS v4 (`@import "tailwindcss"`) is the styling engine.
All token names are available as Tailwind classes: `text-eden-ink`, `bg-eden-accent`, etc.

---

## Security rules for Antigravity

- Never write raw secrets, API keys, or DB credentials into any file
- Never call owner API routes from public-facing UI components
- Never import from `modules/core/agents/` in client components
- Never import `server-only` modules in client components
- Never expose role logic or session internals in public components
- The `"use client"` boundary must be respected — server components stay server-side
- The autonomy policy model (PRIVATE_DEV / PUBLIC_PROD) governs all agent actions:
  - **PUBLIC_PROD scope applies to edencloud.app** — always treat it as Stage B (review-gated)
  - Any DB writes beyond read + sandbox-task scope require owner acknowledgement

---

## Environment variables required

These live in `.env` — never commit them:

```
DATABASE_URL            Postgres connection string
NEXTAUTH_URL            https://edencloud.app (or dev equivalent)
NEXTAUTH_SECRET         Auth.js signing secret
OPENAI_API_KEY          Required for live owner sandbox execution only
EDEN_OWNER_USERNAME     Authorised owner account username
EDEN_ENVIRONMENT_SCOPE  Optional: PRIVATE_DEV | PUBLIC_PROD (auto-detected if absent)
```

---

## What the public homepage currently is

File: `ui/entry/eden-public-auth-panel.tsx`

Current structure:
- Radial gradient background (orange-to-white-to-blue)
- Left column: brand lockup, headline, feature tags, "How Eden works" 3-step card, "Who Eden is for" 2-card grid
- Right column: sign-up / sign-in form with username + password fields and a "What happens next" explainer

Current visual quality: clean and functional, not premium. No motion, no depth, no 3D.

The headline: **"Discover published AI services and run them with visible pricing."**
The brand: **Eden — Launchable AI service platform**
The accent: teal (`#14989a`), navy ink (`#10253a`), warm-to-cool gradient background

---

## Migration status (important)

The latest Prisma migration (`20260323010000_sandbox_task_lifecycle_audit_v1`) has been written
to disk but **has not yet been applied to the live database**. The owner must run:

```
npx prisma migrate deploy
```

This is a human-gated action. Do not attempt to run migrations from Antigravity.
