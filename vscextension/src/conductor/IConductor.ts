import type { ExtensionHostEvent, ExtensionHostSnapshot } from "../state";

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
 * Input for conductor smoke reaction policy.
 */
export interface ConductorReactToSmokeIntentInput {
  intent: ConductorSmokeIntent;
  snapshot: ExtensionHostSnapshot;
}

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
   * Gets one run snapshot.
   *
   * @param {string} runId Run identifier.
   * @returns {ConductorRunSnapshot | null} Snapshot or null when unavailable.
   */
  getRun(runId: string): ConductorRunSnapshot | null;
}
