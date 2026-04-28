# Adversarial Code Review

## Findings

1. P-001: ~~Main-file delete path skips include-folder cleanup~~ *(intentional design choice — excluded by request)*

2. P-002: Multi-root workspace runs can resolve the wrong src root (functional correctness bug)
- Severity: High
- Evidence:
  - src/coordinator.ts:111 passes `workspaceFolderPaths[0] ?? ""` as the `repositoryRoot` when constructing the conductor service.
  - src/algorithms/index.ts:70-75 resolves the algorithms root by returning the first workspace folder containing `src`.
  - src/conductor/internal/runFile.ts:438-441 consumes that first-match root for run orchestration and path validation.
- Why this is a problem:
  - In multi-root workspaces, running a file from workspace B can be validated against workspace A's root.
  - This yields false out-of-root failures or resolves the wrong `run.sh`, depending on folder order.
- Suggested fix:
  - Resolve workspace root from the selected file path first, then fall back to scanning workspace folders.
  - Thread the selected file URI's workspace folder identity through editor/explorer/tree commands into run orchestration.
  - Add multi-root tests with two `src` trees and verify run dispatch chooses the correct root.

3. P-003: `orchestrateRunFile` is an oversized orchestration entry point with too many responsibilities
- Severity: Medium-High
- Evidence:
  - src/conductor/internal/runFile.ts spans 1,157 lines and still has `orchestrateRunFile` as the top-level entry point tying together validation, option building, lifecycle transitions, smoke parsing, process execution, status publication, and error translation.
- Why this is a problem:
  - High branch density increases regression risk whenever one execution mode changes.
  - It is hard to unit test in isolation because setup must traverse many unrelated paths.
- Suggested fix:
  - Split into focused steps: preflight validation, token/argument construction, smoke runtime streaming/status application, process execution strategy (terminal vs tracked commandline), and completion/error finalization.
  - Keep each step pure where possible and unit-test each step independently.

4. P-004: `createCoordinator` is a god-function that owns too many construction concerns
- Severity: Medium
- Evidence:
  - src/coordinator.ts:145 onward builds services, adapters, channels, providers, handlers, commands, registrations, and disposal wiring in one function.
- Why this is a problem:
  - A single edit can accidentally couple unrelated runtime areas (views, comms, command wiring, lifecycle disposal).
  - Reviewability is reduced, and ownership boundaries become implicit instead of explicit.
- Suggested fix:
  - Extract construction into composable factories: `buildRuntimeServices`, `buildViewLayer`, `buildMessageChannels`, `buildCommands`, `buildDisposables`.
  - Keep `createCoordinator` as a thin composition root that sequences these factories.

5. P-005: `buildRunExecutionPlan` is a sync function that silently drops async notification errors
- Severity: Medium
- Evidence:
  - src/conductor/internal/runFile.ts:963 and :977 use `void input.notificationRouter.warn(errorMessage)` inside the sync `buildRunExecutionPlan` function.
  - Every other validation failure path in `runFile.ts` awaits its notification call; these two are the exception.
- Why this is a problem:
  - The sync/async mismatch is invisible from the function signature, making it easy to miss during maintenance.
  - If `notificationRouter.warn` rejects, the error is silently swallowed — the user gets no warning and no diagnostic log entry anywhere in the call stack.
  - Any refactor that makes `buildRunExecutionPlan` async would change observable behavior in non-obvious ways.
- Suggested fix:
  - Change `buildRunExecutionPlan` to return a `Promise<RunExecutionPlan | null>` and `await` both notification calls, consistent with every other validation path in the file.
  - Alternatively, separate "build the plan" (pure, sync) from "report the failure" (async), placing the notification call in `orchestrateRunFile` after checking the plan result — that way no sync function ever touches async infrastructure.

6. P-006: `nextRunSequence` is module-level mutable global state shared across all registry instances
- Severity: Medium
- Evidence:
  - src/conductor/internal/runRegistry.ts: `let nextRunSequence = 1;` is declared at module scope.
  - `createBootstrapRunSnapshot` reads and increments this counter.
  - `RunSnapshotStore` and `createRunRegistry` are both instance-scoped, but the counter they depend on is not.
- Why this is a problem:
  - Multiple registry instances (e.g., in tests) share one counter, creating cross-instance coupling.
  - Test suites that create more than one registry or run tests in unexpected order can observe run IDs with unexpected sequence numbers, making assertions fragile.
  - Instance isolation — which the class-based `RunSnapshotStore` otherwise achieves — breaks at this boundary.
- Suggested fix:
  - Move the sequence counter into `RunSnapshotStore` as a private field initialized to `1`.
  - Pass the instance counter into `createBootstrapRunSnapshot` as a parameter, or move snapshot creation into the store itself.
  - This eliminates module-level mutable state entirely and aligns with the store encapsulation pattern already in place.

7. P-007: Smoke status projection calls `refreshAlgorithmsTree` on every parsed output line, bypassing the run debouncer
- Severity: Medium
- Evidence:
  - src/conductor/internal/runFile.ts: `createSmokeRuntimeProjection.consumeChunk()` calls `input.refreshAlgorithmsTree()` immediately after each valid smoke-status line parsed from stdout.
  - Workspace path changes in src/conductor/service.ts use `scheduleTreeRefresh` with a 75 ms debounce timer.
  - A smoke test running many languages with frequent status updates can emit dozens of status lines in rapid bursts.
- Why this is a problem:
  - Each call enters the VS Code tree provider refresh cycle, triggering model computation and UI updates.
  - High-volume smoke output saturates the tree provider, causing visual jitter and potentially delaying other extension activity.
  - The inconsistency between debounced workspace refreshes and unbounded per-line smoke refreshes is a latent performance asymmetry that will be hard to diagnose under slow conditions.
- Suggested fix:
  - Apply the same debounce strategy to smoke-projection tree refreshes.
  - Pass a debounce-wrapped `refreshAlgorithmsTree` into `createSmokeRuntimeProjection`, or thread the `scheduleTreeRefresh` helper through the orchestration dependencies so projection can use it.
  - The terminal `finish()` and `markStarted()` calls that trigger a single intentional refresh can bypass the debounce.

8. P-008: `RunSnapshotStore.store()` takes `publish` as a parameter instead of calling `this.publish`, creating redundant coupling
- Severity: Low
- Evidence:
  - src/conductor/internal/runRegistry.ts: every call-site of `store.store(...)` passes `store.publish.bind(store)` as the third argument.
  - `RunSnapshotStore` already owns `publish` as a public method; passing it back as a callback to a method on the same object is circular.
- Why this is a problem:
  - Every call to `store.store()` is visually noisy and creates an unnecessary binding allocation.
  - A future author could accidentally pass a different `publish` function, breaking the listener contract silently.
  - The pattern undermines the encapsulation purpose of extracting `RunSnapshotStore` in the first place.
- Suggested fix:
  - Remove the `publish` parameter from `store.store()` and have the method call `this.publish()` directly.
  - The retention-timer closure inside `store.store` already captures `this` implicitly through the class context, so this change is mechanical.
  - Update all call-sites in `createRunRegistry` to `store.store(target, snapshot)`.

