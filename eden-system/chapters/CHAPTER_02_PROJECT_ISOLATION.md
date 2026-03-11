# Chapter 02 - Project Isolation

## Goal

Introduce a real boundary between Eden Core and project/business runtimes so Eden can host, link, and operate projects without mixing runtime code into the platform shell.

## Why This Chapter Exists

The current repo already models project blueprints, agents, hosting balance, and publish states. That is useful product scaffolding, but it is not runtime isolation. Without a runtime boundary, Eden risks turning project metadata into a false substitute for real deployment architecture.

## Required Systems

- runtime metadata separate from `ProjectBlueprint`
- access policy that distinguishes Eden Owner from Business Owner
- runtime type modeling for hosted, linked, and internal preview systems
- owner-only internal sandbox project for Eden-next development
- explicit environment modeling
- audit trail for runtime state changes

## Minimal Safe Implementation Path

1. Add runtime metadata models without changing existing blueprint behavior.
2. Add read models that show blueprint state and runtime state separately.
3. Add owner-only internal sandbox support as the first runtime use case.
4. Only after metadata and permissions are stable, add actual runtime launch/connect mechanics.

## Done Criteria

- a project can exist without implying a runtime exists
- a runtime can be marked as owner-only internal preview
- hosted runtime, linked external site, and internal preview concepts are all explicitly modeled
- Eden Core stores runtime metadata only, not business runtime code
- the next coding phase can build Eden-inside-Eden sandboxing on top of a clean control-plane model

## Main Risks

- treating project blueprint status as deployment truth
- putting project code or generated runtime state inside Eden core folders
- allowing general business roles to access the owner-only Eden sandbox
- mixing domain routing concerns with business metadata before runtime boundaries exist

## Dependencies

- Chapter 01 foundation clarity
- Prisma schema extension
- permission model review
- human approval of the sandbox/runtime strategy
