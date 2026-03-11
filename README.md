# Eden v1

Eden is the platform shell for consumer discovery, business workspace operations, owner control, and future AI orchestration. The current implementation is a Next.js App Router app in a hybrid transition state: some flows are Prisma-backed and persisted, while other surfaces still rely on mock or cookie-backed development overlays.

## Current Architecture

- `app/`: route groups for `consumer`, `business`, and `owner`, plus API handlers.
- `modules/core/`: shared platform concerns such as auth/session, services, repositories, credits, payments, pipeline, and business helpers.
- `modules/eden-ai/`: Ask Eden routing, tool registry, and legacy workspace AI helpers.
- `ui/`: role-specific UI panels and dashboard components.
- `prisma/`: PostgreSQL schema for users, businesses, services, payments, usage, payouts, and project blueprints/agents.
- `docs/`: transition and audit notes from earlier work.
- `eden-dev/`: legacy planning notes.
- `eden-system/`: canonical build-memory system for ongoing implementation state, chapters, specs, logs, and prompts.

## Verified Repo Health

Verified on 2026-03-11:

- `npm run lint`: passed
- `npm run build`: passed
- `cmd /c npx prisma validate`: passed

Partially verified:

- `npm run acceptance:verify-ledger`: script completed, but persistent model checks were skipped with Prisma `EACCES` warnings, so database-backed ledger health is not fully confirmed.
- `npm run dev`: startup probing showed an existing Next dev lock or running process in `.next/dev`, so an isolated fresh boot was not fully confirmed during audit.

## Key Product Reality

- Eden core is partially separated by modules and role surfaces.
- Project blueprints and agent metadata exist.
- True project runtime isolation does not exist yet.
- Hosted project funding and publishing are currently metadata and accounting concepts, not real isolated deployments.
- Owner/business/consumer roles exist, but the platform still mixes mock compatibility layers with persistent auth and persistent writes.

## Common Commands

Run from `C:\dev\Eden\eden-v1`:

```powershell
npm run lint
npm run build
cmd /c npx prisma validate
cmd /c npm run dev
cmd /c npm run acceptance:verify-ledger
```

## Notes

- The actual git repo root is `eden-v1`. The parent `C:\dev\Eden` directory is a workspace wrapper, not the git repository.
- `docs/` and `eden-dev/` contain useful historical context, but `eden-system/` is the canonical build-memory location going forward.
- The next major implementation target is isolated project runtime support, including an owner-only internal Eden sandbox project that remains separate from Eden core.
