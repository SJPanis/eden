# Eden Master Spec

Last updated: 2026-03-11

## Purpose

Eden is the platform shell and control plane for discovering, creating, operating, and launching AI-enabled products and businesses. Eden itself is not the business runtime. Eden owns orchestration, identity, billing context, publish control, and marketplace visibility. Businesses and projects created inside Eden must run outside Eden core so they cannot corrupt or blur the platform shell.

## Core System Layers

### 1. Eden Core

Eden Core is the control plane.

Responsibilities:

- authentication and role resolution
- owner oversight and platform controls
- business and project metadata
- marketplace search and discovery
- billing, ledger, payout, and usage accounting
- orchestration of AI agents and project workflows
- launch and publication control
- state, logs, memory, and execution history

Eden Core must not become the place where user project code lives.

### 2. Project Runtime Layer

The Project Runtime Layer is where a user business or project actually runs.

Examples:

- an Eden-hosted internal preview runtime
- an Eden-hosted customer-facing runtime
- a linked external runtime or domain
- a future container, VM, repo workspace, or isolated deployment target

Rules:

- runtime code is isolated from Eden core
- runtime failures must not damage Eden core data or code
- runtime deployment state is represented in Eden as metadata, not mixed application logic

### 3. User Experience Layer

The User Experience Layer is the set of Eden surfaces users interact with.

Current product directions:

- public entry and sign-in
- consumer discovery and service execution
- business workspace and project-building surfaces
- owner dashboard and platform controls

Future direction:

- a unified operator layer where human intent, AI work, and launch workflows meet through Eden

## Role Model

### Eden Owner

Platform-level authority.

Responsibilities:

- system oversight
- approvals and freezes
- ledger and payout inspection
- infrastructure and security control
- management of internal Eden sandbox projects

### Business Owner / Builder

Business-scoped operator.

Responsibilities:

- create and manage businesses, services, and project blueprints
- manage business-scoped agents and future runtimes
- publish business outputs into Eden

### Consumer

Marketplace user.

Responsibilities:

- search, evaluate, and run published services
- manage wallet and usage
- interact with Eden discovery and operator surfaces

## Ownership Separation

Eden Owner control is separate from Business Owner control.

- Eden Owner controls the platform.
- Business Owner controls a business scope.
- A business cannot gain platform-level authority by virtue of owning or building inside Eden.
- Internal Eden sandbox projects are controlled by the Eden Owner, not by general business users.

## Project Isolation Philosophy

Project and business systems must not live mixed into Eden core app logic.

Required boundary:

- Eden stores metadata, routing, orchestration state, permissions, billing links, launch links, and status.
- The actual project runtime, code execution, build workspace, and deployment artifacts live in isolated environments.

This means:

- no direct storage of arbitrary business runtime code inside Eden Core app folders
- no assumption that a project blueprint equals a runtime
- no assumption that publication metadata equals deployment

## AI Orchestration Intent

Eden is intended to evolve into a multi-model, multi-agent orchestration platform.

High-level intent:

- a main Eden planner/router at the platform layer
- scoped worker agents operating within a project or business context
- QA and validation agents
- ledger and state-writing agents
- durable task/state updates after each execution unit

Agents must operate against project scope, not against arbitrary Eden core files.

## Open-Source Philosophy

Default direction:

- Eden Core may be open source
- user businesses and project runtimes remain private by default
- shared templates, adapters, and public specifications can be open
- deployment secrets, customer data, and business code remain isolated and private

## Security Direction

High-level principles:

- least privilege between platform and project runtime
- explicit owner-only controls for internal platform sandboxing
- auditable actions for payments, payouts, grants, and runtime changes
- clear separation between metadata writes and runtime execution
- future secrets handling outside general project metadata records

## Deployment Direction

Eden should support:

- linked external domains
- Eden-hosted instances
- internal preview instances
- owner-only internal Eden sandbox instances

Every deployed project should have a clearly modeled status, runtime type, access policy, and environment boundary.

## Current Reality

As of 2026-03-11, the repo partially implements Eden Core and user-facing layers, but it does not yet implement true project runtime isolation. Current project blueprints and agent runs are still platform metadata and simulated workflow scaffolding inside the Eden app.
