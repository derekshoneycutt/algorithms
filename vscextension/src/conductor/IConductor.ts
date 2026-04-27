import type { ExtensionHostEvent, ExtensionHostSnapshot } from "../state";
import type { IFilesystem } from "../filesystem";
import type { IAlgorithmsIndex } from "../algorithms";
import type { ILanguages } from "../languages";
import type { INotificationRouter } from "../notifications";
import type { IStateMachine } from "../state";
import type { WorkspaceTreeNode } from "../views";
import type {
  CheckEnvResult,
  CopyIconsResult,
  EnvironmentReadResult,
  EnvironmentWriteRequest,
  EnvironmentWriteResult,
} from "./internal/environment";


/**
 * Lifecycle status for one conductor run snapshot.
 */
export type ConductorRunStatus =
  | "starting"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Snapshot for one host-side orchestrated run.
 */
export interface ConductorRunSnapshot {
  runId: string;
  ownerKey: string;
  status: ConductorRunStatus;
  startedAt: number;
  updatedAt: number;
  message: string | null;
  progressPercent: number | null;
  stepKey: string | null;
  errorMessage: string | null;
}

/**
 * Stable run-target reference used by tree status projection.
 */
export interface ConductorRunTargetRef {
  nodeKind: "file" | "mainFile" | "languageSummary" | "algorithmDir";
  filePath: string;
}

/**
 * Change payload emitted when run-target status changes.
 */
export interface ConductorRunTargetStatusChange {
  snapshot: ConductorRunSnapshot;
  target: ConductorRunTargetRef;
}

/**
 * Disposable subscription handle.
 */
export interface ConductorSubscription {
  dispose(): void;
}

/**
 * Input for starting one run.
 */
export interface ConductorStartRunInput {
  ownerKey: string;
  processType?: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Input for progress updates.
 */
export interface ConductorMarkProgressInput {
  runId: string;
  message?: string | null;
  progressPercent?: number | null;
  stepKey?: string | null;
}

/**
 * Input for completion updates.
 */
export interface ConductorMarkCompletedInput {
  runId: string;
  message?: string | null;
}

/**
 * Input for failure updates.
 */
export interface ConductorMarkFailedInput {
  runId: string;
  errorMessage: string;
  message?: string | null;
}

/**
 * Input for cancellation updates.
 */
export interface ConductorCancelRunInput {
  runId: string;
  message?: string | null;
}

/**
 * Host-side smoke controls intents owned by conductor policy.
 */
export type ConductorSmokeIntent =
  | { kind: "setReportEnabled"; enabled: boolean }
  | { kind: "setMarkdownPath"; markdownPath: string }
  | { kind: "setTimeoutSeconds"; timeoutSeconds: string }
  | { kind: "setSlowTimeoutSeconds"; slowTimeoutSeconds: string }
  | { kind: "toggleLanguage"; languageKey: string }
  | { kind: "selectAllLanguages" }
  | { kind: "deselectAllLanguages" };

/**
 * Host-side run controls intents owned by conductor policy.
 */
export type ConductorRunControlsIntent =
  | { kind: "setRunArgsEnabled"; enabled: boolean }
  | { kind: "setRunArgsText"; text: string }
  | { kind: "setSourceProfileEnabled"; enabled: boolean }
  | { kind: "setSourceProfileText"; text: string }
  | { kind: "setRunChecksMode"; mode: "none" | "check-only" | "compile-only" }
  | { kind: "setRunChecksRoute"; route: "native" | "docker" | "ssh" }
  | { kind: "setCleanStdlibEnabled"; enabled: boolean }
  | { kind: "setCleanArchivesEnabled"; enabled: boolean };

/**
 * Input for conductor smoke reaction policy.
 */
export interface ConductorReactToSmokeIntentInput {
  intent: ConductorSmokeIntent;
  snapshot: ExtensionHostSnapshot;
}

/**
 * Input for conductor run controls reaction policy.
 */
export interface ConductorReactToRunControlsIntentInput {
  intent: ConductorRunControlsIntent;
  snapshot: ExtensionHostSnapshot;
}

/**
 * Input for stopping one active smoke test.
 */
export interface ConductorStopSmokeTestInput {
  algorithmPath: string;
}

/**
 * Input for clearing retained smoke results for one algorithm.
 */
export interface ConductorClearSmokeResultsInput {
  algorithmPath: string;
  hostState: IStateMachine;
  refreshAlgorithmsTree: () => void;
}

/**
 * Input for clearing retained run results for one run target.
 */
export interface ConductorClearRunResultsInput {
  target: ConductorRunTargetRef;
  refreshAlgorithmsTree: () => void;
}

/**
 * Input for workspace-path cache invalidation policy.
 */
export interface ConductorWorkspacePathInvalidationInput {
  targetPath: string;
  filesystem: IFilesystem;
  algorithmsIndex: IAlgorithmsIndex;
}

/**
 * Input for workspace-root cache invalidation policy.
 */
export interface ConductorWorkspaceRootsInvalidationInput {
  filesystem: IFilesystem;
  algorithmsIndex: IAlgorithmsIndex;
}

/**
 * Input for one workspace-path change orchestration request.
 */
export interface ConductorWorkspacePathChangeInput {
  targetPath: string;
  filesystem: IFilesystem;
  algorithmsIndex: IAlgorithmsIndex;
  refreshAlgorithmsTree: () => void;
  refreshStandardLibraryTree: () => void;
}

/**
 * Input for one workspace-roots change orchestration request.
 */
export interface ConductorWorkspaceRootsChangeInput {
  filesystem: IFilesystem;
  algorithmsIndex: IAlgorithmsIndex;
  refreshAlgorithmsTree: () => void;
  refreshStandardLibraryTree: () => void;
}

/**
 * Input for conductor-owned run-file orchestration.
 */
export interface ConductorRunFileInput {
  actionKind?: ConductorRunActionKind;
  filesystem: IFilesystem;
  hostState: IStateMachine;
  languages: ILanguages;
  notificationRouter: INotificationRouter;
  refreshAlgorithmsTree: () => void;
  treeNode?: WorkspaceTreeNode;
  workspaceFolderPaths: readonly string[];
}

/**
 * Supported tree execution actions routed through run.sh.
 */
export type ConductorRunActionKind =
  | "run-file"
  | "compile-only"
  | "check-only"
  | "clean"
  | "localclean"
  | "smoke-test";

/**
 * One host notification emitted by conductor policy.
 */
export interface ConductorNotificationEffect {
  level: "info" | "warn" | "error";
  message: string;
}

/**
 * Reaction output returned by conductor policy.
 */
export interface ConductorSmokeReaction {
  stateEvents: ExtensionHostEvent[];
  notification: ConductorNotificationEffect | null;
  shouldPublishSnapshot: boolean;
}

/**
 * Reaction output returned by run controls conductor policy.
 */
export interface ConductorRunControlsReaction {
  stateEvents: ExtensionHostEvent[];
  notification: ConductorNotificationEffect | null;
  shouldPublishSnapshot: boolean;
}

/**
 * DI contract for host-side long-running orchestration.
 */
export interface IConductor {
  /**
   * Interprets one smoke intent and returns host reaction effects.
   *
   * @param {ConductorReactToSmokeIntentInput} input Conductor reaction input.
   * @returns {ConductorSmokeReaction} Deterministic reaction result.
   */
  reactToSmokeIntent(
    input: ConductorReactToSmokeIntentInput
  ): ConductorSmokeReaction;

  /**
   * Interprets one run controls intent and returns host reaction effects.
   *
   * @param {ConductorReactToRunControlsIntentInput} input Conductor reaction input.
   * @returns {ConductorRunControlsReaction} Deterministic reaction result.
   */
  reactToRunControlsIntent(
    input: ConductorReactToRunControlsIntentInput
  ): ConductorRunControlsReaction;

  /**
   * Runs one Algorithms target using state-owned run controls.
   *
   * @param {ConductorRunFileInput} input Run-file orchestration input.
   * @returns {Promise<void>} Resolves when orchestration finishes.
   */
  runFile(input: ConductorRunFileInput): Promise<void>;

  /**
   * Stops one active smoke test.
   *
   * @param {ConductorStopSmokeTestInput} input Stop input.
   * @returns {Promise<boolean>} True when a stop request was delivered.
   */
  stopSmokeTest(input: ConductorStopSmokeTestInput): Promise<boolean>;

  /**
   * Clears retained smoke results for one algorithm.
   *
   * @param {ConductorClearSmokeResultsInput} input Clear input.
   * @returns {boolean} True when results were cleared.
   */
  clearSmokeResults(input: ConductorClearSmokeResultsInput): boolean;

  /**
   * Clears retained run results for one run target.
   *
   * @param {ConductorClearRunResultsInput} input Clear input.
   * @returns {boolean} True when retained results were cleared.
   */
  clearRunResults(input: ConductorClearRunResultsInput): boolean;

  /**
   * Gets the latest run snapshot for one target.
   *
   * @param {ConductorRunTargetRef} target Stable run target reference.
   * @returns {ConductorRunSnapshot | null} Snapshot for target or null.
   */
  getRunForTarget(target: ConductorRunTargetRef): ConductorRunSnapshot | null;

  /**
   * Subscribes to run-target status change events.
   *
   * @param {(change: ConductorRunTargetStatusChange) => void} listener Change listener.
   * @returns {ConductorSubscription} Disposable listener handle.
   */
  subscribeRunTargetStatus(
    listener: (change: ConductorRunTargetStatusChange) => void
  ): ConductorSubscription;

  /**
   * Applies conductor-owned cache invalidation policy for one changed path.
   *
   * @param {ConductorWorkspacePathInvalidationInput} input Changed path input.
   * @returns {boolean} True when caches were invalidated.
   */
  invalidateWorkspacePath?(
    input: ConductorWorkspacePathInvalidationInput
  ): boolean;

  /**
   * Applies conductor-owned cache invalidation policy for workspace-root changes.
   *
   * @param {ConductorWorkspaceRootsInvalidationInput} input Workspace roots input.
   * @returns {void}
   */
  invalidateWorkspaceRoots?(input: ConductorWorkspaceRootsInvalidationInput): void;

  /**
   * Handles one workspace path change using conductor-owned policy.
   *
   * This includes invalidation and debounced tree refresh behavior.
   *
   * @param {ConductorWorkspacePathChangeInput} input Path change input.
   * @returns {void}
   */
  handleWorkspacePathChanged?(input: ConductorWorkspacePathChangeInput): void;

  /**
   * Handles workspace roots change using conductor-owned policy.
   *
   * @param {ConductorWorkspaceRootsChangeInput} input Roots change input.
   * @returns {void}
   */
  handleWorkspaceRootsChanged?(input: ConductorWorkspaceRootsChangeInput): void;

  /**
   * Starts one run and returns its first snapshot.
   *
   * @param {ConductorStartRunInput} input Start input.
   * @returns {ConductorRunSnapshot} Initial run snapshot.
   */
  startRun(input: ConductorStartRunInput): ConductorRunSnapshot;

  /**
   * Marks run progress.
   *
   * @param {ConductorMarkProgressInput} input Progress input.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null in bootstrap mode.
   */
  markProgress(input: ConductorMarkProgressInput): ConductorRunSnapshot | null;

  /**
   * Marks run completion.
   *
   * @param {ConductorMarkCompletedInput} input Completion input.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null in bootstrap mode.
   */
  markCompleted(input: ConductorMarkCompletedInput): ConductorRunSnapshot | null;

  /**
   * Marks run failure.
   *
   * @param {ConductorMarkFailedInput} input Failure input.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null in bootstrap mode.
   */
  markFailed(input: ConductorMarkFailedInput): ConductorRunSnapshot | null;

  /**
   * Cancels one run.
   *
   * @param {ConductorCancelRunInput} input Cancellation input.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null in bootstrap mode.
   */
  cancelRun(input: ConductorCancelRunInput): ConductorRunSnapshot | null;

  /**
   * Disposes conductor-owned resources.
   *
   * @returns {void}
   */
  dispose?(): void;

  /**
   * Gets one run snapshot.
   *
   * @param {string} runId Run identifier.
   * @returns {ConductorRunSnapshot | null} Snapshot or null when unavailable.
   */
  getRun(runId: string): ConductorRunSnapshot | null;

  /**
   * Reads the managed DEREKALGOS environment profile.
   *
   * @param {string} [profilePath] Optional profile path override.
   * @returns {Promise<EnvironmentReadResult>} Parsed profile result.
   */
  readEnvironment(profilePath?: string): Promise<EnvironmentReadResult>;

  /**
   * Writes managed DEREKALGOS environment variables to the profile.
   *
   * @param {EnvironmentWriteRequest} request Write request with values.
   * @returns {Promise<EnvironmentWriteResult>} Written profile result.
   */
  writeEnvironment(request: EnvironmentWriteRequest): Promise<EnvironmentWriteResult>;

  /**
   * Executes the check-environment diagnostics operation.
   *
   * @param {string} [profilePath] Optional profile path override.
   * @returns {Promise<CheckEnvResult>} Check-environment result.
   */
  checkEnvironment(profilePath?: string): Promise<CheckEnvResult>;

  /**
   * Executes the copy-icons operation.
   *
   * @param {string} [profilePath] Optional profile path override.
   * @param {string} [iconsPath] Optional destination path for icons.
   * @returns {Promise<CopyIconsResult>} Copy-icons result.
   */
  copyIcons(profilePath?: string, iconsPath?: string): Promise<CopyIconsResult>;
}

/**
 * Environment operation result types re-exported from internal/environment module.
 */
export type {
  CheckEnvResult,
  CopyIconsResult,
  EnvironmentReadResult,
  EnvironmentWriteRequest,
  EnvironmentWriteResult,
} from "./internal/environment";
