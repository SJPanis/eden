# Project Isolation Model

Last updated: 2026-03-11

## Objective

Define how Eden Core and project systems remain separate so businesses created inside Eden do not live inside Eden's own application runtime or codebase.

## Core Boundary

### Eden Core owns

- users, auth, and permissions
- businesses and project metadata
- marketplace indexing and discovery
- billing, usage, and payouts
- orchestration state
- runtime metadata
- launch status and audit logs

### Project Runtime owns

- application code
- runtime processes
- environment execution
- deployment artifacts
- runtime filesystem state
- per-runtime secrets
- runtime-specific process control

Eden Core should know about a runtime, not be the runtime.

## Metadata vs Runtime

### Metadata stored in Eden

- project blueprint
- project owner/business linkage
- runtime type
- runtime status
- visibility/access policy
- environment labels
- external domain links
- Eden-managed hostnames
- runtime health summary
- audit and launch history

### Runtime state stored outside Eden core app logic

- source code
- container image or workspace contents
- build output
- runtime filesystem state
- per-runtime secrets
- runtime-specific process control

## Required Concepts

### Project Blueprint

Purpose:

- business intent
- goal, description, scoped agents
- pre-runtime planning and workflow state

Blueprints can exist with no runtime.

### Project Runtime

Purpose:

- represent an actual isolated execution target

Suggested minimum fields:

- `id`
- `projectBlueprintId`
- `runtimeType`
- `environment`
- `accessPolicy`
- `status`
- `managedBy`
- `runtimeLocator`
- `lastHealthCheckAt`

### Project Domain Link

Purpose:

- map a project runtime to either an Eden-managed URL or an external linked domain

Suggested types:

- `eden_managed`
- `linked_external`
- `internal_preview`

### Project Environment

Suggested environments:

- `development`
- `staging`
- `production`

The first internal Eden sandbox should use `development` or `staging`, not `production`.

## Runtime Types

### Internal Preview

- private
- owner-only or tightly scoped
- used for experiments and pre-launch preview
- first target for "Eden inside Eden"

### Eden Hosted

- managed by Eden
- publicly reachable through Eden-managed infrastructure
- still isolated from Eden Core

### Linked External

- managed outside Eden
- Eden stores metadata, status, and launch links only

## Access Policies

### Owner Only

- only Eden Owner can access
- used for Eden internal sandbox projects

### Business Scoped

- available to business members
- not platform-wide

### Public Launch

- publicly reachable through a domain or hosted endpoint
- still managed through runtime metadata and explicit publish state

## Eden Inside Eden Sandbox

The private "Eden inside Eden" development system should be implemented as:

- an internal project blueprint owned by the Eden Owner
- a separate isolated runtime record
- owner-only access policy
- Eden-managed internal preview locator
- explicit non-public status

It must not be implemented as:

- more code mixed into Eden core routes
- a disguised feature flag inside the main shell
- a new business workspace that shares Eden core runtime execution

## Minimum Implementation Recommendation

First build only the control-plane pieces:

1. new runtime metadata tables
2. owner-only sandbox policy
3. runtime/environment/domain read models
4. UI surfaces that show blueprint vs runtime clearly

Only after that should Eden start any actual isolated runtime process.
