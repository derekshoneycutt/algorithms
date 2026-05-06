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
import type {
  CreateRunRegistryInput,
  IRunRegistry,
  RunFileStatusLifecycle,
} from "./types";

/**
 * Manages run snapshot storage and listener notifications.
 */
class RunSnapshotStore {
  private readonly runTargetByRunId = new Map<string, string>();
  private readonly runSnapshotsById = new Map<string, ConductorRunSnapshot>();
  private readonly runSnapshotsByTarget = new Map<string, ConductorRunSnapshot>();
  private readonly runTargetListeners = new Set<
    (change: ConductorRunTargetStatusChange) => void
  >();
  private nextSequence = 1;

  /**
   * Returns the next sequence number and advances the counter.
   *
   * @returns {number} Next sequence number for run id generation.
   */
  nextSequenceNumber(): number {
    const seq = this.nextSequence;
    this.nextSequence += 1;
    return seq;
  }

  /**
   * Gets snapshot by run id.
   */
  getById(runId: string): ConductorRunSnapshot | undefined {
    return this.runSnapshotsById.get(runId);
  }

  /**
   * Gets snapshot by target.
   */
  getByTarget(targetKey: string): ConductorRunSnapshot | undefined {
    return this.runSnapshotsByTarget.get(targetKey);
  }

  /**
   * Resolves run target from run id.
   */
  getRunTargetForRunId(runId: string): ConductorRunTargetRef | null {
    const targetKey = this.runTargetByRunId.get(runId);
    if (targetKey === undefined) {
      return null;
    }

    const separatorIndex = targetKey.indexOf(":");
    if (separatorIndex < 0) {
      return null;
    }

    const nodeKind = targetKey.slice(0, separatorIndex);
    const filePath = targetKey.slice(separatorIndex + 1);
    if (!isValidNodeKind(nodeKind)) {
      return null;
    }

    return { nodeKind, filePath };
  }

  /**
   * Stores snapshot by id and target, publishes change.
   */
  store(
    target: ConductorRunTargetRef,
    snapshot: ConductorRunSnapshot
  ): void {
    const targetKey = buildRunTargetKey(target);
    this.runSnapshotsById.set(snapshot.runId, snapshot);
    this.runTargetByRunId.set(snapshot.runId, targetKey);
    this.runSnapshotsByTarget.set(targetKey, snapshot);
    this.publish(target, snapshot);
  }

  /**
   * Deletes target snapshot and its run id mapping.
   */
  deleteTarget(targetKey: string, runId: string): void {
    this.runSnapshotsByTarget.delete(targetKey);
    this.runTargetByRunId.delete(runId);
  }

  /**
   * Subscribes to run target status changes.
   */
  subscribe(
    listener: (change: ConductorRunTargetStatusChange) => void
  ): () => void {
    this.runTargetListeners.add(listener);
    return () => {
      this.runTargetListeners.delete(listener);
    };
  }

  /**
   * Publishes change to all listeners.
   */
  publish(target: ConductorRunTargetRef, snapshot: ConductorRunSnapshot): void {
    const change: ConductorRunTargetStatusChange = { target, snapshot };
    for (const listener of this.runTargetListeners) {
      listener(change);
    }
  }
}

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
 * Resolves equivalent run-target refs that may map to the same visible row.
 *
 * @param {ConductorRunTargetRef} target Requested target.
 * @returns {ConductorRunTargetRef[]} Equivalent targets in lookup order.
 */
function getEquivalentRunTargets(target: ConductorRunTargetRef): ConductorRunTargetRef[] {
  if (target.nodeKind === "algorithmDir") {
    return [target];
  }

  const orderedKinds: ConductorRunTargetRef["nodeKind"][] = [
    target.nodeKind,
    "mainFile",
    "languageSummary",
    "file",
  ];

  const seenKinds = new Set<ConductorRunTargetRef["nodeKind"]>();
  const resolvedTargets: ConductorRunTargetRef[] = [];
  for (const nodeKind of orderedKinds) {
    if (seenKinds.has(nodeKind)) {
      continue;
    }

    seenKinds.add(nodeKind);
    resolvedTargets.push({
      nodeKind,
      filePath: target.filePath,
    });
  }

  return resolvedTargets;
}

/**
 * Validates whether a value is a valid node kind.
 *
 * @param {string} value Value to validate.
 * @returns {value is ConductorRunTargetRef["nodeKind"]} True if value is valid node kind.
 */
function isValidNodeKind(
  value: string
): value is ConductorRunTargetRef["nodeKind"] {
  return (
    value === "file"
    || value === "mainFile"
    || value === "languageSummary"
    || value === "algorithmDir"
  );
}

/**
 * Creates one bootstrap run snapshot.
 *
 * @param {ConductorStartRunInput} input Start input.
 * @param {number} sequence Sequence number for this run.
 * @returns {ConductorRunSnapshot} Initial run snapshot.
 */
function createBootstrapRunSnapshot(
  input: ConductorStartRunInput,
  sequence: number
): ConductorRunSnapshot {
  const now = Date.now();
  const runId = `conductor:${input.ownerKey}:${sequence}`;

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
  const store = new RunSnapshotStore();

  return {
    buildRunLifecycle(): RunFileStatusLifecycle {
      return {
        start(target, ownerKey, message): ConductorRunSnapshot {
          const snapshot = createBootstrapRunSnapshot({
            target,
            ownerKey,
            reason: message ?? null,
          }, store.nextSequenceNumber());
          store.store(target, snapshot);
          return snapshot;
        },
        markCancelled(target, message, expectedRunId): void {
          const snapshot = store.getByTarget(buildRunTargetKey(target));
          if (snapshot === undefined || !matchesExpectedRunId(snapshot, expectedRunId)) {
            return;
          }

          const updated = {
            ...snapshot,
            status: "cancelled" as const,
            message: message ?? snapshot.message,
            updatedAt: Date.now(),
          };
          store.store(target, updated);
        },
        markRunning(target, message, expectedRunId): void {
          const snapshot = store.getByTarget(buildRunTargetKey(target));
          if (snapshot === undefined || !matchesExpectedRunId(snapshot, expectedRunId)) {
            return;
          }

          const updated = {
            ...snapshot,
            status: "running" as const,
            message: message ?? snapshot.message,
            updatedAt: Date.now(),
          };
          store.store(target, updated);
        },
        markCompleted(target, message, expectedRunId): void {
          const snapshot = store.getByTarget(buildRunTargetKey(target));
          if (snapshot === undefined || !matchesExpectedRunId(snapshot, expectedRunId)) {
            return;
          }

          const updated = {
            ...snapshot,
            status: "completed" as const,
            errorMessage: null,
            message: message ?? snapshot.message,
            updatedAt: Date.now(),
          };
          store.store(target, updated);
        },
        markFailed(target, errorMessage, expectedRunId): void {
          const targetKey = buildRunTargetKey(target);
          const existing = store.getByTarget(targetKey);
          if (existing !== undefined && !matchesExpectedRunId(existing, expectedRunId)) {
            return;
          }

          const baseSnapshot = existing ?? createBootstrapRunSnapshot({
            target,
            ownerKey: `failed:${target.filePath}`,
            reason: null,
          }, store.nextSequenceNumber());

          const updated = {
            ...baseSnapshot,
            status: "failed" as const,
            errorMessage,
            message: errorMessage,
            updatedAt: Date.now(),
          };
          store.store(target, updated);
        },
      };
    },

    clearRunResults(target: ConductorRunTargetRef): boolean {
      let clearedAny = false;
      const equivalentTargets = getEquivalentRunTargets(target);
      for (const equivalentTarget of equivalentTargets) {
        const targetKey = buildRunTargetKey(equivalentTarget);
        const snapshot = store.getByTarget(targetKey);
        if (snapshot === undefined) {
          continue;
        }

        if (snapshot.status === "starting" || snapshot.status === "running") {
          continue;
        }

        store.deleteTarget(targetKey, snapshot.runId);
        store.publish(equivalentTarget, snapshot);
        clearedAny = true;
      }

      return clearedAny;
    },

    getRunForTarget(target: ConductorRunTargetRef): ConductorRunSnapshot | null {
      const targetKey = buildRunTargetKey(target);
      return store.getByTarget(targetKey) ?? null;
    },

    subscribeRunTargetStatus(
      listener: (change: ConductorRunTargetStatusChange) => void
    ): ConductorSubscription {
      const unsubscribe = store.subscribe(listener);
      return {
        dispose(): void {
          unsubscribe();
        },
      };
    },

    startRun(inputStart: ConductorStartRunInput): ConductorRunSnapshot {
      const snapshot = createBootstrapRunSnapshot(inputStart, store.nextSequenceNumber());
      store.store(inputStart.target, snapshot);
      return snapshot;
    },

    markProgress(inputProgress: ConductorMarkProgressInput): ConductorRunSnapshot | null {
      const snapshot = store.getById(inputProgress.runId);
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
      store.getById(updated.runId);
      const target = store.getRunTargetForRunId(updated.runId);
      if (target !== null) {
        store.store(target, updated);
      }
      return updated;
    },

    markCompleted(inputComplete: ConductorMarkCompletedInput): ConductorRunSnapshot | null {
      const snapshot = store.getById(inputComplete.runId);
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

      const target = store.getRunTargetForRunId(updated.runId);
      if (target !== null) {
        store.store(target, updated);
      }

      return updated;
    },

    markFailed(inputFail: ConductorMarkFailedInput): ConductorRunSnapshot | null {
      const snapshot = store.getById(inputFail.runId);
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

      const target = store.getRunTargetForRunId(updated.runId);
      if (target !== null) {
        store.store(target, updated);
      }

      return updated;
    },

    cancelRun(inputCancel: ConductorCancelRunInput): ConductorRunSnapshot | null {
      const snapshot = store.getById(inputCancel.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "cancelled",
        message: inputCancel.message ?? snapshot.message,
        updatedAt: Date.now(),
      };

      const target = store.getRunTargetForRunId(updated.runId);
      if (target !== null) {
        store.store(target, updated);
      }

      return updated;
    },

    getRun(runId: string): ConductorRunSnapshot | null {
      return store.getById(runId) ?? null;
    },
  };
}
