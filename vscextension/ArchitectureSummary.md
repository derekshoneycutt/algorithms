# Architecture Summary

This document summarizes the architecture of `vscextension` as a module system with clear ownership boundaries.

## Table of Contents

- [1. System Snapshot](#1-system-snapshot)
- [2. Tech Stack](#2-tech-stack)
- [3. Design Philosophy](#3-design-philosophy)
- [4. Category Definitions](#4-category-definitions)
- [5. Module Contracts](#5-module-contracts)
- [6. Runtime Flow](#6-runtime-flow)
- [7. Internal Structure Policy](#7-internal-structure-policy)
- [8. Dependency Rules](#8-dependency-rules)
- [9. Where Code Goes](#9-where-code-goes)
- [10. Summary](#10-summary)

## 1. System Snapshot

The extension is host-authoritative:

1. Host owns canonical state and policy.
2. Webviews render host snapshots and send typed write-intent messages.
3. Shared contracts define host/webview protocol shape.
4. Coordinator composes modules; domain logic remains in domain modules.

Current UI scope is four sidebar panels:

1. Smoke Controls.
2. Run Controls.
3. Algorithms tree.
4. Standard Library tree.

## 2. Tech Stack

1. Platform/runtime: VS Code extension host + webview frontend.
2. Language: TypeScript across host and frontend layers.
3. Frontend UI rendering: Lit (`lit`) in webview UI layers.
4. Host state orchestration: XState (`xstate`) for host state machine/actor flow.
5. Build/bundle: npm scripts + webpack/esbuild pipeline for extension host and webview bundles.
6. Testing: VS Code extension-host tests through the npm test pipeline.
7. Packaging/publishing: VSCE (`@vscode/vsce`).
8. Linting/quality: ESLint + TypeScript typechecking.
9. Contracts/architecture: typed host-webview protocol in `src/comms/shared` with coordinator-owned DI via interface/port contracts.

## 3. Design Philosophy

Architecture uses four module categories:

1. Domain modules.
2. Boundary and support modules.
3. Composition modules.
4. Utility support surfaces.

Quality checks:

1. Distinct reason to change.
2. Distinct ownership boundary.
3. Distinct external contract.
4. Distinct failure modes.
5. Interface-first dependency flow: cross-module runtime behavior uses injected contracts, not concrete imports outside Coordinator.

## 4. Category Definitions

### 4.1 Domain Modules

Purpose: own product behavior and workflow rules.

Responsibilities: encode invariants, expose stable contracts, and avoid transport/composition ownership.

Modules: `commands`, `conductor`, `languages`, `state`.

### 4.2 Boundary and Support Modules

Purpose: adapt domain behavior to runtime concerns.

Responsibilities: typed transport adaptation, view lifecycle integration, filesystem/process boundaries, notification routing, and view classification for command dispatch.

Modules: `comms`, `views`, `notifications`, `filesystem`, `commandline`.

### 4.3 Composition Modules

Purpose: wire modules into a running system.

Responsibilities: startup ordering, concrete construction, interface binding, and subscription registration.

Modules: `coordinator`.

### 4.4 Utility Support Surfaces

Purpose: provide reusable support without domain ownership.

Responsibilities: generic helpers without accidental domain ownership.

Surfaces: `src/views/media/shared/`, `test/`.

## 5. Module Contracts

| Module | Why It Exists | Owns | Must Not Own | Primary Contracts |
| --- | --- | --- | --- | --- |
| `commands` | User-invoked extension behavior | `src/commands/`, command registration and command handlers | Canonical state ownership, view transport ownership | `IExtensionCommands` |
| `commandline` | Process execution boundary | `src/commandline/`, process handle abstraction and adapters | Workflow policy, UI ownership, host state ownership | `ICommandLine`, `ICommandLineProcessHandle` |
| `comms` | Typed host/webview messaging | `src/comms/shared/`, `src/comms/communicationHub.ts`, payload and publish helpers under `src/comms/builders/` | Workflow policy, orchestration policy, canonical state ownership | `ICommunicationHub` |
| `conductor` | Host-side workflow and orchestration | `src/conductor/`, reaction helpers, effect application helpers, channel handlers | Direct transport ownership, direct VS Code view ownership, canonical state storage | `IConductor` |
| `filesystem` | Filesystem boundary | `src/filesystem/`, path-safe host file operations | Product workflow decisions, transport ownership, UI rendering ownership | `IFilesystem` |
| `languages` | Canonical language catalog and lookup behavior | `src/languages/`, generated data adaptation, language lookup/normalization, smoke selection rules | Command execution ownership, transport ownership, UI rendering ownership | `ILanguages` |
| `notifications` | Host notification policy and routing | `src/notifications/`, notification adaptation and routing | Product domain decisions | `INotificationRouter` |
| `state` | Canonical host state | `src/state/`, XState machine/actor lifecycle and snapshot selectors | Asset I/O, transport ownership, UI rendering ownership | `IStateMachine` |
| `views` | Webview provider, tree provider, template, and frontend runtime | `src/views/`, `src/views/media/`, `src/views/trees/` | Canonical workflow state, orchestration policy, filesystem I/O presentation & triggering | `IViewHost` |
| `coordinator` | Composition root | `src/coordinator.ts` | Deep domain logic | Composition wiring and concrete construction |

## 6. Runtime Flow

1. `src/extension.ts` activates extension runtime.
2. `src/coordinator.ts` constructs concrete modules and binds them together.
3. `views` registers the Smoke Controls and Run Controls webviews plus the Algorithms and Standard Library tree providers, then connects VS Code view lifecycle to the host runtime.
4. `coordinator` wires `ICommunicationHub.subscribe` with conductor-owned channel handlers.
5. `comms` receives typed host/webview traffic and delivers inbound messages to subscribed handlers.
6. `conductor` owns ready/intent handling, computes reactions, applies state effects, dispatches notifications, and decides whether snapshots should be republished.
7. `comms.post` transports outbound snapshots back to the webview when asked.
8. `state` remains canonical throughout; snapshots are derived from host state rather than treated as source of truth.
9. Commands are registered from `commands`; command handlers derive output from host state and route user-visible status via `notifications`.

## 7. Internal Structure Policy

Modules may use internal vertical structure when it improves coherence.

Rules:

1. Prefer coherent internals over premature nanomodules.
2. Split modules only when ownership boundaries clearly diverge.
3. Keep internals scoped to module responsibility.

### 7.1 Notable Internal Structures

These internals are intentionally layered. Each row documents one layer's responsibility and explicit boundary.

| Module | Layer | Location | Responsibility | Boundary |
| --- | --- | --- | --- | --- |
| `views` | Provider boundary | `src/views/` | Bind VS Code view lifecycle to coordinator handoff. | No domain logic or canonical state ownership. |
| `views` | Shared frontend base | `src/views/media/shared/` | Shared webview runtime, typed frontend comms facade, and Lit UI support. | No host policy ownership or canonical host state ownership. |
| `views` | Smoke Controls panel | `src/views/media/smokeControls/` | Smoke panel bridge and UI rendering. | No canonical host state ownership or cross-panel policy ownership. |
| `views` | Run Controls panel | `src/views/media/runControls/` | Run panel bridge and UI rendering. | No canonical host state ownership or cross-panel policy ownership. |
| `views` | Tree providers | `src/views/trees/` | Algorithms and standard-library tree data providers, restricted file shaping, and context value assignment for command dispatch. | No canonical host state ownership or cross-panel policy ownership. Context values are derived from tree item properties (depth, type) and keyed to enable menu-driven command routing via `when` clauses. |
| `conductor` | Orchestration service | `src/conductor/service.ts` | Own intent reactions, effect application, and host-side channel handling. | No direct transport implementation ownership. |
| `comms` | Shared protocol | `src/comms/shared/` | Define transport-agnostic message contracts and guards. | No host/frontend runtime side effects. |
| `comms` | Transport hub | `src/comms/communicationHub.ts`, `src/comms/ICommunicationHub.ts` | Deliver subscribed messages and outbound transport posting. | No workflow/domain policy ownership. |
| `comms` | Payload/publish helpers | `src/comms/builders/` | Shape snapshots and construct transport-facing publish helpers. | No domain decision ownership. |
| `commandline` | Adapter layer | `src/commandline/adapters/` | Isolated process execution adapter boundary. | No workflow orchestration policy ownership. |
| `languages` | Generated catalog data | `src/languages/generated/` | Source language metadata consumed by the language service. | No state/transport ownership. |

These are internal layers inside module boundaries, not separate top-level modules.

## 8. Dependency Rules

The job of the Coordinator is to initate all modules and handle the dependency graph. All other logic should be in appropriate modules otherwise, linked through the dependency graph owned by Coordinator.

MUST rules:

1. Only `src/coordinator.ts` may construct or runtime-import concrete cross-module implementations.
2. All non-coordinator modules must depend on contract types (interfaces or ports), not concrete runtime imports.
3. Contracts must be defined by the provider module and consumed as injected dependencies.
4. Shared protocol exception: modules may import `src/comms/shared` for transport contract types and guards only, not transport implementation.
5. Webview frontend code may depend on shared frontend surfaces under `src/views/media/shared`, but not host-only module internals.
6. Coordinator may bind subscriptions and callbacks because that is dependency-graph wiring; Coordinator must not decide runtime behavior.
7. Conductor owns orchestration logic for reactions, effect application, and channel-handler behavior.
8. Comms is restricted to communication abstraction only: front/back transport, subscription delivery, message posting, and payload/publish helper support.
9. If comms decides behavior instead of forwarding or delivering, that is an architecture violation.
10. Violations should fail CI through targeted architecture assertions in the test suite.

Example:

1. `INotificationRouter` is defined in `notifications`, consumed as an injected contract in dependent modules, and concrete wiring remains in `src/coordinator.ts`.

## 9. Where Code Goes

1. Messaging contracts/transports: `src/comms/`
2. Host-side orchestration and channel handling: `src/conductor/`
3. Packaged asset I/O/discovery: `src/filesystem/`
4. Notification policy/routing: `src/notifications/`
5. Canonical host state: `src/state/`
6. User commands: `src/commands/`
7. Language catalog and lookups: `src/languages/`
8. Process execution boundary: `src/commandline/`
9. Webview provider and frontend runtime: `src/views/`, `src/views/media/`
10. Composition root: `src/coordinator.ts`
11. Utility support surfaces: `src/views/media/shared/`, `test/`

## 10. Summary

1. Domain modules own behavior.
2. Boundary/support modules adapt runtime concerns.
3. Composition modules wire the runtime.
4. Utility support surfaces provide shared support without domain ownership.
5. Coordinator is the sole composition root; it owns the concrete dependency graph and subscription wiring.
6. `conductor` is a first-class domain owner; it conducts workflow transitions and host-side orchestration.
7. `comms` is not a decision-maker; it is a transport abstraction.

Goal: clear ownership boundaries with flexible internal structure, without nanomodule fragmentation.
