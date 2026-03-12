# Eden Post-Deploy Timeline

Last updated: 2026-03-11

## Immediate Next

- Reconcile live Prisma migration history and deploy the runtime-control-plane migration chain.
- Verify `/owner/runtimes` against the active database instead of local fallback assumptions.
- Confirm the internal sandbox runtime can persist lifecycle, launch-intent, deployment-history, config-policy, and task records.

## Short-Horizon V1 Closeout

- Verify dispatch/session history from the new execution-interface layer against the migrated live database.
- Add sandbox task lifecycle audit logging.
- Verify provider approvals, secret readiness updates, agent runs, and sandbox result capture against the migrated live database.
- Keep active owner and consumer surfaces honest about which ledger, runtime, and provider features remain metadata-only or development overlays.

## Post-V1 Stabilization

- Replace remaining hybrid mock-first overlays in owner, business, and consumer flows with persistent or explicitly quarantined equivalents.
- Add route-protection smoke checks and replace deprecated `middleware.ts` usage with the current Next.js `proxy` convention.
- Resolve database permission issues so acceptance verification is authoritative.

## Requires Owner Review

- Any change that would enable real provider execution.
- Any change that would provision or mutate a real isolated runtime target.
- Any change that would widen owner-only internal sandbox scope into business or public runtime execution.

## Blocked By Missing Real Infrastructure

- Real container or workspace provisioning.
- Real secret storage outside metadata status records.
- Real provider credentials and outbound adapter execution.
- Real external-domain or hosted runtime activation.

## Stop Conditions

- Eden must stop and wait if the next approved queue item is blocked by missing runtime infra, provider wiring, or unresolved database permissions.
- Eden must stop and wait if a task would require broad repo mutation outside the approved queue item scope.
- Eden must stop and wait after each queued self-work task while the loop remains in owner-review-required mode.
