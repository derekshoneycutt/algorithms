# Tree-Action Pattern Spec

Implementation spec for tree-based file actions.

Related sources of truth:

1. Ownership boundaries: `../ArchitectureSummary.md`
2. Dependency contracts: `../DependencyContracts.md`

This spec intentionally avoids re-stating architecture and dependency policy.

## Table of Contents

- [1. Scope](#1-scope)
- [2. Context Value Conventions](#2-context-value-conventions)
- [3. Menu Gating Conventions](#3-menu-gating-conventions)
- [4. Command Handler Conventions](#4-command-handler-conventions)
- [5. Delete Flow Conventions](#5-delete-flow-conventions)
- [6. Command ID Conventions](#6-command-id-conventions)
- [7. Verification Checklist](#7-verification-checklist)

## 1. Scope

In scope:

1. Tree item context-value conventions.
2. Command-handler behavior for tree actions.
3. Menu visibility gating for tree actions.
4. Refresh behavior after mutations.

Out of scope:

1. Module ownership definitions.
2. Interface dependency rules and bootstrap construction policy.

## 2. Context Value Conventions

1. Tree providers in `src/views/trees/` derive `TreeItem.contextValue` from node depth, type, and feature context.
2. Context values follow pattern `algos.<featureName><depthOrType>`.
3. Assignment must be deterministic for equivalent node inputs.
4. Tree providers do not perform filesystem mutations.

Example values:

- `algos.algorithmsFirstLevelDirectory`
- `algos.algorithmsLeafFile`
- `algos.stdlibFirstLevelDirectory`

## 3. Menu Gating Conventions

1. Command visibility is controlled by `package.json` menu `when` clauses.
2. Tree-action clauses use `view == <viewId> && viewItem == <contextValue>`.
3. Visibility logic belongs in menu clauses, not tree providers.
4. Context values must be specific enough to allow precise action targeting.

## 4. Command Handler Conventions

1. Tree-action handlers live in `src/commands/`.
2. Handlers accept an optional `WorkspaceTreeNode` to derive target context.
3. Handlers resolve canonical root path before deriving target-relative paths.
4. Handlers validate target paths before mutation.

Required path validations:

1. Path is present and non-empty.
2. Path is relative to the canonical root.
3. Path does not escape root bounds.

Handler responsibilities:

1. Perform filesystem mutations.
2. Route user-facing status through notification utilities.
3. Request tree refresh after mutation completion.

Non-responsibilities:

1. Setting or mutating tree item context values.
2. Making menu availability decisions.

## 5. Delete Flow Conventions

1. Show explicit confirmation modal before delete attempts.
2. First attempt `vscode.workspace.fs.delete` with `useTrash: true`.
3. If trash delete is unavailable or fails for unsupported reasons, fall back to `filesystem.deletePath`.
4. Deleting a main algorithm code file cascades to associated `_include` directories in the same algorithm folder when present.
5. Emit user-visible success or failure status through notification utilities.
6. Request tree refresh after successful mutation.

## 6. Command ID Conventions

1. Tree-action command IDs are exposed via getter functions in `src/commands/commandIds.ts`.
2. IDs are stable and treated as API-like references for command registration and menu contributions.
3. Menu contribution IDs in `package.json` must map directly to these command ID getters.

## 7. Verification Checklist

- [ ] Tree providers derive deterministic context values from node properties.
- [ ] Tree providers do not perform filesystem mutations.
- [ ] Menu visibility is driven by `view` + `viewItem` `when` clauses.
- [ ] Handlers validate target path presence, relativity, and root bounds.
- [ ] Delete handlers confirm first, try trash delete, then fallback delete path.
- [ ] Deleting a main algorithm code file also deletes associated `_include` directories when present.
- [ ] Tree refresh is requested after successful mutations.
- [ ] Command IDs come from `src/commands/commandIds.ts` and match `package.json` contributions.
