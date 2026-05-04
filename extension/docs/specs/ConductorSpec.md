# Conductor Module Spec

Implementation spec for host-side orchestration behavior: intent reactions, run/smoke lifecycle management, cache invalidation policy, environment operations, and channel handler wiring.

Related sources of truth:

1. Ownership boundaries: `../ArchitectureSummary.md`
2. Dependency contracts: `../DependencyContracts.md`

This spec defines behavior details only and does not restate architecture or dependency policy.

## Table of Contents

- [1. Scope](#1-scope)
- [2. Internal Structure](#2-internal-structure)
- [3. Intent Reaction Policy](#3-intent-reaction-policy)
- [4. Run Lifecycle](#4-run-lifecycle)
- [5. Smoke Lifecycle](#5-smoke-lifecycle)
- [6. Cache Invalidation Policy](#6-cache-invalidation-policy)
- [7. Environment Operations](#7-environment-operations)
- [8. Channel Handler Conventions](#8-channel-handler-conventions)
- [9. Run Registry Conventions](#9-run-registry-conventions)
- [10. Workspace Context Management](#10-workspace-context-management)
- [11. Verification Checklist](#11-verification-checklist)

## 1. Scope

In scope:

1. Smoke-controls and run-controls intent interpretation and effect application.
2. `runFile` orchestration for all `ConductorRunActionKind` variants.
3. Run snapshot lifecycle (`startRun` → `markProgress` → `markCompleted`/`markFailed`/`cancelRun`).
4. Smoke run registry: active process tracking, stop requests, output parsing.
5. Workspace path invalidation and watcher-scope gating.
6. Environment profile read, write, check-environment, and copy-icons operations.
7. Channel handler wiring for smoke-controls and run-controls messages.
8. `algos.workspaceSupported` VS Code context key management.

Out of scope:

1. State machine transitions (owned by `state` module).
2. Command registration and command routing (owned by `commands` module).
3. Tree data provider rendering and tree node construction (owned by `views` module).
4. Algorithm index discovery and caching (owned by `algorithms` module).
5. UI layout policy and panel snapshot publishing (owned by `views` coordination layer).

## 2. Internal Structure

The conductor module contains four internal subsystems.

### 2.1 `runner/`

Owns: run-file orchestration (`runFile.ts`), run-controls and smoke-controls intent reactions (`reactions.ts`), terminal/commandline helpers (`runActionHelpers.ts`), output parsing for smoke lines (`outputParsing.ts`), run snapshot registry (`runRegistry.ts`), and smoke process registry (`smokeRegistry.ts`).

### 2.2 `environment/`

Owns: environment profile read/write delegation (`environmentOps.ts`), check-environment and copy-icons shell command execution (`environmentAdapter.ts`), channel handler for environment-controls messages (`environmentChannelHandler.ts`), and the `ApplyConductorReactionDependencies` type contract (`types.ts`).

### 2.3 `channels/`

Owns: the `ApplyConductorReactionDependencies` type re-export (`types.ts`). Channel handler builders for smoke-controls and run-controls messages live in `runner/` and are assembled in `service.ts`.

### 2.4 `service.ts`

Composes all subsystems into the `IConductor` implementation. Owns: `hasPathSegment`, `isPathWithinRoot`, and `resolveWatcherScopeRootsForWorkspaceFolder` helpers; run/smoke registry construction; `CreateConductorServiceInput` factory input; `applyConductorReaction`, `reactAndApplySmokeIntent`, and `reactAndApplyRunControlsIntent` exported helpers; channel message handler factories (`createSmokeControlsChannelMessageHandler`, `createRunControlsChannelMessageHandler`).

## 3. Intent Reaction Policy

### 3.0 Reaction contract

1. `reactToSmokeIntent` and `reactToRunControlsIntent` are pure functions: given the same `intent` and `snapshot`, they return the same `stateEvents`, `notification`, and `shouldPublishSnapshot`.
2. No side effects are applied inside the reaction functions themselves.
3. Side effects are applied by `applyConductorReaction`: it sends `stateEvents` to the state machine, dispatches `notification` if non-null, and returns `shouldPublishSnapshot` to the caller.
4. `applyConductorReaction` must not be called on a reaction whose events have already been applied.

### 3.1 Smoke-controls intents

| Intent kind | Effect |
|---|---|
| `setReportEnabled` | Emit `setSmokeReportEnabled` state event |
| `setMarkdownPath` | Emit `setSmokeMarkdownPath` state event |
| `setTimeoutSeconds` | Emit `setSmokeTimeoutSeconds` state event |
| `setSlowTimeoutSeconds` | Emit `setSmokeSlowTimeoutSeconds` state event |
| `toggleLanguage` | Emit `toggleSmokeLanguage` state event |
| `selectAllLanguages` | Emit `selectAllSmokeLanguages` state event |
| `deselectAllLanguages` | Emit `deselectAllSmokeLanguages` state event |

1. All smoke-controls reactions always set `shouldPublishSnapshot: true`.
2. No smoke-controls intent produces a notification.

### 3.2 Run-controls intents

| Intent kind | Effect |
|---|---|
| `setRunArgsEnabled` | Emit `setRunArgsEnabled` state event |
| `setRunArgsText` | Emit `setRunArgsText` state event |
| `setSourceProfileEnabled` | Emit `setSourceProfileEnabled` state event |
| `setSourceProfileText` | Emit `setSourceProfileText` state event |
| `setRunChecksMode` | Emit `setRunChecksMode` state event |
| `setRunChecksRoute` | Emit `setRunChecksRoute` state event |
| `setCleanStdlibEnabled` | Emit `setCleanStdlibEnabled` state event |
| `setCleanArchivesEnabled` | Emit `setCleanArchivesEnabled` state event |

1. All run-controls reactions always set `shouldPublishSnapshot: true`.
2. No run-controls intent produces a notification.

## 4. Run Lifecycle

### 4.0 Run-file orchestration

1. `runFile` orchestrates one full run-action execution including preflight validation, command construction, execution, and snapshot lifecycle management.
2. The action kind defaults to `"run-file"` when not supplied in `ConductorRunFileInput`.
3. Preflight validates tree node compatibility for the action kind, resolves the algorithms root and repository root, confirms `run.sh` exists, and for file-based actions confirms the canonical target file exists and is under the algorithms root.
4. Language key resolution is mandatory for non-smoke actions; preflight fails when the language key cannot be determined.

### 4.1 Run snapshot states

Runs progress through these states in order:

```
starting → running → completed
                   → failed
                   → cancelled
```

1. `startRun` returns the initial snapshot at `"starting"` status.
2. `markProgress` transitions to `"running"` on the first call and updates message, percent, and step key on subsequent calls.
3. `markCompleted`, `markFailed`, and `cancelRun` are terminal transitions. No further updates are accepted after a terminal state.
4. After terminal state, the run snapshot is retained for `runStatusRetentionMs` milliseconds (default `120_000`) then cleared.
5. At most one active run exists per `ownerKey` at a time. Starting a new run for the same `ownerKey` replaces the prior run.

### 4.2 Run target references

1. A `ConductorRunTargetRef` is the stable key used for `getRunForTarget` lookup and `subscribeRunTargetStatus` events.
2. Target key is derived from `nodeKind` and `filePath` together.
3. `subscribeRunTargetStatus` listeners are notified on every snapshot transition including terminal states.

### 4.3 Terminal versus tracked execution

1. When `IAlgorithmsTerminalRunAdapter` is available, non-smoke run actions use the terminal adapter path.
2. When `ICommandLine.spawnTracked` is available and the action is `"smoke-test"`, the tracked commandline path is used with streamed output parsing.
3. Terminal adapter runs do not produce streaming output snapshots; the run snapshot transitions directly to `completed` or `failed` when the terminal command exits.
4. Tracked runs parse each output chunk via `outputParsing` to emit intermediate smoke-status projections.

## 5. Smoke Lifecycle

### 5.0 Smoke registry

1. One active smoke execution is tracked per algorithm path.
2. `stopSmokeTest` delivers a stop request to the active process and returns `true`; returns `false` when no active smoke exists for the algorithm path.
3. `clearSmokeResults` removes retained smoke results from state and refreshes the algorithms tree; returns `true` when results existed.

### 5.1 Output parsing

1. Smoke output lines are parsed by `parseSmokeStatusLine` in `outputParsing.ts`.
2. Parsed line objects carry a `kind` discriminant; unrecognized lines emit a `"raw"` kind and are ignored for status projection.
3. Language-pass and language-fail lines update per-language smoke status in host state.
4. Smoke completion and failure lines drive the terminal state transition of the run snapshot.

### 5.2 Smoke run start conditions

1. A smoke run may not start while another smoke run for the same algorithm path is already active.
2. Attempting to start a duplicate smoke run silently no-ops the second call.

## 6. Cache Invalidation Policy

### 6.0 Path-scoped invalidation

1. `invalidateWorkspacePath` accepts one changed path and applies conductor-owned cache invalidation policy.
2. The changed path is first checked against watcher scope roots (derived from workspace folder paths via `resolveWatcherScopeRootsForWorkspaceFolder`). Changes that fall outside all scope roots are skipped without emitting metrics.
3. For accepted paths, `algorithmsIndex.clearProblemRowsCache(targetPath)` is called to scope the invalidation to the affected algorithm only.
4. Paths matching the `output` segment via `hasPathSegment` are excluded from cache invalidation regardless of scope root membership.

### 6.1 Watcher scope root resolution

`resolveWatcherScopeRootsForWorkspaceFolder` produces scope roots as follows:

1. Always includes `<workspaceFolderPath>/src` and `<workspaceFolderPath>/stdlib`.
2. When the workspace folder base name is `"src"`, also includes the folder itself and `<repositoryRoot>/stdlib`.
3. When the workspace folder base name is `"stdlib"`, also includes the folder itself and `<repositoryRoot>/src`.

### 6.2 Workspace-roots invalidation

1. `invalidateWorkspaceRoots` is called when the workspace folder list changes.
2. It calls `algorithmsIndex.clearProblemRowsCache()` with no argument (full cache clear) and `filesystem` index invalidation if the `IFilesystem` contract supports it.

### 6.3 Workspace path change handling

1. `handleWorkspacePathChanged` composes `invalidateWorkspacePath` with a debounced tree refresh policy.
2. `handleWorkspaceRootsChanged` composes `invalidateWorkspaceRoots` with full tree refresh.
3. Both handlers accept the full refresh callbacks from the caller; conductor does not hold direct tree provider references.

## 7. Environment Operations

### 7.0 Workspace-folder scoping

1. All environment operations accept a `workspaceFolderPath` and are scoped to one workspace folder at a time.
2. Conductor does not hold global environment state across workspace folders.

### 7.1 Read

1. `readEnvironment` loads the managed `DEREKALGOS` shell profile block from the resolved profile path.
2. When `profilePath` is not supplied, the default shell profile path is resolved by `ICommandLine`.
3. The result is typed as `EnvironmentReadResult` (alias for `ShellProfileLoadResult`).

### 7.2 Write

1. `writeEnvironment` applies a `EnvironmentWriteRequest` (writable `AlgorithmsProfileWritableValues`) to the managed shell profile block.
2. Write validates that only the managed variable set is written; unmanaged keys are rejected.
3. The result is typed as `EnvironmentWriteResult` (alias for `ShellProfileWriteResult`).

### 7.3 Check-environment

1. `checkEnvironment` executes `init.sh check-environment` via `ICommandLine.spawn` scoped to the given workspace folder path.
2. The result captures `kind` (`"running"` | `"ok"` | `"error"`), human-readable `text`, `filteredOutput`, `rawOutput`, and `exitCode`.
3. A non-zero exit code always produces `kind: "error"`.

### 7.4 Copy-icons

1. `copyIcons` executes `init.sh copy-icons` via `ICommandLine.spawn` scoped to the given workspace folder path.
2. Optional `iconsPath` and `profilePath` are forwarded as arguments when supplied.
3. The result captures `kind`, `text`, and `exitCode`.

## 8. Channel Handler Conventions

### 8.0 Handler factories

1. `createSmokeControlsChannelMessageHandler` and `createRunControlsChannelMessageHandler` are exported from `service.ts`.
2. Each factory accepts `ReactAndApply*Dependencies` plus a `publishSnapshot` callback.
3. The returned handler processes one `ViewToHostMessage` at a time; it is the caller's responsibility to route messages to the correct handler.

### 8.1 Message routing

1. Smoke-controls handlers process messages whose `channel` discriminant matches the smoke-controls channel identifier.
2. Run-controls handlers process messages whose `channel` discriminant matches the run-controls channel identifier.
3. Unknown message kinds within a channel are silently ignored.

### 8.2 Effect sequencing within a handler

1. Parse the intent from the message payload.
2. Obtain the current host snapshot from `IStateMachine`.
3. Call `reactAndApply*Intent` which calls `applyConductorReaction` internally.
4. If the return value is `true`, call `publishSnapshot()`.
5. No other side effects are permitted inside a channel handler.

### 8.3 Environment channel handler

1. The environment-controls channel handler lives in `environment/environmentChannelHandler.ts`.
2. It reads host state exclusively via `IStateMachine.getEnvironmentControls()` narrow accessor.
3. It delegates environment operations to conductor's environment methods; it never calls `ICommandLine` directly.

## 9. Run Registry Conventions

### 9.0 `RunSnapshotStore`

1. `RunSnapshotStore` manages run snapshot storage, per-target retention timers, and listener dispatch.
2. Run IDs are generated by concatenating `ownerKey`, a timestamp, and a monotonic sequence number.
3. Only one snapshot per `ownerKey` is active at a time; `startRun` cancels the prior snapshot for that key if it is still in a non-terminal state.
4. Retention timers fire after `retentionMs` and invoke `clearForTarget`; after clearing, subscribers receive a `null`-snapshot notification.

### 9.1 Smoke registry

1. `SmokeRegistry` maps `algorithmPath → ActiveSmokeExecution`.
2. An `ActiveSmokeExecution` holds the spawned process reference, a stop-requested flag, and the associated `runId`.
3. When `stopSmokeTest` is called and the process is still alive, the stop-requested flag is set and a SIGTERM is sent.

## 10. Workspace Context Management

1. `initWorkspaceSupportedContext` is called once on extension activation to set `algos.workspaceSupported` based on whether any workspace folder contains an algorithms repository.
2. `refreshWorkspaceSupportedContext` is called when workspace folders change; it re-evaluates and re-sets the context key.
3. The evaluation uses `IFilesystem` to check for the presence of `run.sh` under each workspace folder root.
4. The context key is set via `vscode.commands.executeCommand("setContext", ...)`.
5. Both init and refresh are fire-and-forget from the coordinator; errors are swallowed and do not surface to the user.

## 11. Verification Checklist

### Intent reactions

- [ ] `reactToSmokeIntent` is pure; same inputs always produce the same output.
- [ ] `reactToRunControlsIntent` is pure; same inputs always produce the same output.
- [ ] `applyConductorReaction` sends all `stateEvents` before dispatching notifications.
- [ ] `shouldPublishSnapshot: true` on all smoke-controls and run-controls reactions.
- [ ] No reaction function applies side effects directly.

### Run lifecycle

- [ ] `startRun` returns a `"starting"` snapshot immediately.
- [ ] First `markProgress` call transitions to `"running"`.
- [ ] Terminal state (`completed`/`failed`/`cancelled`) is not overwritten by subsequent updates.
- [ ] Retention timer fires after `runStatusRetentionMs` and clears the snapshot.
- [ ] `subscribeRunTargetStatus` notified on every state transition.

### Smoke lifecycle

- [ ] Duplicate smoke run for same algorithm path is rejected (no-op).
- [ ] `stopSmokeTest` returns `false` when no active smoke exists for the path.
- [ ] `clearSmokeResults` refreshes the algorithms tree after clearing.
- [ ] Smoke output lines parsed by `parseSmokeStatusLine`; unrecognized lines produce `"raw"` kind.

### Cache invalidation

- [ ] Paths outside all watcher scope roots are skipped without cache invalidation.
- [ ] Paths matching `output` segment are excluded.
- [ ] Accepted paths call `algorithmsIndex.clearProblemRowsCache(targetPath)` (scoped).
- [ ] `invalidateWorkspaceRoots` calls full cache clear with no path argument.
- [ ] `resolveWatcherScopeRootsForWorkspaceFolder` includes `src` and `stdlib` siblings for `src`/`stdlib`-named workspace folders.

### Environment operations

- [ ] All environment operations scoped to one `workspaceFolderPath` at a time.
- [ ] `checkEnvironment` non-zero exit code always produces `kind: "error"`.
- [ ] `writeEnvironment` rejects unmanaged variable keys.
- [ ] Environment channel handler reads host state only via `getEnvironmentControls()` narrow accessor.

### Channel handlers

- [ ] Unknown message kinds within a channel handler are silently ignored.
- [ ] `publishSnapshot` is called only when `reactAndApply*` returns `true`.
- [ ] No other side effects inside channel handler bodies.

### Workspace context

- [ ] `initWorkspaceSupportedContext` called once on activation.
- [ ] `refreshWorkspaceSupportedContext` called on workspace folder change.
- [ ] Errors from context key operations do not propagate to the user.
