import type {
  ConductorCancelRunInput,
  ConductorClearRunResultsInput,
  ConductorClearSmokeResultsInput,
  ConductorMarkCompletedInput,
  ConductorMarkFailedInput,
  ConductorMarkProgressInput,
  ConductorNotificationEffect,
  ConductorRunControlsIntent,
  ConductorRunControlsReaction,
  ConductorRunFileInput,
  ConductorRunTargetRef,
  ConductorRunTargetStatusChange,
  ConductorSmokeReaction,
  ConductorRunSnapshot,
  ConductorSmokeIntent,
  ConductorStartRunInput,
  ConductorStopSmokeTestInput,
  ConductorSubscription,
  IConductor,
} from "./IConductor";
import type { ViewToHostMessage } from "../comms/shared/messageTypes";
import type {
  IAlgorithmsTerminalRunAdapter,
  ICommandLine,
} from "../commandline";
import type { IStateMachine } from "../state";
import {
  createRunControlsIntentReaction,
  createSmokeIntentReaction,
} from "./internal/reactions";
import { createRunRegistry } from "./internal/runRegistry";
import { createSmokeRegistry } from "./internal/smokeRegistry";
import { orchestrateRunFile } from "./internal/runFile";

const DEFAULT_RUN_STATUS_RETENTION_MS = 120_000;

/**
 * Dependencies required to create the conductor service.
 */
export interface CreateConductorServiceInput {
  algorithmsTerminalRunAdapter?: IAlgorithmsTerminalRunAdapter;
  commandLine?: ICommandLine;
  runStatusRetentionMs?: number;
}

/**
 * Dependencies used to apply one conductor reaction to host runtime state.
 */
export interface ApplyConductorReactionDependencies {
  stateMachine: IStateMachine;
  dispatchNotification: (notification: ConductorNotificationEffect) => void;
}

/**
 * Dependencies used to react to and apply one smoke-controls intent.
 */
export interface ReactAndApplySmokeIntentDependencies
  extends ApplyConductorReactionDependencies {
  conductor: IConductor;
}

/**
 * Dependencies used to react to and apply one run-controls intent.
 */
export interface ReactAndApplyRunControlsIntentDependencies
  extends ApplyConductorReactionDependencies {
  conductor: IConductor;
}

/**
 * Dependencies used to create one smoke-controls channel handler.
 */
export interface CreateSmokeControlsChannelMessageHandlerInput
  extends ReactAndApplySmokeIntentDependencies {
  publishSnapshot: () => void;
}

/**
 * Dependencies used to create one run-controls channel handler.
 */
export interface CreateRunControlsChannelMessageHandlerInput
  extends ReactAndApplyRunControlsIntentDependencies {
  publishSnapshot: () => void;
}

/**
 * Applies one conductor reaction to host state and notifications.
 *
 * @param {ConductorSmokeReaction | ConductorRunControlsReaction} reaction Conductor reaction to apply.
 * @param {ApplyConductorReactionDependencies} dependencies Host runtime dependencies.
 * @returns {boolean} True when the caller should publish a refreshed snapshot.
 */
export function applyConductorReaction(
  reaction: ConductorSmokeReaction | ConductorRunControlsReaction,
  dependencies: ApplyConductorReactionDependencies
): boolean {
  for (const stateEvent of reaction.stateEvents) {
    dependencies.stateMachine.send(stateEvent);
  }

  if (reaction.notification !== null) {
    dependencies.dispatchNotification(reaction.notification);
  }

  return reaction.shouldPublishSnapshot;
}

/**
 * Reacts to one smoke-controls intent and applies the resulting effects.
 *
 * @param {ConductorSmokeIntent} intent Smoke-controls intent.
 * @param {ReactAndApplySmokeIntentDependencies} dependencies Conductor and runtime dependencies.
 * @returns {boolean} True when the caller should publish a refreshed snapshot.
 */
export function reactAndApplySmokeIntent(
  intent: ConductorSmokeIntent,
  dependencies: ReactAndApplySmokeIntentDependencies
): boolean {
  const reaction = dependencies.conductor.reactToSmokeIntent({
    intent,
    snapshot: dependencies.stateMachine.getSnapshot(),
  });

  return applyConductorReaction(reaction, dependencies);
}

/**
 * Reacts to one run-controls intent and applies the resulting effects.
 *
 * @param {ConductorRunControlsIntent} intent Run-controls intent.
 * @param {ReactAndApplyRunControlsIntentDependencies} dependencies Conductor and runtime dependencies.
 * @returns {boolean} True when the caller should publish a refreshed snapshot.
 */
export function reactAndApplyRunControlsIntent(
  intent: ConductorRunControlsIntent,
  dependencies: ReactAndApplyRunControlsIntentDependencies
): boolean {
  const reaction = dependencies.conductor.reactToRunControlsIntent({
    intent,
    snapshot: dependencies.stateMachine.getSnapshot(),
  });

  return applyConductorReaction(reaction, dependencies);
}

/**
 * Creates one conductor-owned message handler for the smoke-controls channel.
 *
 * @param {CreateSmokeControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {(message: ViewToHostMessage) => void} Message handler.
 */
export function createSmokeControlsChannelMessageHandler(
  input: CreateSmokeControlsChannelMessageHandlerInput
): (message: ViewToHostMessage) => void {
  return (message: ViewToHostMessage): void => {
    if (message.type === "smoke.ready") {
      input.publishSnapshot();
      return;
    }

    if (message.type !== "smoke.intent") {
      return;
    }

    const shouldPublishSnapshot = reactAndApplySmokeIntent(message.payload, input);

    if (shouldPublishSnapshot) {
      input.publishSnapshot();
    }
  };
}

/**
 * Creates one conductor-owned message handler for the run-controls channel.
 *
 * @param {CreateRunControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {(message: ViewToHostMessage) => void} Message handler.
 */
export function createRunControlsChannelMessageHandler(
  input: CreateRunControlsChannelMessageHandlerInput
): (message: ViewToHostMessage) => void {
  return (message: ViewToHostMessage): void => {
    if (message.type === "run.ready") {
      input.publishSnapshot();
      return;
    }

    if (message.type !== "run.intent") {
      return;
    }

    const shouldPublishSnapshot = reactAndApplyRunControlsIntent(message.payload, input);

    if (shouldPublishSnapshot) {
      input.publishSnapshot();
    }
  };
}

/**
 * Creates the conductor service implementation.
 *
 * @param {CreateConductorServiceInput} [input] Optional conductor dependencies.
 * @returns {IConductor} Conductor implementation.
 */
export function createConductorService(
  input?: CreateConductorServiceInput
): IConductor {
  const runAdapter = input?.algorithmsTerminalRunAdapter;
  const commandLine = input?.commandLine;
  const runStatusRetentionMs = input?.runStatusRetentionMs ?? DEFAULT_RUN_STATUS_RETENTION_MS;
  const runRegistry = createRunRegistry({ runStatusRetentionMs });
  const runLifecycle = runRegistry.buildRunLifecycle();
  const smokeRegistry = createSmokeRegistry({
    smokeStatusRetentionMs: runStatusRetentionMs,
  });
  const activeSmokeExecutionByAlgorithm = smokeRegistry.getActiveSmokeExecutionByAlgorithm();
  const smokeStatusRetentionLifecycle = smokeRegistry.getSmokeStatusRetentionLifecycle();

  return {
    reactToSmokeIntent(input) {
      return createSmokeIntentReaction(input.intent, input.snapshot.smokeControls);
    },

    reactToRunControlsIntent(input) {
      return createRunControlsIntentReaction(input.intent, input.snapshot.runControls);
    },

    async runFile(input: ConductorRunFileInput): Promise<void> {
      await orchestrateRunFile(input, {
        runAdapter,
        commandLine,
        runLifecycle,
        smokeStatusRetentionLifecycle,
        activeSmokeExecutionByAlgorithm,
      });
    },

    async stopSmokeTest(input: ConductorStopSmokeTestInput): Promise<boolean> {
      return smokeRegistry.stopSmokeTest(input);
    },

    clearSmokeResults(input: ConductorClearSmokeResultsInput): boolean {
      return smokeRegistry.clearSmokeResults(input);
    },

    clearRunResults(input: ConductorClearRunResultsInput): boolean {
      const wasCleared = runRegistry.clearRunResults(input.target);
      if (wasCleared) {
        input.refreshAlgorithmsTree();
      }

      return wasCleared;
    },

    getRunForTarget(target: ConductorRunTargetRef): ConductorRunSnapshot | null {
      return runRegistry.getRunForTarget(target);
    },

    subscribeRunTargetStatus(
      listener: (change: ConductorRunTargetStatusChange) => void
    ): ConductorSubscription {
      return runRegistry.subscribeRunTargetStatus(listener);
    },

    startRun(input: ConductorStartRunInput): ConductorRunSnapshot {
      return runRegistry.startRun(input);
    },

    markProgress(input: ConductorMarkProgressInput): ConductorRunSnapshot | null {
      return runRegistry.markProgress(input);
    },

    markCompleted(input: ConductorMarkCompletedInput): ConductorRunSnapshot | null {
      return runRegistry.markCompleted(input);
    },

    markFailed(input: ConductorMarkFailedInput): ConductorRunSnapshot | null {
      return runRegistry.markFailed(input);
    },

    cancelRun(input: ConductorCancelRunInput): ConductorRunSnapshot | null {
      return runRegistry.cancelRun(input);
    },

    getRun(runId: string): ConductorRunSnapshot | null {
      return runRegistry.getRun(runId);
    },
  };
}
