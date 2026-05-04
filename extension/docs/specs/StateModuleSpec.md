# State Module Spec

Implementation spec for host state management: the XState machine definition, state context layout, event catalogue, snapshot shape, narrow accessor contracts, sidebar mode services, and the filesystem state bridge.

Related sources of truth:

1. Ownership boundaries: `../ArchitectureSummary.md`
2. Dependency contracts: `../DependencyContracts.md`

This spec defines behavior details only and does not restate architecture or dependency policy.

## Table of Contents

- [1. Scope](#1-scope)
- [2. Internal Structure](#2-internal-structure)
- [3. Machine Lifecycle](#3-machine-lifecycle)
- [4. Context Layout](#4-context-layout)
- [5. State Values](#5-state-values)
- [6. Event Catalogue](#6-event-catalogue)
- [7. Snapshot Contract](#7-snapshot-contract)
- [8. IStateMachine Narrow Accessors](#8-istatemachine-narrow-accessors)
- [9. Smoke Controls Domain](#9-smoke-controls-domain)
- [10. Run Controls Domain](#10-run-controls-domain)
- [11. Environment Controls Domain](#11-environment-controls-domain)
- [12. Filesystem State Bridge](#12-filesystem-state-bridge)
- [13. Sidebar View Mode and Filter Mode](#13-sidebar-view-mode-and-filter-mode)
- [14. Status Helper Functions](#14-status-helper-functions)
- [15. Verification Checklist](#15-verification-checklist)

## 1. Scope

In scope:

1. XState machine definition (`machine.ts`) and its context shape.
2. Full event type catalogue (`ExtensionHostEvent`).
3. Read-only snapshot interface (`ExtensionHostSnapshot`).
4. `IStateMachine` DI contract including narrow accessors.
5. `IViewModeService` and `IFilterModeService` sidebar mode services.
6. `IStateFilesystemBridge` filesystem event forwarding contract.
7. Shared status helper functions (`createRunArgsStatus`, etc.) and status class name types.

Out of scope:

1. Command execution orchestration (owned by `conductor` module).
2. View rendering and panel snapshot publishing (owned by `views` module).
3. Filesystem abstraction (owned by `filesystem` module).
4. Any module reading or writing `ExtensionHostSnapshot` data via UI (owned by `comms` module).

## 2. Internal Structure

| File | Responsibility |
|---|---|
| `IStateMachine.ts` | DI contract: `IStateMachine` interface with all accessor and mutator methods |
| `machine.ts` | XState machine definition: context, guards, all `assign` handlers |
| `service.ts` | `createStateMachineService` factory: wraps XState actor, implements `IStateMachine` |
| `types.ts` | All domain types, context shape, event union, snapshot interface, status helpers |
| `viewMode.ts` | `IViewModeService` contract and `createViewModeService` factory |
| `filterMode.ts` | `IFilterModeService` contract and `createFilterModeService` factory |
| `filesystemStateBridge.ts` | `IStateFilesystemBridge` contract and `createStateFilesystemBridge` factory |
| `index.ts` | Module barrel export |

## 3. Machine Lifecycle

1. The XState actor is created lazily: it is not started until the first call to `IStateMachine.send`.
2. `IStateMachine.getSnapshot` may be called before the first `send`; it returns initial context values.
3. `IStateMachine.dispose` stops the actor and releases resources. No further events should be sent after `dispose`.
4. The machine has no async actors or effects; all transitions are synchronous `assign` actions.
5. `machine.ts` accepts optional `ExtensionHostMachineInput` at creation time to seed initial smoke and run control values.

## 4. Context Layout

`ExtensionHostContext` holds all mutable host state across machine states:

| Field | Type | Description |
|---|---|---|
| `lastCommandId` | `string \| null` | ID of the last dispatched command |
| `lastResult` | `string \| null` | Result text of the last succeeded command |
| `lastFailure` | `string \| null` | Error text of the last failed command |
| `smokeControls` | `SmokeControlsSettings` | All smoke-controls panel state |
| `smokeRunStatusByAlgorithm` | `SmokeRunStatusByAlgorithm` | Runtime per-language statuses keyed by algorithm path |
| `activeSmokeRunAlgorithmPath` | `string \| null` | Algorithm path currently running a smoke test |
| `activeSmokeRunIdByAlgorithm` | `Record<string, string>` | Active run IDs keyed by algorithm path |
| `runControls` | `RunControlsSettings` | All run-controls panel state |
| `environmentControls` | `EnvironmentControlsSettings` | All environment-controls panel state |
| `filesystemCacheTtlMs` | `number` | Current filesystem cache TTL |
| `filesystemStatCacheByPath` | `Record<string, FilesystemStatCacheEntry>` | Per-path stat summaries |
| `filesystemDirectoryCacheByPath` | `Record<string, FilesystemDirectoryCacheEntry>` | Per-path directory summaries |
| `filesystemPendingOperationById` | `Record<string, FilesystemPendingOperation>` | In-flight operation summaries |
| `filesystemOperationErrorByPath` | `Record<string, string>` | Per-path operation errors |

## 5. State Values

`ExtensionHostStateValue = "ready" | "running" | "stopped"`

| Value | Meaning |
|---|---|
| `"ready"` | Machine initialized; no command in flight |
| `"running"` | A command is currently in flight |
| `"stopped"` | Machine has received `SHUTDOWN`; no further transitions |

## 6. Event Catalogue

### 6.1 Command events

| Event type | Payload | Effect |
|---|---|---|
| `COMMAND_REQUESTED` | `commandId` | Transitions to `"running"`, sets `lastCommandId` |
| `COMMAND_SUCCEEDED` | `result` | Transitions to `"ready"`, sets `lastResult` |
| `COMMAND_FAILED` | `error` | Transitions to `"ready"`, sets `lastFailure` |
| `SHUTDOWN` | — | Transitions to `"stopped"` |

### 6.2 Smoke controls events

| Event type | Key payload fields | Context update |
|---|---|---|
| `SMOKE_REPORT_ENABLED_SET` | `enabled` | `smokeControls.reportEnabled` |
| `SMOKE_MARKDOWN_PATH_SET` | `path` | `smokeControls.markdownPath` |
| `SMOKE_TIMEOUT_SECONDS_SET` | `seconds` | `smokeControls.timeoutSeconds` |
| `SMOKE_SLOW_TIMEOUT_SECONDS_SET` | `seconds` | `smokeControls.slowTimeoutSeconds` |
| `SMOKE_LANGUAGE_TOGGLED` | `languageKey` | Toggles `selected` on matching language in `smokeControls.languages` (disabled languages ignored) |
| `SMOKE_ALL_LANGUAGES_SELECTED` | — | Sets `selected: true` on all non-disabled languages |
| `SMOKE_ALL_LANGUAGES_DESELECTED` | — | Sets `selected: false` on all languages |
| `SMOKE_REPORT_STATUS_SET` | `statusText`, `statusClassName` | `smokeControls.reportStatusText`, `.reportStatusClassName` |
| `SMOKE_SELECTION_STATUS_SET` | `statusText`, `statusClassName` | `smokeControls.smokeStatusText`, `.smokeStatusClassName` |
| `SMOKE_STATUS_LABEL_SET` | `statusLabel` | `smokeControls.statusLabel` |

### 6.3 Smoke runtime events

| Event type | Key payload fields | Context update |
|---|---|---|
| `SMOKE_RUN_STARTED` | `algorithmPath`, `languageKeys`, `runId` | Initializes all keys in `smokeRunStatusByAlgorithm[algorithmPath]` to `"queued"`; sets `activeSmokeRunAlgorithmPath`; records `runId` in `activeSmokeRunIdByAlgorithm` |
| `SMOKE_LANGUAGE_RUN_STATUS_SET` | `algorithmPath`, `languageKey`, `status` | Updates one language's status under `smokeRunStatusByAlgorithm[algorithmPath]` |
| `SMOKE_RUN_FINISHED` | `algorithmPath` | Clears `activeSmokeRunAlgorithmPath` (sets to `null`) and removes run ID |
| `SMOKE_RUN_STATUS_CLEARED` | `algorithmPath`, `runId` | Removes `smokeRunStatusByAlgorithm[algorithmPath]` only when `runId` matches the stored run ID |

### 6.4 Run controls events

| Event type | Key payload | Context update |
|---|---|---|
| `RUN_ARGS_ENABLED_SET` | `enabled` | `runControls.runArgsEnabled` |
| `RUN_ARGS_TEXT_SET` | `text` | `runControls.runArgsText` |
| `RUN_SOURCE_PROFILE_ENABLED_SET` | `enabled` | `runControls.sourceProfileEnabled` |
| `RUN_SOURCE_PROFILE_TEXT_SET` | `text` | `runControls.sourceProfileText` |
| `RUN_CHECKS_MODE_SET` | `mode` | `runControls.runChecksMode` |
| `RUN_CHECKS_ROUTE_SET` | `route` | `runControls.runChecksRoute` |
| `RUN_CLEAN_STDLIB_ENABLED_SET` | `enabled` | `runControls.cleanStdlibEnabled` |
| `RUN_CLEAN_ARCHIVES_ENABLED_SET` | `enabled` | `runControls.cleanArchivesEnabled` |
| `RUN_ARGS_STATUS_SET` | `statusText`, `statusClassName` | `runControls.runArgsStatusText`, `.runArgsStatusClassName` |
| `RUN_SOURCE_PROFILE_STATUS_SET` | `statusText`, `statusClassName` | `runControls.sourceProfileStatusText`, `.sourceProfileStatusClassName` |
| `RUN_CHECKS_STATUS_SET` | `statusText`, `statusClassName` | `runControls.runChecksStatusText`, `.runChecksStatusClassName` |
| `RUN_CLEAN_OPTIONS_STATUS_SET` | `statusText`, `statusClassName` | `runControls.cleanOptionsStatusText`, `.cleanOptionsStatusClassName` |

### 6.5 Environment controls events

| Event type | Key payload | Context update |
|---|---|---|
| `ENV_PROFILE_PATH_SET` | `profilePath` | `environmentControls.profilePath` |
| `ENV_PROFILE_PLACEHOLDER_SET` | `profilePlaceholder` | `environmentControls.profilePlaceholder` |
| `ENV_EFFECTIVE_PROFILE_PATH_SET` | `effectiveProfilePath` | `environmentControls.effectiveProfilePath` |
| `ENV_COPY_ICONS_PATH_SET` | `copyIconsPath` | `environmentControls.copyIconsPath` |
| `ENV_CHECK_ENV_STATUS_SET` | `statusText`, `statusClassName`, `filteredOutput`, `rawOutput` | `environmentControls.checkEnvStatus*`, `checkEnvFilteredOutput`, `checkEnvRawOutput` |
| `ENV_COPY_ICONS_STATUS_SET` | `statusText`, `statusClassName` | `environmentControls.copyIconsStatus*` |
| `ENV_VARIABLE_VALUE_SET` | `key: EnvironmentVariableKey`, `value` | Updates matching entry in `environmentControls.variables` |
| `ENV_VARIABLE_STATUS_SET` | `key: EnvironmentVariableKey`, `statusText`, `statusClassName` | Updates status fields on matching variable entry |
| `ENV_ROUTING_DOCKER_MAP_TEXT_SET` | `text` | `environmentControls.routingDockerMapText` |
| `ENV_ROUTING_SSH_MAP_TEXT_SET` | `text` | `environmentControls.routingSshMapText` |
| `ENV_ROUTING_STATUS_SET` | `statusText`, `statusClassName` | `environmentControls.routingStatus*` |
| `ENV_ROUTING_LANGUAGE_ENTRIES_SET` | `entries` | Replaces `environmentControls.routingEntries` |
| `ENV_ROUTING_LANGUAGE_DRAFT_SET` | `languageKey`, `dockerEnabled`, `dockerValue`, `sshEnabled`, `sshValue` | Updates draft fields on the matching routing entry |
| `ENV_ROUTING_LANGUAGE_STATUS_SET` | `languageKey`, `statusText`, `statusClassName` | Updates status on matching routing entry |
| `ENV_BATCH_ROUTING_DRAFT_SET` | `dockerEnabled`, `dockerValue`, `sshEnabled`, `sshValue` | `environmentControls.batchRouting*`, updates `batchRoutingConflict` |

### 6.6 Filesystem state events

| Event type | Key payload | Context update |
|---|---|---|
| `FILESYSTEM_CACHE_TTL_SET` | `ttlMs` | `filesystemCacheTtlMs` |
| `FILESYSTEM_CACHE_CLEARED` | `targetPath?` | Clears stat/directory/pending/error caches (scoped when `targetPath` provided) |
| `FILESYSTEM_STAT_CACHE_ENTRY_SET` | `targetPath`, `exists`, `kind`, `updatedAt` | `filesystemStatCacheByPath[targetPath]` |
| `FILESYSTEM_DIRECTORY_CACHE_ENTRY_SET` | `targetPath`, `entryCount`, `updatedAt` | `filesystemDirectoryCacheByPath[targetPath]` |
| `FILESYSTEM_PENDING_OPERATION_SET` | `operationId`, `operationType`, `targetPath`, `status`, `updatedAt` | `filesystemPendingOperationById[operationId]` |
| `FILESYSTEM_PENDING_OPERATION_CLEARED` | `operationId` | Removes entry from `filesystemPendingOperationById` |
| `FILESYSTEM_OPERATION_ERROR_SET` | `targetPath`, `message` | `filesystemOperationErrorByPath[targetPath]` |

## 7. Snapshot Contract

`ExtensionHostSnapshot` is a read-only projection of `ExtensionHostContext`. All fields are `readonly`; collections are typed as `Record<…>` with readonly modifier.

Rules:

1. `getSnapshot()` returns a snapshot reflecting the state at the moment of the call.
2. The snapshot is not live; it does not update after being read.
3. Callers must not mutate snapshot fields or nested objects.
4. `activeSmokeRunIdByAlgorithm` is intentionally excluded from `ExtensionHostSnapshot` (internal bookkeeping only; not needed by consumers).

## 8. IStateMachine Narrow Accessors

Narrow accessors exist to avoid the cost of a full deep-clone when only a subset of context is needed.

| Accessor | Returns | Avoids cloning |
|---|---|---|
| `getSmokeRunStatusForAlgorithm(algorithmPath)` | `SmokeRunStatusByLanguage \| undefined` | All context except `smokeRunStatusByAlgorithm[algorithmPath]` |
| `getActiveSmokeRunAlgorithmPath()` | `string \| null` | All context except `activeSmokeRunAlgorithmPath` |
| `getEnvironmentControls()` | `EnvironmentControlsSettings` | All context except `environmentControls` |
| `getRunControlsSnapshot()` | `{ stateValue, runControls }` | All context except `stateValue` and `runControls` |
| `getSmokeControlsSnapshot()` | `{ stateValue, smokeControls }` | All context except `stateValue` and `smokeControls` |
| `getEnvironmentControlsSnapshot()` | `{ stateValue, environmentControls }` | All context except `stateValue` and `environmentControls` |

Implementation rule: narrow accessors read directly from `actor.getSnapshot().context` without full deep-clone; only the required sub-tree is shallow-spread.

## 9. Smoke Controls Domain

### 9.1 Language selection model

1. Each `SmokeLanguageSelection` has `selected` and `disabled` flags.
2. `SMOKE_LANGUAGE_TOGGLED` toggles `selected` only on non-disabled entries; disabled entries pass through unchanged.
3. `SMOKE_ALL_LANGUAGES_SELECTED` sets `selected: true` on non-disabled, `selected: false` on disabled entries.
4. `SMOKE_ALL_LANGUAGES_DESELECTED` sets `selected: false` on all entries regardless of disabled state.

### 9.2 Smoke runtime status model

1. `smokeRunStatusByAlgorithm` maps `algorithmPath → { languageKey → SmokeLanguageRunStatus }`.
2. `SmokeLanguageRunStatus = "queued" | "running" | "passed" | "failed"`.
3. On `SMOKE_RUN_STARTED`, all specified `languageKeys` are normalized (trimmed, lowercased) before being stored as `"queued"`.
4. `activeSmokeRunAlgorithmPath` holds the algorithm path currently under execution. At most one algorithm path is active at a time.
5. `SMOKE_RUN_FINISHED` clears `activeSmokeRunAlgorithmPath` to `null`.
6. `SMOKE_RUN_STATUS_CLEARED` removes the algorithm's per-language map only when the provided `runId` matches the stored run ID; stale clear requests are ignored.

## 10. Run Controls Domain

### 10.1 Derived status

Run controls status fields (`runArgsStatusText`, `sourceProfileStatusText`, etc.) are not computed by the machine automatically. Callers are responsible for computing status using the helper functions from `types.ts` and dispatching the corresponding `*_STATUS_SET` events.

### 10.2 Run args parsing

`parseRunArgumentsText` in `types.ts` provides shell-like tokenization:
- Supports `"..."` and `'...'` quoting.
- Supports `\` escape sequences.
- Returns `{ ok: false, reason }` when an unfinished escape or unclosed quote is detected.
- Returns `{ ok: true, tokens }` on success.

## 11. Environment Controls Domain

### 11.1 Variable keys

`EnvironmentVariableKey` is a discriminated string union:
`"timeout" | "eiffel" | "gcc13Directory" | "gcc13Name" | "gxx13Name"`

All `ENV_VARIABLE_VALUE_SET` and `ENV_VARIABLE_STATUS_SET` events must use a key from this union. Callers outside the state module must cast or validate before dispatching.

### 11.2 Routing entries model

1. `routingEntries: EnvironmentRoutingLanguageSetting[]` stores per-language routing configuration.
2. `ENV_ROUTING_LANGUAGE_ENTRIES_SET` replaces the full list (used after re-parsing map texts).
3. `ENV_ROUTING_LANGUAGE_DRAFT_SET` updates fields in-place for one language by key; the language entry must already exist in `routingEntries`.
4. Batch routing draft fields (`batchRoutingDockerEnabled`, etc.) are independent of `routingEntries`.
5. `batchRoutingConflict` is recomputed on every `ENV_BATCH_ROUTING_DRAFT_SET`: it is `true` when both `dockerEnabled` and `sshEnabled` are `true`.

## 12. Filesystem State Bridge

`IStateFilesystemBridge` decouples the `filesystem` module from state event types. The concrete implementation returned by `createStateFilesystemBridge` translates each bridge method call into a `stateMachine.send(...)` call.

### 12.1 Bridge methods and their state events

| Bridge method | State event dispatched |
|---|---|
| `onCacheTtlSet(ttlMs)` | `FILESYSTEM_CACHE_TTL_SET` |
| `onCacheCleared(targetPath?)` | `FILESYSTEM_CACHE_CLEARED` |
| `onStatCacheEntrySet(...)` | `FILESYSTEM_STAT_CACHE_ENTRY_SET` |
| `onDirectoryCacheEntrySet(...)` | `FILESYSTEM_DIRECTORY_CACHE_ENTRY_SET` |
| `onPendingOperationSet(...)` | `FILESYSTEM_PENDING_OPERATION_SET` |
| `onPendingOperationCleared(operationId)` | `FILESYSTEM_PENDING_OPERATION_CLEARED` |
| `onOperationErrorSet(targetPath, message)` | `FILESYSTEM_OPERATION_ERROR_SET` |

The bridge never reads from state; it is write-only.

## 13. Sidebar View Mode and Filter Mode

### 13.1 IViewModeService

- `SidebarViewMode = "files" | "language"`
- Initial mode is `"files"` on service creation; the `algos.sidebarViewMode` VS Code context key is set immediately on construction.
- `setViewMode` is a no-op when the new mode equals the current mode.
- On a mode change: updates the internal value, sets the `algos.sidebarViewMode` context key, and fires `onDidChangeViewMode`.
- `onDidChangeViewMode` is a `vscode.Event<SidebarViewMode>`.

### 13.2 IFilterModeService

- `SidebarFilterMode = "all" | "problems"`
- Initial mode is `"all"` on service creation; `algos.sidebarFilterMode` is set immediately.
- `setFilterMode` is a no-op when the new mode equals the current mode.
- On a mode change: updates the internal value, sets the `algos.sidebarFilterMode` context key, and fires `onDidChangeFilterMode`.
- `onDidChangeFilterMode` is a `vscode.Event<SidebarFilterMode>`.

### 13.3 Context key rules

Both services use `vscode.commands.executeCommand("setContext", ...)` directly. Context key updates are `async`; callers that need to act after the update must `await setViewMode`/`setFilterMode`.

## 14. Status Helper Functions

All status helpers are exported from `types.ts` and are pure functions (no side effects, no state machine reads).

| Function | Inputs | Returns |
|---|---|---|
| `createRunArgsStatus` | `runArgsEnabled`, `runArgsText` | `{ statusText, statusClassName }` |
| `createSourceProfileStatus` | `sourceProfileEnabled`, `sourceProfileText` | `{ statusText, statusClassName }` |
| `createRunChecksStatus` | `runChecksMode`, `runChecksRoute` | `{ statusText, statusClassName }` |
| `createCleanOptionsStatus` | `cleanStdlibEnabled`, `cleanArchivesEnabled` | `{ statusText, statusClassName }` |
| `parseRunArgumentsText` | `rawText` | `ParsedRunArgumentsResult` |

Status classes are always one of `ViewStatusClassName = "status-muted" | "status-ok" | "status-error"`.

Callers are expected to dispatch the corresponding `*_STATUS_SET` events after computing status. The machine does not auto-update status fields when input fields change.

## 15. Verification Checklist

### Machine lifecycle

- [ ] `getSnapshot()` returns valid initial state before any `send` call.
- [ ] Actor starts lazily on first `send`.
- [ ] `dispose()` stops the actor; subsequent `send` calls are safe no-ops (or documented as invalid).

### Smoke runtime

- [ ] `SMOKE_LANGUAGE_TOGGLED` leaves disabled language entries unchanged.
- [ ] `SMOKE_ALL_LANGUAGES_SELECTED` forces disabled entries to `selected: false`.
- [ ] `SMOKE_RUN_STARTED` normalizes all language keys to lowercase before storing.
- [ ] `SMOKE_RUN_STATUS_CLEARED` is a no-op when `runId` does not match.
- [ ] Only one `activeSmokeRunAlgorithmPath` is non-null at any time.

### Narrow accessors

- [ ] Each narrow accessor reads only the specific sub-tree it returns; it does not deep-clone unrelated context fields.
- [ ] All six narrow accessors implemented on the concrete service.

### Environment variable events

- [ ] `ENV_VARIABLE_VALUE_SET` and `ENV_VARIABLE_STATUS_SET` reject (TypeScript compile error) any key not in `EnvironmentVariableKey`.
- [ ] `ENV_ROUTING_LANGUAGE_DRAFT_SET` updates only the entry whose `languageKey` matches; other entries are unchanged.
- [ ] `ENV_BATCH_ROUTING_DRAFT_SET` recomputes `batchRoutingConflict`.

### Filesystem bridge

- [ ] Bridge methods are write-only; no state reads occur inside bridge methods.
- [ ] Every bridge method maps to exactly one `stateMachine.send` call.

### View mode and filter mode

- [ ] Both services initialize their VS Code context keys synchronously on construction.
- [ ] `setViewMode`/`setFilterMode` is a no-op when mode is unchanged; event is not fired.
- [ ] `onDidChangeViewMode`/`onDidChangeFilterMode` fires only when the mode actually changes.

### Status helpers

- [ ] All status helpers are pure; they do not call `stateMachine.send` or access any module state.
- [ ] `parseRunArgumentsText` returns `ok: false` for unclosed quotes and trailing backslashes.
