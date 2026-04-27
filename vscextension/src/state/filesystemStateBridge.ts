import type { IStateMachine } from "./IStateMachine";

/**
 * DI-ready callback surface for filesystem state event forwarding.
 */
export interface IStateFilesystemBridge {
  /**
   * Handles filesystem cache TTL updates.
   *
   * @param {number} ttlMs Updated cache TTL in milliseconds.
   * @returns {void}
   */
  onCacheTtlSet(ttlMs: number): void;

  /**
   * Handles filesystem cache invalidation updates.
   *
   * @param {string} [targetPath] Optional invalidated path.
   * @returns {void}
   */
  onCacheCleared(targetPath?: string): void;

  /**
   * Handles filesystem stat cache entry updates.
   *
   * @param {string} targetPath Target path.
   * @param {boolean} exists Whether the path exists.
   * @param {"file" | "directory" | "other" | "missing"} kind Stat kind.
   * @param {number} updatedAt Update timestamp.
   * @returns {void}
   */
  onStatCacheEntrySet(
    targetPath: string,
    exists: boolean,
    kind: "file" | "directory" | "other" | "missing",
    updatedAt: number
  ): void;

  /**
   * Handles filesystem directory cache entry updates.
   *
   * @param {string} targetPath Target path.
   * @param {number} entryCount Directory entry count.
   * @param {number} updatedAt Update timestamp.
   * @returns {void}
   */
  onDirectoryCacheEntrySet(
    targetPath: string,
    entryCount: number,
    updatedAt: number
  ): void;

  /**
   * Handles pending filesystem operation state updates.
   *
   * @param {string} operationId Operation identifier.
   * @param {string} operationType Operation type.
   * @param {string} targetPath Target path.
   * @param {"pending"} status Operation status.
   * @param {number} updatedAt Update timestamp.
   * @returns {void}
   */
  onPendingOperationSet(
    operationId: string,
    operationType: string,
    targetPath: string,
    status: "pending",
    updatedAt: number
  ): void;

  /**
   * Handles pending filesystem operation clears.
   *
   * @param {string} operationId Operation identifier.
   * @returns {void}
   */
  onPendingOperationCleared(operationId: string): void;

  /**
   * Handles filesystem operation error updates.
   *
   * @param {string} targetPath Target path.
   * @param {string} message Error message.
   * @returns {void}
   */
  onOperationErrorSet(targetPath: string, message: string): void;
}

/**
 * Creates a state-machine-backed filesystem bridge implementation.
 *
 * @param {IStateMachine} stateMachine Host state machine.
 * @returns {IStateFilesystemBridge} Filesystem bridge callbacks bound to state events.
 */
export function createStateFilesystemBridge(
  stateMachine: IStateMachine
): IStateFilesystemBridge {
  return {
    onCacheTtlSet(ttlMs): void {
      stateMachine.send({
        type: "FILESYSTEM_CACHE_TTL_SET",
        ttlMs,
      });
    },

    onCacheCleared(targetPath): void {
      stateMachine.send({
        type: "FILESYSTEM_CACHE_CLEARED",
        targetPath,
      });
    },

    onStatCacheEntrySet(targetPath, exists, kind, updatedAt): void {
      stateMachine.send({
        type: "FILESYSTEM_STAT_CACHE_ENTRY_SET",
        targetPath,
        exists,
        kind,
        updatedAt,
      });
    },

    onDirectoryCacheEntrySet(targetPath, entryCount, updatedAt): void {
      stateMachine.send({
        type: "FILESYSTEM_DIRECTORY_CACHE_ENTRY_SET",
        targetPath,
        entryCount,
        updatedAt,
      });
    },

    onPendingOperationSet(operationId, operationType, targetPath, status, updatedAt): void {
      stateMachine.send({
        type: "FILESYSTEM_PENDING_OPERATION_SET",
        operationId,
        operationType,
        targetPath,
        status,
        updatedAt,
      });
    },

    onPendingOperationCleared(operationId): void {
      stateMachine.send({
        type: "FILESYSTEM_PENDING_OPERATION_CLEARED",
        operationId,
      });
    },

    onOperationErrorSet(targetPath, message): void {
      stateMachine.send({
        type: "FILESYSTEM_OPERATION_ERROR_SET",
        targetPath,
        message,
      });
    },
  };
}
