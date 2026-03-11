# Eden Build Supervisor

Last updated: 2026-03-11

## Purpose

The Eden Build Supervisor is an owner-gated workflow-orchestration layer for Eden-core self-improvement work.

It does not replace the owner, Codex, or runtime boundaries.
It automates the repetitive coordination step of:

- reading canonical Eden state
- choosing the next approved Codex-ready task
- preparing a structured execution packet
- tracking blockers and human-required actions
- recording the last completed result
- preparing the next step after completion

## Input Sources

Required supervisor inputs:

- `eden-system/specs/EDEN_MASTER_SPEC.md`
- `eden-system/specs/PROJECT_ISOLATION_MODEL.md`
- `eden-system/specs/AI_ORCHESTRATION_MODEL.md`
- `eden-system/specs/OWNER_CONTROL_CONSTITUTION.md`
- `eden-system/state/CURRENT_STATE.md`
- `eden-system/state/TASK_QUEUE.md`
- `eden-system/state/HUMAN_ACTIONS_REQUIRED.md`
- `eden-system/state/EDEN_POST_DEPLOY_TIMELINE.md`
- `eden-system/state/EDEN_SELF_WORK_QUEUE.json`
- `eden-system/logs/CHANGELOG_AGENT.md`
- runtime/task readiness from the owner-only internal sandbox control plane

## Decision Rules

1. Eden selects work only from owner-approved Eden-core queues.
2. Eden prefers the first approved actionable task that is not already completed or already queued into the sandbox runtime.
3. Eden refuses tasks that are blocked by owner action, required manual infra work, or explicit queue blockers.
4. If a higher-priority approved task is blocked, Eden may recommend the next Codex-ready task, but it must surface the blocked head task honestly.
5. Eden never treats a missing control input, missing runtime metadata, or unavailable runtime schema as success.

## Codex Execution Packet

The canonical packet output lives at:

- `eden-system/state/EDEN_CODEX_EXECUTION_PACKET.json`

Required packet fields:

- task id and title
- objective
- repo context and source-of-truth paths
- likely files affected
- constraints and hard limits
- acceptance criteria
- required post-task file updates
- blocker and stop-condition summary

## Stop And Continue Conditions

Continue only when:

- the next task is approved
- required control inputs are present
- the task is not blocked by owner-only or human-required action
- the packet is prepared inside owner scope

Stop when:

- the next head task requires owner action first
- runtime/task control-plane state is unavailable
- the queue is empty or waiting on review
- the task would require unsupported autonomy, provider execution, or real runtime provisioning

## Owner Review Gates

- The build supervisor is owner-aligned and owner-gated.
- Queue mode remains `owner_review_required`.
- Completed-task ingestion records results and can prepare the next packet, but that does not remove the owner review boundary.
- No packet should claim autonomous deployment, autonomous coding completion, or live provider execution unless those capabilities are actually implemented and verified.

## Blocked Task Handling

- Blocked approved tasks are surfaced explicitly.
- Matching human-required actions are attached to the blocked task summary where practical.
- Eden may recommend the next ready approved task after a blocked head task, but it must not hide that the higher-priority item is still blocked.

## Human-Required Action Handling

- Human-required actions remain canonical in `HUMAN_ACTIONS_REQUIRED.md`.
- Build Supervisor ingestion may append or refresh a managed summary section in that file.
- Raw secrets, credentials, and unrestricted runtime actions remain outside supervisor scope.

## Limits

- No unrestricted autonomy
- No raw secret exposure
- No real deployment or runtime provisioning claims unless implemented
- No bypass of runtime boundaries
- No mutation of unrelated systems outside the scoped Eden-core task
