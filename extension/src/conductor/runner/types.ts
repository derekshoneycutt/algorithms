import type {
  ConductorCancelRunInput,
  ConductorClearSmokeResultsInput,
  ConductorMarkCompletedInput,
  ConductorMarkFailedInput,
  ConductorMarkProgressInput,
  ConductorRunFileInput,
  ConductorRunSnapshot,
  ConductorRunTargetRef,
  ConductorRunTargetStatusChange,
  ConductorStartRunInput,
  ConductorStopSmokeTestInput,
  ConductorSubscription,
} from "../IConductor";
import type {
  CommandLineResult,
  IAlgorithmsTerminalRunAdapter,
  ICommandLine,
  ICommandLineProcessHandle,
} from "../../commandline";
import type { IRootPathResolver } from "../../algorithms";
import type { IStateMachine } from "../../state";

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
}

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
 * Dependencies injected into run-file orchestration from the conductor factory.
 */
export interface RunFileOrchestrationDependencies {
  runAdapter: IAlgorithmsTerminalRunAdapter | undefined;
  commandLine: ICommandLine | undefined;
  runLifecycle: RunFileStatusLifecycle;
  smokeStatusRetentionLifecycle: SmokeStatusRetentionLifecycle;
  activeSmokeExecutionByAlgorithm: Map<string, ActiveSmokeExecution>;
  rootPathResolver: IRootPathResolver | undefined;
}

/**
 * Runtime input used by run-file orchestration.
 */
export type RunFileOrchestrationInput = ConductorRunFileInput;