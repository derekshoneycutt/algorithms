# Dependency Contracts

**Status**: Authoritative contract specification for extension module architecture.

This document defines the formal dependency contracts between modules in the extension runtime. It serves as the source-of-truth for which modules provide which interfaces, who consumes them, and the normative rules for maintaining module boundaries.

---

## 1. Module Provider Contract Matrix

| Module | Primary Interface | Secondary Interfaces | Consumers | Notes |
| ------ | ----------------- | -------------------- | --------- | ----- |
| **state** | `IStateMachine` | `IViewModeService`, `IFilterModeService` | views, commands, conductor, comms | XState machine; immutable canary factory |
| **filesystem** | `IFilesystem` | `IEligibilityResolver`, `FilesystemStateBridge` | conductor, algorithms, state, views; notifier | Cross-platform file ops; cache TTL control |
| **algorithms** | `IAlgorithmsIndex` | `IRootPathResolver` | commands, views; conductor (for repo root) | Algorithm tree discovery, caching; root resolution |
| **languages** | `ILanguages` | (none) | conductor, algorithms, comms, views | Immutable language catalog; normalization |
| **commandline** | `ICommandLine` | `IAlgorithmsTerminalRunAdapter` | conductor, commandline handlers | Shell profile read/write; platform helpers |
| **conductor** | `IConductor` | (none, but exports internal reaction factories) | commands, views, comms, notifications | Workflow orchestration; run/smoke management |
| **commands** | `IExtensionCommands` | (none) | extension.ts bootstrap | 38+ command constructors; all interfaces injected |
| **views** | `IViewHost` | `ICommunicationHub`, tree providers, watcher adapter | comms, conductor (for status), state (for modes) | VS Code view lifecycle; webview adapter |
| **comms** | `ICommunicationHub` | (none, but snapshot builders exported) | conductor, views | Host ↔ webview messaging; type-safe frames |
| **notifications** | `INotificationRouter` | `IConductorNotificationDispatcher` | conductor, commands | Info/warn/error facade over vscode.window.* |

---

## 2. Dependency Flows (Module DAG)

### Composition Root

**Coordinator** (sole composition root):

- Constructs all domain modules in dependency order
- Provides only interfaces downstream; never concrete types
- Passes provider contracts as injected dependencies

### Domain Module Dependency Graph

```text
coordinator (bootstrap entry)
├─ creates state → IStateMachine (XState machine)
├─ creates filesystem → IFilesystem (with cache TTL from state)
│  ├─ provides IEligibilityResolver (workspace folder eligibility)
├─ creates languages → ILanguages (immutable records)
├─ creates rootPathResolver → IRootPathResolver (algorithms + stdlib discovery)
├─ creates eligibilityResolver → IEligibilityResolver (sidebar state)
├─ creates conductor → IConductor
│  ├─ receives: IFilesystem, ICommandLine, IRootPathResolver, IEligibilityResolver
│  └─ internally uses: run registry, smoke registry, reaction factories
├─ creates commands → IExtensionCommands (38+ command registry)
│  └─ receives all domain modules via IWhatever interfaces
├─ creates viewLayer → IViewHost + ICommunicationHub
│  └─ receives: IConductor, IFilesystem, ILanguages, etc. (all interfaces)
├─ creates channels (controls → conductor message handlers)
│  └─ receives: ICommunicationHub, IConductor, IStateMachine
└─ creates notifications → INotificationRouter
   └─ receives: IConductor (for dispatcher)

Domain module cross-references (no coordinator mediating):
├─ conductor → filesystem (query methods only)
├─ conductor → languages (query methods only)
├─ commands → conductor, filesystem, state, languages (all via interfaces)
├─ views → conductor, state, languages (all via interfaces)
├─ comms → state, languages (message builders)
└─ [circular dependencies: NONE]
```

**Key invariant**: All arrows in the graph flow through interfaces (IWhatever). No module directly imports and uses another module's implementation or internal functions.

---

## 3. Run/Target Contract Semantics

### Current State

**Run Lifecycle**:

- `ConductorStartRunInput.target` is a **required** field (`ConductorRunTargetRef`)
- Runs are stored in the registry indexed by target; consumer APIs retrieve runs by target via `getRunForTarget()`
- No synthetic fallback targets exist; all callers must supply a real target reference
- Round-trip capability is guaranteed: `startRun(input)` → `getRunForTarget(input.target)` always returns the stored snapshot

**Target Semantics**:

| Type | Definition | Usage |
| ---- | ---------- | ----- |
| `ConductorRunTargetRef` | Immutable target reference (`nodeKind` + `filePath`) | Key for run storage and retrieval |
| `ConductorStartRunInput` | Requires `target: ConductorRunTargetRef` + `ownerKey` | No synthetic defaults; callers own target identity |
| `ConductorRunSnapshot` | Snapshot returned by all lifecycle operations | Contains `runId`, `status`, and lifecycle fields |

**Rule**: Runs are always target-aware. If a command lacks ambient target context, it must resolve one before calling `conductor.startRun()`.

### Environment Operation Workspace Scoping

All environment operations on `IConductor` (`readEnvironment`, `writeEnvironment`, `checkEnvironment`, `copyIcons`) accept workspace-scoped structured inputs:

| Input Type | Required Field | Purpose |
| ---------- | -------------- | ------- |
| `ConductorReadEnvironmentInput` | `workspaceFolderPath: string` | Scopes repo root resolution to one workspace folder |
| `ConductorWriteEnvironmentInput` | `workspaceFolderPath: string` | Same; plus `request: EnvironmentWriteRequest` |
| `ConductorCheckEnvironmentInput` | `workspaceFolderPath: string` | Same for diagnostics |
| `ConductorCopyIconsInput` | `workspaceFolderPath: string` | Same for icon copying |

**Rule**: Environment operations are always workspace-scoped at call time. The conductor resolves the repository root from the provided `workspaceFolderPath` on each request; no ambient or cached workspace folder path is captured at construction time.

---

## 4. Architectural Rules (Normative)

### Rule 1: Contract-First Dependencies

All cross-module dependencies **must** be declared through formal interfaces (IWhatever). No module may directly import:

- Private functions or helpers from another module
- Internal implementation details (internal/ subdirectories)
- Constructs from other modules' index.ts re-exports that are not formal contracts

**Exception**: Hand-off adapters in the coordinator may construct internal instances (e.g., `createRunRegistry` is private to conductor; coordinator never sees it). Only the resulting `IConductor` interface flows downstream.

**Consequence**: If conductor needs a service from another module, that service must be wrapped in an interface and injected at construction time. Direct imports trigger code review rejection.

**Lint enforcement**: `no-restricted-imports` rules in `eslint.config.js` explicitly forbid named imports of raw resolver functions (`resolveAlgorithmsRootPath`, `resolveStdlibRootPath`) from the algorithms module at any relative import depth. Violations are compile-time lint errors, not just review feedback.

### Rule 2: Sole Composition Root

Only **Coordinator** creates concrete implementations across module boundaries. No other module may instantiate another module's implementation.

**Exception**: Within a module, implementation details may use private constructors (e.g., conductor/service.ts may `createRunRegistry()` internally; that's private orchestration).

**Consequence**: All wiring decisions flow through one file. Refactoring a module's internal structure requires only coordinator updates, not scattered coupling.

### Rule 3: No Circular Dependencies

The module dependency graph is a DAG (directed acyclic graph). No module may depend on (directly or transitively) any module that depends on it.

**Verification**: Each pass of refactoring should re-verify the DAG is acyclic using a topological sort.

### Rule 4: Interface Stability

Once a module interface (IWhatever) is public, changes to its signature require:

1. Semver bump and changelog entry
2. Updates to all consumers (enforced by TypeScript compiler)
3. Coordinator updates if new dependencies are injected

**Consequence**: Interfaces are a stability contract. Use them to signal "this is the public boundary."

### Rule 5: Provider Contract Naming

When a module M provides a contract C, the interface shall be named `IC` and exported from M's `index.ts`. Factory functions are named `createC` and exported alongside.

**Example**:

- Module: `filesystem`
- Contract provider: `IEligibilityResolver` (exported from filesystem/index.ts)
- Factory: `createEligibilityResolver` (exported from filesystem/index.ts; implemented in eligibilityResolverProvider.ts)

### Rule 6: Fallback Behavior for Optional Dependencies

When a module accepts optional provider dependencies in its constructor:

- If provided, use the injected provider
- If not provided, either fail gracefully or no-op (not panic)
- Document the expected behavior

**Example**: conductor's `eligibilityResolver` is optional. If unprovided, `initWorkspaceSupportedContext()` returns early.

---

## 5. Contract Enforcement

### Type System (First Line)

- TypeScript compiler enforces interface contracts at build time
- Imports of non-exported symbols fail to compile

### Peer Review (Second Line)

- All cross-module imports are audited in code review
- Violations of Rules 1–4 trigger rejection (not just style feedback)

### Active Lint Enforcement (Third Line)

- `no-restricted-imports` rule in `eslint.config.js` guards the `algorithms` module resolver boundary:
  - Forbids named imports of `resolveAlgorithmsRootPath` and `resolveStdlibRootPath` from any relative path to the algorithms module (`../algorithms`, `../../algorithms`, `../../../algorithms`, `../../../../algorithms`)
  - Error-level: violations block build
- These functions are also unexported from `algorithms/index.ts`; the lint rule provides belt-and-suspenders enforcement if that ever changes

### Optional Tooling (Future)

- ESLint rule: Forbid imports from `src/module/internal/*` unless via formal provider interface
- TypeScript path aliases to restrict import patterns (once proven stable)

---

## 6. Module Boundary Descriptions

### **state** module

- **Primary interface**: `IStateMachine` (XState machine snapshot + subscribe)
- **Exports**: `IViewModeService`, `IFilterModeService` (view mode toggles)
- **Dependents**: All other modules (reads state; never mutates directly)
- **Rule**: State is canonical. No other module modifies state internals. All mutations flow through XState actions.

### **filesystem** module

- **Primary interface**: `IFilesystem` (cross-platform file ops)
- **Exports**: `IEligibilityResolver` (workspace folder eligibility checks)
- **Dependents**: conductor, algorithms (for src/ discovery), commands (file iteration)
- **Rule**: `IEligibilityResolver` is a cached eligibility evaluator. Conductor and views depend on it for workspace support decisions.

### **algorithms** module

- **Primary interface**: `IAlgorithmsIndex` (algorithm tree discovery and caching)
- **Exports**: `IRootPathResolver` (locates src/ and stdlib/ roots); `RootResolverDependencies` (type for resolver construction); `createRootPathResolver` (factory)
- **Dependents**: commands, views (tree providers); conductor (for repo root)
- **Rule**: Root resolution is stateless. `IRootPathResolver` async functions; results are not cached (filesystem handles caching).
- **Boundary enforcement**: Raw resolver functions (`resolveAlgorithmsRootPath`, `resolveStdlibRootPath`) are private to the module and also blocked by lint guard. All external consumers must use `IRootPathResolver` injected via coordinator.

### **languages** module

- **Primary interface**: `ILanguages` (immutable language records; no state)
- **Exports**: None (no secondary contracts)
- **Dependents**: conductor, algorithms (language flags), comms (language names in messages)
- **Rule**: Language data is immutable. No side effects; pure queries only.

### **conductor** module

- **Primary interface**: `IConductor` (run/smoke orchestration)
- **Exports**: Reaction factories (`applyConductorReaction`, etc.) for advanced integration
- **Dependents**: commands, views (coordinate via IConductor); notifications (dispatcher)
- **Constructor dependencies**: `IFilesystem`, `ICommandLine`, `IRootPathResolver`, `IEligibilityResolver` (all optional for test ergonomics; no ambient workspace folder path at construction time)
- **Rule**: Conductor is workflow hub. All run logic flows through it. Direct imports of internal modules (runRegistry, smokeRegistry) are forbidden outside conductor.
- **Run contract**: All `startRun` calls require an explicit `target: ConductorRunTargetRef`. No synthetic default targets exist.
- **Environment contract**: All environment operations accept workspace-scoped input types (see Section 3). Repository root is resolved per-request from the supplied `workspaceFolderPath`.

### **commands** module

- **Primary interface**: `IExtensionCommands` (command registry)
- **Exports**: None (commands are internal constructs)
- **Dependents**: extension.ts bootstrap (to register); that's it
- **Rule**: Commands are instantiated by coordinator. Each command receives injected interfaces (conductor, filesystem, state, etc.). No command may construct other modules.

### **views** module

- **Primary interface**: `IViewHost` (VS Code view lifecycle adapter)
- **Exports**: `ICommunicationHub` (host ↔ webview messaging), tree providers
- **Dependents**: coordinator, comms (message hub subscriptions)
- **Rule**: Views consume IConductor and IStateMachine for updates but never mutate either. Updates flow one-way: state → views via subscriptions.

### **comms** module

- **Primary interface**: `ICommunicationHub` (host ↔ webview message routing)
- **Exports**: Snapshot builders (`buildSmokeSnapshot`, etc.)
- **Dependents**: conductor (message handlers), views (webview subscriptions)
- **Rule**: Comms is a facade over VS Code's webview API. Message types are shared/messageTypes.ts (schema).

### **commandline** module

- **Primary interface**: `ICommandLine` (shell execution)
- **Exports**: `IAlgorithmsTerminalRunAdapter` (algorithm run execution)
- **Dependents**: conductor (to orchestrate runs)
- **Rule**: Commandline is a wrapper over spawnSync/execSync. Terminal-specific state is not exposed; only execution results.

### **notifications** module

- **Primary interface**: `INotificationRouter` (info/warn/error)
- **Exports**: `IConductorNotificationDispatcher` (wires conductor to router)
- **Dependents**: conductor, commands (to notify user)
- **Rule**: Notifications are fire-and-forget; no request/response or state. Messages are simple strings or inline buttons.

---

## 7. Contract Changes & Versioning

When a module's primary interface changes:

| Change Type | Impact | Example |
| ----------- | ------ | ------- |
| Method added to interface | Semver minor; all consumers unaffected (opt-in use) | Add `conductor.queryRuns()` |
| Method signature changed | Semver major; all consumers must update | Change `conductor.startRun(ConductorStartRunInput)` args |
| Method removed | Semver major; compiler error in all consumers | Remove deprecated API |
| Secondary interface added | Semver minor; coordinator must inject | Add `ISmokeReporter` as new secondary contract |

**Process**:

1. Update interface definition (IWhatever.ts)
2. Update implementation (service.ts or provider.ts)
3. Update coordinator.ts to pass new dependencies
4. Update module's index.ts exports if new secondary contracts added
5. Update this document (DependencyContracts.md) to reflect new contract
6. Semver bump in extension/package.json

---

## 8. Verification Checklist

Use this checklist to verify the architecture matches this contract:

- [ ] All module-to-module imports go through IWhatever interfaces (grep for `import.*from.*/../`)
- [ ] Coordinator is the only place that constructs domain modules
- [ ] No circular dependencies exist in the module graph (topological sort succeeds)
- [ ] Each module exports one primary interface (IWhatever)
- [ ] Secondary contracts are re-exported from module index.ts
- [ ] Factory functions (createWhatever) are exported from module index.ts
- [ ] Conductor receives `IRootPathResolver` and `IEligibilityResolver` injected (not imported directly); no ambient `workspaceFolderPaths` at construction time
- [ ] Views, commands, and other consumers depend only on domain modules via interfaces
- [ ] `npm run lint:ts` passes with no `no-restricted-imports` violations for raw resolver functions
- [ ] Run/target semantics match Section 3 above: `ConductorStartRunInput.target` is required, no synthetic fallbacks
- [ ] Environment operations pass workspace-scoped inputs; no constructor-level workspace folder path on conductor
- [ ] TypeScript compilation succeeds with `npm run compile`
- [ ] All tests pass with `npm run test`

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

### ✅ Correct: Coordinator Wiring

```typescript
// coordinator.ts
const rootPathResolver = createRootPathResolver();
const eligibilityResolver = createEligibilityResolver();
const conductor = createConductorService({
  rootPathResolver,
  eligibilityResolver,
  // ... other deps
});
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

## 10. Future Opportunities

- **Lazy initialization**: If certain modules (e.g., notifications) are heavy, consider lazy-loading their providers and updating Coordinator to wire them on-demand.
- **Plugin architecture**: If third-party extensions might hook into the conductor, formalize provider-lookup mechanisms (e.g., ServiceRegistry pattern).
- **Runtime validation**: Add type-guard runtime checks to detect interface violations at runtime (e.g., assert conductor has all required methods).

---

## References

- **ArchitectureSummary.md**: Conceptual module ownership and lifecycle (Section 11: Temporary Addendum)
- **CodeReview.md**: P-004 (architectural contract violation)
- **extension/src/coordinator.ts**: Composition root implementation
- **extension/src/conductor/service.ts**: Domain orchestration; consumes provider interfaces
