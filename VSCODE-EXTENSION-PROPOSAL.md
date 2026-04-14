# VS Code Script Integration Extension - Build Proposal

> Status: Proposed
> Owner: Senior engineer
> Date: 2026-04-13
> Scope target: MVP

## Executive Summary

This proposal defines an MVP Visual Studio Code extension that integrates `run.sh` into VS Code via Explorer context menu, editor title actions, and Command Palette. The extension is orchestration only: script behavior stays canonical. The goal is lower command friction without contract drift from script-owned behavior.

MVP callout: `init.sh` support is intentionally out of scope for this proposal.

## Table Of Contents

1. [Executive Summary](#executive-summary)
2. [Intent And Success Criteria](#intent-and-success-criteria)
3. [Scope](#scope)
4. [Source Of Truth And Guardrails](#source-of-truth-and-guardrails)
5. [Workspace Eligibility Contract](#workspace-eligibility-contract)
6. [User Entry Points (Command Surfaces)](#user-entry-points-command-surfaces)
7. [Command Inventory (MVP)](#command-inventory-mvp)
8. [Normative Command-To-Script Mapping](#normative-command-to-script-mapping)
9. [Directory Execution Invariant](#directory-execution-invariant)
10. [Validation, Precedence, And Error Semantics](#validation-precedence-and-error-semantics)
11. [Active File And Language Resolution Strategy](#active-file-and-language-resolution-strategy)
12. [Execution Model](#execution-model)
13. [Activation And Non-Interference Rules](#activation-and-non-interference-rules)
14. [Runtime Invocation Contract](#runtime-invocation-contract)
15. [Extension Project Structure (Planned Files)](#extension-project-structure-planned-files)
16. [Validation Data Source Contract](#validation-data-source-contract)
17. [Copilot Execution Protocol (Human-In-The-Loop)](#copilot-execution-protocol-human-in-the-loop)
18. [FEAT Definition Of Done Template](#feat-definition-of-done-template)
19. [FEAT Sizing And Numbering Policy](#feat-sizing-and-numbering-policy)
20. [Agent Handoff Packets](#agent-handoff-packets)
21. [FEAT Packet Alignment Matrix](#feat-packet-alignment-matrix)
22. [Configuration And State Handling](#configuration-and-state-handling)
23. [Local Packaging Requirements (MVP Final Gate)](#local-packaging-requirements-mvp-final-gate)
24. [Risks And Mitigations](#risks-and-mitigations)
25. [Repository Coexistence Constraints (Blog + Extension)](#repository-coexistence-constraints-blog--extension)
26. [Post-MVP Deferred Records (No MVP Action)](#post-mvp-deferred-records-no-mvp-action)
27. [Phased Delivery Plan](#phased-delivery-plan)
28. [MVP Delivery Gating Rule](#mvp-delivery-gating-rule)
29. [Implementation Artifact Checklist (MVP)](#implementation-artifact-checklist-mvp)
30. [FEAT Backlog (Scrum-Style Scoped Tickets)](#feat-backlog-scrum-style-scoped-tickets)
31. [MVP Estimates Summary](#mvp-estimates-summary)
32. [FEAT Traceability Matrix](#feat-traceability-matrix)
33. [Acceptance Criteria](#acceptance-criteria)
34. [Verification Plan](#verification-plan)
35. [Compatibility And Regression Boundaries](#compatibility-and-regression-boundaries)
36. [Documentation Drift Policy](#documentation-drift-policy)
37. [Reviewer Checklist](#reviewer-checklist)
38. [Change Log](#change-log)
39. [Appendix A: Canonical MVP Command Examples (User-Facing Display)](#appendix-a-canonical-mvp-command-examples-user-facing-display)
40. [Appendix B: Language Key Coverage Sync Strategy](#appendix-b-language-key-coverage-sync-strategy)
41. [Appendix C: Explicitly Excluded from MVP](#appendix-c-explicitly-excluded-from-mvp)

## Intent And Success Criteria

### Intent

Provide a discoverable and contract-safe way to execute `run.sh` flows from VS Code without manual shell composition.

### Success Criteria

1. Users can run the active file from Explorer context menu, editor title action, and Command Palette.
2. Users can invoke `clean` and `localclean` from VS Code Command Palette when a valid active compatible source file target is present; otherwise these commands no-op with guidance.
3. Users can trigger `--compile-only` and check-only route variants (`native`, `docker`, `ssh`) from VS Code.
4. All MVP command execution runs from `src/<category>/<algorithm>/` algorithm-directory context using filename invocation mode for file-targeted commands.
5. Command behavior is contract-aligned with script-owned accepted values, precedence, and known parser failures.
6. Reviewers can validate all MVP actions via a clear command mapping table and verification checklist.

Success criteria summarize discoverability goals and must not weaken the detailed runtime gating and failure-handling rules defined later in this document.

## Scope

### In Scope (MVP)

1. Extension commands for active-file `run.sh` flows.
2. Explorer file context menu actions for supported files.
3. Editor title actions for active file quick run actions.
4. Command Palette command set for run flows, including clean maintenance commands.
5. Preflight validation for obvious user mistakes where safe.
6. Terminal-based execution with output visibility and exit reporting.

### Out Of Scope (MVP)

1. Changes to script contracts or parser behavior in `run.sh`.
2. Any `init.sh` command support.
3. Custom tree/panel UI for map editing or route-map management (deferred).
4. Debugger integration.
5. Non-VS Code editor integrations.
6. Language-key run command surface (`./run.sh <language-key>`) from extension UI; deferred post-MVP.
7. Extension-owned persistent archival logging mechanisms; `run.sh` remains the canonical runtime logging/archive owner.

### MVP Constraint Taxonomy

All requirement statements in this proposal must be classified into one of these tiers. Tiering is normative and governs implementation and FEAT acceptance.

1. `MVP-BLOCKING`: mandatory for MVP completion; must have FEAT coverage, acceptance criteria, and verification evidence.
2. `MVP-GUARDRAIL`: mandatory safety/behavior constraints for MVP execution quality; must be enforced in implementation and verified where applicable.
3. `POST-MVP-DEFERRED`: explicitly not implemented in MVP; recorded for later planning only.

Classification rule:

1. A statement that implies new command surface, configurable behavior expansion, or additional logging/archive ownership beyond current MVP constraints is `POST-MVP-DEFERRED` unless explicitly promoted by senior-engineer approval and changelog entry.

### Out-Of-Scope Parking Lot

1. Full `init.sh` integration proposal and command surface design.
2. Tree/panel UX for route-map editing and advanced configuration.
3. Smoke-test UI workflows and value-shape assistants.
4. Rich extension log retention controls (custom TTL/size cache policy) beyond VS Code-managed log lifecycle.

## Source Of Truth And Guardrails

### Contract Sources

1. `run.sh` parser and execution flow.

### Non-Negotiable Guardrails

1. Do not alter script precedence behavior.
2. Do not reinterpret accepted option shapes.
3. Do not silently coerce unsupported values.
4. Keep language-key handling aligned with canonical supported-key catalog.
5. Keep error reporting truthful to script outcomes when execution occurs.

## Workspace Eligibility Contract

The extension must run full functionality only in an eligible workspace and fail safe (inert) elsewhere.

### Root Terminology And Supported Workspace Shapes

1. Project root for this extension always means the repository root (git root) that contains the required runtime markers.
2. A VS Code workspace folder may point at the repository root or at a nested folder such as `src/`.
3. If only `src/` is open, the extension must resolve the repository root by walking ancestors until required markers are found.
4. If both repository root and `src/` are open in the same workspace, they are treated as one repository context when they resolve to the same canonical root path.
5. Nested folders that resolve to the same repository root are not a multi-root ambiguity condition.
6. MVP execution behavior is anchored to algorithm directories under `src/<category>/<algorithm>/`; eligibility, script path, and canary checks remain repository-root anchored.

### Eligibility States

1. Eligible:
   - required hard repository markers are present (`run.sh`, `init.sh`, `src/`, `shlib/`, `stdlib/`, and `templates/` at resolved repository root)
   - canary command `<run-script-path> --help-all` succeeds from resolved repository-root context.
   - full command/UI surface is enabled.
2. Partial:
   - hard markers are mostly present but one or more are missing with clear remediation guidance, or
   - hard markers are present but canary command fails.
   - command discovery may remain visible, but run execution is blocked with actionable guidance.
3. Ineligible:
   - core repository identity markers are missing (for example `run.sh` or `src/`), or
   - multiple distinct eligible repository roots are present and selection is ambiguous and unresolved.
   - run functionality remains inert and no run terminal execution is attempted.

Marker policy:

1. Hard eligibility markers: `run.sh`, `init.sh`, `src/`, `shlib/`, `stdlib/`, `templates/`.

### Multi-Root Resolution Rules

1. Evaluate each workspace folder by resolving its candidate repository root, then validate eligibility at that resolved root.
2. Canonicalize and deduplicate candidate roots by absolute path before ambiguity checks.
3. Select exactly one eligible repository root as active execution root.
4. If none are eligible, remain inert and surface ineligible guidance.
5. If multiple distinct repository roots are eligible and selection is ambiguous, stop and request senior engineer decision before execution.

### Non-Interference Rules

1. No run execution is allowed outside resolved eligible repository root.
2. Do not infer fallback roots when eligibility markers are missing or ambiguous.
3. Eligibility failures block command execution before argument assembly and before terminal creation.

### Path Policy Terminology Lock

1. Use this exact phrase whenever path-format behavior is specified: `Path Policy: Internal Absolute, Display Relative With Safe Fallback`.
2. Internal path policy: repository root, algorithm directory, and script path are canonical absolute filesystem paths for resolution, validation, argument assembly, and evidence capture.
3. User-facing display policy: terminal command display may render a relative script path from resolved algorithm-directory context (for example `../../../run.sh`) only when safely derivable; otherwise display absolute script path.

### Logging Policy Terminology Lock

1. Use this exact phrase whenever extension logging scope is specified: `Logging Policy: Extension Light, Script Canonical`.
2. MVP extension logging is orchestration metadata only and intentionally minimal.
3. Extension logging must not duplicate `run.sh` build/archive logging or add extension-owned persistent archive logs in MVP.

## User Entry Points (Command Surfaces)

### Explorer Context Menu

Show file-scoped run actions when a file is selected and extension can resolve a supported path.

- `algos.runActiveFile` remains directly accessible as the primary run action and is shown only for supported source files that are immediate children under `src/<category>/<algorithm>/`.
- `algos.runActiveFileCompileOnly`, `algos.runActiveFileCheckOnlyNative`, `algos.runActiveFileCheckOnlyDocker`, and `algos.runActiveFileCheckOnlySsh` are shown only for supported source files that are immediate children under `src/<category>/<algorithm>/`.
- `algos.runLocalClean` is shown for algorithm directories, immediate-child files, and immediate-child directories in Explorer when selection is within one algorithm scope (`src/<category>/<algorithm>/`); deeper descendants are invalid in MVP.
- `algos.runClean` is shown for algorithm directories, immediate-child files, and immediate-child directories in Explorer when selection is within one algorithm scope (`src/<category>/<algorithm>/`); deeper descendants are invalid in MVP.
- Non-Play actions are grouped under an explicit `Derek's Algorithms` submenu.

### Editor Title Actions

Show quick actions for active editor file in top-right tab action region.

- `algos.runActiveFile` is the **primary always-visible button**: contributed to the `editor/title` menu with `"group": "navigation"` and `"icon": "$(play)"` so it renders as an inline Play icon button rather than being buried in the `...` overflow. This is the only editor-title command in the `navigation` group for MVP.
- `algos.runActiveFileCompileOnly`, `algos.runActiveFileCheckOnlyNative`, `algos.runActiveFileCheckOnlyDocker`, `algos.runActiveFileCheckOnlySsh`, `algos.runClean`, and `algos.runLocalClean` are included in the `Derek's Algorithms` editor-title overflow submenu only when the active file is a supported source file that is an immediate child under `src/<category>/<algorithm>/`.
- All other run interfaces are grouped under an explicit `Derek's Algorithms` submenu in the editor-title overflow menu.

### Command Palette

Expose the MVP run inventory through two palette entry paths:

1. Direct `Run Active Script` command (`algos.runActiveFile`) for valid active scripts only.
   - If there is no valid active script target, this command performs no execution and shows actionable `nothing to do` guidance.
2. `Derek's Algorithms` run menu launcher for all non-Play run actions.
   - Palette context source is only the active open file.
   - `algos.runActiveFileCompileOnly`, `algos.runActiveFileCheckOnlyNative`, `algos.runActiveFileCheckOnlyDocker`, and `algos.runActiveFileCheckOnlySsh` require a valid active source file target and perform no execution with guidance when invalid.
   - `algos.runClean` and `algos.runLocalClean` require a valid active source file target and run from the resolved parent algorithm directory.

Surface isolation rule: Command Palette and editor-title actions do not read Explorer selection context. Explorer context-menu actions do not read active editor context.

Note: VS Code Command Palette does not provide a native nested folder UI. `Derek's Algorithms` in palette is represented by command naming plus a launcher-driven quick-pick menu.

Post-MVP deferral note: `--list-languages`, `--list-problems`, `--flag`, and `--unflag` command surfaces are intentionally excluded from MVP.

### Deferred Surface (Post-MVP Candidate)

Tree view/custom panel for richer run controls and route-map editing UX.

## Command Inventory (MVP)

| Command ID (proposed) | Surface(s) | Placement | Purpose |
| --- | --- | --- | --- |
| `algos.runActiveFile` | Explorer, Editor Title, Palette | Primary Play action (inline in editor title) | Run active/selected file with canonical run flow; palette invocation allowed only for valid active scripts. |
| `algos.openRunMenu` | Palette | `Derek's Algorithms` launcher | Open the grouped run menu for non-Play actions. |
| `algos.runActiveFileCompileOnly` | Explorer, Editor Title, Palette | `Derek's Algorithms` group | Compile only for active/selected file; requires supported source file target under `src/<category>/<algorithm>/`. |
| `algos.runLocalClean` | Explorer, Editor Title, Palette | `Derek's Algorithms` group | Execute `localclean` to remove local `./output` and exit; execution base is the resolved algorithm directory. |
| `algos.runClean` | Explorer, Editor Title, Palette | `Derek's Algorithms` group | Execute deterministic non-interactive `clean --defaults=y`; execution base is the resolved algorithm directory. |
| `algos.runActiveFileCheckOnlyNative` | Explorer, Editor Title, Palette | `Derek's Algorithms` group | Simulate route setup with `--check-only=native`; requires supported source file target under `src/<category>/<algorithm>/`. |
| `algos.runActiveFileCheckOnlyDocker` | Explorer, Editor Title, Palette | `Derek's Algorithms` group | Simulate route setup with `--check-only=docker`; requires supported source file target under `src/<category>/<algorithm>/`. |
| `algos.runActiveFileCheckOnlySsh` | Explorer, Editor Title, Palette | `Derek's Algorithms` group | Simulate route setup with `--check-only=ssh`; requires supported source file target under `src/<category>/<algorithm>/`. |

Command priority note: `clean` and `localclean` are listed before check-only variants because they are frequent maintenance actions and fully contract-defined positional modes.

Editor title icon note: `algos.runActiveFile` is the only command with an inline Play icon (`$(play)`, `"group": "navigation"`) in the editor title bar. All other run actions are grouped under the `Derek's Algorithms` submenu in the editor-title overflow.

## Normative Command-To-Script Mapping

### MVP Command Mapping (CWD = algorithm directory)

| Extension Command | Script Invocation Pattern | Key Validation Rules |
| --- | --- | --- |
| `algos.runActiveFile` | `<run-script-path> <filename>` | Resolve active/selected compatible source file to its parent algorithm directory, set CWD to that algorithm directory, and pass filename basename. |
| `algos.runActiveFileCompileOnly` | `<run-script-path> --compile-only <filename>` | Resolve active/selected compatible source file to its parent algorithm directory, set CWD to that algorithm directory, and pass filename basename. |
| `algos.runLocalClean` | `<run-script-path> localclean` | CWD is resolved algorithm directory. Palette/editor-title require active compatible source file. Explorer allows algorithm-directory selection and immediate-child selection (file or directory), both normalized to one algorithm directory; deeper descendants are invalid. |
| `algos.runClean` | `<run-script-path> clean --defaults=y` | CWD is resolved algorithm directory. Palette/editor-title require active compatible source file. Explorer allows algorithm-directory selection and immediate-child selection (file or directory), both normalized to one algorithm directory; deeper descendants are invalid. |
| `algos.runActiveFileCheckOnlyNative` | `<run-script-path> --check-only=native <filename>` | Route enum must be exact (`native`); target must satisfy valid active script contract. |
| `algos.runActiveFileCheckOnlyDocker` | `<run-script-path> --check-only=docker <filename>` | Route enum must be exact (`docker`); target must satisfy valid active script contract. |
| `algos.runActiveFileCheckOnlySsh` | `<run-script-path> --check-only=ssh <filename>` | Route enum must be exact (`ssh`); target must satisfy valid active script contract. |

### Canonical Context Vocabulary

1. Active compatible source file: active editor file that is a supported source file and an immediate child under `src/<category>/<algorithm>/`; used by palette/editor-title command contexts.
2. Explorer algorithm-directory selection: selected directory path exactly equal to one algorithm directory (`src/<category>/<algorithm>/`); cleanup commands execute with this directory as normalized target.
3. Explorer immediate-child file selection: selected file path directly under one algorithm directory; cleanup commands normalize target to the parent algorithm directory.
4. Explorer immediate-child directory selection: selected directory path directly under one algorithm directory; cleanup commands normalize target to the parent algorithm directory.
5. Deeper-descendant selection: any selected path below immediate-child depth under an algorithm directory; invalid in MVP and must no-op with guidance.

### Command-By-Selection Legality Matrix

Outcome vocabulary:

- `allowed-exec`: command is visible/available and executes.
- `hidden-unavailable`: command should not be shown for that context.

Matrix scope note: this matrix models context legality and visibility by command family. Surface-specific no-op behavior for invokable commands is governed by Command Palette rules and Runtime Invocation Contract failure-handling sections.
Cross-read note: for no-active-file and invalid-context no-op outcomes, use the Command Palette behavior rules and Runtime Invocation Contract failure-handling as the authoritative source of behavior.

| Command Family | Active Compatible Source File | Explorer Algorithm-Directory Selection | Explorer Immediate-Child File Selection | Explorer Immediate-Child Directory Selection | Deeper-Descendant Selection |
| --- | --- | --- | --- | --- | --- |
| `run-active` | `allowed-exec` | `hidden-unavailable` | `allowed-exec` (supported source file only) | `hidden-unavailable` | `hidden-unavailable` |
| `compile-only` | `allowed-exec` | `hidden-unavailable` | `allowed-exec` (supported source file only) | `hidden-unavailable` | `hidden-unavailable` |
| `check-only` routes | `allowed-exec` | `hidden-unavailable` | `allowed-exec` (supported source file only) | `hidden-unavailable` | `hidden-unavailable` |
| `localclean` | `allowed-exec` | `allowed-exec` | `allowed-exec` (normalized to parent algorithm directory) | `allowed-exec` (normalized to parent algorithm directory) | `hidden-unavailable` |
| `clean` | `allowed-exec` | `allowed-exec` | `allowed-exec` (normalized to parent algorithm directory) | `allowed-exec` (normalized to parent algorithm directory) | `hidden-unavailable` |

Post-MVP note: list and flag/unflag command mappings remain script-owned capabilities and are intentionally excluded from MVP surfaces.

## Directory Execution Invariant

All MVP run commands execute `run.sh` only from valid algorithm-directory context (`src/<category>/<algorithm>/`).

Algorithm-directory base rule:

1. CWD for all current MVP commands is always one resolved algorithm directory.
2. For any valid source-file target, resolve CWD to that file's parent algorithm directory (never a subdirectory).
3. Internal script path resolution is canonical absolute: `<run-script-path> = <repo-root>/run.sh`.
4. User-facing terminal command display may render `../../../run.sh` from algorithm-directory CWD when safely derivable; if not safely derivable, display absolute `<run-script-path>`.
5. The resolved repository root must contain required repository markers.

- Filename mode: `cd` into algorithm directory, then invoke `<run-script-path> <filename>`; terminal display may show `../../../run.sh <filename>` when safe, but internal execution artifacts remain absolute-path based.
- Clean mode uses deterministic invocation (`clean --defaults=y`) and resolves algorithm directory context from an active compatible source file, selected algorithm directory, or immediate-child Explorer file/directory selection normalized to the parent algorithm directory.
- Local cleanup modes execute from algorithm directory context so `./output` and related cleanup behavior match user expectation for that algorithm scope.

### Context Resolution Edge Cases

| Context | Behavior |
| --- | --- |
| Explorer file selected and editor has different active file | Explorer context-menu commands use Explorer selection only; active editor file is ignored. |
| Active saved file in nested folder | Not a valid target for MVP file execution; only immediate children of `src/<category>/<algorithm>/` are supported. |
| Explorer right-click file | Explorer context-menu commands use clicked selection only and resolve to one algorithm directory CWD. |
| Explorer selected folder in eligible repository (non-algorithm folder) invoking `clean` | Command is unavailable; clean requires algorithm-directory context. |
| Explorer selected algorithm directory invoking `localclean` | Execute from selected algorithm directory CWD. |
| Untitled or unsaved editor | Block command with guidance to save/select file first. |
| No active file and no explorer selection | `algos.runActiveFile` performs no execution and notifies there is nothing to do; guidance: select or open a saved valid script file. |
| Active file outside `src/<category>/<algorithm>/` | `algos.runActiveFile` performs no execution and notifies there is nothing to do; guidance: target must be in an algorithm directory. |
| Active file with unsupported extension | `algos.runActiveFile` performs no execution and notifies there is nothing to do; guidance: file extension/language is not supported for run-active. |
| `algos.runLocalClean` from palette without active compatible source file | Performs no execution and notifies there is nothing to do; guidance: open a compatible source file target first. |
| `algos.runClean` from palette without active compatible source file | Performs no execution and notifies there is nothing to do; guidance: open a compatible source file target first. |

### Valid Active Script Contract

A file is a valid active script target only when both conditions hold:

1. File path is an immediate child of `src/<category>/<algorithm>/` (no nested subdirectory under that algorithm directory).
2. File extension maps to a supported language key in the extension language catalog.

`algos.runActiveFile`, `algos.runActiveFileCompileOnly`, and all `algos.runActiveFileCheckOnly*` commands must enforce this contract and fail fast without terminal creation when invalid; they must show actionable `nothing to do` guidance.
MVP explicitly does not add filename-bracketing or advanced filename interpretation logic; that behavior is deferred post-MVP.

## Validation, Precedence, And Error Semantics

### Extension Preflight Validation

1. Confirm workspace contains `run.sh` for relevant commands.
2. Confirm run/compile/check-only commands are invoked only with a selected/active compatible source file that is an immediate child under `src/<category>/<algorithm>/`.
3. Confirm `algos.runLocalClean` and `algos.runClean` execute only with algorithm-directory context: active compatible source file (palette/editor-title) or Explorer algorithm-directory/immediate-child selection context.
4. Confirm check-only route is one of `native`, `docker`, `ssh`.
5. Confirm MVP `algos.runClean` always maps to `clean --defaults=y`.

### Workspace Eligibility Preflight

1. Resolve candidate repository root from active workspace selection.
2. Validate hard required markers at resolved root: `run.sh`, `init.sh`, `src/`, `shlib/`, `stdlib/`, `templates/`.
3. Execute canary with resolved absolute script path from resolved repository-root context: `<run-script-path> --help-all`; expected exit code is `0`.
4. If workspace is partial or ineligible, block execution before command assembly and show missing-marker or canary guidance.
5. Record eligibility outcome (`eligible`, `partial`, `ineligible`) in FEAT evidence for eligibility-related FEATs, including marker and canary results.

### Script-Level Validation (Pass Through)

1. Parser-level unknown option and invalid topic failures remain script-owned.
2. Smoke-test forwarding semantics remain script-owned.

### Precedence Preservation Requirements

1. Parser precedence is preserved: no additional args appended by extension.
2. `--check-only` behavior remains canonical; extension does not reinterpret compile/run semantics.
3. Help and parser exit codes remain script-authored outcomes.

### Error Reporting

1. Preflight errors: VS Code error notification with corrective hint.
2. Script execution errors: terminal output retained plus concise notification summarizing exit code.
3. No suppression of script stderr.

## Active File And Language Resolution Strategy

1. For file-scoped run commands, resolve selected/active compatible source file to its parent algorithm directory as CWD and pass filename basename to `run.sh`.
2. Run flows in MVP are filename-driven; extension command surfaces do not expose language-key run mode.
3. For cleanup commands, resolve algorithm-directory context from active file (palette/editor-title) or Explorer selection (Explorer context menu only); supported source files map to their parent algorithm directory.
4. For unsupported extension or out-of-structure contexts, `algos.runActiveFile`, `algos.runActiveFileCompileOnly`, and all `algos.runActiveFileCheckOnly*` commands perform no execution and show actionable `nothing to do` guidance.
5. Surface context isolation is strict: Explorer context menus use Explorer selection only; editor-title and palette actions use active file only.
6. Explorer/context visibility rules are strict: `run-active`, compile-only, and check-only appear only for supported source files that are immediate children in `src/<category>/<algorithm>/`; `localclean` and `clean` appear for algorithm directories plus immediate-child files/directories that normalize to one algorithm directory (deeper descendants invalid).

Note: this section is resolution policy only; normative CWD behavior is defined in `Directory Execution Invariant`.

## Execution Model

1. Use VS Code terminal execution for MVP to preserve visibility and script parity.
2. The extension must own its terminal: always create it via `vscode.window.createTerminal()` with a fixed, extension-specific name (e.g., `Algorithms Runner`). Never write to, read from, or reuse a terminal created by another extension or by VS Code itself — those terminals have unknown shell state, environment variables, and CWD that cannot be trusted.
3. Every run invocation shows the owned terminal via `terminal.show()` so output is immediately visible to the user — output must **never** be captured silently in the background.
4. The "reuse" option in configuration refers only to reusing the extension's own previously created terminal, not any external terminal.
5. Enforce the `Directory Execution Invariant` for all file-context commands.
6. Cleanup command contexts are algorithm-directory only; repository-context cleanup execution is not part of MVP.
7. `Path Policy: Internal Absolute, Display Relative With Safe Fallback` applies to all run invocations.
8. Emit the exact user-facing command string before invocation in extension output channel; show relative script path when safely derivable from resolved algorithm-directory CWD, otherwise show absolute script path.
9. `Logging Policy: Extension Light, Script Canonical` applies to all extension diagnostics.
10. Internal runner diagnostics and FEAT evidence capture must record only compact orchestration metadata: canonical absolute script path, canonical absolute CWD, command family, lifecycle state, and exit result.
11. Do not add extension-owned persistent archive logs in MVP; rely on VS Code-managed extension log lifecycle and script-owned runtime/archive logs.
12. Track terminal lifecycle for user feedback (started, completed, failed).

## Activation And Non-Interference Rules

1. Activation may be command-triggered, but all functional handlers must hard-check workspace eligibility before execution.
2. In ineligible workspaces, run handlers must no-op with clear guidance; no run terminal is created.
3. If hard markers are missing or canary validation fails, run handlers must remain inert and block execution.
4. Editor title and context-menu run surfaces should be hidden or disabled when workspace eligibility is false.
5. In multi-root scenarios, execution is scoped only to the selected eligible root; sibling roots are never used as implicit fallbacks.

## Runtime Invocation Contract

### Purpose

Define deterministic command construction so implementation cannot drift.

`Path Policy: Internal Absolute, Display Relative With Safe Fallback` is normative for this contract.

### Contract Rules

1. Script location is repository-root anchored, not source-folder anchored.
2. Execution CWD for file-targeted commands is the resolved algorithm directory, not the source file path itself.
3. Cleanup commands run from resolved algorithm-directory context.
4. Command argument assembly is strict and positional order is preserved.
5. Extension logs resolved canonical absolute script path and canonical absolute execution CWD before launch.
6. File-context validation and algorithm targeting are driven by the path structure under `src/<category>/<algorithm>/`, independent of which workspace folder was opened.
7. Internal runtime artifacts are canonical absolute filesystem paths: resolved repository root, resolved algorithm directory, and resolved `<run-script-path>`.
8. User-facing terminal command display may render a relative script path from resolved algorithm-directory CWD only when safely derivable; otherwise use absolute script path display.

### Resolution Algorithms

1. Repository root resolution base: first normalize command target context to one algorithm directory, then search upward from that algorithm directory until repository root markers are found; resolver output is canonical absolute path.
2. Canonicalize and deduplicate resolved roots by absolute path; nested folders that resolve to the same root remain one repository context.
3. Script path resolution: `<run-script-path> = <repo-root>/run.sh` as canonical absolute path.
4. File-target CWD resolution: parent algorithm directory of selected/active compatible source file as canonical absolute path.
5. Explorer cleanup target normalization: algorithm-directory selection stays unchanged; immediate-child file or immediate-child directory selection normalizes to its parent algorithm directory; any deeper descendant selection is invalid in MVP.
6. Cleanup-command CWD resolution: resolved algorithm directory context from active file (palette/editor-title) or normalized Explorer selection (Explorer context menu).
7. Display-path rendering: derive relative script path display from resolved algorithm-directory CWD only when safe and unambiguous; otherwise display absolute `<run-script-path>`.

### Canonical Invocation Shapes

1. File run: `<run-script-path> <filename>` with CWD=`<algorithm-dir>`.
2. Compile only: `<run-script-path> --compile-only <filename>` with CWD=`<algorithm-dir>`.
3. Localclean: `<run-script-path> localclean` with CWD=`<algorithm-dir>` when source-file target exists.
4. Localclean (Explorer algorithm-directory target): `<run-script-path> localclean` with CWD=`<algorithm-dir>`.
5. Clean: `<run-script-path> clean --defaults=y` with CWD=`<algorithm-dir>`.
6. Check-only routes: `<run-script-path> --check-only=native|docker|ssh <filename>` with CWD=`<algorithm-dir>`; valid active script contract required.

### Failure Handling

1. If repository root or `run.sh` cannot be resolved, fail with actionable guidance.
2. If active file is unsaved or untitled for file-context commands, block and show save guidance.
3. If no valid active script target is available for `algos.runActiveFile`, `algos.runActiveFileCompileOnly`, or any `algos.runActiveFileCheckOnly*` command (missing active file, unsupported extension, or out-of-contract path), perform no execution and show actionable `nothing to do` guidance.
4. If `algos.runLocalClean` has no valid context for the invoking surface (active compatible source file for palette/editor-title, or normalized Explorer algorithm-directory target from algorithm-directory/immediate-child file/immediate-child directory selection), perform no execution and show actionable `nothing to do` guidance.
5. If `algos.runClean` has no valid context for the invoking surface (active compatible source file for palette/editor-title, or normalized Explorer algorithm-directory target from algorithm-directory/immediate-child file/immediate-child directory selection), perform no execution and show actionable guidance.

## Extension Project Structure (Planned Files)

### Structure Purpose

Define artifact targets so Copilot implementation is file-deterministic.

### Planned Structure

```text
extension/
|- package.json
|- .vscodeignore
|- .vscode/
|  `- launch.json
|- src/
|  |- extension.js
|  |- commands/
|  |  |- registerCommands.js
|  |  `- fileCommands.js
|  |- runtime/
|  |  |- runScriptRunner.js
|  |  |- pathResolver.js
|  |  `- argumentBuilder.js
|  |- validation/
|  |  |- inputValidation.js
|  |  `- languageCatalog.js
|  `- ui/
|     |- notifications.js
|     `- quickPickFlows.js
`- docs/
   `- manual-verification.md
```

### Ownership By Layer

1. Runtime layer: path resolution, CWD selection, process invocation, logging.
2. Command layer: intent-to-argument mapping and command handlers.
3. Validation layer: supported file targets, route enums, preconditions.
4. UI layer: notifications and quick-pick user flows.

Packaging command-chain ownership (FEAT-216 required):

1. Repository root `package.json` owns operator entrypoint `npm run buildextension`.
2. `extension/package.json` owns VSIX executor command (for example `build:vsix`) that invokes `vsce`.
3. Root entrypoint delegates to extension executor; operators should not need direct `vsce` invocation.

## Validation Data Source Contract

### Validation Purpose

Prevent language and option validation drift.

### Source Of Truth

1. Runtime behavior reference: `run.sh`.

### Implementation Rule

1. Use one internal language catalog source only.
2. Document a repeatable catalog update path.
3. Do not duplicate ad hoc language lists in command handlers.

### Required Validations

1. `--check-only` route is one of `native`, `docker`, `ssh`.
2. MVP `algos.runClean` always maps to `clean --defaults=y`; broader `run.sh` accepted forms are post-MVP command-surface considerations.
3. Commands preserve canonical parser-owned argument ordering.

### Drift Gate

Any option or language-key contract change requires updates to:

1. proposal mapping sections
2. extension catalog source

## Copilot Execution Protocol (Human-In-The-Loop)

### Protocol Purpose

Define how Copilot executes each FEAT under human guidance.

### FEAT Execution Loop

1. Read FEAT scope and non-goals.
2. Resolve and touch only declared target files.
3. Implement required behavior.
4. Run FEAT-specific verification checks.
5. Produce FEAT evidence packet.
6. Pause for human approval before starting next FEAT.

### Copilot Path-Policy Execution Aid

1. Terminology lock in all touched sections: include `Path Policy: Internal Absolute, Display Relative With Safe Fallback`.
2. Copilot section self-check prompt: does this section explicitly distinguish internal canonical absolute path artifacts from user-facing relative command display behavior?
3. Copilot sequence lock for this change set: update Runtime Invocation Contract and Directory Execution Invariant first, then FEAT packet/evidence schema, then Verification Plan and Reviewer Checklist, and update Appendix examples last.
4. Copilot logging self-check prompt: did this change keep extension logging MVP-light and avoid introducing persistent archive logging or script-log duplication?

### Copilot Boundary And Approval Execution Aid

1. Before editing any section, classify the intended change as `MVP-BLOCKING`, `MVP-GUARDRAIL`, or `POST-MVP-DEFERRED`; if classification is unclear, stop and request human decision.
2. For any edit that changes scope boundaries, command surface scope, or guardrail strictness, require explicit human approval before implementation.
3. After approved boundary-affecting edits, append a change-log row in this proposal with date, concise change summary, rationale, and approver.
4. If a requested change is `POST-MVP-DEFERRED`, record it in deferred records and do not add FEAT implementation requirements in MVP sections.
5. FEAT packet and acceptance wording must remain aligned with the MVP Constraint Taxonomy and must not silently promote deferred items.

### Mandatory Stop-And-Ask Conditions

1. Contract ambiguity between proposal and scripts.
   - Copilot action: pause immediately and produce a FEAT evidence packet with ambiguity details.
   - Decision owner: senior engineer.
   - Resume condition: explicit written resolution recorded in FEAT notes.
2. Missing or conflicting repository path assumptions.
   - Copilot action: pause and show attempted path resolution inputs and outputs.
   - Decision owner: senior engineer.
   - Resume condition: approved path rule update or directive.
3. Unexpected script behavior that changes command semantics.
   - Copilot action: stop implementation changes and provide command output evidence.
   - Decision owner: reviewer.
   - Resume condition: behavior confirmed as expected or contract updated.
4. Any requirement that expands MVP scope.
   - Copilot action: pause and label proposed change as out-of-scope.
   - Decision owner: senior engineer.
   - Resume condition: explicit scope expansion approval.
5. Any proposed change touches protected blog surfaces or shared root npm surfaces.
   - Copilot action: pause immediately and attach coexistence evidence (`git status -- web/ github-markdown-loader.mjs postcss.config.js webpack.config.js`, `git diff -- package.json package-lock.json`).
   - Decision owner: senior engineer.
   - Resume condition: explicit written approval that change is additive-safe with coexistence risk accepted.
6. Workspace eligibility is ambiguous (for example multi-root conflict, partial marker set, or conflicting root resolution outcomes).
   - Copilot action: pause and attach per-root eligibility inputs/outputs and selected fallback decision (if any).
   - Decision owner: senior engineer.
   - Resume condition: explicit written root-selection directive or inert-mode confirmation.

Operational rule: Copilot must pause after each FEAT completion and cannot begin the next FEAT without approval response.

### FEAT Evidence Packet Format

Use this exact structure for every FEAT closeout:

1. FEAT ID and title.
2. Files changed:
   - path
   - change summary
3. Commands executed:
   - command
   - working directory
   - exit code
4. Acceptance criteria check:
   - criterion
   - expected
   - observed
   - pass/fail
5. Residual risk:
   - severity (`low`, `medium`, `high`)
   - mitigation or follow-up
6. Approval request:
   - required approver role
   - requested decision (`approved`, `approved with follow-up`, `rework required`, `blocked`)
7. Evidence location:
   - document section or artifact path where logs/screenshots are attached.
8. Normalization and context evidence:
   - source surface (`Explorer`, `Editor Title`, `Command Palette`)
   - raw selection path (or `NA` when not selection-driven); use absolute path when path exists
   - normalized algorithm directory (absolute path)
   - resolved repository root (absolute path)
   - resolved script path for internal runtime (`<run-script-path>` absolute path)
   - user-facing script path display form (`relative` when safely derivable, otherwise `absolute`)
   - extension logging scope evidence: metadata-only orchestration fields captured; no duplicated script payload/archive output
   - reject reason enum when execution is blocked/no-op (`invalid-context`, `invalid-target`, `unsupported-extension`, `missing-active-file`, `deeper-descendant-selection`) or `NA` when execution succeeds.

### Human Approval Roles

1. Senior engineer: architecture-sensitive FEAT approvals.
2. Reviewer: behavior and UX guardrail approvals.
3. MVP close: senior engineer sign-off required.

Current role assignment for this proposal execution:

1. Reviewer owner: Derek.

## FEAT Definition Of Done Template

1. FEAT ID and title.
2. Scope.
3. Non-goals.
4. Dependencies.
5. Files to create/edit.
6. Acceptance criteria.
7. Verification steps.
8. Evidence required.
9. Human approval owner.
10. Exit status (`approved`, `approved with follow-up`, `rework required`, `blocked`).

## FEAT Sizing And Numbering Policy

1. FEATs are intentionally small, single-theme work units for rapid implementation and review.
2. Each FEAT must be independently digestible and closable with one focused evidence packet.
3. FEAT IDs are individually assigned and strictly numeric in sequence.
4. Alphanumeric FEAT IDs (for example `FEAT-206A`) are not allowed.
5. Split a FEAT only when one packet can no longer keep scope, behavior, and verification concise.
6. Do not over-split into micro-FEATs that increase coordination overhead without reducing risk.

## Agent Handoff Packets

### Packet Format

1. FEAT objective.
2. Allowed and forbidden files.
3. Contract constraints.
4. Required command behavior.
5. Verification output expectations.
6. Pause-and-approval requirement.

### FEAT-201 Packet: Extension Scaffold Bootstrap

1. FEAT objective: scaffold extension package, establish Extension Development Host launch baseline, and register one bootstrap command.
2. Allowed and forbidden files:
   - Allowed: `extension/package.json`, `extension/src/extension.js`, `extension/src/commands/registerCommands.js`, `extension/.vscode/launch.json`.
   - Forbidden: files outside `extension/`.
3. Contract constraints: command namespace must follow `algos.*`; no runtime behavior changes.
4. Required command behavior: bootstrap command appears in Command Palette.
5. Verification output expectations: Extension Development Host launches from `extension/.vscode/launch.json`; bootstrap command discoverable in host Command Palette; coexistence evidence confirms protected blog surfaces remain unchanged.
6. Pause-and-approval requirement: pause and request senior engineer approval.

### FEAT-202 Packet: Workspace Eligibility Resolver + Activation Guard

1. FEAT objective: implement workspace eligibility resolver and activation guard so extension is inert outside eligible repository roots.
2. Allowed and forbidden files:
   - Allowed: `extension/src/extension.js`, `extension/src/runtime/pathResolver.js`, `extension/src/validation/inputValidation.js`.
   - Forbidden: command behavior modules beyond eligibility guard wiring.
3. Contract constraints: hard eligibility markers are mandatory (`run.sh`, `init.sh`, `src/`, `shlib/`, `stdlib/`, `templates/`); partial/ineligible workspaces must not execute run flows.
4. Required command behavior: activation and run handlers enforce eligibility preflight and scope execution to one eligible root only.
5. Verification output expectations: eligible, partial, and ineligible scenarios are captured, including hard marker checks, canary command result (`<run-script-path> --help-all`, exit `0` expected for eligible), multi-root ambiguity handling, inert no-terminal behavior for ineligible roots, and canonical absolute resolved-root evidence.
6. Pause-and-approval requirement: pause and request senior engineer approval.

### FEAT-203 Packet: Path And CWD Resolution Core

1. FEAT objective: implement repo-root script discovery and algorithm-directory CWD resolution.
2. Allowed and forbidden files:
   - Allowed: `extension/src/runtime/pathResolver.js`.
   - Forbidden: command handlers and UI modules.
3. Contract constraints: follow Runtime Invocation Contract resolution algorithms exactly.
4. Required command behavior: resolver returns deterministic canonical absolute `<run-script-path>` and canonical absolute algorithm-directory CWD.
5. Verification output expectations: resolver outputs validated for active file and explorer selection contexts, including absolute-path format and safe display-path derivation inputs.
6. Pause-and-approval requirement: pause and request senior engineer approval.

### FEAT-204 Packet: Process Runner + Execution Logging

1. FEAT objective: implement process runner and execution logging.
2. Allowed and forbidden files:
   - Allowed: `extension/src/runtime/runScriptRunner.js`, `extension/src/runtime/argumentBuilder.js`.
   - Forbidden: UI contribution files.
3. Contract constraints: command string, script path, and CWD must be logged before execution; internal logs must use canonical absolute script path and canonical absolute CWD; user-facing terminal command display may show relative script path when safely derivable and must fall back to absolute script path otherwise; `Logging Policy: Extension Light, Script Canonical` is required for MVP (metadata-only orchestration logging, no extension-owned persistent archive logs, no duplication of script-owned archive/build payload logs); runner must call `terminal.show()` on every invocation so output is always visible — background/silent execution is forbidden; runner must only operate on a terminal it created via `vscode.window.createTerminal()` and must never adopt a terminal from an external source.
4. Required command behavior: runner creates (or, if configured, reuses its own previously created) named terminal, reveals it to the user, sends the command using the display-path policy, and returns structured status/exit outcome.
5. Verification output expectations: sample invocation evidence includes internal absolute script path, internal absolute CWD, displayed script path form, command family/lifecycle/exit metadata, and confirmation that no extension-owned persistent archive logs were created.
6. Pause-and-approval requirement: pause and request senior engineer approval.

### FEAT-205 Packet: Run Active File Handler

1. FEAT objective: implement `algos.runActiveFile` handler logic.
2. Allowed and forbidden files:
   - Allowed: `extension/src/commands/fileCommands.js`, `extension/src/validation/inputValidation.js`.
   - Forbidden: package contribution metadata.
3. Contract constraints: algorithm-directory CWD semantics, basename behavior, valid-active-script contract, and handoff of canonical absolute path artifacts to the runner are mandatory for palette invocation.
4. Required command behavior: run-active-file executes for saved valid scripts and performs no execution for unsaved/untitled/invalid-script contexts while showing actionable `nothing to do` guidance.
5. Verification output expectations: palette invocation success path and failure paths for unsaved, non-algorithm path, and unsupported extension are captured.
6. Pause-and-approval requirement: pause and request reviewer approval.

### FEAT-206 Packet: Surface Wiring (Explorer, Editor Title, Palette)

1. FEAT objective: wire run-active-file to Explorer, editor title, and Command Palette.
2. Allowed and forbidden files:
   - Allowed: `extension/package.json`, `extension/src/commands/registerCommands.js`.
   - Forbidden: runtime runner modules.
3. Contract constraints: shared handler invocation only; no duplicated business logic; `algos.runActiveFile` must be contributed to `editor/title` with `"group": "navigation"` and `"icon": "$(play)"` as the only inline run action; non-Play run actions must be grouped under explicit `Derek's Algorithms` menus (editor-title overflow and Explorer context) and palette launcher flow.
4. Required command behavior: run-active-file appears and executes from all three surfaces; Play icon is visible inline in the editor title bar whenever an editor is open; non-Play run actions are accessed via `Derek's Algorithms` menu paths with strict visibility rules by context.
5. Verification output expectations: Play icon button visible in editor title bar; `Derek's Algorithms` submenu visible in editor overflow and Explorer context; `clean` and `localclean` appear for supported source files (immediate-child only), algorithm directories, and immediate-child directory selections; command reachable via Command Palette paths.
6. Pause-and-approval requirement: pause and request senior engineer approval.

### FEAT-207 Packet: Launcher Command Coverage

1. FEAT objective: implement launcher command coverage for grouped non-Play Command Palette actions.
2. Allowed and forbidden files:
   - Allowed: `extension/package.json`, `extension/src/commands/registerCommands.js`, `extension/src/ui/quickPickFlows.js`.
   - Forbidden: runtime runner modules and command execution business logic in `fileCommands.js`.
3. Contract constraints: launcher FEAT is contribution/dispatch only; no duplicated command execution logic; launcher routes to existing command handlers.
4. Required command behavior: `algos.openRunMenu` is discoverable in Command Palette, opens `Derek's Algorithms` grouped actions, and dispatches selected entries to shared handlers.
5. Verification output expectations: launcher command discoverable in palette, grouped actions visible, selected entry triggers corresponding existing command handler.
6. Pause-and-approval requirement: pause and request senior engineer approval.

### FEAT-208 Packet: Localclean Command

1. FEAT objective: implement `algos.runLocalClean` command.
2. Allowed and forbidden files:
   - Allowed: `extension/src/commands/fileCommands.js`.
   - Forbidden: unrelated UI contribution modules.
3. Contract constraints: command maps to `localclean` in algorithm-directory CWD and requires compatible source-file or Explorer target that normalizes to one algorithm directory (algorithm directory, immediate-child file, or immediate-child directory only).
4. Required command behavior: localclean executes and reports completion status when active compatible file exists (palette/editor-title) or when Explorer selection normalizes to one algorithm directory; deeper-descendant Explorer targets are rejected with actionable guidance.
5. Verification output expectations: local output cleanup verified in resolved algorithm-directory context for active-file and Explorer selection paths; no-op guidance captured for missing/incompatible contexts.
6. Pause-and-approval requirement: pause and request reviewer approval.

### FEAT-209 Packet: Clean Command + Defaults Flow

1. FEAT objective: implement clean command and defaults input flow.
2. Allowed and forbidden files:
   - Allowed: `extension/src/commands/fileCommands.js`, `extension/src/ui/quickPickFlows.js`, `extension/src/validation/inputValidation.js`.
   - Forbidden: unrelated non-clean command modules.
3. Contract constraints: MVP clean invocation is fixed to `clean --defaults=y`; clean command remains positioned before route checks in grouped command order.
4. Required command behavior: clean executes with deterministic `clean --defaults=y` mapping and requires algorithm-directory context from active compatible source file or Explorer selection that normalizes to one algorithm directory (algorithm directory, immediate-child file, or immediate-child directory only).
5. Verification output expectations: deterministic `--defaults=y` behavior captured with algorithm-directory context evidence for active-file invocation and normalized Explorer invocation paths (algorithm-directory, immediate-child file, immediate-child directory).
6. Pause-and-approval requirement: pause and request senior engineer approval.

### FEAT-210 Packet: Compile-Only Command

1. FEAT objective: implement compile-only command.
2. Allowed and forbidden files:
   - Allowed: `extension/src/commands/fileCommands.js`.
   - Forbidden: FEAT-211 route command declarations.
3. Contract constraints: compile-only mapping must include filename basename and algorithm-directory CWD; command must enforce valid active script contract.
4. Required command behavior: compile-only command executes only for valid active script targets and no-ops with guidance otherwise.
5. Verification output expectations: compile-only invocation output recorded for active and selected valid file contexts; invalid-target no-op evidence captured.
6. Pause-and-approval requirement: pause and request reviewer approval.

### FEAT-211 Packet: Check-Only Route Commands

1. FEAT objective: implement check-only route commands (`native`, `docker`, `ssh`).
2. Allowed and forbidden files:
   - Allowed: `extension/src/commands/fileCommands.js`, `extension/src/validation/inputValidation.js`.
   - Forbidden: compile-only command logic changes.
3. Contract constraints: strict route validation; unsupported routes blocked before execution; command must enforce valid active script contract.
4. Required command behavior: each route command maps exactly to route-specific check-only invocation and executes only for valid active script targets.
5. Verification output expectations: three success cases, one invalid-route failure case, and invalid-target no-op evidence captured.
6. Pause-and-approval requirement: pause and request reviewer approval.

### FEAT-212 Packet: File-Context Guardrails

1. FEAT objective: enforce shared file-context guardrails.
2. Allowed and forbidden files:
   - Allowed: `extension/src/validation/inputValidation.js`, file-context command call sites.
   - Forbidden: command behavior changes outside shared file-context guardrails.
3. Contract constraints: unsaved/untitled/missing-context errors must fail fast with actionable guidance.
4. Required command behavior: all file-context commands use shared guardrail checks.
5. Verification output expectations: failure cases for all guardrail contexts captured.
6. Pause-and-approval requirement: pause and request reviewer approval.

### FEAT-213 Packet: User Notifications + Error UX

1. FEAT objective: standardize user notifications and runtime/preflight error UX.
2. Allowed and forbidden files:
   - Allowed: `extension/src/ui/notifications.js`, command modules for call-site integration.
   - Forbidden: contract mapping tables.
3. Contract constraints: preserve script stderr visibility; no hidden suppression.
4. Required command behavior: notifications are consistent, actionable, and context-appropriate.
5. Verification output expectations: representative preflight and runtime error messages captured.
6. Pause-and-approval requirement: pause and request reviewer approval.

### FEAT-214 Packet: Verification Matrix + Evidence Capture

1. FEAT objective: create verification matrix and evidence capture template.
2. Allowed and forbidden files:
   - Allowed: `extension/docs/manual-verification.md`.
   - Forbidden: runtime command behavior changes.
3. Contract constraints: include expected-success and expected-failure checks for every MVP command path.
4. Required command behavior: verification guidance is complete and actionable for FEAT closure.
5. Verification output expectations: matrix includes all FEAT command families and evidence fields.
6. Pause-and-approval requirement: pause and request senior engineer approval.

### FEAT-215 Packet: Pre-Package Approval Gate + Sign-Off Record

1. FEAT objective: execute pre-package MVP approval gate and record sign-off.
2. Allowed and forbidden files:
   - Allowed: proposal reviewer checklist evidence references and approval record fields.
   - Forbidden: implementation scope expansion and packaging execution steps.
3. Contract constraints: all FEAT-201 through FEAT-214 approvals and evidence must be present.
4. Required command behavior: pre-package approval workflow completes with explicit decision record and go/no-go for packaging.
5. Verification output expectations: pre-package approval entry with approver, date, and packaging authorization captured.
6. Pause-and-approval requirement: pause and request senior engineer approval before FEAT-216.

### FEAT-216 Packet: Local VSIX Package + Install Validation

1. FEAT objective: package extension to local VSIX and verify local formal installation behavior.
2. Allowed and forbidden files:
   - Allowed: `package.json` (repo root), `package-lock.json` (if modified), `extension/.vscodeignore`, `extension/package.json`, `extension/docs/manual-verification.md`, proposal approval evidence references.
   - Forbidden: command behavior changes, marketplace publishing configuration, and protected blog surfaces unless explicitly approved.
3. Contract constraints: `npm run buildextension` is the canonical packaging entrypoint; root script must delegate to extension packaging executor command that invokes `vsce`; script must produce VSIX in `extension/dist/`; local install only; no marketplace publication flow in MVP; any `package.json`/`package-lock.json` change requires explicit coexistence evidence and approval.
4. Required command behavior: VSIX is produced in `extension/dist/`, build output includes close/install operator guidance, and installed extension command surfaces behave equivalently to Extension Development Host validation.
5. Verification output expectations: VSIX filename and path in `extension/dist/` captured, `npm run buildextension` output captured with close/install instruction text, local install command and exit status captured, post-install command discovery/launch checks recorded, and coexistence evidence commands attached for protected/shared surfaces.
6. Pause-and-approval requirement: pause and request senior engineer final MVP sign-off.

## FEAT Packet Alignment Matrix

| FEAT ID | Backlog Title | Packet Objective | Alignment Status |
| --- | --- | --- | --- |
| FEAT-201 | Extension Scaffold Bootstrap | scaffold extension package and register one bootstrap command | aligned |
| FEAT-202 | Workspace Eligibility Resolver + Activation Guard | enforce eligible/partial/ineligible workspace behavior and guarded activation | aligned |
| FEAT-203 | Path And CWD Resolution Core | implement repo-root script discovery and algorithm-directory CWD resolution | aligned |
| FEAT-204 | Process Runner + Execution Logging | implement process runner and execution logging | aligned |
| FEAT-205 | Run Active File Handler | implement `algos.runActiveFile` handler logic | aligned |
| FEAT-206 | Surface Wiring (Explorer, Editor Title, Palette) | wire run-active-file across required surfaces | aligned |
| FEAT-207 | Launcher Command Coverage | implement grouped launcher command discovery and dispatch wiring | aligned |
| FEAT-208 | Localclean Command | implement localclean command | aligned |
| FEAT-209 | Clean Command + Defaults Flow | implement clean command and defaults flow | aligned |
| FEAT-210 | Compile-Only Command | implement compile-only command | aligned |
| FEAT-211 | Check-Only Route Commands | implement route-specific check-only commands | aligned |
| FEAT-212 | File-Context Guardrails | enforce shared file-context guardrails | aligned |
| FEAT-213 | User Notifications + Error UX | standardize user notifications and error UX | aligned |
| FEAT-214 | Verification Matrix + Evidence Capture | create verification matrix and evidence template | aligned |
| FEAT-215 | Pre-Package Approval Gate + Sign-Off Record | execute pre-package approval gate and record sign-off | aligned |
| FEAT-216 | Local VSIX Package + Install Validation | package extension as VSIX and verify local install behavior | aligned |

## Configuration And State Handling

1. MVP configuration keys:
   - default check-only route preference
   - fixed clean invocation for `algos.runClean`: always `clean --defaults=y`
   - whether to reuse the extension's own previously created terminal or always open a new one (terminal **must** be shown regardless; this setting controls reuse of the extension-owned terminal only — terminals from other sources are never used)
2. No hidden mutation of shell profiles by extension itself.

### Profile Sourcing Contract (MVP)

1. MVP uses script-default profile sourcing behavior only; extension-managed profile override inputs are out of scope.
2. If profile sourcing emits warnings or failures, extension behavior is to surface terminal output and actionable notification only; do not add alternate profile-selection logic in MVP.
3. Any profile-source configurability expansion is `POST-MVP-DEFERRED` and requires explicit scope-approval before FEAT planning.

## Local Packaging Requirements (MVP Final Gate)

1. Packaging tool for MVP local install validation: `@vscode/vsce` (backend packager invoked by extension executor script).
2. Canonical packaging entrypoint: run `npm run buildextension` from repository root.
3. `buildextension` script contract: package VSIX and place artifact in `extension/dist/`.
4. Command-chain contract (normative):
   - root `package.json` defines `buildextension` script that delegates to extension packaging executor (for example `npm --prefix extension run build:vsix`).
   - `extension/package.json` defines packaging executor command (for example `build:vsix`) that invokes `vsce package` and controls artifact/output messaging.
5. Install validation command: `code --install-extension extension/dist/<extension-name>-<version>.vsix`.
6. Packaging output verification must confirm required runtime files and command contributions are present in the VSIX.
7. `buildextension` output must print both:
   - final VSIX artifact path in `extension/dist/`
   - operator instruction: close VS Code and install the VSIX from the printed path.
8. MVP packaging scope is local formal installation only; marketplace publishing and distribution workflows are explicitly out of scope.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Script contract drift vs extension command assumptions | Tie extension release checklist to direct parser/mapping verification against `run.sh` behavior. |
| Wrong execution directory causes incorrect file discovery or cleanup scope | Enforce algorithm-directory CWD invariant and show resolved CWD before execution. |
| User confusion around `clean` interactive prompts | Use deterministic MVP non-interactive clean mapping (`clean --defaults=y`); defer interactive clean command surfaces to post-MVP. |
| User confusion when profile source warnings appear | Surface terminal output clearly and add a short notification when profile source appears to fail. |

## Repository Coexistence Constraints (Blog + Extension)

1. Extension work must not change blog behavior, routes, build output, or deployment flow.
2. Protected surfaces for this proposal are off-limits unless explicitly approved:
   - `web/`
   - `github-markdown-loader.mjs`
   - `postcss.config.js`
   - `webpack.config.js`
3. Shared surfaces (`package.json`, `package-lock.json`) are additive-only and require explicit coexistence evidence when modified.
4. Coexistence evidence command set for shared/protected-surface checks:
   - `git status -- web/ github-markdown-loader.mjs postcss.config.js webpack.config.js` (expected: no modifications unless explicitly approved)
   - `git diff -- package.json package-lock.json` (expected: empty or additive-safe with approval note)
5. If any protected/shared surface is touched, FEAT evidence must include baseline parity confirmation that blog build/runtime behavior is unchanged.

## Post-MVP Deferred Records (No MVP Action)

1. Smoke-test command surface remains deferred; no MVP FEAT work is authorized for smoke-test commands.
2. Language-key run command family remains deferred post-MVP; no MVP surface planning is authorized here.
3. Profile-source configurability beyond script-default behavior remains deferred post-MVP; no MVP configuration key is authorized.

## Phased Delivery Plan

### Pre-Implementation Approval Gate (Route C)

Before FEAT-201 implementation begins, reviewer and senior engineer must explicitly approve this gate checklist.

1. MVP Constraint Taxonomy accepted as normative (`MVP-BLOCKING`, `MVP-GUARDRAIL`, `POST-MVP-DEFERRED`).
2. All deferred records are confirmed as non-implementable in MVP.
3. Profile Sourcing Contract accepted: script-default behavior only; no extension override path in MVP.
4. Copilot boundary-and-approval execution aid accepted, including mandatory changelog updates for approved boundary edits.
5. FEAT packet/evidence expectations confirmed to preserve taxonomy boundaries and avoid deferred-item leakage.

Execution lock: if this gate is not approved, implementation must pause at planning-only state.

Approval record (2026-04-13):

1. Gate approved by Senior engineer: Derek.
2. Gate approved by Reviewer: Derek.
3. FEAT-by-FEAT pause/resume cadence confirmed (no auto-advance without explicit approval response).

### Phase 1: Foundation

1. FEAT-201 Extension Scaffold Bootstrap.
2. FEAT-202 Workspace Eligibility Resolver + Activation Guard.
3. FEAT-203 Path And CWD Resolution Core.
4. FEAT-204 Process Runner + Execution Logging.

### Phase 2: First End-To-End Command

1. FEAT-205 Run Active File Handler.
2. FEAT-206 Surface Wiring (Explorer, Editor Title, Palette).
3. FEAT-207 Launcher Command Coverage.

### Phase 3: Cleanup And Execution Variants

1. FEAT-208 Localclean Command.
2. FEAT-209 Clean Command + Defaults Flow.
3. FEAT-210 Compile-Only Command.
4. FEAT-211 Check-Only Route Commands.

### Phase 4: Guardrails And UX Hardening

1. FEAT-212 File-Context Guardrails.
2. FEAT-213 User Notifications + Error UX.

### Phase 5: Verification And Approval

1. FEAT-214 Verification Matrix + Evidence Capture.
2. FEAT-215 Pre-Package Approval Gate + Sign-Off Record.

### Phase 6: Local Packaging Validation

1. FEAT-216 Local VSIX Package + Install Validation.

### Phase 7: Post-MVP Candidate (Not In MVP Delivery)

1. Tree/custom panel for richer workflows.
2. Optional smoke test UX and advanced profile management.
3. Separate `init.sh` integration proposal.

## MVP Delivery Gating Rule

MVP delivery is gated by FEAT-200+ implementation tickets only. This proposal defines a single implementation ticket track.
Final MVP closeout requires FEAT-216 completion and senior engineer sign-off.

## Implementation Artifact Checklist (MVP)

1. Extension scaffold with VS Code metadata and activation wiring.
2. Extension Development Host launch profile in `extension/.vscode/launch.json`.
3. Command contributions for Explorer, editor title, and Command Palette.
4. Command handler modules for all MVP command IDs.
5. Runner module with safe argument assembly and CWD logging.
6. Validation and notification module for preflight and user-facing errors.
7. VSIX packaging boundary file `extension/.vscodeignore`.
8. Verification evidence set for all MVP command paths, including local VSIX install checks.

## FEAT Backlog (Scrum-Style Scoped Tickets)

### Track A: Implementation FEAT-200+ (MVP-Critical)

### FEAT-201 Extension Scaffold Bootstrap

- Scope: create extension package skeleton, VS Code engine metadata, activation events, Extension Development Host launch profile, and base command registration.
- Dependencies: none.
- Files: `extension/package.json`, `extension/src/extension.js`, `extension/src/commands/registerCommands.js`, `extension/.vscode/launch.json`.
- Estimates:
  - Human-Primary: 3 SP, 11 h
  - Copilot-Led: 2 SP, 7 h
- Acceptance Criteria: Extension Development Host launches from `extension/.vscode/launch.json` and one bootstrap command is discoverable in host Command Palette.
- Definition Of Done: scaffold is runnable with debug launch profile, activation baseline confirmed in host, and setup notes recorded.
- Human Approval: Senior engineer approves scaffold conventions and command namespace.

### FEAT-202 Workspace Eligibility Resolver + Activation Guard

- Scope: detect eligible/partial/ineligible workspace state and enforce inert behavior outside eligible repository roots.
- Dependencies: FEAT-201.
- Files: `extension/src/extension.js`, `extension/src/runtime/pathResolver.js`, `extension/src/validation/inputValidation.js`.
- Estimates:
  - Human-Primary: 8 SP, 30 h
  - Copilot-Led: 5 SP, 20 h
- Acceptance Criteria: hard eligibility markers (`run.sh`, `init.sh`, `src/`, `shlib/`, `stdlib/`, `templates/`) are enforced; canary command `<run-script-path> --help-all` is evaluated using resolved absolute script path and repository-root context; ineligible/partial workspaces block run execution with actionable guidance; nested workspace folders resolving to the same repository root are deduplicated; only multiple distinct eligible roots trigger ambiguity pause/escalation.
- Definition Of Done: eligibility resolver is wired to activation and command preflight with marker and canary evidence, and no run terminal is created when workspace is ineligible.
- Human Approval: Senior engineer approves workspace safety and non-interference behavior.

### FEAT-203 Path And CWD Resolution Core

- Scope: implement repo-root `run.sh` discovery and algorithm-directory CWD resolution.
- Dependencies: FEAT-201, FEAT-202.
- Files: `extension/src/runtime/pathResolver.js`.
- Estimates:
  - Human-Primary: 5 SP, 18 h
  - Copilot-Led: 3 SP, 12 h
- Acceptance Criteria: resolves canonical absolute `<run-script-path>` and canonical absolute CWD for active and selected files; behavior is correct when repository root only is open, when only `src/` is open, and when both are open together in a nested multi-root workspace.
- Definition Of Done: path resolver is unit-testable and consumed by command runner.
- Human Approval: Senior engineer approves resolution behavior.

### FEAT-204 Process Runner + Execution Logging

- Scope: implement reusable process/terminal runner with command logging and exit reporting.
- Dependencies: FEAT-201, FEAT-203.
- Files: `extension/src/runtime/runScriptRunner.js`, `extension/src/runtime/argumentBuilder.js`.
- Estimates:
  - Human-Primary: 5 SP, 15 h
  - Copilot-Led: 3 SP, 10 h
- Acceptance Criteria: runner executes exact invocation, logs internal absolute script path and internal absolute CWD, applies display-path policy (`relative` when safely derivable, otherwise `absolute`) for user-facing terminal command output, reports status, and enforces `Logging Policy: Extension Light, Script Canonical` (metadata-only extension diagnostics, no extension-owned persistent archive logging).
- Definition Of Done: runner is integrated and used by at least one command handler.
- Human Approval: Senior engineer approves runtime safety and logging.

### FEAT-205 Run Active File Handler

- Scope: implement command handler logic for `algos.runActiveFile`.
- Dependencies: FEAT-203, FEAT-204.
- Files: `extension/src/commands/fileCommands.js`, `extension/src/validation/inputValidation.js`.
- Estimates:
  - Human-Primary: 5 SP, 15 h
  - Copilot-Led: 3 SP, 10 h
- Acceptance Criteria: saved valid script executes with filename basename and algorithm-directory CWD semantics.
- Definition Of Done: handler works via Command Palette and rejects untitled/unsaved buffers and invalid script targets.
- Human Approval: Reviewer approves contract alignment.

### FEAT-206 Surface Wiring (Explorer, Editor Title, Palette)

- Scope: wire `algos.runActiveFile` to all required command surfaces.
- Dependencies: FEAT-205.
- Files: `extension/package.json`, `extension/src/commands/registerCommands.js`.
- Estimates:
  - Human-Primary: 5 SP, 12 h
  - Copilot-Led: 3 SP, 8 h
- Acceptance Criteria: Play command is available inline from editor title and via explorer/palette contexts; non-Play run actions are grouped behind explicit `Derek's Algorithms` menu paths with context visibility rules (Explorer: clean/localclean on algorithm-directory context or immediate-child selection that normalizes to algorithm-directory context only; Editor Title: clean/localclean on valid active source files only).
- Definition Of Done: surface contributions are visible, grouped as specified, and invoke shared handlers.
- Human Approval: Senior engineer approves UX surface coverage.

### FEAT-207 Launcher Command Coverage

- Scope: implement launcher command contribution and grouped dispatch flow for non-Play palette actions.
- Dependencies: FEAT-201, FEAT-206.
- Files: `extension/package.json`, `extension/src/commands/registerCommands.js`, `extension/src/ui/quickPickFlows.js`.
- Estimates:
  - Human-Primary: 3 SP, 9 h
  - Copilot-Led: 2 SP, 6 h
- Acceptance Criteria: `algos.openRunMenu` is discoverable from Command Palette, opens grouped non-Play actions, and routes selections to existing command handlers without duplicating execution logic.
- Definition Of Done: launcher contribution and dispatch wiring are verified independently from command execution semantics.
- Human Approval: Senior engineer approves launcher discoverability and dispatch UX.

### FEAT-208 Localclean Command

- Scope: implement `algos.runLocalClean` command.
- Dependencies: FEAT-204, FEAT-205.
- Files: `extension/src/commands/fileCommands.js`.
- Estimates:
  - Human-Primary: 5 SP, 11 h
  - Copilot-Led: 3 SP, 7 h
- Acceptance Criteria: executes `localclean` in algorithm-directory CWD when active compatible file exists and in algorithm-directory CWD when Explorer algorithm-directory or immediate-child context is selected; otherwise no-ops with actionable guidance.
- Definition Of Done: command is callable from palette/editor-title/explorer where context permits, matches source-file/algorithm-directory gating contract, and no-op behavior is verified for invalid/missing contexts.
- Human Approval: Reviewer approves cleanup behavior.

### FEAT-209 Clean Command + Defaults Flow

- Scope: implement `algos.runClean` deterministic defaults flow.
- Dependencies: FEAT-204, FEAT-205.
- Files: `extension/src/commands/fileCommands.js`, `extension/src/ui/quickPickFlows.js`, `extension/src/validation/inputValidation.js`.
- Estimates:
  - Human-Primary: 5 SP, 16 h
  - Copilot-Led: 3 SP, 11 h
- Acceptance Criteria: clean deterministically maps to `clean --defaults=y`; clean uses algorithm-directory CWD for active compatible files and Explorer algorithm-directory context.
- Definition Of Done: clean command is usable and validated from palette/editor-title/explorer with deterministic defaults behavior and algorithm-directory behavior captured in evidence.
- Human Approval: Senior engineer approves defaults UX and mapping.

### FEAT-210 Compile-Only Command

- Scope: implement `algos.runActiveFileCompileOnly` command.
- Dependencies: FEAT-204, FEAT-205.
- Files: `extension/src/commands/fileCommands.js`.
- Estimates:
  - Human-Primary: 3 SP, 8 h
  - Copilot-Led: 2 SP, 5 h
- Acceptance Criteria: executes compile-only mapping with correct filename and CWD only for valid active script targets under `src/<category>/<algorithm>/` with supported extensions.
- Definition Of Done: compile-only behavior verified for active and selected valid file contexts; invalid-target no-op behavior verified.
- Human Approval: Reviewer approves compile-only behavior.

### FEAT-211 Check-Only Route Commands

- Scope: implement native/docker/ssh check-only command variants.
- Dependencies: FEAT-204, FEAT-205.
- Files: `extension/src/commands/fileCommands.js`, `extension/src/validation/inputValidation.js`.
- Estimates:
  - Human-Primary: 5 SP, 11 h
  - Copilot-Led: 3 SP, 8 h
- Acceptance Criteria: only supported routes allowed and route-specific mapping is exact; commands execute only for valid active script targets under `src/<category>/<algorithm>/` with supported extensions.
- Definition Of Done: all route commands execute for valid targets, invalid route inputs fail fast, and invalid-target no-op behavior is verified.
- Human Approval: Reviewer approves route validation and behavior.

### FEAT-212 File-Context Guardrails

- Scope: enforce preflight checks for file-context commands.
- Dependencies: FEAT-205 through FEAT-210.
- Files: `extension/src/validation/inputValidation.js`.
- Estimates:
  - Human-Primary: 3 SP, 9 h
  - Copilot-Led: 2 SP, 6 h
- Acceptance Criteria: unsaved, untitled, and missing-context cases fail fast with actionable errors.
- Definition Of Done: all file-context commands share guardrail checks.
- Human Approval: Reviewer approves guardrail coverage.

### FEAT-213 User Notifications + Error UX

- Scope: standardize user notifications and error surfaces.
- Dependencies: FEAT-205 through FEAT-211.
- Files: `extension/src/ui/notifications.js`, `extension/src/commands/*`.
- Estimates:
  - Human-Primary: 5 SP, 12 h
  - Copilot-Led: 3 SP, 9 h
- Acceptance Criteria: preflight and runtime failures present clear, consistent messages.
- Definition Of Done: notification behavior documented and verified in manual checks.
- Human Approval: Reviewer approves user-facing error quality.

### FEAT-214 Verification Matrix + Evidence Capture

- Scope: build per-command verification matrix and evidence collection guidance.
- Dependencies: FEAT-206 through FEAT-213.
- Files: `extension/docs/manual-verification.md`.
- Estimates:
  - Human-Primary: 8 SP, 20 h
  - Copilot-Led: 5 SP, 13 h
- Acceptance Criteria: every MVP command path has expected-success and expected-failure checks.
- Definition Of Done: evidence packet template exists and is used for FEAT closure.
- Human Approval: Senior engineer approves verification completeness.

### FEAT-215 Pre-Package Approval Gate + Sign-Off Record

- Scope: execute pre-package approval workflow and record sign-off decision authorizing local packaging validation.
- Dependencies: FEAT-214.
- Files: proposal reviewer checklist and evidence references.
- Estimates:
  - Human-Primary: 3 SP, 8 h
  - Copilot-Led: 2 SP, 6 h
- Acceptance Criteria: all required FEAT tickets through FEAT-214 are approved, evidence is linked, and packaging go/no-go decision is explicit.
- Definition Of Done: pre-package approval decision is recorded with approver and date.
- Human Approval: Senior engineer signs off pre-package readiness.

### FEAT-216 Local VSIX Package + Install Validation

- Scope: package the extension into VSIX and validate local formal installation behavior without distribution workflows.
- Dependencies: FEAT-215.
- Files: `package.json` (repo root), `package-lock.json` (if modified), `extension/.vscodeignore`, `extension/package.json`, `extension/docs/manual-verification.md`, proposal approval evidence references.
- Estimates:
  - Human-Primary: 8 SP, 24 h
  - Copilot-Led: 5 SP, 17 h
- Acceptance Criteria: `npm run buildextension` succeeds from repository root; root `package.json` `buildextension` delegates to extension packaging executor in `extension/package.json` that invokes `vsce`; VSIX is written to `extension/dist/`; build output prints VSIX path plus instruction to close VS Code and install from that path; installed extension surfaces required MVP commands and run flows.
- Definition Of Done: VSIX artifact name/version/path is recorded, `buildextension` output evidence is attached, delegation-chain evidence (`package.json` root script -> `extension/package.json` executor -> `vsce`) is attached, local install verification evidence is attached, and no marketplace/distribution tasks are added.
- Human Approval: Senior engineer signs off final MVP readiness after local install verification.

## MVP Estimates Summary

### Estimate Classes

1. `Human-Primary`: Human engineers lead delivery while using Copilot for acceleration and drafting support.
2. `Copilot-Led`: Copilot drives implementation steps with human oversight and approval gates.

### Measurement Constraints And Limitations

1. Story points use Fibonacci scale (`1, 2, 3, 5, 8, 13`) and represent relative complexity/risk, not time.
2. Hour estimates are specific planning values but low-reliability approximations with high variance potential.
3. Approval wait time, meeting/sync overhead, and scope-change rework are not included unless explicitly noted.
4. Copilot-led estimates assume the existing human approval protocol still applies at FEAT boundaries.

### Per-FEAT Estimate Table

| FEAT | Title | Human-Primary | Copilot-Led | Notes |
| --- | --- | --- | --- | --- |
| FEAT-201 | Extension Scaffold Bootstrap | 3 SP, 11 h | 2 SP, 7 h | Scaffold/setup heavy but bounded scope |
| FEAT-202 | Workspace Eligibility Resolver + Activation Guard | 8 SP, 30 h | 5 SP, 20 h | Highest logic and edge-case risk |
| FEAT-203 | Path And CWD Resolution Core | 5 SP, 18 h | 3 SP, 12 h | Multi-root and path resolution complexity |
| FEAT-204 | Process Runner + Execution Logging | 5 SP, 15 h | 3 SP, 10 h | Execution safety and terminal behavior coupling |
| FEAT-205 | Run Active File Handler | 5 SP, 15 h | 3 SP, 10 h | Core command behavior and validation |
| FEAT-206 | Surface Wiring (Explorer, Editor Title, Palette) | 5 SP, 12 h | 3 SP, 8 h | Contribution wiring and visibility gating |
| FEAT-207 | Launcher Command Coverage | 3 SP, 9 h | 2 SP, 6 h | Quick-pick/dispatch integration scope |
| FEAT-208 | Localclean Command | 5 SP, 11 h | 3 SP, 7 h | Cleanup context and no-op branching |
| FEAT-209 | Clean Command + Defaults Flow | 5 SP, 16 h | 3 SP, 11 h | Deterministic clean contract enforcement |
| FEAT-210 | Compile-Only Command | 3 SP, 8 h | 2 SP, 5 h | Straightforward mapping and gating |
| FEAT-211 | Check-Only Route Commands | 5 SP, 11 h | 3 SP, 8 h | Route matrix and invalid-route guards |
| FEAT-212 | File-Context Guardrails | 3 SP, 9 h | 2 SP, 6 h | Shared preflight integration |
| FEAT-213 | User Notifications + Error UX | 5 SP, 12 h | 3 SP, 9 h | UX consistency and message coverage |
| FEAT-214 | Verification Matrix + Evidence Capture | 8 SP, 20 h | 5 SP, 13 h | Breadth of manual-path verification |
| FEAT-215 | Pre-Package Approval Gate + Sign-Off Record | 3 SP, 8 h | 2 SP, 6 h | Process and evidence consolidation |
| FEAT-216 | Local VSIX Package + Install Validation | 8 SP, 24 h | 5 SP, 17 h | Packaging + install validation variability |

### Overall Estimates

1. Human-Primary total: 79 SP, 229 h.
2. Copilot-Led total: 49 SP, 155 h.
3. Totals are planning guides for prioritization and sequencing, not delivery guarantees.

## FEAT Traceability Matrix

| FEAT | Primary Delivery Artifact | Verification Anchor |
| --- | --- | --- |
| FEAT-201 | Extension scaffold and activation wiring | Extension host startup and command discovery check |
| FEAT-202 | Workspace eligibility resolver and activation guard | Eligible/partial/ineligible plus multi-root ambiguity checks with inert behavior validation |
| FEAT-203 | Path resolver module | Resolver returns repo-root script path and algorithm-directory CWD |
| FEAT-204 | Runner module | Command execution evidence includes internal absolute script path/CWD, displayed script path form, and exit result |
| FEAT-205 | Run-active-file handler | Manual check: run from palette with saved and unsaved files |
| FEAT-206 | Surface contributions | Manual check: Explorer, editor title, and palette invocation |
| FEAT-207 | Launcher contribution and dispatch | Manual check: launcher discoverability and grouped action dispatch wiring |
| FEAT-208 | Localclean command handler | Manual check: `localclean` behavior in active-file context and normalized Explorer algorithm-directory contexts (algorithm-directory and immediate-child file/directory selections) |
| FEAT-209 | Clean/defaults command flow | Manual check: deterministic `clean --defaults=y` plus algorithm-context execution behavior |
| FEAT-210 | Compile-only command handler | Manual check: compile-only execution behavior plus invalid-target no-op |
| FEAT-211 | Route-specific check-only handlers | Manual check: native/docker/ssh route behavior, invalid-route rejection, and invalid-target no-op |
| FEAT-212 | Shared file-context guardrail validation | Regression check: unsaved/untitled/missing-context failures |
| FEAT-213 | Notification and error UX layer | Regression check: consistent user-visible error messaging |
| FEAT-214 | Verification matrix and evidence template | Verification review: all command paths covered |
| FEAT-215 | Pre-package approval record | Approval review: FEAT-201 through FEAT-214 evidence complete and packaging authorized |
| FEAT-216 | Local VSIX package and install evidence | Packaging review: VSIX generated, installed locally, and required command surfaces validated |

## Acceptance Criteria

1. All MVP commands execute with expected script invocation patterns.
2. No command in MVP violates documented accepted-value constraints.
3. Commands preserve canonical argument ordering without appending conflicting positional args.
4. File-scoped commands work from Explorer, editor title, and Command Palette, with direct palette run restricted to valid active scripts.
5. File-mode run commands execute with CWD set to resolved algorithm directory.
6. `clean` and `localclean` are included in MVP and mapped to canonical positional modes; both support active compatible source-file context and Explorer selections that normalize to one algorithm-directory context (algorithm directory or immediate-child file/directory only).
7. Invalid user input for preflight-validated paths receives actionable error messages.
8. Reviewer can trace every command to documented script behavior in this proposal's mapping and verification sections.
9. Extension remains inert in ineligible workspaces and does not attempt run terminal execution outside eligible repository roots; nested workspace folders that resolve to one repository root do not trigger false ambiguity.
10. Only the Play action is inline; non-Play run actions are exposed through explicit `Derek's Algorithms` menu paths and launcher flow.
11. `Path Policy: Internal Absolute, Display Relative With Safe Fallback` is enforced across runtime contract, FEAT evidence, and verification checks.

## Verification Plan

### Manual Checks

1. Run active file from all three command surfaces and verify same script behavior.
2. Verify hard-marker checks (`run.sh`, `init.sh`, `src/`, `shlib/`, `stdlib/`, `templates/`) drive eligible/partial/ineligible classification.
3. Verify canary execution `<run-script-path> --help-all` from resolved repository-root context and confirm expected exit `0` for eligible state.
4. Verify repo-root-only workspace scenario resolves the same repository root used for eligibility and execution.
5. Verify `src/`-only workspace scenario resolves upward to repository root and remains eligible when markers and canary pass.
6. Verify nested multi-root scenario (`repo root` + `src/`) deduplicates to one repository context and does not trigger ambiguity.
7. Verify eligible/partial/ineligible workspace scenarios and confirm ineligible mode blocks execution with guidance and no terminal creation.
8. Verify multi-root ambiguity handling pauses for explicit root-selection approval only when multiple distinct eligible repository roots are present.
9. Execute `localclean` and verify local `./output` cleanup in resolved algorithm-directory context.
10. Execute `clean`; verify deterministic `clean --defaults=y` invocation and algorithm-directory context behavior.
11. Run each check-only route variant and confirm route is reflected in command output.
12. Verify compile-only and check-only commands are present on Explorer, editor-title overflow, and palette launcher surfaces under the same valid-source-file gating as run-active.
13. Verify documentation examples for file-context run/compile/check commands use algorithm-directory CWD plus basename invocation (no `./run.sh src/...` examples).
14. Verify `Derek's Algorithms` submenu is present for non-Play run actions in editor-title overflow and Explorer context.
15. Verify editor-title overflow includes `clean`, `localclean`, `compile-only`, and check-only variants only when the active file is a supported source file that is an immediate child under `src/<category>/<algorithm>/`.
16. Verify Explorer visibility rules: `clean` and `localclean` appear for algorithm directories, immediate-child files, and immediate-child directories that normalize to one algorithm directory (deeper descendants invalid), and `run-active`/`compile-only`/check-only appear only for supported source files that are immediate children under `src/<category>/<algorithm>/`.
17. Verify direct palette run-active succeeds only for valid active script targets and performs no execution with actionable `nothing to do` guidance for invalid targets.
18. Verify palette compile-only and check-only commands perform no execution with actionable guidance for invalid targets (no active file, outside `src/<category>/<algorithm>/`, unsupported extension).
19. Verify `localclean` from Command Palette performs no execution with actionable guidance when no active compatible source file exists.
20. Verify `clean` from Command Palette performs no execution with actionable guidance when no active compatible source file exists.
21. Run `npm run buildextension` from repository root and verify VSIX artifact is emitted under `extension/dist/`.
22. Verify `buildextension` output includes explicit instruction to close VS Code and install the VSIX from the printed path.
23. Verify packaging command-chain ownership is explicit: root `package.json` `buildextension` delegates to `extension/package.json` executor command, and that executor invokes `vsce package`.
24. Verify path policy internals: resolver output and runner diagnostics record canonical absolute repository root, canonical absolute algorithm directory CWD, and canonical absolute `<run-script-path>`.
25. Verify user-facing terminal command display uses relative script path when safely derivable from algorithm-directory CWD (for example `../../../run.sh`) and absolute script path fallback when relative display is unsafe or ambiguous.
26. Verify FEAT evidence captures both path representations where applicable: internal absolute script path and displayed script path form.
27. Verify `Logging Policy: Extension Light, Script Canonical`: extension diagnostics remain metadata-only orchestration logs and do not duplicate script-owned archive/build payload logs.
28. Verify no extension-owned persistent archive log files are created in MVP flows.

Named negative test vectors:

1. `NEG-CLEAN-EXPLORER-DEEPER-DESCENDANT`: selecting a deeper-descendant Explorer path for `clean` or `localclean` must be hidden/unavailable or no-op with actionable guidance (never execute).
2. `NEG-CLEAN-PALETTE-NO-ACTIVE`: invoking `clean` from Command Palette with no active compatible source file must no-op with actionable guidance.
3. `NEG-LOCALCLEAN-PALETTE-NO-ACTIVE`: invoking `localclean` from Command Palette with no active compatible source file must no-op with actionable guidance.
4. `NEG-RUN-FAMILY-INVALID-ACTIVE`: invoking run-active, compile-only, or check-only with invalid active file context (missing active file, outside algorithm path, or unsupported extension) must no-op with actionable guidance.
5. `NEG-PATH-RELATIVE-UNSAFE`: when relative script display cannot be safely derived, terminal display must fall back to absolute script path rather than emit malformed relative path.
6. `NEG-PATH-ABSOLUTE-LEAKAGE`: when relative script display is safely derivable, terminal display should not leak unnecessary absolute script path text.

### Regression Checks

1. Verify commands do not alter `run.sh` script.
2. Verify no behavior drift against `run.sh`-owned precedence rules and invocation behavior.
3. Verify unsupported command inputs fail clearly and do not execute malformed commands.
4. Verify path policy remains intact after refactors: internal artifacts are absolute, and user-facing display preserves relative-with-safe-fallback behavior.
5. Verify logging policy remains intact after refactors: extension logging stays metadata-only and does not add persistent archive logging scope.

## Compatibility And Regression Boundaries

1. Existing shell-based workflows remain fully supported.
2. Existing scripts remain the behavior source of truth.
3. Proposal does not require changes to web editor project surfaces.

## Documentation Drift Policy

Any behavioral change to `run.sh` option handling, accepted values, precedence, or language key coverage requires updates in the same change set to:

1. extension command mapping documentation (this proposal and implementation docs)

## Reviewer Checklist

- [ ] Gating rule accepted: FEAT-200+ implementation tickets are the only MVP blockers in this proposal.
- [ ] Packet schema split clarity passed: Agent Handoff Packet Format (6 fields) and FEAT Evidence Packet Format (8 fields) are treated as distinct schemas with distinct purposes.
- [ ] Agent Handoff packet completeness passed: FEAT-201 through FEAT-216 packet definitions each contain all 6 Packet Format fields.
- [ ] FEAT evidence packet completeness passed: FEAT closeouts include all 8 FEAT Evidence Packet Format fields.
- [ ] FEAT Packet Alignment Matrix passed: all FEAT IDs are marked aligned.
- [ ] Evidence template compliance passed: FEAT closeouts follow the defined evidence packet structure.
- [ ] Phrase-level drift guard passed: normative sections, FEAT packets, and FEAT backlog acceptance lines contain no legacy shorthand that weakens current normalization policy.
- [ ] Path Policy terminology lock passed: `Path Policy: Internal Absolute, Display Relative With Safe Fallback` appears consistently in path-policy sections and FEAT packet wording.
- [ ] Logging Policy terminology lock passed: `Logging Policy: Extension Light, Script Canonical` appears consistently in execution/logging sections and FEAT-204 constraints.
- [ ] MVP Constraint Taxonomy lock passed: normative statements and FEAT acceptance wording remain classified/aligned as `MVP-BLOCKING`, `MVP-GUARDRAIL`, or `POST-MVP-DEFERRED` without silent tier promotion.
- [ ] Named negative vector coverage passed: Verification Plan named negative test vectors are executed and evidence is recorded in FEAT closeouts where applicable.
- [ ] Path policy evidence coverage passed: FEAT evidence captures internal absolute path artifacts and user-facing display-path form where applicable.
- [ ] Lightweight logging compliance passed: extension evidence confirms metadata-only orchestration logging and no extension-owned persistent archive logging in MVP.
- [ ] Stop-and-ask protocol passed: each FEAT closure includes explicit pause-and-approval before next FEAT.
- [ ] Blog Coexistence Gate passed: protected blog surfaces are unchanged unless explicitly approved, shared-surface changes are additive-safe, and coexistence evidence command output is attached.
- [ ] Workspace Safety Gate passed: hard marker and canary checks are evidenced, eligible/partial/ineligible detection works, ineligible mode is inert, and no run execution occurs outside resolved eligible root.
- [ ] FEAT-201 passed: extension scaffold loads and bootstrap command is discoverable.
- [ ] FEAT-202 passed: workspace eligibility and activation guard behavior is correct.
- [ ] FEAT-203 passed: path and CWD resolution are contract-correct.
- [ ] FEAT-204 passed: runner logs required orchestration metadata, preserves path display policy, and complies with lightweight logging policy.
- [ ] FEAT-205 passed: run-active-file handler works with proper preconditions.
- [ ] FEAT-206 passed: run-active-file is wired to Explorer, editor title, and palette.
- [ ] FEAT-207 passed: launcher command coverage is implemented and verified.
- [ ] FEAT-208 passed: localclean command is implemented and verified.
- [ ] FEAT-209 passed: clean and defaults flow is implemented with validation.
- [ ] FEAT-210 passed: compile-only command behavior is verified.
- [ ] FEAT-211 passed: all check-only route commands and route validation are verified.
- [ ] FEAT-212 passed: shared file-context guardrails are enforced.
- [ ] FEAT-213 passed: user-facing notification and error UX is consistent.
- [ ] FEAT-214 passed: verification matrix and evidence packet are complete.
- [ ] FEAT-215 passed: pre-package approval record is complete and signed.
- [ ] FEAT-216 passed: VSIX package/install validation evidence is complete and final MVP sign-off is recorded.

## Change Log

| Date | Change | Rationale | Approver |
| --- | --- | --- | --- |
| 2026-04-13 | Initial proposal draft created | Establish implementation-ready MVP blueprint | Approved by Derek |
| 2026-04-13 | Reviewer polish pass with two-table mapping, FEAT backlog, and FEAT traceability matrix | Improve reviewer throughput and planning handoff quality | Approved by Derek |
| 2026-04-13 | Backlog standardized to FEAT-200 implementation track only | Align planning taxonomy with executable extension delivery | Approved by Derek |
| 2026-04-13 | Added runtime invocation contract, planned extension structure, and Copilot execution protocol | Make FEAT execution deterministic for guided Copilot implementation | Approved by Derek |
| 2026-04-13 | FEAT backlog decomposed from FEAT-201..208 into FEAT-201..215 with per-ticket AC and DoD focus | Improve execution granularity and reviewability under guided Copilot workflow | Approved by Derek |
| 2026-04-13 | Copilot-centric hardening pass: FEAT-201..215 packet expansion, alignment matrix, and operational evidence/approval rules | Eliminate packet/backlog drift and enforce deterministic human-guided execution | Approved by Derek |
| 2026-04-13 | Added Appendix C: Explicitly Excluded from MVP, covering all run.sh features intentionally out of scope | Prevent scope creep during FEAT implementation and give Copilot a hard stop list | Approved by Derek |
| 2026-04-13 | Added repository coexistence gating for protected blog/shared surfaces with mandatory evidence commands | Prevent blog regressions from extension work and enforce explicit human approval on shared-surface edits | Approved by Derek |
| 2026-04-13 | Added EDH-first bootstrap requirements and FEAT-216 local VSIX package/install validation gate | Ensure MVP proves Extension Development Host operation early and local formal installation at closeout | Approved by Derek |
| 2026-04-13 | Added workspace eligibility/non-interference MVP gate and inserted FEAT-202 with full downstream renumbering to FEAT-215 | Ensure extension behavior is scoped to eligible repository workspaces and remains inert elsewhere | Approved by Derek |
| 2026-04-13 | Hardened workspace eligibility with runtime-capability markers plus canary check | Ensure eligibility reflects repository runtime shape and execution safety | Approved by Derek |
| 2026-04-13 | Removed ScriptsReference.md from runtime decision paths and removed lookup command references | Ensure final code decisions are driven only by runtime markers, parser behavior, and proposal mapping | Approved by Derek |
| 2026-04-13 | Adopted explicit `Derek's Algorithms` menu model for non-Play run actions and added valid-active-script gating for direct palette run | Improve discoverability while preventing ambiguous or invalid direct run execution | Approved by Derek |
| 2026-04-13 | Updated FEAT-216 packaging contract to require `npm run buildextension`, VSIX output in `extension/dist/`, and explicit close/install operator guidance in build output | Provide a single human-friendly build path and clear post-build installation instructions | Approved by Derek |
| 2026-04-13 | Clarified FEAT-216 packaging ownership chain so root `buildextension` delegates to extension executor that invokes `vsce` | Remove ambiguity about where packaging logic lives and how VSIX creation is executed | Approved by Derek |
| 2026-04-13 | Renumbered FEAT sequence to strict numeric IDs and added FEAT sizing/numbering policy | Keep FEAT IDs strictly numeric and preserve small-scope FEAT boundaries without suffix IDs | Approved by Derek |
| 2026-04-13 | Tightened surface availability model: editor-title clean/localclean on valid source files, Explorer context gating for clean/localclean/run, and aligned FEAT/verification contracts | Eliminate command-surface ambiguity and ensure context-driven visibility is testable and implementable | Approved by Derek |
| 2026-04-13 | Added explicit compile/check surface parity wording, standardized MVP non-interactive clean to `--defaults=y`, and hardened strict supported-target-only execution contract (with filename-bracketing deferred post-MVP) | Keep MVP simple, deterministic, and unambiguous while preventing unsupported file execution paths | Approved by Derek |
| 2026-04-13 | Corrected filename-mode shell examples and invariant wording to algorithm-directory basename invocation for file-context commands | Remove conflicting `./run.sh src/...` examples and align Appendix A with normative mapping/CWD contract | Approved by Derek |
| 2026-04-13 | Simplified MVP scope by deferring list/flag command surfaces post-MVP, collapsing to one clean command (`clean --defaults=y`), and enforcing algorithm-directory-only execution contexts for all remaining commands | Keep MVP minimal, deterministic, and strictly aligned to supported algorithm targets | Approved by Derek |
| 2026-04-13 | Added path-policy hardening: internal canonical absolute runtime artifacts, relative-with-safe-fallback terminal display, and evidence/verification updates | Preserve terminal readability while making runtime behavior and Copilot implementation guidance deterministic | Approved by Derek |
| 2026-04-13 | Added lightweight extension logging policy: metadata-only orchestration diagnostics, no extension-owned persistent archive logging, and FEAT-204/verification guardrails | Keep MVP logging minimal because `run.sh` already owns canonical runtime logging and archival | Approved by Derek |
| 2026-04-13 | Applied Route C governance hardening: MVP constraint taxonomy, pre-implementation approval gate, profile-sourcing MVP contract, and deferred-record conversion | Prevent MVP scope leakage and make boundary-changing edits require explicit approval plus changelog traceability | Approved by Derek |
| 2026-04-13 | Applied human approvals for kickoff: status moved to Proposed, reviewer owner recorded, and Route C pre-implementation gate approval recorded | Confirm governance prerequisites for human-led, FEAT-gated Copilot implementation flow | Approved by Derek |
| 2026-04-13 | Added full proposal table of contents near the top of the document | Improve navigation and review speed for human-led, Copilot-assisted FEAT execution | Approved by Derek |

## Appendix A: Canonical MVP Command Examples (User-Facing Display)

Note: the commands below are user-facing shell display examples. Internal runtime resolution, validation, and evidence use canonical absolute `<run-script-path>` and canonical absolute CWD artifacts as defined in Runtime Invocation Contract.

```bash
# File-context examples from algorithm directory (basename invocation mode)
cd src/numeric/euclidgcd
../../../run.sh euclidgcd.py
../../../run.sh --compile-only euclidgcd.py
../../../run.sh --check-only=native euclidgcd.py
../../../run.sh --check-only=docker euclidgcd.py
../../../run.sh --check-only=ssh euclidgcd.py
../../../run.sh localclean
../../../run.sh clean --defaults=y
```

Internal path evidence example (diagnostic/evidence, not terminal display):

```text
Resolved Script Path (absolute): /home/user/path/to/repo/run.sh
Resolved Algorithm CWD (absolute): /home/user/path/to/repo/src/numeric/euclidgcd
Displayed Script Path Form: ../../../run.sh
```

## Appendix B: Language Key Coverage Sync Strategy

1. Keep one extension-side generated catalog sourced from canonical script contract references.
2. Validate command inputs against the same catalog used for quick pick UI.
3. Add CI or release checklist item to diff language keys against canonical parser-derived catalog snapshots before publish.

## Appendix C: Explicitly Excluded from MVP

This appendix is the authoritative stop list for MVP scope. Every `run.sh` feature listed here must **not** be implemented as an extension command or surface in MVP. Copilot must treat this list as a hard boundary: if a FEAT task appears to require one of these features, stop and request explicit reviewer approval before proceeding.

### Hard Excluded (No Extension Command in MVP)

These features exist in `run.sh` but will not be surfaced as VS Code commands at all during MVP.

| Feature / Flag | Description | Exclusion Rationale |
| --- | --- | --- |
| `--smoke-test` | Runs the smoke test suite and exits | CI/development tooling; not a user-facing editor action. See Post-MVP Deferred Records item 1: if explicitly promoted out of deferred status, remove from this list and add to the FEAT backlog. |
| `--smoke-test --langs=<keys>` | Filters smoke run to named language keys | Same as above; forwarded smoke option. |
| `--smoke-test --timeout=<duration>` | Overrides main smoke timeout | Same as above; forwarded smoke option. |
| `--smoke-test --slow-timeout=<duration>` | Overrides slow-language smoke timeout | Same as above; forwarded smoke option. |
| `--smoke-test --markdown[=<path>]` | Produces markdown-format smoke output | Same as above; forwarded smoke option. |
| `select` | Interactive language selector with live shell prompts | Requires interactive terminal prompts incompatible with MVP extension command/quick-pick architecture; language-key run surfaces are deferred post-MVP. |
| `--help` / `-h` | Compact script help output | Shell help is not an extension command; extension provides UI-layer guidance. |
| `--help-all` | Full script help output | Same as above. |
| `--help=<topic>` | Topic-specific help (examples, profile, execution, docker, general, clean) | Same as above; topic-level help is deferred to extension documentation and error message guidance. |
| `--source-profile=` (empty value) | Disables default profile sourcing | System environment management concern; extension does not control shell profile sourcing in MVP. |
| `--list-langauges` (typo alias) | Alias for `--list-languages` (typo in script) | Extension exposes only canonical flags; typo aliases are not surfaced as commands. |

### Implicitly Out of Scope (No Extension Command; Script Behavior Passes Through)

These `run.sh` behaviors exist and work correctly in the terminal, but the extension provides no dedicated command, UI, or configuration knob for them in MVP. They are visible to the user only through the terminal's output.

| Feature / Behavior | Description | Why No Extension Command |
| --- | --- | --- |
| `--source-profile=<path>` | Sources a custom profile path before execution | Profile path is a shell/environment concern; users configure this via `init.sh` or their own shell setup, not through the extension. |
| `--check-only` (bare, no route value) | Simulates route setup using default route (native) | Extension always passes an explicit route (`native`, `docker`, or `ssh`) to avoid ambiguity; the implicit-default bare form is intentionally absent from the command inventory. |
| Runtime argv after positional (`./run.sh main.py arg1 arg2`) | Forwards extra arguments to the compiled/run target's argv | No extension command for building or passing arbitrary runtime arguments in MVP; deferred to a future argument-builder UI. |
| Script exit codes 65, 73, 74, 78 | Setup and system-level error codes beyond standard success (0) and usage error (64) | Errors are visible in the extension-owned terminal; extension does not create distinct notification categories per system error code in MVP. |
| Parser option precedence (first option wins; extras ignored with warning) | When multiple quick/parser-affecting flags are provided, only the first is honored | This is script-owned behavior; extension enforces single-option invocations per command and does not expose multi-flag composition. |
