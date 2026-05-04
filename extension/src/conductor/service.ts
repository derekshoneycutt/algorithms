import * as path from "node:path";

import * as vscode from "vscode";

import type {
  ConductorCancelRunInput,
  ConductorClearRunResultsInput,
  ConductorClearSmokeResultsInput,
  ConductorMarkCompletedInput,
  ConductorMarkFailedInput,
  ConductorMarkProgressInput,
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
  ConductorWorkspacePathInvalidationInput,
  ConductorWorkspacePathChangeInput,
  ConductorWorkspaceRootsChangeInput,
  ConductorWorkspaceRootsInvalidationInput,
  ConductorInitWorkspaceSupportedContextInput,
  ConductorRefreshWorkspaceSupportedContextInput,
  ConductorReadEnvironmentInput,
  ConductorWriteEnvironmentInput,
  ConductorCheckEnvironmentInput,
  ConductorCopyIconsInput,
  IConductor,
  CheckEnvResult,
  CopyIconsResult,
  EnvironmentReadResult,
  EnvironmentWriteResult,
} from "./IConductor";
import type { ViewToHostMessage } from "../comms/shared/messageTypes";
import type { IAlgorithmsTerminalRunAdapter, ICommandLine } from "../commandline";
import type { IFilesystem } from "../filesystem";
import type { IEligibilityResolver } from "../filesystem";
import type { IRootPathResolver } from "../algorithms";
import type { IObservability } from "../observability";
import {
  createRunRegistry,
  createSmokeRegistry,
  createRunControlsIntentReaction,
  createSmokeIntentReaction,
  orchestrateRunFile,
} from "./runner";
import {
  executeCheckEnv,
  executeCopyIcons,
  readEnvironment,
  writeEnvironment,
  type ApplyConductorReactionDependencies,
} from "./environment";

const DEFAULT_RUN_STATUS_RETENTION_MS = 120_000;

/**
 * Returns true when one path segment exists in the candidate path.
 *
 * @param {string} candidatePath Path to inspect.
 * @param {string} segment Segment name to match.
 * @returns {boolean} True when candidatePath contains segment.
 */
function hasPathSegment(candidatePath: string, segment: string): boolean {
  const normalizedPath = candidatePath.replace(/\\/g, "/");
  const segments = normalizedPath.split("/").filter(Boolean);
  return segments.includes(segment);
}

/**
 * Returns true when candidatePath is equal to or nested under rootPath.
 *
 * @param {string} candidatePath Candidate absolute path.
 * @param {string} rootPath Root absolute path.
 * @returns {boolean} True when candidatePath is within rootPath.
 */
function isPathWithinRoot(candidatePath: string, rootPath: string): boolean {
  const normalizedCandidatePath = path.resolve(candidatePath);
  const normalizedRootPath = path.resolve(rootPath);

  if (normalizedCandidatePath === normalizedRootPath) {
    return true;
  }

  return normalizedCandidatePath.startsWith(`${normalizedRootPath}${path.sep}`);
}

/**
 * Resolves likely algorithms/stdlib roots for one workspace folder path.
 *
 * @param {string} workspaceFolderPath Workspace folder path.
 * @returns {string[]} Candidate roots for watcher-path scoping.
 */
function resolveWatcherScopeRootsForWorkspaceFolder(workspaceFolderPath: string): string[] {
  const resolvedWorkspaceFolderPath = path.resolve(workspaceFolderPath);
  const roots = [
    path.join(resolvedWorkspaceFolderPath, "src"),
    path.join(resolvedWorkspaceFolderPath, "stdlib"),
  ];

  const workspaceBaseName = path.basename(resolvedWorkspaceFolderPath);
  if (workspaceBaseName === "src") {
    const repositoryRootPath = path.dirname(resolvedWorkspaceFolderPath);
    roots.push(
      resolvedWorkspaceFolderPath,
      path.join(repositoryRootPath, "stdlib")
    );
  }

  if (workspaceBaseName === "stdlib") {
    const repositoryRootPath = path.dirname(resolvedWorkspaceFolderPath);
    roots.push(
      resolvedWorkspaceFolderPath,
      path.join(repositoryRootPath, "src")
    );
  }

  return roots;
}

/**
 * Dependencies required to create the conductor service.
 */
export interface CreateConductorServiceInput {
  algorithmsTerminalRunAdapter?: IAlgorithmsTerminalRunAdapter;
  commandLine?: ICommandLine;
  observability?: IObservability;
  filesystem?: IFilesystem;
  runStatusRetentionMs?: number;
  rootPathResolver?: IRootPathResolver;
  eligibilityResolver?: IEligibilityResolver;
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
  const observability = input?.observability;
  const filesystem = input?.filesystem;
  const runStatusRetentionMs = input?.runStatusRetentionMs ?? DEFAULT_RUN_STATUS_RETENTION_MS;
  const rootPathResolver = input?.rootPathResolver;
  const eligibilityResolver = input?.eligibilityResolver;

  /**
   * Resolves the repository root from workspace folders at call time.
   *
   * @returns {Promise<string>} Repository root path or empty string when unavailable.
   */
  async function resolveRepositoryRoot(workspaceFolderPath: string): Promise<string> {
    if (
      filesystem === undefined
      || workspaceFolderPath.trim().length === 0
      || rootPathResolver === undefined
    ) {
      return "";
    }

    const algorithmsRoot = await rootPathResolver.resolveAlgorithmsRoot({
      filesystem,
      owningWorkspaceFolderPath: workspaceFolderPath,
      workspaceFolderPaths: [workspaceFolderPath],
    });

    if (algorithmsRoot === null) {
      return "";
    }

    return path.dirname(algorithmsRoot);
  }
  const runRegistry = createRunRegistry({ runStatusRetentionMs });
  const runLifecycle = runRegistry.buildRunLifecycle();
  const smokeRegistry = createSmokeRegistry({
    smokeStatusRetentionMs: runStatusRetentionMs,
  });
  const activeSmokeExecutionByAlgorithm = smokeRegistry.getActiveSmokeExecutionByAlgorithm();
  const smokeStatusRetentionLifecycle = smokeRegistry.getSmokeStatusRetentionLifecycle();
  let refreshTreeViewsTimer: ReturnType<typeof setTimeout> | null = null;
  let workspaceSupportRefreshGeneration = 0;

  /**
   * Computes workspace support state and applies it to VS Code context.
   *
   * @param {readonly string[]} workspaceFolderPaths Workspace folder paths.
   * @param {{ skipCanary?: boolean }} [options] Optional eligibility resolution options.
   * @returns {Promise<void>} Resolves when context has been updated.
   */
  async function setWorkspaceSupportedContext(
    workspaceFolderPaths: readonly string[],
    options?: { skipCanary?: boolean }
  ): Promise<void> {
    if (eligibilityResolver === undefined) {
      return;
    }

    const sidebarState = eligibilityResolver.resolveSidebarState(workspaceFolderPaths, options);
    await vscode.commands.executeCommand(
      "setContext",
      "algos.workspaceSupported",
      sidebarState.supported
    );
  }

  /**
   * Schedules one debounced refresh for both tree providers.
   *
   * @param {() => void} refreshAlgorithmsTree Algorithms tree refresh callback.
   * @param {() => void} refreshStandardLibraryTree Standard library tree refresh callback.
   * @returns {void}
   */
  function scheduleTreeRefresh(
    refreshAlgorithmsTree: () => void,
    refreshStandardLibraryTree: () => void
  ): void {
    if (refreshTreeViewsTimer !== null) {
      clearTimeout(refreshTreeViewsTimer);
    }

    refreshTreeViewsTimer = setTimeout(() => {
      refreshTreeViewsTimer = null;
      refreshAlgorithmsTree();
      refreshStandardLibraryTree();
    }, 75);
  }

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
        rootPathResolver,
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

    invalidateWorkspacePath(input: ConductorWorkspacePathInvalidationInput): boolean {
      const canonicalPath = input.targetPath;
      const observabilityCategory = "watcher.invalidation";
      const startedAt = observability?.isEnabled(observabilityCategory) === true
        ? Date.now()
        : 0;

      /**
       * Records one invalidation decision.
       *
       * @param {boolean} accepted Whether invalidation is accepted.
       * @param {"missing-segment" | "out-of-scope" | "accepted"} reason Decision reason.
       * @returns {boolean} Accepted value.
       */
      const recordDecision = (
        accepted: boolean,
        reason: "missing-segment" | "out-of-scope" | "accepted"
      ): boolean => {
        observability?.increment(
          accepted
            ? "watcher.invalidation.accepted"
            : "watcher.invalidation.skipped",
          1,
          {
            reason,
          }
        );

        if (startedAt > 0) {
          observability?.log("debug", "watcher.invalidation.decision.completed", {
            accepted,
            durationMs: Date.now() - startedAt,
            reason,
          });
        }

        return accepted;
      };

      if (!hasPathSegment(canonicalPath, "src") && !hasPathSegment(canonicalPath, "stdlib")) {
        return recordDecision(false, "missing-segment");
      }

      const watcherScopeRoots = input.workspaceFolderPaths.flatMap((workspaceFolderPath) => {
        return resolveWatcherScopeRootsForWorkspaceFolder(workspaceFolderPath);
      });

      if (
        watcherScopeRoots.length > 0
        && !watcherScopeRoots.some((rootPath) => isPathWithinRoot(canonicalPath, rootPath))
      ) {
        return recordDecision(false, "out-of-scope");
      }

      input.filesystem.clearCache?.(canonicalPath);
      input.filesystem.clearCache?.(path.dirname(canonicalPath));
      input.algorithmsIndex.clearCache(canonicalPath);
      return recordDecision(true, "accepted");
    },

    invalidateWorkspaceRoots(input: ConductorWorkspaceRootsInvalidationInput): void {
      input.filesystem.clearCache?.();
      input.algorithmsIndex.clearCache();
    },

    invalidateWorkspaceSupportCache(rootPath?: string): void {
      eligibilityResolver?.invalidateCanaryCache(rootPath);
    },

    handleWorkspacePathChanged(input: ConductorWorkspacePathChangeInput): void {
      const wasInvalidated = this.invalidateWorkspacePath?.({
        targetPath: input.targetPath,
        filesystem: input.filesystem,
        algorithmsIndex: input.algorithmsIndex,
        workspaceFolderPaths: input.workspaceFolderPaths,
      });

      if (wasInvalidated) {
        scheduleTreeRefresh(
          input.refreshAlgorithmsTree,
          input.refreshStandardLibraryTree
        );
      }
    },

    handleWorkspaceRootsChanged(input: ConductorWorkspaceRootsChangeInput): void {
      this.invalidateWorkspaceRoots?.({
        filesystem: input.filesystem,
        algorithmsIndex: input.algorithmsIndex,
      });
      this.invalidateWorkspaceSupportCache?.();
      void this.refreshWorkspaceSupportedContext({
        workspaceFolderPaths: input.workspaceFolderPaths,
      });
      scheduleTreeRefresh(
        input.refreshAlgorithmsTree,
        input.refreshStandardLibraryTree
      );
    },

    async initWorkspaceSupportedContext(input: ConductorInitWorkspaceSupportedContextInput): Promise<void> {
      workspaceSupportRefreshGeneration += 1;
      const refreshGeneration = workspaceSupportRefreshGeneration;

      // Fast startup pass: avoid canary process execution during activation context initialization.
      await setWorkspaceSupportedContext(input.workspaceFolderPaths, { skipCanary: true });

      setTimeout(() => {
        if (refreshGeneration !== workspaceSupportRefreshGeneration) {
          return;
        }

        void this.refreshWorkspaceSupportedContext({
          workspaceFolderPaths: input.workspaceFolderPaths,
        });
      }, 0);
    },

    async refreshWorkspaceSupportedContext(input: ConductorRefreshWorkspaceSupportedContextInput): Promise<void> {
      workspaceSupportRefreshGeneration += 1;
      await setWorkspaceSupportedContext(input.workspaceFolderPaths);
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

    async readEnvironment(inputRead: ConductorReadEnvironmentInput): Promise<EnvironmentReadResult> {
      if (!commandLine || !input?.filesystem) {
        throw new Error("Environment operations require commandLine and filesystem dependencies");
      }

      return readEnvironment(
        {
          filesystem: input.filesystem,
          commandLine,
          repositoryRoot: await resolveRepositoryRoot(inputRead.workspaceFolderPath),
        },
        inputRead.profilePath
      );
    },

    async writeEnvironment(inputWrite: ConductorWriteEnvironmentInput): Promise<EnvironmentWriteResult> {
      if (!commandLine || !input?.filesystem) {
        throw new Error("Environment operations require commandLine and filesystem dependencies");
      }

      return writeEnvironment(
        {
          filesystem: input.filesystem,
          commandLine,
          repositoryRoot: await resolveRepositoryRoot(inputWrite.workspaceFolderPath),
        },
        inputWrite.request
      );
    },

    async checkEnvironment(inputCheck: ConductorCheckEnvironmentInput): Promise<CheckEnvResult> {
      if (!commandLine || !input?.filesystem) {
        throw new Error("Environment operations require commandLine and filesystem dependencies");
      }

      return executeCheckEnv(
        {
          filesystem: input.filesystem,
          commandLine,
          repositoryRoot: await resolveRepositoryRoot(inputCheck.workspaceFolderPath),
        },
        inputCheck.profilePath
      );
    },

    async copyIcons(inputCopy: ConductorCopyIconsInput): Promise<CopyIconsResult> {
      if (!commandLine || !input?.filesystem) {
        throw new Error("Environment operations require commandLine and filesystem dependencies");
      }

      return executeCopyIcons(
        {
          filesystem: input.filesystem,
          commandLine,
          repositoryRoot: await resolveRepositoryRoot(inputCopy.workspaceFolderPath),
        },
        inputCopy.profilePath,
        inputCopy.iconsPath
      );
    },

    dispose(): void {
      if (refreshTreeViewsTimer !== null) {
        clearTimeout(refreshTreeViewsTimer);
        refreshTreeViewsTimer = null;
      }
    },
  };
}
