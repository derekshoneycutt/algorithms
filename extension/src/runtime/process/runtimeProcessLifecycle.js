const {
  actionCreators,
  extensionStateStore,
  selectActiveRuntimeProcessForOwner,
  selectRuntimeProcessById,
  selectRuntimeProcessRunTokenForOwner,
  selectStoppedRuntimeProcessRunTokenForOwner,
} = require("../state/extensionStateStore");

let nextProcessSequence = 1;

/**
 * Creates a stable runtime process id for one owner/run pair.
 *
 * @param {string} ownerKey Runtime process owner key.
 * @param {number} runToken Runtime process run token.
 * @returns {string} Runtime process identifier.
 */
function createRuntimeProcessId(ownerKey, runToken) {
  const sequence = nextProcessSequence;
  nextProcessSequence += 1;
  return `${ownerKey}:${runToken}:${sequence}`;
}

/**
 * Creates one runtime process lifecycle helper backed by extension state.
 *
 * @param {{now?: () => number}} [options] Optional time provider.
 * @returns {{beginRun: (metadata: {ownerKey: string, processType?: string, commandFamily?: string, scriptPath?: string, cwd?: string, displayCommand?: string, reason?: string|null, metadata?: object|null}) => {ok: boolean, ownerKey: string, processId: string|null, runToken: number, startedAt: number}, attachSpawnedProcess: (input: {ownerKey: string, processId: string, childProcess?: import("child_process").ChildProcess|null, handle?: {pid: number|null, isRunning: () => boolean, kill: (signal?: NodeJS.Signals|number) => {ok: boolean, reason: string|null}}|null}) => boolean, isCurrentRun: (ownerKey: string, runToken: number) => boolean, isStoppedRun: (ownerKey: string, runToken: number) => boolean, markFailed: (input: {ownerKey: string, processId: string, runToken?: number, errorMessage?: string, reason?: string|null}) => boolean, markCompleted: (input: {ownerKey: string, processId: string, runToken?: number, exitCode?: number|null, signal?: string|null, reason?: string|null}) => boolean, stopRun: (ownerKey: string, options?: {markStopped?: boolean, invalidateRunToken?: boolean, reason?: string|null}) => boolean, disposeOwner: (ownerKey: string) => void}} Helper API.
 */
function createRuntimeProcessLifecycle(options = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const runtimeByProcessId = new Map();

  /**
   * Writes one process record into central state.
   *
   * @param {object} processRecord Runtime process record.
   * @returns {void}
   */
  function upsertProcessRecord(processRecord) {
    extensionStateStore.dispatch(actionCreators.upsertRuntimeProcess(processRecord));
  }

  /**
   * Removes one local runtime entry by process id.
   *
   * @param {string} processId Runtime process identifier.
   * @returns {void}
   */
  function cleanupRuntime(processId) {
    runtimeByProcessId.delete(processId);
  }

  /**
   * Returns whether one owner/run pair is current.
   *
   * @param {string} ownerKey Runtime process owner key.
   * @param {number} runToken Runtime process run token.
   * @returns {boolean} True when current.
   */
  function isCurrentRun(ownerKey, runToken) {
    return selectRuntimeProcessRunTokenForOwner(ownerKey) === runToken;
  }

  /**
   * Returns whether one owner/run pair has been stopped.
   *
   * @param {string} ownerKey Runtime process owner key.
   * @param {number} runToken Runtime process run token.
   * @returns {boolean} True when stopped.
   */
  function isStoppedRun(ownerKey, runToken) {
    return selectStoppedRuntimeProcessRunTokenForOwner(ownerKey) === runToken;
  }

  /**
   * Begins one runtime process run for an owner key.
   *
   * @param {{ownerKey: string, processType?: string, commandFamily?: string, scriptPath?: string, cwd?: string, displayCommand?: string, reason?: string|null, metadata?: object|null}} metadata Runtime process metadata.
   * @returns {{ok: boolean, ownerKey: string, processId: string|null, runToken: number, startedAt: number}} Begin-run result.
   */
  function beginRun(metadata) {
    const ownerKey = String(metadata?.ownerKey || "").trim();
    const startedAt = Number(now());

    if (!ownerKey) {
      return {
        ok: false,
        ownerKey: "",
        processId: null,
        runToken: 0,
        startedAt,
      };
    }

    const runToken = selectRuntimeProcessRunTokenForOwner(ownerKey) + 1;
    const processId = createRuntimeProcessId(ownerKey, runToken);

    extensionStateStore.dispatch(actionCreators.setRuntimeProcessRunToken(ownerKey, runToken));
    extensionStateStore.dispatch(actionCreators.setStoppedRuntimeProcessRunToken(ownerKey, null));
    extensionStateStore.dispatch(actionCreators.setActiveRuntimeProcessId(ownerKey, processId));
    extensionStateStore.dispatch(actionCreators.setRuntimeProcessRunning(ownerKey, false));

    upsertProcessRecord({
      processId,
      ownerKey,
      processType: metadata?.processType || "unknown",
      commandFamily: metadata?.commandFamily || null,
      scriptPath: metadata?.scriptPath || null,
      cwd: metadata?.cwd || null,
      displayCommand: metadata?.displayCommand || null,
      status: "started",
      startedAt,
      endedAt: null,
      pid: null,
      exitCode: null,
      signal: null,
      errorMessage: null,
      reason: metadata?.reason || null,
      runToken,
      metadata: metadata?.metadata || null,
    });

    return {
      ok: true,
      ownerKey,
      processId,
      runToken,
      startedAt,
    };
  }

  /**
   * Attaches one spawned process handle to a tracked runtime process.
   *
   * @param {{ownerKey: string, processId: string, childProcess?: import("child_process").ChildProcess|null, handle?: {pid: number|null, isRunning: () => boolean, kill: (signal?: NodeJS.Signals|number) => {ok: boolean, reason: string|null}}|null}} input Attachment input.
   * @returns {boolean} True when attached.
   */
  function attachSpawnedProcess(input) {
    const ownerKey = String(input?.ownerKey || "").trim();
    const processId = String(input?.processId || "").trim();
    const processRecord = selectActiveRuntimeProcessForOwner(ownerKey);

    if (!ownerKey || !processId || processRecord?.processId !== processId) {
      return false;
    }

    runtimeByProcessId.set(processId, {
      childProcess: input?.childProcess || null,
      handle: input?.handle || null,
    });

    extensionStateStore.dispatch(actionCreators.setRuntimeProcessRunning(ownerKey, true));
    upsertProcessRecord({
      ...processRecord,
      status: "running",
      pid: Number.isInteger(input?.handle?.pid) ? input.handle.pid : null,
    });
    return true;
  }

  /**
   * Marks one tracked runtime process as failed.
   *
   * @param {{ownerKey: string, processId: string, runToken?: number, errorMessage?: string, reason?: string|null}} input Failure input.
   * @returns {boolean} True when applied.
   */
  function markFailed(input) {
    const ownerKey = String(input?.ownerKey || "").trim();
    const processId = String(input?.processId || "").trim();
    const processRecord = selectRuntimeProcessById(processId);

    if (!ownerKey || !processId || !processRecord || processRecord.ownerKey !== ownerKey) {
      return false;
    }

    if (Number.isInteger(input?.runToken) && !isCurrentRun(ownerKey, input.runToken)) {
      return false;
    }

    cleanupRuntime(processId);
    extensionStateStore.dispatch(actionCreators.setRuntimeProcessRunning(ownerKey, false));
    upsertProcessRecord({
      ...processRecord,
      status: "failed",
      endedAt: Number(now()),
      errorMessage: String(input?.errorMessage || ""),
      reason: input?.reason || processRecord.reason || null,
    });
    return true;
  }

  /**
   * Marks one tracked runtime process as completed.
   *
   * @param {{ownerKey: string, processId: string, runToken?: number, exitCode?: number|null, signal?: string|null, reason?: string|null}} input Completion input.
   * @returns {boolean} True when applied.
   */
  function markCompleted(input) {
    const ownerKey = String(input?.ownerKey || "").trim();
    const processId = String(input?.processId || "").trim();
    const processRecord = selectRuntimeProcessById(processId);

    if (!ownerKey || !processId || !processRecord || processRecord.ownerKey !== ownerKey) {
      return false;
    }

    if (Number.isInteger(input?.runToken) && !isCurrentRun(ownerKey, input.runToken)) {
      return false;
    }

    cleanupRuntime(processId);
    extensionStateStore.dispatch(actionCreators.setRuntimeProcessRunning(ownerKey, false));
    upsertProcessRecord({
      ...processRecord,
      status: "completed",
      endedAt: Number(now()),
      exitCode: typeof input?.exitCode === "number" ? input.exitCode : null,
      signal: input?.signal ? String(input.signal) : null,
      reason: input?.reason || processRecord.reason || null,
    });
    return true;
  }

  /**
   * Stops one active runtime process for an owner key.
   *
   * @param {string} ownerKey Runtime process owner key.
   * @param {{markStopped?: boolean, invalidateRunToken?: boolean, reason?: string|null}} [options] Stop options.
   * @returns {boolean} True when stopped.
   */
  function stopRun(ownerKey, options = {}) {
    const normalizedOwnerKey = String(ownerKey || "").trim();
    const processRecord = selectActiveRuntimeProcessForOwner(normalizedOwnerKey);

    if (!normalizedOwnerKey || !processRecord) {
      return false;
    }

    const activeRunToken = selectRuntimeProcessRunTokenForOwner(normalizedOwnerKey);
    const runtimeEntry = runtimeByProcessId.get(processRecord.processId);
    const markStopped = options.markStopped === true;
    const invalidateRunToken = options.invalidateRunToken !== false;

    if (markStopped) {
      extensionStateStore.dispatch(
        actionCreators.setStoppedRuntimeProcessRunToken(normalizedOwnerKey, activeRunToken)
      );
    } else {
      extensionStateStore.dispatch(
        actionCreators.setStoppedRuntimeProcessRunToken(normalizedOwnerKey, null)
      );
    }

    if (invalidateRunToken) {
      extensionStateStore.dispatch(
        actionCreators.setRuntimeProcessRunToken(normalizedOwnerKey, activeRunToken + 1)
      );
    }

    extensionStateStore.dispatch(actionCreators.setRuntimeProcessRunning(normalizedOwnerKey, false));
    upsertProcessRecord({
      ...processRecord,
      status: markStopped ? "stopped" : "completed",
      endedAt: Number(now()),
      reason: options.reason || processRecord.reason || null,
    });

    cleanupRuntime(processRecord.processId);

    try {
      if (runtimeEntry?.handle) {
        runtimeEntry.handle.kill();
      } else if (runtimeEntry?.childProcess && typeof runtimeEntry.childProcess.kill === "function") {
        runtimeEntry.childProcess.kill();
      }
    } catch (_) {
      // Ignore termination errors during replacement/disposal.
    }

    return true;
  }

  /**
   * Disposes owner-scoped runtime state.
   *
   * @param {string} ownerKey Runtime process owner key.
   * @returns {void}
   */
  function disposeOwner(ownerKey) {
    stopRun(ownerKey, {
      markStopped: false,
      invalidateRunToken: true,
      reason: "disposed",
    });
  }

  return {
    beginRun,
    attachSpawnedProcess,
    isCurrentRun,
    isStoppedRun,
    markFailed,
    markCompleted,
    stopRun,
    disposeOwner,
  };
}

module.exports = {
  createRuntimeProcessLifecycle,
};