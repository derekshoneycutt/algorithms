# Webview Behavior Spec

Implementation spec for webview controls channels, message flow, and host-state projection behavior.

Related sources of truth:

1. Ownership boundaries: `../ArchitectureSummary.md`
2. Dependency contracts: `../DependencyContracts.md`

This spec defines runtime behavior details only and does not restate architecture or dependency policy.

## Table of Contents

- [1. Scope](#1-scope)
- [2. Panels and Startup](#2-panels-and-startup)
- [3. Channel Message Contract](#3-channel-message-contract)
- [4. Host Snapshot Publication](#4-host-snapshot-publication)
- [5. Run/Smoke Control Projection to Execution Inputs](#5-runsmoke-control-projection-to-execution-inputs)
- [6. Environment Controls Behavior](#6-environment-controls-behavior)
- [7. Status and Error Semantics](#7-status-and-error-semantics)
- [8. Verification Checklist](#8-verification-checklist)

## 1. Scope

In scope:

1. Webview panel startup and bridge wiring behavior.
2. Typed host-to-view and view-to-host message behavior.
3. Snapshot publication semantics for run, smoke, and environment controls.
4. Projection path from run/smoke control values into host execution inputs.

Out of scope:

1. Module ownership definitions.
2. Dependency graph and bootstrap policy.
3. Command execution internals.

## 2. Panels and Startup

1. Each controls panel initializes comms facade, UI, and bridge at load time.
2. Bridge startup registers two directions:
   - UI intents -> typed `*.intent` messages.
   - Host snapshots -> UI `setSnapshot` updates.
3. On startup, bridge sends a typed `*.ready` message to request initial state publication.

## 3. Channel Message Contract

### 3.1 Typed Message Families

1. Run controls:
   - Ready: `run.ready`
   - Intent: `run.intent`
   - Snapshot: `run.snapshot`
2. Smoke controls:
   - Ready: `smoke.ready`
   - Intent: `smoke.intent`
   - Snapshot: `smoke.snapshot`
3. Environment controls:
   - Ready: `environment.ready`
   - Intent: `environment.intent`
   - Snapshot: `environment.snapshot`

### 3.2 Intent Discipline

1. Webview sends only typed intent payloads from shared message contracts.
2. Host channel handlers ignore unrelated message types.
3. UI components do not mutate host state directly; all writes flow through intent messages.

## 4. Host Snapshot Publication

1. Channel publishers build snapshots from current host state and post them to the matching view.
2. `*.ready` should trigger a publish path so the webview hydrates from host state.
3. After accepted intents, host state changes should publish updated snapshots when reaction policy indicates.
4. Snapshot payloads must include explicit status text/class fields for UI feedback surfaces.

## 5. Run/Smoke Control Projection to Execution Inputs

This section defines the control-data path that ultimately shapes execution inputs.

State-module mediation is mandatory for this path.

### 5.1 Pipeline

1. Webview emits `run.intent` or `smoke.intent`.
2. Host channel handler routes intent through conductor reaction policy.
3. Reaction applies events to the State module (`IStateMachine`).
4. Later execution dispatch reads run/smoke control values from State snapshots.
5. Execution options/passthrough inputs are projected from those stored values.

### 5.2 Run Controls Projection Rules

1. `runArgsEnabled` + `runArgsText` -> passthrough argument token list.
2. `sourceProfileEnabled` + `sourceProfileText` -> source-profile option token.
3. `runChecksMode` + `runChecksRoute` -> checks-mode option token selection.
4. `cleanStdlibEnabled` + `cleanArchivesEnabled` -> clean-defaults option token.

### 5.3 Smoke Controls Projection Rules

1. `reportEnabled` + `markdownPath` -> markdown option selection.
2. `timeoutSeconds` and `slowTimeoutSeconds` -> timeout option tokens.
3. Selected language set -> language filter option when subset-selected.
4. Empty selected language set is invalid and must block smoke execution dispatch.

### 5.4 Consistency Constraint

1. Run/smoke execution input projection must be derived from host state, not directly from transient webview local state.
2. For equivalent host snapshots, projection outputs must be deterministic.
3. Direct webview-to-execution option piping is not allowed.

## 6. Environment Controls Behavior

1. `environment.ready` triggers profile read and snapshot hydration workflow.
2. Environment intents update host state and status surfaces before/after async operations.
3. Save/refresh/check/copy operations are host-owned side effects initiated by environment intents.
4. Routing edits are validated before save operations; invalid combinations set error status instead of dispatching writes.

## 7. Status and Error Semantics

1. Status styling uses shared class names (`status-muted`, `status-ok`, `status-error`).
2. Pending operations publish muted/running status before async work starts.
3. Success and failure outcomes publish explicit user-facing status text.
4. Handler failures should set status surfaces and keep the message channel alive.

## 8. Verification Checklist

- [ ] Each controls panel sends `*.ready` on bridge startup.
- [ ] Each panel processes only matching snapshot message types.
- [ ] UI changes are sent as typed `*.intent` messages rather than direct host mutation.
- [ ] Host handlers route intents through reaction/state-event flow before snapshot publication.
- [ ] Run-controls values project to execution-input fields through host snapshot state.
- [ ] Smoke-controls values project to execution-input fields through host snapshot state.
- [ ] State module (`IStateMachine`) is the required mediation layer between webview intents and execution inputs.
- [ ] Empty smoke-language selection blocks dispatch and surfaces validation status.
- [ ] Environment operations update status surfaces across running/success/error states.
