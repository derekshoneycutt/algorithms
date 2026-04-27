import type {
  ConductorCancelRunInput,
  ConductorMarkCompletedInput,
  ConductorMarkFailedInput,
  ConductorMarkProgressInput,
  ConductorRunSnapshot,
  ConductorRunTargetRef,
  ConductorRunTargetStatusChange,
  ConductorStartRunInput,
  ConductorSubscription,
} from "../IConductor";

/**
 * Lifecycle operations used by run-file orchestration.
 */
export interface RunFileStatusLifecycle {
  markCancelled(
    target: ConductorRunTargetRef,
    message?: string | null,
    expectedRunId?: string
  ): void;
  markCompleted(
    target: ConductorRunTargetRef,
    message?: string | null,
    expectedRunId?: string
  ): void;
  markFailed(
    target: ConductorRunTargetRef,
    errorMessage: string,
    expectedRunId?: string
  ): void;
  markRunning(
    target: ConductorRunTargetRef,
    message?: string | null,
    expectedRunId?: string
  ): void;
  start(
    target: ConductorRunTargetRef,
    ownerKey: string,
    message?: string | null
  ): ConductorRunSnapshot;
}

/**
 * Run registry API for conductor composition.
 */
export interface IRunRegistry {
  buildRunLifecycle(): RunFileStatusLifecycle;
  clearRunResults(target: ConductorRunTargetRef): boolean;
  getRun(runId: string): ConductorRunSnapshot | null;
  getRunForTarget(target: ConductorRunTargetRef): ConductorRunSnapshot | null;
  markCompleted(input: ConductorMarkCompletedInput): ConductorRunSnapshot | null;
  markFailed(input: ConductorMarkFailedInput): ConductorRunSnapshot | null;
  markProgress(input: ConductorMarkProgressInput): ConductorRunSnapshot | null;
  cancelRun(input: ConductorCancelRunInput): ConductorRunSnapshot | null;
  startRun(input: ConductorStartRunInput): ConductorRunSnapshot;
  subscribeRunTargetStatus(
    listener: (change: ConductorRunTargetStatusChange) => void
  ): ConductorSubscription;
}

/**
 * Input required to create one run registry.
 */
export interface CreateRunRegistryInput {
  runStatusRetentionMs: number;
}

let nextRunSequence = 1;

/**
 * Builds one stable run-target key.
 *
 * @param {ConductorRunTargetRef} target Run target reference.
 * @returns {string} Stable target key.
 */
function buildRunTargetKey(target: ConductorRunTargetRef): string {
  return `${target.nodeKind}:${target.filePath}`;
}

/**
 * Creates one bootstrap run snapshot.
 *
 * @param {ConductorStartRunInput} input Start input.
 * @returns {ConductorRunSnapshot} Initial run snapshot.
 */
function createBootstrapRunSnapshot(
  input: ConductorStartRunInput
): ConductorRunSnapshot {
  const now = Date.now();
  const runId = `conductor:${input.ownerKey}:${nextRunSequence}`;
  nextRunSequence += 1;

  return {
    runId,
    ownerKey: input.ownerKey,
    status: "starting",
    startedAt: now,
    updatedAt: now,
    message: input.reason ?? null,
    progressPercent: null,
    stepKey: null,
    errorMessage: null,
  };
}

/**
 * Returns true when one run target still points to one expected run id.
 *
 * @param {ConductorRunSnapshot | undefined} snapshot Current target snapshot.
 * @param {string | undefined} expectedRunId Expected run id.
 * @returns {boolean} True when update should be applied.
 */
function matchesExpectedRunId(
  snapshot: ConductorRunSnapshot | undefined,
  expectedRunId: string | undefined
): boolean {
  if (snapshot === undefined) {
    return false;
  }

  if (expectedRunId === undefined) {
    return true;
  }

  return snapshot.runId === expectedRunId;
}

/**
 * Creates one run registry instance.
 *
 * @param {CreateRunRegistryInput} input Registry creation input.
 * @returns {IRunRegistry} Run registry implementation.
 */
export function createRunRegistry(input: CreateRunRegistryInput): IRunRegistry {
  const runTargetByRunId = new Map<string, string>();
  const runSnapshotsById = new Map<string, ConductorRunSnapshot>();
  const runSnapshotsByTarget = new Map<string, ConductorRunSnapshot>();
  const runStatusClearTimersByTarget = new Map<string, NodeJS.Timeout>();
  const runTargetListeners = new Set<
    (change: ConductorRunTargetStatusChange) => void
  >();

  /**
   * Clears one scheduled run-status timer for one target key.
   *
   * @param {string} targetKey Stable target key.
   * @returns {void}
   */
  function clearRunStatusTimer(targetKey: string): void {
    const existingTimer = runStatusClearTimersByTarget.get(targetKey);
    if (existingTimer === undefined) {
      return;
    }

    clearTimeout(existingTimer);
    runStatusClearTimersByTarget.delete(targetKey);
  }

  /**
   * Emits one target-status change event to subscribers.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {ConductorRunSnapshot} snapshot Updated snapshot.
   * @returns {void}
   */
  function publishRunTargetStatusChange(
    target: ConductorRunTargetRef,
    snapshot: ConductorRunSnapshot
  ): void {
    const change: ConductorRunTargetStatusChange = {
      target,
      snapshot,
    };

    for (const listener of runTargetListeners) {
      listener(change);
    }
  }

  /**
   * Stores one run snapshot by run id and target.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {ConductorRunSnapshot} snapshot Snapshot to store.
   * @returns {ConductorRunSnapshot} Stored snapshot.
   */
  function storeRunSnapshotForTarget(
    target: ConductorRunTargetRef,
    snapshot: ConductorRunSnapshot
  ): ConductorRunSnapshot {
    const targetKey = buildRunTargetKey(target);
    runSnapshotsById.set(snapshot.runId, snapshot);
    runTargetByRunId.set(snapshot.runId, targetKey);
    runSnapshotsByTarget.set(targetKey, snapshot);
    publishRunTargetStatusChange(target, snapshot);

    if (input.runStatusRetentionMs > 0) {
      clearRunStatusTimer(targetKey);

      const retainedRunId = snapshot.runId;
      const timeoutHandle = setTimeout(() => {
        runStatusClearTimersByTarget.delete(targetKey);

        const latestSnapshot = runSnapshotsByTarget.get(targetKey);
        if (latestSnapshot === undefined || latestSnapshot.runId !== retainedRunId) {
          return;
        }

        runSnapshotsByTarget.delete(targetKey);
        runTargetByRunId.delete(retainedRunId);
        publishRunTargetStatusChange(target, latestSnapshot);
      }, input.runStatusRetentionMs);

      runStatusClearTimersByTarget.set(targetKey, timeoutHandle);
    }

    return snapshot;
  }

  /**
   * Resolves the run target for one run identifier.
   *
   * @param {string} runId Run identifier.
   * @returns {ConductorRunTargetRef | null} Target reference or null.
   */
  function getRunTargetForRunId(runId: string): ConductorRunTargetRef | null {
    const targetKey = runTargetByRunId.get(runId);
    if (targetKey === undefined) {
      return null;
    }

    const separatorIndex = targetKey.indexOf(":");
    if (separatorIndex < 0) {
      return null;
    }

    const nodeKind = targetKey.slice(0, separatorIndex);
    const filePath = targetKey.slice(separatorIndex + 1);
    if (
      nodeKind !== "file"
      && nodeKind !== "mainFile"
      && nodeKind !== "languageSummary"
      && nodeKind !== "algorithmDir"
    ) {
      return null;
    }

    return {
      nodeKind,
      filePath,
    };
  }

  /**
   * Starts one run snapshot for one target.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string} ownerKey Run owner key.
   * @param {string | null} message Snapshot message.
   * @returns {ConductorRunSnapshot} Started snapshot.
   */
  function startRunForTarget(
    target: ConductorRunTargetRef,
    ownerKey: string,
    message: string | null
  ): ConductorRunSnapshot {
    const started = createBootstrapRunSnapshot({
      ownerKey,
      reason: message,
    });
    return storeRunSnapshotForTarget(target, started);
  }

  /**
   * Marks one target run as running.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string | null} message Optional status message.
   * @param {string | undefined} expectedRunId Optional stale-update guard.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null.
   */
  function markTargetRunRunning(
    target: ConductorRunTargetRef,
    message: string | null,
    expectedRunId?: string
  ): ConductorRunSnapshot | null {
    const targetKey = buildRunTargetKey(target);
    const snapshot = runSnapshotsByTarget.get(targetKey);
    if (snapshot === undefined) {
      return null;
    }

    if (expectedRunId !== undefined && snapshot.runId !== expectedRunId) {
      return null;
    }

    const updated: ConductorRunSnapshot = {
      ...snapshot,
      status: "running",
      message,
      updatedAt: Date.now(),
    };
    return storeRunSnapshotForTarget(target, updated);
  }

  /**
   * Marks one target run as failed.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string} errorMessage Failure message.
   * @param {string | undefined} expectedRunId Optional stale-update guard.
   * @returns {ConductorRunSnapshot} Updated snapshot.
   */
  function markTargetRunFailed(
    target: ConductorRunTargetRef,
    errorMessage: string,
    expectedRunId?: string
  ): ConductorRunSnapshot {
    const targetKey = buildRunTargetKey(target);
    const existing = runSnapshotsByTarget.get(targetKey);
    if (existing !== undefined && !matchesExpectedRunId(existing, expectedRunId)) {
      return existing;
    }

    const baseSnapshot = existing ?? createBootstrapRunSnapshot({
      ownerKey: `failed:${target.filePath}`,
      reason: null,
    });

    const updated: ConductorRunSnapshot = {
      ...baseSnapshot,
      status: "failed",
      errorMessage,
      message: errorMessage,
      updatedAt: Date.now(),
    };

    return storeRunSnapshotForTarget(target, updated);
  }

  /**
   * Marks one target run as completed.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string | null} message Completion message.
   * @param {string | undefined} expectedRunId Optional stale-update guard.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null.
   */
  function markTargetRunCompleted(
    target: ConductorRunTargetRef,
    message: string | null,
    expectedRunId?: string
  ): ConductorRunSnapshot | null {
    const targetKey = buildRunTargetKey(target);
    const snapshot = runSnapshotsByTarget.get(targetKey);
    if (snapshot === undefined) {
      return null;
    }

    if (expectedRunId !== undefined && snapshot.runId !== expectedRunId) {
      return null;
    }

    const updated: ConductorRunSnapshot = {
      ...snapshot,
      status: "completed",
      errorMessage: null,
      message,
      updatedAt: Date.now(),
    };

    return storeRunSnapshotForTarget(target, updated);
  }

  /**
   * Marks one target run as cancelled.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string | null} message Cancellation message.
   * @param {string | undefined} expectedRunId Optional stale-update guard.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null.
   */
  function markTargetRunCancelled(
    target: ConductorRunTargetRef,
    message: string | null,
    expectedRunId?: string
  ): ConductorRunSnapshot | null {
    const targetKey = buildRunTargetKey(target);
    const snapshot = runSnapshotsByTarget.get(targetKey);
    if (snapshot === undefined) {
      return null;
    }

    if (expectedRunId !== undefined && snapshot.runId !== expectedRunId) {
      return null;
    }

    const updated: ConductorRunSnapshot = {
      ...snapshot,
      status: "cancelled",
      errorMessage: null,
      message,
      updatedAt: Date.now(),
    };

    return storeRunSnapshotForTarget(target, updated);
  }

  return {
    buildRunLifecycle(): RunFileStatusLifecycle {
      return {
        start(target, ownerKey, message): ConductorRunSnapshot {
          return startRunForTarget(target, ownerKey, message ?? null);
        },
        markCancelled(target, message, expectedRunId): void {
          markTargetRunCancelled(target, message ?? null, expectedRunId);
        },
        markRunning(target, message, expectedRunId): void {
          markTargetRunRunning(target, message ?? null, expectedRunId);
        },
        markCompleted(target, message, expectedRunId): void {
          markTargetRunCompleted(target, message ?? null, expectedRunId);
        },
        markFailed(target, errorMessage, expectedRunId): void {
          markTargetRunFailed(target, errorMessage, expectedRunId);
        },
      };
    },

    clearRunResults(target: ConductorRunTargetRef): boolean {
      const targetKey = buildRunTargetKey(target);
      const snapshot = runSnapshotsByTarget.get(targetKey);
      if (snapshot === undefined) {
        return false;
      }

      if (snapshot.status === "starting" || snapshot.status === "running") {
        return false;
      }

      clearRunStatusTimer(targetKey);
      runSnapshotsByTarget.delete(targetKey);
      runTargetByRunId.delete(snapshot.runId);
      publishRunTargetStatusChange(target, snapshot);
      return true;
    },

    getRunForTarget(target: ConductorRunTargetRef): ConductorRunSnapshot | null {
      const targetKey = buildRunTargetKey(target);
      const snapshot = runSnapshotsByTarget.get(targetKey);
      return snapshot ?? null;
    },

    subscribeRunTargetStatus(
      listener: (change: ConductorRunTargetStatusChange) => void
    ): ConductorSubscription {
      runTargetListeners.add(listener);
      return {
        dispose(): void {
          runTargetListeners.delete(listener);
        },
      };
    },

    startRun(inputStart: ConductorStartRunInput): ConductorRunSnapshot {
      const snapshot = createBootstrapRunSnapshot(inputStart);
      runSnapshotsById.set(snapshot.runId, snapshot);
      return snapshot;
    },

    markProgress(inputProgress: ConductorMarkProgressInput): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(inputProgress.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "running",
        message: inputProgress.message ?? snapshot.message,
        progressPercent: inputProgress.progressPercent ?? snapshot.progressPercent,
        stepKey: inputProgress.stepKey ?? snapshot.stepKey,
        updatedAt: Date.now(),
      };
      runSnapshotsById.set(updated.runId, updated);

      const target = getRunTargetForRunId(updated.runId);
      if (target !== null) {
        storeRunSnapshotForTarget(target, updated);
      }

      return updated;
    },

    markCompleted(inputComplete: ConductorMarkCompletedInput): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(inputComplete.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "completed",
        message: inputComplete.message ?? snapshot.message,
        errorMessage: null,
        updatedAt: Date.now(),
      };
      runSnapshotsById.set(updated.runId, updated);

      const target = getRunTargetForRunId(updated.runId);
      if (target !== null) {
        storeRunSnapshotForTarget(target, updated);
      }

      return updated;
    },

    markFailed(inputFail: ConductorMarkFailedInput): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(inputFail.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "failed",
        errorMessage: inputFail.errorMessage,
        message: inputFail.message ?? inputFail.errorMessage,
        updatedAt: Date.now(),
      };
      runSnapshotsById.set(updated.runId, updated);

      const target = getRunTargetForRunId(updated.runId);
      if (target !== null) {
        storeRunSnapshotForTarget(target, updated);
      }

      return updated;
    },

    cancelRun(inputCancel: ConductorCancelRunInput): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(inputCancel.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "cancelled",
        message: inputCancel.message ?? snapshot.message,
        updatedAt: Date.now(),
      };
      runSnapshotsById.set(updated.runId, updated);

      const target = getRunTargetForRunId(updated.runId);
      if (target !== null) {
        storeRunSnapshotForTarget(target, updated);
      }

      return updated;
    },

    getRun(runId: string): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(runId);
      return snapshot ?? null;
    },
  };
}
