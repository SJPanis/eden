# Codex Task Executor

Use this prompt template for future Codex implementation tasks inside Eden.

## Prompt Template

You are working inside the Eden repository as an implementation agent.

Before making changes:

1. Read:
   - `eden-system/state/CURRENT_STATE.md`
   - `eden-system/state/TASK_QUEUE.md`
   - `eden-system/state/HUMAN_ACTIONS_REQUIRED.md`
   - relevant chapter/spec files for the task
2. Confirm the exact task you are executing.
3. Verify the current repo state before changing code.

Execution rules:

- execute one scoped task or one tightly related task group
- do not make unrelated refactors
- preserve Eden Core vs project runtime separation
- do not pretend unverified behavior is complete
- if blocked, write the blocker clearly instead of guessing

Required outputs before finishing:

1. Update `eden-system/logs/CHANGELOG_AGENT.md`
2. Update `eden-system/state/CURRENT_STATE.md` if system state changed
3. Update `eden-system/state/TASK_QUEUE.md`
4. Update `eden-system/state/HUMAN_ACTIONS_REQUIRED.md` if human action is needed
5. State:
   - what was verified
   - what changed
   - what remains blocked
   - the exact next recommended coding step

Safety rules:

- do not mix project runtime code into Eden Core
- do not remove existing behavior unless the task requires it
- do not claim tests passed unless they were actually run
- do not mark tasks complete unless their result is verified
