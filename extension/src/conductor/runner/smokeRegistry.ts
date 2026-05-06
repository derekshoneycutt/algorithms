import type {
  ConductorClearSmokeResultsInput,
  ConductorStopSmokeTestInput,
} from "../IConductor";
import type { IStateMachine } from "../../state";
import type {
  ActiveSmokeExecution,
  CreateSmokeRegistryInput,
  ISmokeRegistry,
  SmokeStatusRetentionLifecycle,
} from "./types";

/**
 * Creates one smoke registry instance.
 *
 * @param {CreateSmokeRegistryInput} input Registry creation input.
 * @returns {ISmokeRegistry} Smoke registry implementation.
 */
export function createSmokeRegistry(input: CreateSmokeRegistryInput): ISmokeRegistry {
  const retentionTimersByAlgorithmPath = new Map<string, NodeJS.Timeout>();
  const latestRunIdByAlgorithmPath = new Map<string, string>();
  const activeExecutionsByAlgorithmPath = new Map<string, ActiveSmokeExecution>();

  /**
   * Cancels and removes any pending clear timer for one algorithm path.
   *
   * @param {string} algorithmPath Algorithm path owning the timer.
   * @returns {void}
   */
  function cancelRetentionTimer(algorithmPath: string): void {
    const existingTimer = retentionTimersByAlgorithmPath.get(algorithmPath);
    if (existingTimer === undefined) {
      return;
    }

    clearTimeout(existingTimer);
    retentionTimersByAlgorithmPath.delete(algorithmPath);
  }

  /**
   * Emits one retained smoke-status clear event for one algorithm path.
   *
   * @param {string} algorithmPath Algorithm path to clear.
   * @param {string} runId Run id whose retained status is being cleared.
   * @param {IStateMachine} hostState Host state machine.
   * @param {() => void} refreshAlgorithmsTree Refresh callback for the tree view.
   * @returns {void}
   */
  function emitRetainedSmokeStatusCleared(
    algorithmPath: string,
    runId: string,
    hostState: IStateMachine,
    refreshAlgorithmsTree: () => void
  ): void {
    latestRunIdByAlgorithmPath.delete(algorithmPath);
    hostState.send({
      type: "SMOKE_RUN_STATUS_CLEARED",
      algorithmPath,
      runId,
    });
    refreshAlgorithmsTree();
  }

  /**
   * Returns the tracked run id for one algorithm path after cancelling retention.
   *
   * @param {string} algorithmPath Algorithm path to inspect.
   * @returns {string | null} Tracked run id when present.
   */
  function getTrackedRunIdAfterCancellingRetention(
    algorithmPath: string
  ): string | null {
    cancelRetentionTimer(algorithmPath);

    const runId = latestRunIdByAlgorithmPath.get(algorithmPath);
    if (runId === undefined) {
      return null;
    }

    return runId;
  }

  /**
   * Schedules retained smoke status clearing for one completed run.
   *
   * @param {string} algorithmPath Algorithm path to clear later.
   * @param {string} runId Completed run id.
   * @param {IStateMachine} hostState Host state machine.
   * @param {() => void} refreshAlgorithmsTree Refresh callback for the tree view.
   * @returns {void}
   */
  function scheduleRetentionClear(
    algorithmPath: string,
    runId: string,
    hostState: IStateMachine,
    refreshAlgorithmsTree: () => void
  ): void {
    cancelRetentionTimer(algorithmPath);

    const timeoutHandle = setTimeout(() => {
      retentionTimersByAlgorithmPath.delete(algorithmPath);

      const latestRunId = latestRunIdByAlgorithmPath.get(algorithmPath);
      if (latestRunId !== runId) {
        return;
      }

      emitRetainedSmokeStatusCleared(
        algorithmPath,
        runId,
        hostState,
        refreshAlgorithmsTree
      );
    }, input.smokeStatusRetentionMs);

    retentionTimersByAlgorithmPath.set(algorithmPath, timeoutHandle);
  }

  /**
   * Returns one active smoke execution for an algorithm path when present.
   *
   * @param {string} algorithmPath Algorithm path to inspect.
   * @returns {ActiveSmokeExecution | null} Active execution when present.
   */
  function getActiveExecution(algorithmPath: string): ActiveSmokeExecution | null {
    return activeExecutionsByAlgorithmPath.get(algorithmPath) ?? null;
  }

  const smokeStatusRetentionLifecycle: SmokeStatusRetentionLifecycle = {
    clearNow(
      algorithmPath,
      hostState,
      refreshAlgorithmsTree
    ): boolean {
      const runId = getTrackedRunIdAfterCancellingRetention(algorithmPath);
      if (runId === null) {
        return false;
      }

      emitRetainedSmokeStatusCleared(
        algorithmPath,
        runId,
        hostState,
        refreshAlgorithmsTree
      );
      return true;
    },

    markStarted(algorithmPath, runId): void {
      latestRunIdByAlgorithmPath.set(algorithmPath, runId);
      cancelRetentionTimer(algorithmPath);
    },

    markFinished(
      algorithmPath,
      runId,
      hostState,
      refreshAlgorithmsTree
    ): void {
      if (input.smokeStatusRetentionMs <= 0) {
        emitRetainedSmokeStatusCleared(
          algorithmPath,
          runId,
          hostState,
          refreshAlgorithmsTree
        );
        return;
      }

      scheduleRetentionClear(
        algorithmPath,
        runId,
        hostState,
        refreshAlgorithmsTree
      );
    },
  };

  return {
    clearSmokeResults(inputClear: ConductorClearSmokeResultsInput): boolean {
      if (getActiveExecution(inputClear.algorithmPath) !== null) {
        return false;
      }

      return smokeStatusRetentionLifecycle.clearNow(
        inputClear.algorithmPath,
        inputClear.hostState,
        inputClear.refreshAlgorithmsTree
      );
    },

    getActiveSmokeExecutionByAlgorithm(): Map<string, ActiveSmokeExecution> {
      return activeExecutionsByAlgorithmPath;
    },

    getSmokeStatusRetentionLifecycle(): SmokeStatusRetentionLifecycle {
      return smokeStatusRetentionLifecycle;
    },

    async stopSmokeTest(inputStop: ConductorStopSmokeTestInput): Promise<boolean> {
      const activeSmokeExecution = getActiveExecution(inputStop.algorithmPath);
      if (activeSmokeExecution === null) {
        return false;
      }

      activeSmokeExecution.stopRequested = true;
      const terminateResult = activeSmokeExecution.handle.kill("SIGTERM");
      if (!terminateResult.ok && terminateResult.reason !== "not-running") {
        return false;
      }

      if (activeSmokeExecution.handle.isRunning()) {
        setTimeout(() => {
          if (activeSmokeExecution.handle.isRunning()) {
            activeSmokeExecution.handle.kill("SIGKILL");
          }
        }, 500);
      }

      return true;
    },
  };
}
