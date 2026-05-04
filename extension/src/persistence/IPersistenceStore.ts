import type * as vscode from "vscode";

/**
 * Narrow store contract used by persistence service.
 */
export interface IPersistenceStore {
  /**
   * Reads the raw stored payload.
   *
   * @returns {unknown} Raw persisted value.
   */
  read(): unknown;

  /**
   * Writes one raw payload value.
   *
   * @param {unknown} value Payload to persist.
   * @returns {Thenable<void>} Resolves when write completes.
   */
  write(value: unknown): Thenable<void>;
}

/**
 * Dependencies for creating one workspace-state backed persistence store.
 */
export interface CreateWorkspaceStatePersistenceStoreInput {
  context: vscode.ExtensionContext;
  storageKey: string;
}
