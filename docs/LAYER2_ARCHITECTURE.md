# Eden Layer 2 — Inner Simulation

## Architecture

**Layer 1** = edencloud.app (public, users, live economy)
**Layer 2** = Eden Inner (private, agents only, simulation)

## How it works

1. Agents in Layer 2 design and test changes in an isolated simulation
2. Layer 2 runs a simulated version of Eden with fake users and data
3. When Layer 2 is satisfied with the result, it creates a Layer 1 PR
4. Sonny reviews the PR and approves or denies
5. That is Sonny's ONLY interaction with the build process

## Sonny's role

> "I approve the plot, Eden writes the book"

Sonny does not write code, design systems, or debug issues. Eden's agents handle all of that autonomously. Sonny's single responsibility is reviewing the output at the PR level and deciding: merge or reject.

## API surface

- `GET /api/layer2/status` — current simulation state, pending approvals
- `POST /api/layer2/submit` — Layer 2 submits work to Layer 1 (creates pending approval)
- `POST /api/layer2/approve` — Sonny approves or denies a submission

## Approval flow

```
Layer 2 agents → simulate → test → PR created → /api/layer2/submit
                                                        ↓
                                                  Approval dashboard
                                                  /layer2 (owner only)
                                                        ↓
                                              Sonny clicks Approve/Deny
                                                        ↓
                                                /api/layer2/approve
                                                        ↓
                                          PR merged or closed via GitHub API
```

## Design principles

- Layer 2 is fully autonomous — it designs, builds, tests, and validates
- Layer 1 only changes when Sonny explicitly approves
- The approval dashboard shows confidence scores so Sonny can prioritize
- Every submission includes a summary of what was simulated and changed
