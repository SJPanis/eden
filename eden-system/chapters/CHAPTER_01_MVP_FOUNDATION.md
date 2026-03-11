# Chapter 01 - MVP Foundation

## Goal

Stabilize Eden as a usable platform shell with clear role surfaces, persistent core records, auditability, and canonical internal build memory.

## Required Systems

- public entry and auth flow
- consumer discovery and service execution
- business workspace and project blueprint flow
- owner control room and accounting inspection
- Prisma-backed core records
- canonical state/task/log/spec memory inside the repo

## Current Status

Partially complete.

Already present:

- role-based route structure
- Auth.js wiring and access helpers
- Prisma schema for core platform records
- business/project blueprint scaffolding
- payment and usage accounting foundations
- owner/business/consumer UI shells

Still missing or incomplete:

- fully verified persistent operational health
- clear removal path for legacy/mock overlap
- canonical runtime isolation model
- clean single-source development memory before this chapter file creation

## Done Criteria

- README and canonical docs match the real product state
- route protection is verified and aligned with current Next.js conventions
- persistent verification scripts run without permission-skipped warnings
- hybrid mock/persistent boundaries are clearly documented
- `eden-system/` is the canonical source for ongoing state and task continuity

## Risks

- persistent data can look healthier than it is if warning-skipped verification is mistaken for a clean pass
- mock compatibility layers can hide ownership and runtime-boundary mistakes
- fragmented docs can cause future implementation drift

## Dependencies

- working Prisma access
- stable auth configuration
- disciplined state updates after each implementation task
