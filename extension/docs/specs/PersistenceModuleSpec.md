# Persistence Module Spec

Implementation spec for host-side persistence behavior: workspace-scoped settings storage, schema/versioning, load/save lifecycle, failure handling, and integration boundaries with state, conductor, and views.

Related sources of truth:

1. Ownership boundaries: `../ArchitectureSummary.md`
2. Dependency contracts: `../DependencyContracts.md`
3. State context/event model: `./StateModuleSpec.md`
4. Conductor intent flow: `./ConductorSpec.md`

This spec defines behavior details only and does not restate architecture or dependency policy.

## Table of Contents

- [1. Scope](#1-scope)
- [2. Design Goals](#2-design-goals)
- [3. Internal Structure](#3-internal-structure)
- [4. Storage Model](#4-storage-model)
- [5. Persistence Domains](#5-persistence-domains)
- [6. Host Lifecycle Integration](#6-host-lifecycle-integration)
- [7. Save Triggers and Policies](#7-save-triggers-and-policies)
- [8. UI Contract for Persist Session](#8-ui-contract-for-persist-session)
- [9. Error Handling and Observability](#9-error-handling-and-observability)
- [10. Security and Data Limits](#10-security-and-data-limits)
- [11. Extensibility Model](#11-extensibility-model)
- [12. Verification Checklist](#12-verification-checklist)

## 1. Scope

In scope:

1. A dedicated persistence module for extension-owned settings, keyed by workspace.
2. Persisted settings for Run controls and Smoke controls (initial implementation domains).
3. Persist session toggle behavior that gates persistence read/write for those domains.
4. Storage schema, versioning, and migration behavior.
5. Integration contracts with activation bootstrap, conductor/channel handlers, and state events.

Out of scope:

1. Git branch-specific persistence keys or branch change handling.
2. Environment profile variable persistence (already owned by profile files and environment operations).
3. Persisting volatile runtime state such as active run IDs, transient status text, or cache summaries.
4. Replacing state machine ownership; state remains source of truth while running.

## 2. Design Goals

1. Keep persistence as an independent module, not embedded in state or filesystem modules.
2. Keep state machine pure (no VS Code API dependency inside state module).
3. Use workspace-scoped storage with explicit schema versioning.
4. Persist only user intent-bearing controls, not derived/transient status text.
5. Degrade safely when storage is unavailable or malformed.
6. Make future domain additions additive and backward compatible.

## 3. Internal Structure

| File | Responsibility |
|---|---|
| `IPersistenceStore.ts` | Narrow storage contract (`read`, `write`, `delete`) for typed blobs |
| `workspaceStateStore.ts` | VS Code `ExtensionContext.workspaceState` adapter implementing `IPersistenceStore` |
| `types.ts` | Versioned persisted-schema types and domain payload types |
| `service.ts` | `createPersistenceService` with load/save APIs and migration logic |
| `index.ts` | Module barrel export |

### 3.1 Primary service contract

The module exposes a single orchestrating service interface:

1. `loadWorkspaceSettings(workspaceKey): PersistedWorkspaceSettings | null`
2. `saveWorkspaceSettings(workspaceKey, payload): Promise<void>`
3. `clearWorkspaceSettings(workspaceKey): Promise<void>`
4. `migrate(raw): PersistedWorkspaceSettings | null`

Implementation rule:

1. All consumers interact with the service, not the raw store adapter.
2. Store adapter remains replaceable (workspaceState today, alternative backend later).

## 4. Storage Model

### 4.1 Keying

Persistence key format:

1. Global key namespace: `algos.persistence.workspace.v1`
2. Value shape contains an internal map keyed by canonical workspace key.

`workspaceKey` rules:

1. Derived from resolved primary workspace folder path (canonical absolute path).
2. Normalized for path separators and casing according to host platform behavior.
3. Empty or unresolved workspace key disables load/save silently.

### 4.2 Blob shape

```ts
interface PersistedWorkspaceSettings {
  schemaVersion: 1;
  updatedAt: number;
  persistSessionEnabled: boolean;
  domains: {
    runControls?: PersistedRunControls;
    smokeControls?: PersistedSmokeControls;
  };
}
```

Container map shape under root key:

```ts
interface PersistedWorkspaceSettingsByKey {
  [workspaceKey: string]: PersistedWorkspaceSettings;
}
```

## 5. Persistence Domains

### 5.1 Run controls domain

Persist these fields only:

1. `runArgsEnabled`
2. `runArgsText`
3. `sourceProfileEnabled`
4. `sourceProfileText`
5. `runChecksMode`
6. `runChecksRoute`
7. `cleanStdlibEnabled`
8. `cleanArchivesEnabled`

Do not persist:

1. Any `*StatusText`
2. Any `*StatusClassName`
3. Any runtime result rows or execution state

### 5.2 Smoke controls domain

Persist these fields only:

1. `reportEnabled`
2. `markdownPath`
3. `timeoutSeconds`
4. `slowTimeoutSeconds`
5. `languages` selected state by language key

Do not persist:

1. `statusLabel`
2. `reportStatusText` and `reportStatusClassName`
3. `smokeStatusText` and `smokeStatusClassName`
4. Per-algorithm smoke runtime statuses

### 5.3 Persist session toggle domain

Persisted field:

1. `persistSessionEnabled`

Behavior rule:

1. Toggle affects only whether Run/Smoke settings are loaded/saved from persistence.
2. Toggle does not alter run execution, smoke execution, environment operations, or tree behavior.

## 6. Host Lifecycle Integration

### 6.1 Activation/bootstrap

1. Activation resolves `workspaceKey` before constructing state service.
2. Persistence service loads workspace payload.
3. If payload exists and `persistSessionEnabled === true`, bootstrap passes persisted Run/Smoke values into state initializers.
4. If payload missing, malformed, or toggle disabled, bootstrap uses normal defaults.

### 6.2 Runtime changes

1. Run/Smoke intents continue through conductor reaction and state events exactly as today.
2. After successful state application, persistence save is attempted when toggle is enabled.
3. Persistence failures never block state updates or snapshot publishing.

## 7. Save Triggers and Policies

### 7.1 Trigger points

Initial policy for v1:

1. Save after each accepted Run controls intent.
2. Save after each accepted Smoke controls intent.
3. Save immediately when `persistSessionEnabled` is toggled.

### 7.2 Debounce policy

Initial policy:

1. No debounce required for v1 unless write amplification becomes visible.
2. If needed later, add module-local debounce (e.g. 150-300 ms) without changing caller contracts.

### 7.3 Toggle-off behavior

When user disables persist session:

1. Stop saving subsequent Run/Smoke changes.
2. Keep current in-memory settings unchanged for this session.
3. Keep existing persisted blob by default (for reversible re-enable) unless explicit clear behavior is introduced later.

## 8. UI Contract for Persist Session

Environment controls panel adds a new top section:

1. Section title: `Persist Session`
2. Section icon: small persistence/session icon consistent with existing section icon style.
3. Control: one checkbox bound to `persistSessionEnabled`.
4. Help text: states that only Run and Smoke controls are persisted across sessions for the current workspace.

Message contract additions:

1. Environment snapshot includes `persistSessionEnabled` boolean.
2. Environment intent adds `setPersistSessionEnabled` with `enabled: boolean`.
3. Environment channel handler emits state event and publishes updated snapshot.

## 9. Error Handling and Observability

### 9.1 Error handling

1. Malformed persisted data: ignore payload, fall back to defaults, optionally log debug-level event.
2. Storage read failure: treat as no persisted data.
3. Storage write failure: show no user-blocking error; optional non-intrusive warn log.

### 9.2 Observability events

Recommended counters:

1. `persistence.load.attempt.count`
2. `persistence.load.hit.count`
3. `persistence.load.miss.count`
4. `persistence.load.error.count`
5. `persistence.save.attempt.count`
6. `persistence.save.success.count`
7. `persistence.save.error.count`

Recommended dimensions:

1. `workspaceKeyPresent` (`true|false`)
2. `domain` (`run|smoke|toggle|all`)

## 10. Security and Data Limits

1. Persist only non-secret UI control values.
2. Do not persist command output, environment secrets, or arbitrary shell text beyond existing Run/Smoke fields.
3. Keep payload small and deterministic.
4. Enforce strict schema validation before use.

## 11. Extensibility Model

Persistence is domain-oriented.

Rules for adding new domains:

1. Add a new optional domain node under `domains`.
2. Version bump only when backward-incompatible shape changes are required.
3. Migration must preserve older domain data where possible.
4. New domains must define explicit allowlist of persisted fields.

Potential future domains (non-committed):

1. Sidebar presentation preferences.
2. Tree expansion preferences.
3. Future panel options not already persisted elsewhere.

## 12. Verification Checklist

Workspace-only persistence scenarios:

1. First activation in workspace with no saved data uses defaults.
2. Enabling Persist Session saves current Run/Smoke values.
3. Changing Run controls with toggle enabled persists values and restores after reload.
4. Changing Smoke controls with toggle enabled persists values and restores after reload.
5. Disabling Persist Session prevents subsequent writes.
6. Reload with toggle disabled does not hydrate Run/Smoke from persisted blob.
7. Corrupt persisted payload falls back to defaults without crashing.
8. Multiple workspaces in separate windows do not cross-contaminate persisted values.
9. Status text/class values are recomputed and not sourced from persistence.
