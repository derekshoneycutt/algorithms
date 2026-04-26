# Architecture Summary

This document summarizes the architecture of `ghcprompter-vscext` as a module system with clear ownership boundaries.

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
2. Webview renders host snapshots and sends typed write-intent messages.
3. Shared contracts define host/webview protocol shape.
4. Coordinator composes modules; domain logic remains in domain modules.

## 2. Tech Stack

1. Platform/runtime: VS Code extension host + webview frontend.
2. Language: TypeScript across host and frontend layers.
3. Frontend UI rendering: Lit (`lit`) in the webview UI layer.
4. Host state orchestration: XState (`xstate`) for host state machine/actor flow.
5. Build/bundle: npm scripts + esbuild for extension and webview bundles.
6. Testing: VS Code extension-host tests via `@vscode/test-electron` in the npm test pipeline.
7. Packaging/publishing: VSCE (`@vscode/vsce`) for extension packaging.
8. Linting/quality: ESLint for TypeScript and markdownlint for documentation.
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

Modules: `conductor`, `models`, `promptBuilder`, `state`, `view` (frontend prompt/UI behavior).

### 4.2 Boundary and Support Modules

Purpose: adapt domain behavior to runtime concerns.

Responsibilities: typed transport adaptation, asset discovery/loading, and notification routing.

Modules: `comms`, `filesystem`, `notifications`.

### 4.3 Composition Modules

Purpose: wire modules into a running system.

Responsibilities: startup ordering and integration wiring.

Modules: `coordinator`.

### 4.4 Utility Support Surfaces

Purpose: provide reusable support without domain ownership.

Responsibilities: generic helpers without accidental domain ownership.

Surfaces: shared templating helpers, general constants, content assets, tests.

## 5. Module Contracts

| Module | Why It Exists | Owns | Must Not Own | Primary Contracts |
| --- | --- | --- | --- | --- |
| `comms` | Typed host/webview messaging | [src/comms/shared/](src/comms/shared), [src/comms/backend/](src/comms/backend), [src/webview/frontend/comms/](src/webview/frontend/comms) | Workflow policy | `HostWebviewMessenger` |
| `conductor` | Host-side workflow and non-user-driven orchestration | [src/conductor/](src/conductor) | DOM, direct transport, direct filesystem I/O | `IConductorService`, `ConductorAiFillPorts` |
| `filesystem` | Packaged asset discovery, loading, and cache | [src/filesystem/](src/filesystem) | Prompt, state, or view domain behavior | `IDocumentDiscoveryService` |
| `models` | Model orchestration and providers | [src/models/](src/models), [src/models/providers/](src/models/providers) | UI rendering ownership | `AiFillTelemetryRecorder` |
| `notifications` | Host notification policy and routing | [src/notifications/](src/notifications) | Product domain decisions | `INotificationRouter` |
| `promptBuilder` | Prompt parse and render contracts | [src/promptBuilder/](src/promptBuilder) | VS Code or webview runtime concerns | PromptBuilder typed contracts and coordinator-wired utility closures |
| `state` | Canonical host state | [src/state/](src/state) | Asset I/O or UI rendering | `IHostStateService` |
| `view` | Webview provider, template, and frontend runtime | [src/views/](src/views), [src/webview/templates/](src/webview/templates), [src/webview/frontend/](src/webview/frontend) | Canonical workflow state | `IPromptBuilderSidebar`, `IPromptBuilderAiFillRuntime` |
| `coordinator` | Composition root | [src/coordinator.ts](src/coordinator.ts) | Deep domain logic | Composition wiring and concrete construction |

## 6. Runtime Flow

1. [src/extension.ts](src/extension.ts) activates extension runtime.
2. [src/coordinator.ts](src/coordinator.ts) loads assets and wires modules.
3. Host services (`state`, `conductor`, `notifications`, `models`) start.
4. `conductor` owns workflow availability, integrity, carryover, and host-side orchestration when the user is not driving directly.
5. During AI fill, `conductor` runs five stages (discovery, packet build, context-window, context enrichment, fill) through injected ports rather than direct model/filesystem/runtime imports.
6. Webview template and frontend bootstrap initialize UI runtime.
7. Frontend sends typed write-intent; host validates, updates state, and returns snapshots.

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
| `view` | Provider boundary | [src/views/](src/views/) | Bind VS Code view lifecycle to coordinator handoff. | No domain logic or canonical state ownership. |
| `view` | Template shell | [src/webview/templates/](src/webview/templates/) | Render static HTML shell with runtime injection points. | No runtime state decisions or host orchestration logic. |
| `view` | Frontend comms facade | [src/webview/frontend/comms/](src/webview/frontend/comms/) | Send and receive typed transport messages. | No workflow policy or DOM rendering. |
| `view` | Prompt bridge | [src/webview/frontend/prompts/](src/webview/frontend/prompts/) | Coordinate prompt-domain message handling and UI-intent flow. | No direct VS Code API transport calls or canonical host state ownership. |
| `view` | Notification bridge | [src/webview/frontend/notifications/](src/webview/frontend/notifications/) | Map host notification payloads into frontend presentation flow. | No severity policy ownership or workflow decisions. |
| `view` | UI rendering | [src/webview/frontend/ui/](src/webview/frontend/ui/) | Render DOM and interaction handlers. | No host transport policy or canonical workflow rules. |
| `models` | Orchestration service | [src/models/service.ts](src/models/service.ts) | Execute model request lifecycle and response handling. | No UI rendering or direct webview behavior ownership. |
| `models` | Provider adapters | [src/models/providers/](src/models/providers/) | Perform provider-specific API/auth integration. | No domain prompt policy or frontend logic. |
| `models` | Normalization/validation helpers | [src/models/normalization.ts](src/models/normalization.ts) | Parse and validate model output against expected contracts. | No transport orchestration ownership. |
| `models` | Telemetry surface | [src/models/telemetry.ts](src/models/telemetry.ts) | Record model request outcomes. | No routing or notification policy decisions. |
| `conductor` | Gating helpers | [src/conductor/gating.ts](src/conductor/gating.ts) | Compute workflow snapshot state from prompt graph and completion state. | No persistence or runtime orchestration ownership. |
| `conductor` | Carryover rules | [src/conductor/carryover.ts](src/conductor/carryover.ts) | Resolve downstream field patch operations from source field edits. | Declarative carryover logic only; no transport or UI behavior. |
| `conductor` | Integrity validation | [src/conductor/integrity.ts](src/conductor/integrity.ts) | Validate prompt catalog and section integrity before runtime use. | Validation only; no recovery policy or orchestration side effects. |
| `conductor` | Orchestration service | [src/conductor/service.ts](src/conductor/service.ts) | Own workflow state/snapshots, resolve carryover, and conduct host-side orchestration when the user is not driving directly. | No direct filesystem/model/runtime ownership; external work flows through ports. |
| `promptBuilder` | Parser | [src/promptBuilder/parser.ts](src/promptBuilder/parser.ts) | Parse Markdown definitions into typed prompt structures. | No rendering policy outside prompt text transformation. |
| `promptBuilder` | Renderer | [src/promptBuilder/renderer.ts](src/promptBuilder/renderer.ts) | Render prompt output from typed sections and values. | No runtime orchestration or transport ownership. |
| `promptBuilder` | Prompting helpers | [src/promptBuilder/prompting/](src/promptBuilder/prompting/) | Build prompt-fill request and display artifacts. | No provider execution ownership. |
| `comms` | Shared protocol | [src/comms/shared/](src/comms/shared/) | Define transport-agnostic message contracts and guards. | No host/frontend runtime side effects. |
| `comms` | Backend adapter | [src/comms/backend/](src/comms/backend/) | Adapt host-side message transport for webview. | No workflow/domain policy ownership. |
| `comms` | Frontend adapter | [src/webview/frontend/comms/](src/webview/frontend/comms/) | Adapt browser-side message transport. | No domain decision ownership. |

These are internal layers inside module boundaries, not separate top-level modules.

## 8. Dependency Rules

MUST rules:

1. Only [src/coordinator.ts](src/coordinator.ts) may construct or runtime-import concrete cross-module implementations.
2. All non-coordinator modules must depend on contract types (interfaces or ports), not concrete runtime imports.
3. Contracts must be defined by the provider module and consumed as injected dependencies.
4. Utility exception: any module may import `webview/assets` and `constants/`; only `view` may import `comms/shared`, via its explicit comms facade.
5. Port-bundle exception: method-level orchestration ports are allowed only when they contain contracts, not concrete implementations (e.g. `ConductorAiFillPorts`).
6. Violations must fail CI through targeted architecture assertions in [src/test/suite/index.ts](src/test/suite/index.ts).

Example:

1. `INotificationRouter` is defined in `notifications`, consumed as an injected contract in dependent modules, and concrete wiring remains in [src/coordinator.ts](src/coordinator.ts).

## 9. Where Code Goes

1. Messaging contracts/transports: [src/comms/](src/comms)
2. Workflow graph, carryover, integrity, and host-driven orchestration: [src/conductor/](src/conductor)
3. Packaged asset I/O/discovery: [src/filesystem/](src/filesystem)
4. Model orchestration/providers: [src/models/](src/models)
5. Notification policy/routing: [src/notifications/](src/notifications)
6. Prompt parsing/rendering: [src/promptBuilder/](src/promptBuilder)
7. Canonical host state: [src/state/](src/state)
8. Webview provider and frontend runtime: [src/views/](src/views), [src/webview/](src/webview)
9. Composition root: [src/coordinator.ts](src/coordinator.ts)
10. Utility support surfaces: [src/templating/](src/templating), [src/constants/](src/constants), [src/content/](src/content), [src/test/](src/test)

## 10. Summary

1. Domain modules own behavior.
2. Boundary/support modules adapt runtime concerns.
3. Composition modules wire the runtime.
4. Utility support surfaces provide shared support without domain ownership.
5. Coordinator is the sole composition root; it owns the concrete dependency graph.
6. `conductor` is a first-class domain owner; it conducts workflow transitions and host-side orchestration when the user is not driving directly.

Goal: clear ownership boundaries with flexible internal structure, without nanomodule fragmentation.
