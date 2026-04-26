# Architecture Summary

This document defines the bootstrap architecture for the new TypeScript-based algorithms VS Code extension in `vscextension/`.

The goal of this phase is not feature parity with the existing JavaScript extension in `extension/`. The goal is to stand up a clean, testable foundation with strong boundaries, a small runtime surface, and tooling that supports later migration work.

## 1. Bootstrap Goals

This bootstrap exists to establish the following:

1. A standalone TypeScript extension package in `vscextension/`.
2. A thin activation entrypoint in `src/extension.ts`.
3. A single composition root in `src/coordinator.ts`.
4. A minimal command slice that proves activation, registration, and user-visible behavior.
5. Build, lint, typecheck, test, and package workflows that work before broader migration begins.

## 2. Bootstrap Non-Goals

This phase intentionally does not include the following:

1. Feature parity with the existing extension in `extension/`.
2. Full sidebar migration (target shape is 5 panels, but only one bootstrap webview is implemented in this phase).
3. Full multi-panel Lit component library expansion.
4. Full multi-panel comms protocol expansion.
5. Full module expansion for `filesystem`, `models`, or other future domains.
6. Root-level repo script integration.

XState is now active for host state orchestration. The `state` module is the canonical host state owner.

If one of those concerns becomes necessary later, it should be added as a new vertical slice rather than pre-created as placeholder architecture.

## 3. Core Architectural Rules

The bootstrap architecture follows these rules:

1. `src/extension.ts` stays thin and delegates startup immediately.
2. `src/coordinator.ts` is the only composition root and the only place allowed to construct concrete services across module boundaries.
3. Feature code is organized by responsibility, not by speculative future layers.
4. Cross-module behavior should move through explicit contracts when a second implementation or consumer appears.
5. The first implementation should prefer a real vertical slice over empty folders and placeholder abstractions.
6. Every module exposes exactly one named DI interface as its public contract, following the naming convention `I<ModuleName>` (e.g. `IStateMachine` for the `state` module, `IExtensionCommands` for the `commands` module). That interface lives in its own file (`I<ModuleName>.ts`) inside the module folder and is the single entry point that consumers outside the module are allowed to depend on. Concrete implementations are wired only in the coordinator.
7. Every module has a module entrypoint file (`index.ts`) that re-exports its public surface so consumers import the module, not internal implementation files.

## 4. Initial Module Shape

The initial source tree should stay small.

| Module | Purpose | Owns | Must Not Own |
| --- | --- | --- | --- |
| `extension` | VS Code activation and shutdown handoff | Activation lifecycle entrypoints | Concrete feature wiring beyond delegation |
| `coordinator` | Composition root for the runtime | Startup wiring, command registration, state service construction, shared disposables | Deep feature logic |
| `commands` | User-invoked extension behavior | `IExtensionCommands` contract, module entrypoint (`src/commands/index.ts`), command registration helpers, and command handlers | Extension activation flow, canonical state, or unrelated future domains |
| `state` | Canonical host state | XState machine, lazy-start actor, `IStateMachine` contract, snapshot selectors | Filesystem I/O, command registration, or UI rendering |
| `languages` | Canonical language catalog and lookup behavior | Generated language data adapter, `ILanguages` contract, normalization/lookups by key, language ID, and extension | Command execution side effects, state transitions, UI rendering, or direct script invocation |
| `filesystem` | Canonical filesystem access and path safety behavior | `IFilesystem` contract, module entrypoint (`src/filesystem/index.ts`), path canonicalization helpers, and bounded file/directory operations | Command orchestration, extension state transitions, UI rendering, or language catalog ownership |
| `comms` | Canonical host-webview transport contracts and routing | `ICommunicationHub` contract, shared protocol contracts (`src/comms/shared`), and host-side message hub wiring | Workflow/domain policy ownership or direct UI rendering ownership |
| `notifications` | Canonical host-side notification routing | `INotificationRouter` contract, module entrypoint (`src/notifications/index.ts`), and VS Code notification adapter | Workflow policy ownership, view rendering ownership, or comms transport ownership |
| `views` | Canonical host-side view registration and interactions | `IViewHost` contract, module entrypoint (`src/views/index.ts`), one bootstrap webview provider, and webview template rendering | Command orchestration logic, canonical state ownership, filesystem policy ownership, or language catalog ownership |

Additional modules should be added only when a real responsibility boundary appears.

The current sidebar scope intentionally includes only one implemented webview. The planned target shape remains 5 panels total: 3 webviews and 2 file-based treeviews. Frontend structure is standardized now as shared webview base code plus panel-local `comms`, `ui`, and `bridges` layers.

The current notifications scope is intentionally host-only and VS Code-backed. Webview notification bridges and per-view targeting remain deferred.

Lit is the standard rendering layer for webview UI surfaces, with shared UI core primitives provided from `src/views/media/shared/ui/`.

## 5. Runtime Flow

1. VS Code activates the extension through a bootstrap command.
2. `src/extension.ts` hands control to `src/coordinator.ts`.
3. The coordinator constructs `IStateMachine`, `IExtensionCommands`, `IViewHost`, `ICommunicationHub`, and `INotificationRouter`, then registers the initial command set and one bootstrap webview provider.
4. `ICommunicationHub` receives typed view-to-host messages, applies host-side routing, and posts typed host-to-view snapshots.
5. The bootstrap frontend composes shared comms/runtime/UI-core base plus panel `comms`, `ui`, and `bridges` layers for transport, rendering, and glue logic.
6. On first command invocation the state machine starts lazily, receives a `COMMAND_REQUESTED` event, and the command derives its output from the resulting snapshot.
7. The command records the outcome back to the machine via `COMMAND_SUCCEEDED` or `COMMAND_FAILED`.
8. Tests validate activation, command registration, lazy machine startup, and state-derived message content.

## 6. Dependency Rules

The following rules apply from the first commit:

1. Only `src/coordinator.ts` may create concrete cross-module dependencies.
2. Modules outside the coordinator should not reach back into the activation layer.
3. Command handlers should stay focused on command behavior and depend on injected collaborators when shared behavior appears.
4. Utility code may be shared only when it removes duplication without taking ownership away from a clearer module.

## 7. Where New Code Goes

Code should go to these locations:

1. Activation entrypoint: `src/extension.ts`
2. Composition root: `src/coordinator.ts`
3. Command module entrypoint and command logic: `src/commands/` (public surface from `src/commands/index.ts`)
4. Canonical host state machine and service: `src/state/`
5. Canonical language catalog interface and helpers: `src/languages/`
6. Canonical filesystem interface and helpers: `src/filesystem/`
7. Canonical host-webview communication contracts and hub: `src/comms/`
8. Canonical host notification routing: `src/notifications/`
9. Canonical view host and provider wiring: `src/views/`
10. Webview templates and client assets authored in TypeScript (HTML/CSS/TS): `src/views/media/`
11. Shared webview frontend base (`comms`, runtime helpers, Lit UI core): `src/views/media/shared/`
12. Panel-local frontend layers (`comms`, `ui`, `bridges`): `src/views/media/<panel>/`
13. Compiled webview client bundles: `dist/views/`
14. Extension-host and unit tests: `test/`
15. Build and quality tooling: package-level config files in `vscextension/`

Do not create top-level directories for future domains until a migrated feature actually needs them.

## 8. Expansion Path

Once the bootstrap is stable, new modules can be introduced one slice at a time. The expected order is:

1. Add the first migrated feature from the current extension.
2. Introduce a new module only when that feature reveals a real ownership boundary.
3. Update this document alongside the new boundary so the written architecture stays aligned with the codebase.

## 9. Summary

The bootstrap architecture is intentionally narrow:

1. TypeScript first.
2. Thin activation.
3. Coordinator-owned composition.
4. Minimal real command slice.
5. No speculative module sprawl.

Success means the new extension package is small, clean, and executable, with room to grow without inheriting the current extension's coupling.
