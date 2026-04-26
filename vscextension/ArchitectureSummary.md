# Architecture Summary

This document summarizes the architecture of `vscextension` as a module system with explicit ownership boundaries and coordinator-only composition.

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

The extension runtime is host-authoritative:

1. Host owns canonical state and policy.
2. Webviews render host snapshots and send typed write-intent messages.
3. Shared contracts define host/webview protocol shape.
4. Coordinator composes module implementations; policy and behavior remain in domain modules.

Current UI scope is two sidebar webviews:

1. Smoke Controls.
2. Run Controls.

## 2. Tech Stack

1. Platform/runtime: VS Code extension host + webview frontend.
2. Language: TypeScript across host and frontend layers.
3. Frontend UI rendering: Lit (`lit`) in webview UI layers.
4. Host state orchestration: XState (`xstate`) for host machine/actor flow.
5. Build/bundle: npm scripts + webpack/esbuild pipeline for extension host and webview bundles.
6. Testing: VS Code extension-host tests through the npm test pipeline.
7. Packaging/publishing: VSCE (`@vscode/vsce`).
8. Linting/quality: ESLint + TypeScript typechecking.
9. Contracts/architecture: typed host-webview protocol in `src/comms/shared` with coordinator-owned DI wiring.

## 3. Design Philosophy

Architecture uses four module categories:

1. Domain modules.
2. Boundary/support modules.
3. Composition modules.
4. Utility/support surfaces.

Quality checks for adding or splitting modules:

1. Distinct reason to change.
2. Distinct ownership boundary.
3. Distinct external contract.
4. Distinct failure modes.
5. Interface-first dependency flow: cross-module behavior depends on injected contracts, not concrete imports outside coordinator wiring.

## 4. Category Definitions

### 4.1 Domain Modules

Purpose: own product behavior and workflow policy.

Responsibilities: encode invariants, validate/transform intent, and expose stable contracts.

Modules:

1. `state`
2. `conductor`
3. `commands`
4. `languages`

### 4.2 Boundary and Support Modules

Purpose: adapt domain behavior to runtime boundaries.

Responsibilities: transport adaptation, filesystem/process boundaries, notification routing, and view-host adaptation.

Modules:

1. `comms`
2. `views`
3. `notifications`
4. `filesystem`
5. `commandline`

### 4.3 Composition Modules

Purpose: wire modules into a running extension.

Responsibilities: startup ordering, construction of concrete dependencies, and integration lifecycle.

Modules:

1. `coordinator`
2. `extension`

### 4.4 Utility Support Surfaces

Purpose: reusable support that does not own domain policy.

Responsibilities: generated data, frontend shared runtime/UI primitives, and test scaffolding.

Surfaces:

1. `src/views/media/shared/`
2. `test/`

## 5. Module Contracts

| Module | Why It Exists | Owns | Must Not Own | Primary Contracts |
| --- | --- | --- | --- | --- |
| `commands` | User-invoked extension behavior | `src/commands/`, command registration and command handlers | Canonical state ownership, view transport ownership | `IExtensionCommands` |
| `commandline` | Process execution boundary | `src/commandline/`, process handle abstraction, adapters | Workflow policy, UI ownership, host state ownership | `ICommandLine`, `ICommandLineProcessHandle` |
| `comms` | Typed host/webview transport and routing | `src/comms/shared`, message hub wiring, payload builders | Domain policy ownership, canonical state ownership | `ICommunicationHub` |
| `conductor` | Host reaction/orchestration policy | `src/conductor/`, typed intent reactions and effects | Direct transport ownership, direct VS Code view ownership, canonical state storage | `IConductor` |
| `filesystem` | Filesystem boundary | `src/filesystem/`, path-safe host file operations | Workflow policy, transport ownership, UI rendering ownership | `IFilesystem` |
| `languages` | Canonical language catalog and lookup behavior | `src/languages/`, generated data adaptation, language lookup/normalization | Command execution ownership, transport ownership, UI rendering ownership | `ILanguages` |
| `notifications` | Host notification routing | `src/notifications/`, VS Code notification adaptation | Product workflow policy ownership, view-state ownership | `INotificationRouter` |
| `state` | Canonical host runtime state | `src/state/`, XState machine/actor lifecycle, snapshot selectors | Filesystem/process side effects, transport ownership, UI rendering ownership | `IStateMachine` |
| `views` | Host-side webview registration and host-view bridge | `src/views/`, webview provider lifecycle, template rendering, message ingress/egress bridge | Canonical workflow policy ownership, canonical state storage ownership | `IViewHost` |
| `coordinator` | Composition root | `src/coordinator.ts`, concrete construction and cross-module wiring | Deep domain policy and module-internal ownership | Composition wiring only |

## 6. Runtime Flow

1. `src/extension.ts` activates the extension and delegates to `createCoordinator`.
2. `src/coordinator.ts` constructs concrete modules (`languages`, `state`, `conductor`, `notifications`, `views`, `comms`, `commands`) and registers host resources.
3. `views` registers Smoke Controls and Run Controls webview providers and bridges inbound/outbound messages.
4. `comms` subscribes per-view channels and forwards typed view messages into coordinator handlers.
5. On `smoke.ready` and `run.ready`, coordinator publishes typed snapshots derived from `state`.
6. On `smoke.intent` and `run.intent`, coordinator calls `conductor` reaction methods with current state snapshot.
7. `conductor` returns deterministic effects: state events, optional notification effect, and snapshot-publish signal.
8. Coordinator applies returned state events through `state`, routes optional notifications via `notifications`, and publishes updated snapshots through `comms` when requested.
9. Commands are registered from `commands`; command handlers derive output from host state and route user-visible status via `notifications`.

## 7. Internal Structure Policy

Modules may keep internal vertical layers where it improves cohesion without creating top-level sprawl.

Rules:

1. Prefer coherent module internals over premature top-level module creation.
2. Split a module only when ownership boundaries diverge in a durable way.
3. Keep internal layers scoped to module responsibility and exported through module entrypoints.

### 7.1 Notable Internal Structures

| Module | Layer | Location | Responsibility | Boundary |
| --- | --- | --- | --- | --- |
| `views` | Shared frontend base | `src/views/media/shared/` | Shared webview runtime, typed frontend comms facade, and Lit UI core | No host policy ownership or canonical host state ownership |
| `views` | Smoke Controls panel | `src/views/media/smokeControls/` | Smoke panel comms, bridge, and UI rendering | No host canonical state ownership or cross-panel policy ownership |
| `views` | Run Controls panel | `src/views/media/runControls/` | Run panel comms, bridge, and UI rendering | No host canonical state ownership or cross-panel policy ownership |
| `comms` | Shared protocol | `src/comms/shared/` | Transport-agnostic message contracts and guards | No domain side effects |
| `comms` | Payload builders | `src/comms/builders/` | Typed host->view snapshot payload shaping support | No workflow policy ownership |
| `commandline` | Adapter layer | `src/commandline/adapters/` | Isolated process execution adapter boundary | No workflow orchestration policy ownership |
| `languages` | Generated catalog data | `src/languages/generated/` | Source language metadata consumed by language service | No state/transport ownership |

`src/runtime/` currently exists as a staging surface (`adapters/`, `builders/`) and is not part of the active module contract graph until concrete production responsibilities are wired through coordinator.

## 8. Dependency Rules

Coordinator scope directive (non-negotiable):

"The job of the Coordinator is to initate all modules and handle the dependency graph. Anything else you're trying to do in Coordinator you need to go fuck yoruself."

MUST rules:

1. Only `src/coordinator.ts` may construct concrete cross-module implementations.
2. Non-coordinator modules must depend on contract types or local internals, not concrete runtime imports from other modules.
3. Contracts are defined by provider modules and consumed via injection in coordinator wiring.
4. Host/webview protocol shape is centralized in `src/comms/shared`.
5. Webview frontend code may depend on shared frontend surfaces under `src/views/media/shared`, but not host-only module internals.
6. New top-level modules require explicit ownership justification and architecture-doc updates in the same change.

## 9. Where Code Goes

1. Activation/deactivation entrypoints: `src/extension.ts`
2. Composition wiring and runtime integration: `src/coordinator.ts`
3. User command registration/handlers: `src/commands/`
4. Canonical host state machine and snapshots: `src/state/`
5. Host intent reaction/orchestration policy: `src/conductor/`
6. Language catalog and lookups: `src/languages/`
7. Filesystem boundary code: `src/filesystem/`
8. Process execution boundary code: `src/commandline/`
9. Host/webview protocol and host message hub: `src/comms/`
10. Host notification routing: `src/notifications/`
11. Host-side view registration and webview hosting: `src/views/`
12. Webview panel assets and panel-local runtime/UI: `src/views/media/`
13. Webview bundles: `dist/views/`
14. Tests and architecture assertions: `test/`

## 10. Summary

1. Domain modules own behavior and policy (`state`, `conductor`, `commands`, `languages`).
2. Boundary/support modules adapt runtime edges (`comms`, `views`, `notifications`, `filesystem`, `commandline`).
3. Coordinator is the sole composition root for concrete dependency wiring.
4. Host remains canonical; webviews render snapshots and send typed write-intent.
5. Architecture grows by real ownership boundaries, not speculative top-level module expansion.
