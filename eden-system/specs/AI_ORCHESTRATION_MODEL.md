# AI Orchestration Model

Last updated: 2026-03-11

## Objective

Define the future multi-agent operating model for Eden so AI work stays scoped, auditable, and aligned with project/runtime boundaries.

## Primary Agent Roles

### 1. Main Eden Agent

Purpose:

- platform-level planner and coordinator
- understands user intent
- routes work to the correct project, runtime, or operational surface

Scope:

- Eden Core only
- does not directly operate arbitrary project code

### 2. Planner / Router Agent

Purpose:

- decompose a request into atomic tasks
- assign tasks to worker agents
- enforce scope and permissions

Outputs:

- task plan
- target project/runtime scope
- required approvals

### 3. Worker Agents

Purpose:

- execute scoped work inside a project context
- generate code, configs, tests, content, or operational actions

Rules:

- workers operate within project scope, not open-ended platform scope
- workers must not mutate Eden Core outside approved control-plane tasks

### 4. QA Agent

Purpose:

- verify runtime health, tests, route behavior, regressions, and acceptance criteria

Rules:

- records what was verified and what could not be verified
- cannot claim completion without evidence

### 5. Ledger / State Agent

Purpose:

- update canonical memory and execution records after work completes

Files to update when applicable:

- `eden-system/state/CURRENT_STATE.md`
- `eden-system/state/TASK_QUEUE.md`
- `eden-system/logs/CHANGELOG_AGENT.md`
- `eden-system/state/HUMAN_ACTIONS_REQUIRED.md`

## Operating Principles

- every agent action must be scoped
- every scoped task should leave a trace
- unresolved blockers must be written down
- human approvals remain explicit for high-risk actions
- agent output must distinguish verified state from proposed state

## Project Scope Requirement

Agents should operate against:

- a project blueprint
- a project runtime
- a business scope
- or an explicit Eden Core maintenance task

Agents should not operate against undefined global state.

## Update Contract

Every substantial future Codex task should:

1. read current state files
2. execute one scoped task or tightly related group of tasks
3. update logs/state/task queue
4. list any human-required actions
5. avoid unrelated breakage

## Future Expansion

Possible future additions:

- budget-aware model routing
- asynchronous job queues
- runtime-specific agent pools
- deployment and rollback agents
- compliance or policy agents
