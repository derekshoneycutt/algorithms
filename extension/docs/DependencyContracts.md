# Dependency Contracts

Source of truth for module dependency contracts: provider interfaces, consumers, and boundary rules.

Planner Quick Start:

- Non-negotiables: contract-first imports, bootstrap-only construction, and no circular dependencies.
- Primary graph: Section 2 (`Dependency Flows (Module DAG)`).
- Checklist: Section 8 (`Verification Checklist`).
- Enforcement and examples: Sections 5 and 9.

## Table of Contents

- [1. Module Provider Contract Matrix](#1-module-provider-contract-matrix)
- [2. Dependency Flows (Module DAG)](#2-dependency-flows-module-dag)
- [3. Run/Target Contract Semantics](#3-runtarget-contract-semantics)
- [4. Architectural Rules (Normative)](#4-architectural-rules-normative)
- [5. Contract Enforcement](#5-contract-enforcement)
- [6. Module Boundary Quick Rules (High-Risk Deltas)](#6-module-boundary-quick-rules-high-risk-deltas)
- [7. Contract Changes & Versioning](#7-contract-changes--versioning)
- [8. Verification Checklist](#8-verification-checklist)
- [9. Examples: Correct vs. Incorrect Imports](#9-examples-correct-vs-incorrect-imports)
- [10. Where Code Goes](#10-where-code-goes)

---

## 1. Module Provider Contract Matrix

| Module | Primary Interface | Secondary Interfaces | Consumers | Notes |
| ------ | ----------------- | -------------------- | --------- | ----- |
| **state** | `IStateMachine` | `IViewModeService`, `IFilterModeService` | views, commands, conductor, comms | XState machine; immutable canary factory |
| **filesystem** | `IFilesystem` | `IEligibilityResolver`, `FilesystemStateBridge` | conductor, algorithms, state, views; notifier | Cross-platform file ops; cache TTL control; marker-fast and canary-full eligibility helpers |
| **algorithms** | `IAlgorithmsIndex` | `IRootPathResolver` | commands, views; conductor (for repo root) | Algorithm tree discovery, caching; root resolution |
| **languages** | `ILanguages` | (none) | conductor, algorithms, comms, views | Immutable language catalog; normalization |
| **commandline** | `ICommandLine` | `IAlgorithmsTerminalRunAdapter` | conductor, commandline handlers | Shell profile read/write; platform helpers |
| **conductor** | `IConductor` | (none, but exports internal reaction factories) | commands, views, comms, notifications | Workflow orchestration; run/smoke management |
| **activator** | `ActivationServicesGraph` | `createActivationServices` | extension.ts, coordinator | Activation-time runtime graph construction; startup side effects |
| **coordinator** | `vscode.Disposable` | `createCoordinator` | extension.ts bootstrap | Wires views, channels, commands, and root disposal from a prebuilt graph |
| **commands** | `IExtensionCommands` | (none) | coordinator | 38+ command constructors; all interfaces injected |
| **views** | `IViewHost` | `ICommunicationHub`, tree providers, watcher adapter | comms, conductor (for status), state (for modes) | VS Code view lifecycle; webview adapter |
| **comms** | `ICommunicationHub` | (none, but snapshot builders exported) | conductor, views | Host ↔ webview messaging; type-safe frames |
| **notifications** | `INotificationRouter` | `IConductorNotificationDispatcher` | conductor, commands | Info/warn/error facade over vscode.window.* |

---

## 2. Dependency Flows (Module DAG)

### Bootstrap Boundary

**Activator + Coordinator** form the extension bootstrap boundary:

- **Activator** builds activation-time domain services.
- **Coordinator** consumes that graph and wires host-facing registrations.
- Together they separate domain construction from VS Code registration policy.

### Domain Module Dependency Graph

```text
extension.ts (VS Code entrypoint)
├─ creates activator → ActivationServicesGraph
│  ├─ creates state → IStateMachine (XState machine)
│  ├─ creates filesystem → IFilesystem (with cache TTL from state)
│  │  └─ provides IEligibilityResolver (workspace folder eligibility)
│  ├─ creates languages → ILanguages (immutable records)
│  ├─ creates rootPathResolver → IRootPathResolver (algorithms + stdlib discovery)
│  ├─ creates eligibilityResolver → IEligibilityResolver (sidebar state, cache invalidation)
│  ├─ creates conductor → IConductor
│  │  ├─ receives: IFilesystem, ICommandLine, IRootPathResolver, IEligibilityResolver
│  │  └─ internally uses: run registry, smoke registry, reaction factories
│  ├─ creates notifications → INotificationRouter
│  └─ performs activation-time startup side effects (marker-fast context init + deferred full canary refresh)
└─ creates coordinator → vscode.Disposable
  ├─ creates viewLayer → IViewHost + ICommunicationHub
  │  └─ receives prebuilt domain services via ActivationServicesGraph
  ├─ creates channels (controls → conductor message handlers)
  │  └─ receives: ICommunicationHub, IConductor, IStateMachine
  ├─ creates commands → IExtensionCommands (38+ command registry)
  │  └─ receives all domain modules via injected interfaces
  └─ assembles root extension disposable

Domain module cross-references (no coordinator mediating):
├─ conductor → filesystem (query methods only)
├─ conductor → languages (query methods only)
├─ commands → conductor, filesystem, state, languages (all via interfaces)
├─ views → conductor, state, languages (all via interfaces)
├─ comms → state, languages (message builders)
└─ [circular dependencies: NONE]
```

**Key invariant**: Domain-module arrows flow through provider-owned interfaces (for example: `IConductor`, `IFilesystem`, `IViewHost`). Bootstrap-layer modules (`activator.ts`, `coordinator.ts`, `extension.ts`) may assemble and pass concrete implementations, but downstream consumers still receive contracts.

---

## 3. Run/Target Contract Semantics

### Run Contract

`ConductorStartRunInput.target` is required (`ConductorRunTargetRef`). No synthetic fallback targets are allowed. `startRun(input)` must round-trip through `getRunForTarget(input.target)`.

| Type | Definition | Usage |
| ---- | ---------- | ----- |
| `ConductorRunTargetRef` | Immutable target reference (`nodeKind` + `filePath`) | Key for run storage and retrieval |
| `ConductorStartRunInput` | Requires `target: ConductorRunTargetRef` + `ownerKey` | Caller-owned target identity |
| `ConductorRunSnapshot` | Snapshot returned by lifecycle operations | Contains `runId`, `status`, and lifecycle fields |

### Environment Contract

All `IConductor` environment operations are workspace-scoped at call time (`readEnvironment`, `writeEnvironment`, `checkEnvironment`, `copyIcons`). Repository root is resolved from the supplied `workspaceFolderPath` on each request.

| Input Type | Required Field | Purpose |
| ---------- | -------------- | ------- |
| `ConductorReadEnvironmentInput` | `workspaceFolderPath: string` | Scope profile reads |
| `ConductorWriteEnvironmentInput` | `workspaceFolderPath: string` | Scope writes (`request: EnvironmentWriteRequest`) |
| `ConductorCheckEnvironmentInput` | `workspaceFolderPath: string` | Scope diagnostics |
| `ConductorCopyIconsInput` | `workspaceFolderPath: string` | Scope icon copy operation |

---

## 4. Architectural Rules (Normative)

1. **Contract-first imports only**: cross-module dependencies must use provider-owned interfaces (for example: `IConductor`, `IFilesystem`, `ICommunicationHub`), not private functions or internal paths.
2. **Bootstrap-only construction**: activator/coordinator may construct/wire concrete implementations; domain modules may not construct each other.
3. **No circular dependencies**: module graph must stay acyclic.
4. **Interface changes are contract changes**: interface signature updates require consumer updates and bootstrap wiring updates.
5. **Provider naming convention**: interfaces use `I*`, factories use `create*`, both exported from the owning module boundary.
6. **Optional dependency behavior is explicit**: optional providers must either no-op or fail gracefully.

**Enforced guard**: `no-restricted-imports` in `eslint.config.js` blocks raw resolver named imports (`resolveAlgorithmsRootPath`, `resolveStdlibRootPath`) from algorithms module paths.

---

## 5. Contract Enforcement

1. **Type system**: TypeScript enforces interface contracts and export visibility.
2. **Review**: cross-module imports are boundary-audited.
3. **Lint**: restricted-import rules block resolver-boundary bypasses.
4. **Future tooling**: internal-path import bans and stronger path restrictions remain optional enhancements.

---

## 6. Module Boundary Quick Rules (High-Risk Deltas)

The matrix above is the full ownership map. This section captures only high-risk boundary mistakes worth rechecking in review.

| Module | High-Risk Boundary Rule |
| ------ | ----------------------- |
| `algorithms` | Resolver internals stay private; consumers use `IRootPathResolver` only. |
| `conductor` | Workflow orchestration owner; no direct transport/view ownership. |
| `activator` | Builds activation-time runtime graph and startup side effects only. |
| `coordinator` | Wires prebuilt services only; does not rebuild runtime graph. |
| `comms` | Transport layer only; no decision policy ownership. |
| `commands` | Uses injected contracts only; does not construct peer modules. |

---

## 7. Contract Changes & Versioning

| Change Type | Impact | Example |
| ----------- | ------ | ------- |
| Method added to interface | Semver minor (opt-in) | Add `conductor.queryRuns()` |
| Method signature changed | Semver major | Change `conductor.startRun(...)` |
| Method removed | Semver major | Remove deprecated API |
| Secondary interface added | Semver minor + bootstrap wiring update | Add `ISmokeReporter` |

**Required process**: Update provider interface, implementation, activator/coordinator wiring, module exports, this contract doc, and semver in one change set.

---

## 8. Verification Checklist

- [ ] Cross-module imports use provider-owned interfaces only.
- [ ] Activator constructs runtime graph; coordinator consumes and wires it.
- [ ] No circular dependencies exist.
- [ ] Each module exports its primary provider interface/factory surface.
- [ ] Resolver boundary lint rules are enforced (`no-restricted-imports`).
- [ ] `startRun` target identity is required and has no synthetic fallback.
- [ ] Environment operations are workspace-scoped.
- [ ] `npm run lint:ts` / `npm run compile` / `npm run test` pass.

---

## 9. Examples: Correct vs. Incorrect Imports

### ✅ Correct: Interface-Based Dependencies

```typescript
// conductor/service.ts
import type { IFilesystem } from "../filesystem";
import type { IRootPathResolver } from "../algorithms";
import { createConductorService } from "./service";

export interface CreateConductorServiceInput {
  filesystem?: IFilesystem;
  rootPathResolver?: IRootPathResolver;
}
```

### ❌ Incorrect: Direct Function Imports

```typescript
// conductor/service.ts (BAD)
import { resolveSidebarState } from "../filesystem/eligibilityResolver"; // ❌ Direct import
import { resolveAlgorithmsRootPath } from "../algorithms"; // ❌ Direct import

// Should be:
import type { IEligibilityResolver, IRootPathResolver } from "../filesystem", "../algorithms";
export interface CreateConductorServiceInput {
  eligibilityResolver?: IEligibilityResolver;
  rootPathResolver?: IRootPathResolver;
}
```

### ✅ Correct: Activator Builds Runtime Graph

```typescript
// activator.ts
export function createActivationServices(): ActivationServicesGraph {
  const rootPathResolver = createRootPathResolver();
  const eligibilityResolver = createEligibilityResolver();
  const conductor = createConductorService({
    rootPathResolver,
    eligibilityResolver,
    // ... other deps
  });

  return {
    conductor,
    rootPathResolver,
    eligibilityResolver,
    // ... other services
  };
}
```

### ✅ Correct: Coordinator Consumes Prebuilt Graph

```typescript
// coordinator.ts
export function createCoordinator(context: ExtensionContext, runtimeServices: ActivationServicesGraph) {
  return buildCoordinatorDisposables(/* assembled from runtimeServices */);
}
```

### ❌ Incorrect: Coordinator Rebuilding Runtime Services

```typescript
// coordinator.ts (BAD)
export function createCoordinator(context: ExtensionContext) {
  const conductor = createConductorService(/* ... */); // ❌ Belongs in activator
  const filesystem = createFilesystem(/* ... */); // ❌ Belongs in activator
  // ...
}
```

### ❌ Incorrect: Conductor Constructing Dependencies

```typescript
// conductor/service.ts (BAD)
export function createConductorService() {
  const filesystem = createFilesystem(); // ❌ Should be injected!
  // ...
}
```

---

## 10. Where Code Goes

- **Architecture overview**: `ArchitectureSummary.md`
- **Activation-time runtime graph construction**: `extension/src/activator.ts`
- **Host wiring + root disposable assembly**: `extension/src/coordinator.ts`
- **VS Code extension activation entrypoint**: `extension/src/extension.ts`
- **Workflow orchestration implementation anchor**: `extension/src/conductor/service.ts`
