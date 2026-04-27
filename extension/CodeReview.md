# Adversarial Code Review

## Findings

1. P-001: Main-file delete path skips include-folder cleanup (functional data integrity bug)
- Severity: High
- Evidence:
  - vscextension/src/commands/algorithmTreeActions.ts:577 only enters include cleanup discovery when treeNode.kind is file.
  - vscextension/src/commands/algorithmTreeActions.ts:597-599 treats only kind directory as folder for prompt text.
  - In FILES view, representative algorithm files are mainFile rows, not file rows.
- Why this is a problem:
  - Deleting a main algorithm file from the tree can leave orphaned *_include directories because the cleanup branch is skipped for mainFile.
  - This creates stale state in the algorithm folder and violates least-surprise behavior for destructive operations.
- Suggested fix:
  - Treat both file and mainFile as candidates for main-file include cleanup.
  - Detect folder prompts using directory and algorithmDir kinds.
  - Add tests that delete a mainFile row with include directories and assert include directories are removed.

2. P-002: Multi-root workspace runs can resolve the wrong src root (functional correctness bug)
- Severity: High
- Evidence:
  - vscextension/src/commands/editorTitleRunCommand.ts:66 passes all workspaceFolderPaths without prioritizing the active file owner workspace.
  - vscextension/src/algorithms/index.ts:70-75 resolves algorithms root by returning the first workspace folder containing src.
  - vscextension/src/conductor/internal/runFile.ts:438-441 consumes that first-match root for run orchestration and path validation.
- Why this is a problem:
  - In multi-root workspaces, running a file from workspace B can be validated against workspace A root.
  - This yields false out-of-root failures or wrong run.sh resolution, depending on folder order.
- Suggested fix:
  - Resolve workspace root from the selected file path first, then fall back to scanning workspace folders.
  - Thread the selected file URI workspace folder identity through editor/explorer/tree commands into run orchestration.
  - Add multi-root tests with two src trees and verify run dispatch chooses the correct root.

3. P-003: orchestrateRunFile is an oversized orchestration function with too many responsibilities
- Severity: Medium-High
- Evidence:
  - vscextension/src/conductor/internal/runFile.ts:397-769 contains validation, option building, lifecycle transitions, smoke parsing, process execution, status publication, and error translation in one function.
- Why this is a problem:
  - High branch density increases regression risk whenever one execution mode changes.
  - It is hard to unit test in isolation because setup must traverse many unrelated paths.
  - This violates the repo standard preference for small single-responsibility functions.
- Suggested fix:
  - Split into focused steps:
    - preflight validation and target resolution
    - token/argument construction
    - smoke runtime streaming/status application
    - process execution strategy (terminal vs tracked commandline)
    - completion/error finalization
  - Keep each step pure where possible and unit-test each step independently.

4. P-004: createCoordinator is a god-function that owns too many construction concerns
- Severity: Medium
- Evidence:
  - vscextension/src/coordinator.ts:129 onward builds services, adapters, channels, providers, handlers, commands, registrations, and disposal wiring in one very long function.
- Why this is a problem:
  - A single edit can accidentally couple unrelated runtime areas (views, comms, command wiring, lifecycle disposal).
  - Reviewability is reduced, and ownership boundaries become implicit instead of explicit.
  - This conflicts with the standard that files/functions should have one clear responsibility and manageable complexity.
- Suggested fix:
  - Extract construction into composable factories:
    - buildRuntimeServices
    - buildViewLayer
    - buildMessageChannels
    - buildCommands
    - buildDisposables
  - Keep createCoordinator as a thin composition root that sequences these factories.
