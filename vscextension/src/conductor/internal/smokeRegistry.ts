import type {
  ConductorClearSmokeResultsInput,
  ConductorRunTargetRef,
  ConductorStopSmokeTestInput,
} from "../IConductor";
import type {
  CommandLineResult,
  ICommandLineProcessHandle,
} from "../../commandline";
import type { IStateMachine } from "../../state";

/**
 * One active smoke execution tracked for stop support.
 */
export interface ActiveSmokeExecution {
  algorithmPath: string;
  handle: ICommandLineProcessHandle;
  result: Promise<CommandLineResult>;
  runId: string;
  stopRequested: boolean;
  target: ConductorRunTargetRef;
}

/**
 * Deferred smoke status retention operations.
 */
export interface SmokeStatusRetentionLifecycle {
  clearNow(
    algorithmPath: string,
    hostState: IStateMachine,
    refreshAlgorithmsTree: () => void
  ): boolean;
  markStarted(algorithmPath: string, runId: string): void;
  markFinished(
    algorithmPath: string,
    runId: string,
    hostState: IStateMachine,
    refreshAlgorithmsTree: () => void
  ): void;
}

/**
 * Smoke registry API for conductor composition.
 */
export interface ISmokeRegistry {
  clearSmokeResults(input: ConductorClearSmokeResultsInput): boolean;
  getActiveSmokeExecutionByAlgorithm(): Map<string, ActiveSmokeExecution>;
  getSmokeStatusRetentionLifecycle(): SmokeStatusRetentionLifecycle;
  stopSmokeTest(input: ConductorStopSmokeTestInput): Promise<boolean>;
}

/**
 * Input required to create one smoke registry.
 */
export interface CreateSmokeRegistryInput {
  smokeStatusRetentionMs: number;
}

/**
 * Creates one smoke registry instance.
 *
 * @param {CreateSmokeRegistryInput} input Registry creation input.
 * @returns {ISmokeRegistry} Smoke registry implementation.
 */
export function createSmokeRegistry(input: CreateSmokeRegistryInput): ISmokeRegistry {
  const smokeStatusClearTimersByAlgorithm = new Map<string, NodeJS.Timeout>();
  const latestSmokeRunIdByAlgorithm = new Map<string, string>();
  const activeSmokeExecutionByAlgorithm = new Map<string, ActiveSmokeExecution>();

  const smokeStatusRetentionLifecycle: SmokeStatusRetentionLifecycle = {
    clearNow(
      algorithmPath,
      hostState,
      refreshAlgorithmsTree
    ): boolean {
      const existingTimer = smokeStatusClearTimersByAlgorithm.get(algorithmPath);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
        smokeStatusClearTimersByAlgorithm.delete(algorithmPath);
      }

      const runId = latestSmokeRunIdByAlgorithm.get(algorithmPath);
      if (runId === undefined) {
        return false;
      }

      latestSmokeRunIdByAlgorithm.delete(algorithmPath);
      hostState.send({
        type: "SMOKE_RUN_STATUS_CLEARED",
        algorithmPath,
        runId,
      });
      refreshAlgorithmsTree();
      return true;
    },

    markStarted(algorithmPath, runId): void {
      latestSmokeRunIdByAlgorithm.set(algorithmPath, runId);

      const existingTimer = smokeStatusClearTimersByAlgorithm.get(algorithmPath);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
        smokeStatusClearTimersByAlgorithm.delete(algorithmPath);
      }
    },

    markFinished(
      algorithmPath,
      runId,
      hostState,
      refreshAlgorithmsTree
    ): void {
      if (input.smokeStatusRetentionMs <= 0) {
        hostState.send({
          type: "SMOKE_RUN_STATUS_CLEARED",
          algorithmPath,
          runId,
        });
        refreshAlgorithmsTree();
        return;
      }

      const existingTimer = smokeStatusClearTimersByAlgorithm.get(algorithmPath);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
      }

      const timeoutHandle = setTimeout(() => {
        smokeStatusClearTimersByAlgorithm.delete(algorithmPath);

        const latestRunId = latestSmokeRunIdByAlgorithm.get(algorithmPath);
        if (latestRunId !== runId) {
          return;
        }

        latestSmokeRunIdByAlgorithm.delete(algorithmPath);
        hostState.send({
          type: "SMOKE_RUN_STATUS_CLEARED",
          algorithmPath,
          runId,
        });
        refreshAlgorithmsTree();
      }, input.smokeStatusRetentionMs);

      smokeStatusClearTimersByAlgorithm.set(algorithmPath, timeoutHandle);
    },
  };

  return {
    clearSmokeResults(inputClear: ConductorClearSmokeResultsInput): boolean {
      if (activeSmokeExecutionByAlgorithm.has(inputClear.algorithmPath)) {
        return false;
      }

      return smokeStatusRetentionLifecycle.clearNow(
        inputClear.algorithmPath,
        inputClear.hostState,
        inputClear.refreshAlgorithmsTree
      );
    },

    getActiveSmokeExecutionByAlgorithm(): Map<string, ActiveSmokeExecution> {
      return activeSmokeExecutionByAlgorithm;
    },

    getSmokeStatusRetentionLifecycle(): SmokeStatusRetentionLifecycle {
      return smokeStatusRetentionLifecycle;
    },

    async stopSmokeTest(inputStop: ConductorStopSmokeTestInput): Promise<boolean> {
      const activeSmokeExecution = activeSmokeExecutionByAlgorithm.get(inputStop.algorithmPath);
      if (activeSmokeExecution === undefined) {
        return false;
      }

      activeSmokeExecution.stopRequested = true;
      const killResult = activeSmokeExecution.handle.kill("SIGTERM");
      if (!killResult.ok && killResult.reason !== "not-running") {
        return false;
      }

      await activeSmokeExecution.result;
      return true;
    },
  };
}
