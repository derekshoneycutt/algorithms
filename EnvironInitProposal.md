# Environment Pane Proposal (init.sh Integration)

## Scope
This proposal defines a new top-most extension sidebar pane named Environment that drives environment setup through init.sh. This document is planning-only and does not include implementation changes.

The pane goal is to provide practical controls for profile targeting, environment diagnostics, icon copy operations, core environment variables, and per-language docker/ssh routing with conflict visibility.

## Placement
1. Add a new sidebar view at the top of algosSidebar named Environment.
2. Keep existing panes below it.
3. The Environment pane can be a WebviewViewProvider for rich form controls and table UX.
4. It should default to collapsed in the sidebar.

## Command Execution Model
All actions in this pane should run init.sh non-interactively.

1. Always include --no-prompt to avoid interactive shell prompts.
2. For actions that are not icon copy, always include --no-icons.
3. For icon copy actions, use --copy-icons and optional --icons-to=<path>.
4. For check-only diagnostics, use --check-env and do not include flags that mutate profile values.

Suggested execution pattern:
- Working directory: repository root.
- Script invocation: ./init.sh <flags>
- Capture stdout/stderr and parse for structured display.

## Profile Selection (Top Control)
### Requirement
Map to --update-profile=<file>.

### UI Behavior
1. A profile path input appears at the top.
2. Placeholder default:
3. Linux and Windows: ~/.bash_profile
4. FreeBSD preferred placeholder: ~/.profile
5. macOS preferred placeholder: ~/.zprofile
6. If empty, do not pass --update-profile and let init.sh use platform defaults.

### Technical Note
Platform-specific placeholder can use process.platform in extension runtime.

## Check Environment
### Requirement
Run --check-env and show success or relevant errors in a small scrolling box.

### UI Behavior
1. Button: Check Environment.
2. On click, run:
3. ./init.sh --no-prompt --no-icons --check-env [optional --update-profile=<file>]
4. Show status badge: Success or Issues Found.
5. Show output panel (scrollable):
6. Prefer filtered error lines first.
7. Allow toggle to view full raw output.

### Output Filtering Heuristic
1. Prioritize lines matching case-insensitive patterns: error, invalid, failed, missing, unsupported.
2. If no matches and exit code is non-zero, show last N lines (for example 40).
3. If exit code is zero and no error-like lines, show compact success summary.

## Copy Icons
### Requirement
Optional path input for copy destination. This action should skip profile updates.

### UI Behavior
1. Toggle or button section: Copy Icons.
2. Optional textbox for destination path.
3. If path present, pass --icons-to=<path>.
4. Execute with profile/env updates disabled:
5. ./init.sh --no-prompt --copy-icons --skip-environment [optional --icons-to=<path>] [optional --update-profile=<file>]
6. Show copy result and output snippet.

### Guardrail
All non-icon actions should explicitly include --no-icons.

## Core Environment Variables Section (No Docker/SSH Here)
### Variables
1. Timeout -> --use-timeout=<value>
2. Eiffel -> --use-eiffel=<value>
3. GCC13 Directory -> --use-gcc13=<value>
4. GCC13 Name -> --use-gcc13name=<value>
5. GXX13 Name -> --use-gxx13name=<value>

### UI Behavior
1. Show editable controls for each variable.
2. Each variable has its own Save button.
3. Save executes init.sh specifically for that variable.

### Recommended Save Strategy
Use set-only semantics to avoid side effects:
- ./init.sh --no-prompt --no-icons --set-use-only --use-<var>=<value> [optional --update-profile=<file>]

This keeps writes narrowly scoped and avoids touching unrelated values.

## Language Routing Table (62 Languages)
init.sh currently declares 62 supported languages.

### Table Layout
1. One row per language.
2. Default collapsed row line shows:
3. Language icon.
4. Language name.
5. Indicator chips: docker and/or ssh when configured.
6. If both docker and ssh are set for the same language, mark row as conflict (error red).

### Expand/Collapse Row Behavior
1. Expanded row keeps summary line visible at top.
2. Expanded area includes:
3. Docker enabled checkbox and docker image textbox.
4. SSH enabled checkbox and ssh route textbox.
5. Save button per row.
6. Row save validates current row state before running init.sh.

### Batch All Control
1. A top-level Batch All section applies docker/ssh values across all 62 languages.
2. Batch apply should write per-language entries consistently.
3. Conflict visualization should refresh immediately after apply.
4. Batch All should also have an explicit Save/Apply button.

### Route Write Semantics
Use explicit map editor flags for predictable per-language operations:
- Docker set: --runondocker-set=<lang>=<image>
- Docker remove: --runondocker-remove=<lang>
- SSH set: --runonssh-set=<lang>=<route>
- SSH remove: --runonssh-remove=<lang>

Command baseline:
- ./init.sh --no-prompt --no-icons [ops...] [optional --update-profile=<file>]

### Conflict Rule
If both docker and ssh are configured for one language, treat as contradictory state in UI (error red). Do not auto-resolve silently.

Save behavior for conflicts:
1. If both docker and ssh are enabled on a row, block save for that row.
2. Show a clear validation error explaining that a language cannot save with both docker and ssh enabled at the same time.
3. Apply the same validation to Batch All so it cannot save contradictory docker+ssh state across all languages.

## File/State Hydration
The pane should initialize itself from a read source before edits.

Recommended approach:
1. Run check-env at pane load and parse effective values where possible.
2. Optionally add a lightweight parser for the managed profile export block to hydrate exact values.
3. Keep a Refresh button to reload from current shell/profile state.

## Error Handling
1. Every action should return exit code, concise status, and expandable raw output.
2. Use actionable messages:
3. Invalid value format.
4. Unsupported route syntax.
5. Missing script/environment prerequisites.
6. For failed commands, keep command line shown in a debug section with sensitive data redaction if needed.

## UX Notes
1. Save/apply buttons should be disabled during in-flight command execution.
2. Use optimistic row states only after process success.
3. Keep the output box height constrained with scroll for compact sidebar usability.
4. Persist unsaved form state locally in the webview until saved or refreshed.

## Proposed Implementation Phases
1. Phase 1: Contribute and register Environment pane shell.
2. Phase 2: Add profile selector, check-env, and output panel.
3. Phase 3: Add copy-icons section and variable controls with per-variable save.
4. Phase 4: Add 62-language table, row expansion, and conflict highlighting.
5. Phase 5: Add Batch All apply and robust parsing/refresh.
6. Phase 6: End-to-end validation and polish.

## Verification, Build, Install (Completion Criteria)
Work is complete only after:

1. Verification
2. Profile selector behavior:
3. Empty profile field omits --update-profile.
4. Placeholder reflects OS preference (Linux/FreeBSD/macOS) where implemented.
5. Check Environment:
6. Success case reports clean state.
7. Failure case displays filtered errors in scroll box and full output option.
8. Copy Icons:
9. Copies successfully with and without destination override.
10. Does not modify environment/profile values when skip-environment is used.
11. Core variable saves:
12. Each variable save updates expected export only and reports success/failure.
13. Language table:
14. 62 rows present with icons and indicators.
15. Expand/collapse works per row.
16. Conflict state turns row error red when both docker and ssh are set.
17. Row save is blocked with a clear error if both docker and ssh are enabled.
18. Batch All save is blocked with a clear error if both docker and ssh are enabled.
19. Batch All applies values to all languages consistently when valid.

18. Build
19. Run npm run build:vsix in extension workspace.

20. Install
21. Run code --install-extension <generated-vsix> --force.

## Non-Goals
1. This proposal does not modify run.sh behavior.
2. This proposal does not alter init.sh semantics.
3. This proposal does not auto-reconcile docker/ssh conflicts; it visualizes them as errors for user correction.
