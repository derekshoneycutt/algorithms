# Command-Line Behavior Spec

Implementation spec for command-line behavior across run dispatch, `init.sh` operations, and managed shell profile handling.

Related sources of truth:

1. Ownership boundaries: `../ArchitectureSummary.md`
2. Dependency contracts: `../DependencyContracts.md`

This spec defines behavior details only and does not restate architecture or dependency policy.

## Table of Contents

- [1. Scope](#1-scope)
- [2. Execution Surfaces](#2-execution-surfaces)
- [3. Run Behavior Conventions](#3-run-behavior-conventions)
- [4. Init Behavior Conventions](#4-init-behavior-conventions)
- [5. Environment Profile Conventions](#5-environment-profile-conventions)
- [6. Safety and Boundaries](#6-safety-and-boundaries)
- [7. Verification Checklist](#7-verification-checklist)

## 1. Scope

In scope:

1. `run.sh` dispatch behavior for run/compile/check/clean/localclean/smoke actions.
2. `init.sh` command behavior for check-environment and copy-icons operations.
3. Managed shell profile read/write/parse conventions for extension-owned variables.

Out of scope:

1. Module ownership definitions.
2. Interface dependency graph rules.
3. UI layout and view rendering policy.

## 2. Execution Surfaces

1. **Terminal adapter path** (`IAlgorithmsTerminalRunAdapter`): dispatches `run.sh` to the extension-owned terminal (`Algorithms Runner`).
2. **Tracked command-line path** (`ICommandLine.spawnTracked`): used for smoke-test execution when available, with streamed output parsing.
3. **Init command path** (`ICommandLine.spawn`): executes `sh -c "...init.sh..."` for check-environment and copy-icons.
4. **Profile file path** (`loadShellProfile` / `writeShellProfile`): reads and updates the managed `DEREKALGOS` block in the selected shell profile.

## 3. Run Behavior Conventions

### 3.0 Execution Input Sources

1. Execution inputs are derived at dispatch time from State-module snapshots (`IStateMachine`) plus explicit command-level overrides when provided.
2. Run actions (`run-file`, `compile-only`, `check-only`, `clean`, `localclean`) project options from run-controls state.
3. Smoke actions project options from smoke-controls state.
4. Input projection is deterministic: same host snapshot and target produce the same option/passthrough token sets.

Authoritative-source rule:

1. State snapshots are the authoritative source of persisted run/smoke controls.
2. Explicit command-level overrides are allowed for specific actions (for example, check-only route overrides).
3. Command-line execution must not read execution options from webview local state.
4. Command-line execution must not read execution options directly from transport message payloads.

### 3.1 Target and Preflight

1. Resolve action kind from input (`run-file` default).
2. Validate tree-node compatibility per action.
3. Resolve algorithms root and repository root at call time.
4. Require `run.sh` to exist before dispatch.
5. For file-based actions, require canonical target file to exist and remain under algorithms root.
6. Resolve language key for non-smoke actions; fail when language cannot be determined.

### 3.2 Token Construction

1. Command composition order is fixed: options first, target second, passthrough args last.
2. Run control options may emit:
   - `--source-profile=<value>`
   - `--compile-only`
   - `--check-only=<native|docker|ssh>`
   - `--defaults=<stdlib|archive>` for clean actions
3. Smoke-test options always include `--smoke-test` and may include:
   - `--markdown` or `--markdown=<path>`
   - `--timeout=<seconds>`
   - `--slow-timeout=<seconds>`
   - `--langs=<space-delimited language keys>` when subset-selected
4. Passthrough args are only supported for `run-file`, `compile-only`, and `check-only`.

Run-controls projection:

1. `sourceProfileEnabled + sourceProfileText` -> `--source-profile=<value>`.
2. `runChecksMode` -> `--compile-only` or `--check-only=<route>`.
3. `runChecksRoute` -> route value used by `--check-only=<native|docker|ssh>`.
4. Clean toggles (`cleanStdlibEnabled`, `cleanArchivesEnabled`) -> `--defaults=<y|n>|<y|n>`.
5. Run args (`runArgsEnabled`, `runArgsText`) -> parsed passthrough token list.

Smoke-controls projection:

1. Report toggle/path (`reportEnabled`, `markdownPath`) -> `--markdown` or `--markdown=<path>`.
2. Timeout fields (`timeoutSeconds`, `slowTimeoutSeconds`) -> `--timeout=<seconds>` and `--slow-timeout=<seconds>`.
3. Language selections -> `--langs=<space-delimited keys>` only when selection is a non-empty subset.
4. Empty language selection is invalid and must fail pre-dispatch.

### 3.3 Dispatch and Status

1. Start run lifecycle entry before execution dispatch.
2. Route smoke-test execution to tracked command-line execution when available; otherwise use terminal adapter.
3. For terminal execution, completion/failure is inferred from terminal exit event callback.
4. For tracked smoke execution, parse stdout/stderr chunks for smoke status projection.
5. On completion, failure, cancellation, or stop request, update run lifecycle and smoke state consistently.

## 4. Init Behavior Conventions

### 4.1 Check Environment

1. Build `init.sh` check command using:
   - `--no-prompt`
   - `--no-icons`
   - optional `--update-profile=<path>` when profile path is provided
   - `--check-env`
2. Execute via `sh -c` in repository-root working directory.
3. Parse output by extracting error-pattern lines first (`error|invalid|failed|missing|unsupported`, case-insensitive).
4. If no matched errors exist, keep full output when short, or last 40 lines when long.

### 4.2 Copy Icons

1. Build `init.sh` copy command using:
   - `--no-prompt`
   - `--copy-icons`
   - `--skip-environment`
   - optional `--update-profile=<path>`
   - optional `--icons-to=<path>`
2. Execute via `sh -c` in repository-root working directory.
3. Interpret `exitCode === 0` as success; otherwise return explicit error status.

## 5. Environment Profile Conventions

### 5.1 Managed Block Ownership

1. Managed block markers are:
   - `# >>> DEREKALGOS INIT >>>`
   - `# <<< DEREKALGOS INIT <<<`
2. Writes are block-scoped: replace existing managed block when present; append block when absent.
3. Preserve non-managed profile content and preserve existing line-ending style.

### 5.2 Profile Path Resolution

1. If `profilePath` is blank, resolve platform default profile path:
   - `darwin`: `~/.zprofile`
   - `freebsd`: `~/.profile`
   - otherwise: `~/.bash_profile`
2. Expose both placeholder path and effective expanded path in read/write results.

### 5.3 Managed Variables

1. Managed exports are limited to:
   - `DEREKALGOS_TIMEOUT`
   - `DEREKALGOS_EIFFEL`
   - `DEREKALGOS_GCC13`
   - `DEREKALGOS_GCC13NAME`
   - `DEREKALGOS_GXX13NAME`
   - `DEREKALGOS_RUNONDOCKER`
   - `DEREKALGOS_RUNONSSH`
2. `undefined` and `null` write values are omitted from output.
3. Empty string values are emitted as explicit empty quoted exports.

### 5.4 Routing Parse Rules

1. Docker map text parses as whitespace-delimited `language=value` tokens.
2. SSH map text parses as whitespace-delimited `language=value` tokens where each value is one of:
   - `destination|code-dir|run-script`
   - `address|user|port|code-dir|run-script`
3. Malformed tokens are ignored instead of failing the full parse.

### 5.5 Workspace Scoping

1. Environment operations are workspace-scoped at call time through `workspaceFolderPath`.
2. Repository root for init commands is resolved from that workspace context per request.

## 6. Safety and Boundaries

1. Command-line module owns execution mechanics only (spawn, track, normalize results).
2. Workflow policy, reaction logic, and user intent interpretation remain outside commandline (conductor/state).
3. Terminal command tokens must be shell-quoted before composition.
4. Async process spawning uses non-shell mode (`shell: false`) in core command-line execution.
5. Input projection is host-state mediated: execution settings must flow through conductor reactions into State before dispatch.
6. Direct webview-to-commandline option piping is not allowed.

## 7. Verification Checklist

- [ ] Run action preflight validates node kind, root resolution, and `run.sh` presence.
- [ ] Run/smoke execution inputs are derived at dispatch from state snapshots plus explicit command-level overrides where applicable.
- [ ] State module (`IStateMachine`) is the authoritative source for persisted run/smoke controls.
- [ ] Explicit command-level overrides are scoped and intentional (for example, check-only route override).
- [ ] Run token order is options -> target -> passthrough.
- [ ] Passthrough args are only forwarded for `run-file`, `compile-only`, and `check-only`.
- [ ] Run-controls fields project to expected execution options (`source-profile`, checks mode/route, clean defaults).
- [ ] Smoke-controls fields project to expected execution options (`markdown`, timeout flags, language subset).
- [ ] Direct webview or transport payloads are not used as execution option sources.
- [ ] Smoke-test uses tracked execution when available and updates smoke projection from output chunks.
- [ ] Check-environment command uses `--no-prompt --no-icons` plus `--check-env`.
- [ ] Copy-icons command uses `--no-prompt --copy-icons --skip-environment`.
- [ ] Profile writes are block-scoped with managed INIT markers and preserve non-managed content.
- [ ] Managed variable set is limited to the documented `DEREKALGOS_*` exports.
- [ ] Environment operations are workspace-scoped and resolve repository root from workspace context.
