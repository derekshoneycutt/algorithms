import * as vscode from "vscode";

/**
 * Unified language-run status used across single-run and smoke-run workflows.
 */
export type TrackerRunStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Run source that produced one tracker status update.
 */
export type TrackerRunSource = "runner" | "smoker";

/**
 * Cancelability scope for one tracked run-status record.
 */
export type TrackerRunCancelability =
  | "single-run"
  | "algorithm-run"
  | "not-cancellable";

/**
 * One language run-status record for a specific algorithm and language pair.
 */
export interface TrackerLanguageRunState {
  algorithmPath: string;
  languageKey: string;
  status: TrackerRunStatus;
  source: TrackerRunSource;
  cancelability: TrackerRunCancelability;
  runId: string;
  message: string;
  updatedAt: number;
}

/**
 * Persistent tracker state shared between run-producing actors and views.
 */
export interface TrackerState {
  languageRunsByAlgorithmPath: Record<string, Record<string, TrackerLanguageRunState>>;
}

/**
 * Partial update payload for tracker state.
 */
export interface TrackerStatePatch {
  languageRunsByAlgorithmPath?: Record<string, Record<string, TrackerLanguageRunState>>;
}

/**
 * Payload used to set one language run status.
 */
export interface TrackerSetLanguageRunStatusInput {
  algorithmPath: string;
  languageKey: string;
  status: TrackerRunStatus;
  source: TrackerRunSource;
  cancelability?: TrackerRunCancelability;
  runId: string;
  message?: string;
  updatedAt?: number;
}

/**
 * Payload used to clear one language run status.
 */
export interface TrackerClearLanguageRunStatusInput {
  algorithmPath: string;
  languageKey: string;
}

/**
 * Tracker actor contract for run-status storage and fan-out.
 */
export interface ITracker extends vscode.Disposable {
  /**
   * Activates the Tracker lifecycle with extension context for future persistence hooks.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  activate(context: vscode.ExtensionContext): void;

  /**
   * Applies a partial tracker-state update.
   *
   * @param {TrackerStatePatch} patch Partial state update to apply.
   * @returns {void} No return value.
   */
  patchTrackerState(patch: TrackerStatePatch): void;

  /**
   * Sets or replaces one language run-status record.
   *
   * @param {TrackerSetLanguageRunStatusInput} input Language run-status payload.
   * @returns {void} No return value.
   */
  setLanguageRunStatus(input: TrackerSetLanguageRunStatusInput): void;

  /**
   * Clears one language run-status record.
   *
   * @param {TrackerClearLanguageRunStatusInput} input Language run-status clear payload.
   * @returns {void} No return value.
   */
  clearLanguageRunStatus(input: TrackerClearLanguageRunStatusInput): void;

  /**
   * Clears all language run statuses for one algorithm path.
   *
   * @param {string} algorithmPath Algorithm directory path key.
   * @returns {void} No return value.
   */
  clearAlgorithmRunStatuses(algorithmPath: string): void;

  /**
   * Clears all tracked run statuses.
   *
   * @returns {void} No return value.
   */
  clearAllRunStatuses(): void;

  /**
   * Returns the current tracker state snapshot.
   *
   * @returns {TrackerState} Current tracker state.
   */
  getTrackerState(): TrackerState;

  /**
   * Returns one language run-status record when available.
   *
   * @param {string} algorithmPath Algorithm directory path key.
   * @param {string} languageKey Language key.
   * @returns {TrackerLanguageRunState | undefined} Current language run record.
   */
  getLanguageRunStatus(
    algorithmPath: string,
    languageKey: string,
  ): TrackerLanguageRunState | undefined;

  /**
   * Subscribes to tracker-state changes.
   *
   * @param {(state: TrackerState) => void} listener Listener invoked on state changes.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  subscribeToStateChanges(listener: (state: TrackerState) => void): vscode.Disposable;
}
