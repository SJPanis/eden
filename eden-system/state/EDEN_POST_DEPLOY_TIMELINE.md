# Eden Post-Deploy Timeline

Last updated: 2026-03-23

## Immediate Next

- Reconcile live Prisma migration history and deploy the full migration chain — now includes `20260323010000_sandbox_task_lifecycle_audit_v1`.
- Verify `/owner/runtimes` against the active database instead of local fallback assumptions.
- Confirm the internal sandbox runtime can persist lifecycle, launch-intent, deployment-history, config-policy, task, and task audit log records.
- Confirm the autonomy-mode panel loads correct scope/stage/blocker state in the intended environment.

## Short-Horizon V1 Closeout

- Verify dispatch/session history from the execution-interface layer against the migrated live database.
- Verify the guarded live OpenAI sandbox path against the migrated live database once `OPENAI_API_KEY` is available in the active server runtime.
- Verify `ProjectRuntimeTaskAuditLog` rows are written at each lifecycle event point after migrations are applied.
- Verify provider approvals, secret readiness updates, agent runs, and sandbox result capture against the migrated live database.
- Add explicit owner review-acknowledgement step before next build-supervisor packet becomes actionable.
- Keep active owner and consumer surfaces honest about which ledger, runtime, and provider features remain metadata-only or development overlays.

## Post-V1 Stabilization

- Replace remaining hybrid mock-first overlays in owner, business, and consumer flows with persistent or explicitly quarantined equivalents.
- Add route-protection smoke checks and replace deprecated `middleware.ts` usage with the current Next.js `proxy` convention.
- Resolve database permission issues so acceptance verification is authoritative.

## Requires Owner Review

- Any change that would widen real provider execution beyond the current owner-only OpenAI sandbox path.
- Any change that would provision or mutate a real isolated runtime target.
- Any change that would widen owner-only internal sandbox scope into business or public runtime execution.

## Blocked By Missing Real Infrastructure

- Real container or workspace provisioning.
- Real secret storage outside metadata status records.
- Additional provider credentials and broader outbound adapter execution beyond the current guarded OpenAI sandbox path.
- Real external-domain or hosted runtime activation.

## Stop Conditions

- Eden must stop and wait if the next approved queue item is blocked by missing runtime infra, provider wiring, or unresolved database permissions.
- Eden must stop and wait if a task would require broad repo mutation outside the approved queue item scope.
- Eden must stop and wait after each queued self-work task while the loop remains in owner-review-required mode.
