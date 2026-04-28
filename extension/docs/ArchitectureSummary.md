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
4. Bootstrap path is `extension.ts` -> `activator.ts` -> `coordinator.ts`; domain logic remains in domain modules.

Current UI scope is five sidebar panels:

1. Environment Controls.
2. Smoke Controls.
3. Run Controls.
4. Algorithms tree.
5. Standard Library tree.

## 2. Tech Stack

1. Platform/runtime: VS Code extension host + webview frontend.
2. Language: TypeScript across host and frontend layers.
3. Frontend UI rendering: Lit (`lit`) in webview UI layers.
4. Host state orchestration: XState (`xstate`) for host state machine/actor flow.
5. Build/bundle: npm scripts + webpack/esbuild pipeline for extension host and webview bundles.
6. Testing: VS Code extension-host tests through the npm test pipeline.
7. Packaging/publishing: VSCE (`@vscode/vsce`).
8. Linting/quality: ESLint + TypeScript typechecking.
9. Contracts/architecture: typed host-webview protocol in `src/comms/shared` with bootstrap-layer DI via interface/port contracts.

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
5. Interface-first dependency flow: cross-module runtime behavior uses injected contracts, not concrete imports outside the bootstrap layer.

## 4. Category Definitions

### 4.1 Domain Modules

Purpose: own product behavior and workflow rules.

Responsibilities: encode invariants, expose stable contracts, and avoid transport/composition ownership.

Modules: `algorithms`, `commands`, `conductor`, `languages`, `state`.

### 4.2 Boundary and Support Modules

Purpose: adapt domain behavior to runtime concerns.

Responsibilities: typed transport adaptation, view lifecycle integration, filesystem/process boundaries, notification routing, and view classification for command dispatch.

Modules: `comms`, `views`, `notifications`, `filesystem`, `commandline`.

### 4.3 Composition Modules

Purpose: wire modules into a running system.

Responsibilities: startup ordering, concrete construction, interface binding, and subscription registration.

Modules: `activator`, `coordinator`.

### 4.4 Utility Support Surfaces

Purpose: provide reusable support without domain ownership.

Responsibilities: generic helpers without accidental domain ownership.

Surfaces: `src/views/media/shared/`, `test/`.

## 5. Module Contracts

| Module | Why It Exists | Owns | Must Not Own | Primary Contracts |
| --- | --- | --- | --- | --- |
| `algorithms` | Algorithm and stdlib discovery | `src/algorithms/`, root-path resolution, category/entry/implementation discovery, stdlib entry discovery | View rendering, canonical state ownership, command execution | `IAlgorithmsIndex` |
| `commands` | User-invoked extension behavior | `src/commands/`, command registration and command handlers | Canonical state ownership, view transport ownership | `IExtensionCommands` |
| `commandline` | Process execution boundary | `src/commandline/`, process handle abstraction, adapters, and shell-profile internals | Workflow policy, UI ownership, host state ownership | `ICommandLine`, `ICommandLineProcessHandle` |
| `comms` | Typed host/webview messaging | `src/comms/shared/`, `src/comms/communicationHub.ts`, payload and publish helpers under `src/comms/builders/` | Workflow policy, orchestration policy, canonical state ownership | `ICommunicationHub` |
| `conductor` | Host-side workflow and orchestration | `src/conductor/`, reaction helpers, effect application helpers, channel handlers, and internal environment routing/ops | Direct transport ownership, direct VS Code view ownership, canonical state storage | `IConductor` |
| `filesystem` | Filesystem boundary | `src/filesystem/`, path-safe host file operations | Product workflow decisions, transport ownership, UI rendering ownership | `IFilesystem` |
| `languages` | Canonical language catalog and lookup behavior | `src/languages/`, generated data adaptation, language lookup/normalization, smoke selection rules | Command execution ownership, transport ownership, UI rendering ownership | `ILanguages` |
| `notifications` | Host notification policy and routing | `src/notifications/`, notification adaptation and routing | Product domain decisions | `INotificationRouter` |
| `state` | Canonical host state | `src/state/`, XState machine/actor lifecycle, snapshot selectors, and filter/view mode selectors | Asset I/O, transport ownership, UI rendering ownership | `IStateMachine` |
| `views` | Webview provider, tree provider, template, and frontend runtime | `src/views/`, `src/views/media/` (environment/smoke/run panels), `src/views/media/shared/`, `src/views/trees/` | Canonical workflow state, orchestration policy, filesystem I/O presentation & triggering | `IViewHost` |
| `activator` | Activation-time bootstrap construction | `src/activator.ts`, workspace-folder discovery, runtime service graph construction, startup-side effects | Workflow orchestration policy, view/channel/command behavior policy | `ActivationServicesGraph` |
| `coordinator` | Host wiring and disposable assembly | `src/coordinator.ts`, view/channel/command wiring and root disposable assembly from prebuilt services | Deep domain logic, runtime graph construction, workflow orchestration policy | `vscode.Disposable` |

## 6. Runtime Flow

1. `src/extension.ts` activates extension runtime.
2. `src/activator.ts` discovers activation-time host inputs, constructs the runtime service graph, and performs startup-side effects.
3. `src/coordinator.ts` receives that graph and wires views, channels, commands, and the root disposable into VS Code.
4. `views` registers the Environment Controls, Smoke Controls, and Run Controls webviews plus the Algorithms and Standard Library tree providers, then connects VS Code view lifecycle to the host runtime.
5. `coordinator` wires `ICommunicationHub.subscribe` with conductor-owned channel handlers.
6. `comms` receives typed host/webview traffic and delivers inbound messages to subscribed handlers.
7. `conductor` owns ready/intent handling, computes reactions, applies state effects, dispatches notifications, and decides whether snapshots should be republished.
8. `comms.post` transports outbound snapshots back to the webview when asked.
9. `state` remains canonical throughout; snapshots are derived from host state rather than treated as source of truth.
10. Commands are registered from `commands`; command handlers derive output from host state and route user-visible status via `notifications`.

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
| `views` | Environment Controls panel | `src/views/media/environmentControls/` | Environment panel bridge and UI rendering. | No canonical host state ownership or cross-panel policy ownership. |
| `views` | Smoke Controls panel | `src/views/media/smokeControls/` | Smoke panel bridge and UI rendering. | No canonical host state ownership or cross-panel policy ownership. |
| `views` | Run Controls panel | `src/views/media/runControls/` | Run panel bridge and UI rendering. | No canonical host state ownership or cross-panel policy ownership. |
| `views` | Tree providers | `src/views/trees/` | Algorithms and standard-library tree data providers, restricted file shaping, and context value assignment for command dispatch. | No canonical host state ownership or cross-panel policy ownership. Context values are derived from tree item properties (depth, type) and keyed to enable menu-driven command routing via `when` clauses. |
| `conductor` | Orchestration service | `src/conductor/service.ts` | Own intent reactions, effect application, and host-side channel handling. | No direct transport implementation ownership. |
| `conductor` | Environment subsystem | `src/conductor/environment/` | Environment variable adaptation, environment channel handling, and environment operation helpers. | No direct transport implementation ownership. |
| `conductor` | Runner subsystem | `src/conductor/runner/` | Shared run/smoke helpers for run registries, run execution flow, output parsing, and reaction/effect utilities. | No direct transport implementation ownership or canonical state ownership. |
| `conductor` | Channel shared types | `src/conductor/channels/` | Shared channel-handler dependency types and cross-channel wiring contracts. | No domain workflow decision ownership. |
| `comms` | Shared protocol | `src/comms/shared/` | Define transport-agnostic message contracts and guards. | No host/frontend runtime side effects. |
| `comms` | Transport hub | `src/comms/communicationHub.ts`, `src/comms/ICommunicationHub.ts` | Deliver subscribed messages and outbound transport posting. | No workflow/domain policy ownership. |
| `comms` | Payload/publish helpers | `src/comms/builders/` | Shape snapshots and construct transport-facing publish helpers. | No domain decision ownership. |
| `commandline` | Adapter layer | `src/commandline/adapters/` | Isolated process execution adapter boundary. | No workflow orchestration policy ownership. |
| `commandline` | Shell profile internals | `src/commandline/internal/` | Platform-aware shell profile parsing, catalog lookup, and profile-writing helpers. | No workflow orchestration policy ownership. |
| `state` | Mode selectors | `src/state/filterMode.ts`, `src/state/viewMode.ts` | Host-side view/filter mode representation and selectors. | No transport or filesystem ownership. |
| `languages` | Generated catalog data | `src/languages/generated/` | Source language metadata consumed by the language service. | No state/transport ownership. |

These are internal layers inside module boundaries, not separate top-level modules.

## 8. Dependency Rules

The bootstrap layer owns runtime construction and host wiring. Domain and support logic should remain in the appropriate modules and connect through provider-owned contracts.

MUST rules:

1. Only `src/activator.ts` may construct concrete cross-module implementations for the host runtime graph.
2. `src/coordinator.ts` may wire and subscribe prebuilt services, but should not rebuild runtime graph construction.
3. All non-bootstrap modules must depend on contract types (interfaces or ports), not concrete runtime imports.
4. Contracts must be defined by the provider module and consumed as injected dependencies.
5. Shared protocol exception: modules may import `src/comms/shared` for transport contract types and guards only, not transport implementation.
6. Webview frontend code may depend on shared frontend surfaces under `src/views/media/shared`, but not host-only module internals.
7. Coordinator may bind subscriptions and callbacks because that is host wiring; Coordinator must not decide runtime behavior.
8. Conductor owns orchestration logic for reactions, effect application, and channel-handler behavior.
9. Comms is restricted to communication abstraction only: front/back transport, subscription delivery, message posting, and payload/publish helper support.
10. If comms decides behavior instead of forwarding or delivering, that is an architecture violation.
11. Violations should fail CI through targeted architecture assertions in the test suite.

Example:

1. `INotificationRouter` is defined in `notifications`, consumed as an injected contract in dependent modules, constructed in `src/activator.ts`, and wired into host subscriptions in `src/coordinator.ts`.

## 9. Where Code Goes

1. Messaging contracts/transports: `src/comms/`
2. Host-side orchestration and channel handling: `src/conductor/` (including `src/conductor/environment/`, `src/conductor/runner/`, and `src/conductor/channels/`)
3. Packaged asset I/O/discovery: `src/filesystem/`
4. Notification policy/routing: `src/notifications/`
5. Canonical host state and mode selectors: `src/state/`
6. User commands: `src/commands/`
7. Language catalog and lookups: `src/languages/`
8. Process execution boundary and shell-profile internals: `src/commandline/`
9. Algorithm and stdlib discovery: `src/algorithms/`
10. Webview provider and frontend runtime: `src/views/`, `src/views/media/`, `src/views/trees/`
11. Activation-time runtime construction and startup side effects: `src/activator.ts`
12. Host wiring and root disposable assembly: `src/coordinator.ts`
13. Utility support surfaces: `src/views/media/shared/`, `test/`

## 10. Summary

1. Domain modules own behavior.
2. Boundary/support modules adapt runtime concerns.
3. Composition modules wire the runtime.
4. Utility support surfaces provide shared support without domain ownership.
5. Bootstrap is split: Activator constructs activation-time runtime services; Coordinator wires those services into host registrations and root disposal.
6. `conductor` is a first-class domain owner; it conducts workflow transitions and host-side orchestration.
7. `comms` is not a decision-maker; it is a transport abstraction.

Goal: clear ownership boundaries with flexible internal structure, without nanomodule fragmentation.
