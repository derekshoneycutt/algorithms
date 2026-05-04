import type * as vscode from "vscode";

import type {
  CreateWorkspaceStatePersistenceStoreInput,
  IPersistenceStore,
} from "./IPersistenceStore";

/**
 * Creates one workspace-state backed persistence store adapter.
 *
 * @param {CreateWorkspaceStatePersistenceStoreInput} input Store dependencies.
 * @returns {IPersistenceStore} Persistence store adapter.
 */
export function createWorkspaceStatePersistenceStore(
  input: CreateWorkspaceStatePersistenceStoreInput
): IPersistenceStore {
  return {
    read(): unknown {
      return input.context.workspaceState.get(input.storageKey);
    },

    write(value: unknown): Thenable<void> {
      return input.context.workspaceState.update(input.storageKey, value);
    },
  };
}
