import * as vscode from "vscode";
import type {
  InitHandlerCheckEnvironmentResult,
  InitHandlerCopyIconsResult,
} from "./initHandler";

/**
 * Supported environment variable keys managed by the environment actor.
 */
export type EnvironmentVariableKey =
  | "timeout"
  | "eiffel"
  | "gcc13Directory"
  | "gcc13Name"
  | "gxx13Name";

/**
 * One environment variable entry shown in environment controls.
 */
export interface EnvironmentVariableState {
  key: EnvironmentVariableKey;
  label: string;
  value: string;
}

/**
 * Batch routing controls shared by language routing UI.
 */
export interface EnvironmentBatchRoutingState {
  dockerEnabled: boolean;
  dockerValue: string;
  sshEnabled: boolean;
  sshValue: string;
  isConflict: boolean;
}

/**
 * One language routing row in environment controls state.
 */
export interface EnvironmentRoutingLanguageState {
  languageKey: string;
  label: string;
  iconUri: string;
  dockerEnabled: boolean;
  dockerValue: string;
  sshEnabled: boolean;
  sshValue: string;
  isConflict: boolean;
}

/**
 * Persistent environment-controls state shared by the environment actor and environment view.
 */
export interface EnvironmentControlsState {
  editModeEnabled: boolean;
  persistSessionEnabled: boolean;
  profilePath: string;
  profilePlaceholder: string;
  effectiveProfilePath: string;
  checkEnvFilteredOutput: string;
  checkEnvRawOutput: string;
  copyIconsPath: string;
  variables: EnvironmentVariableState[];
  batchRouting: EnvironmentBatchRoutingState;
  routingEntries: EnvironmentRoutingLanguageState[];
}

/**
 * Partial update payload for environment-controls state.
 */
export interface EnvironmentControlsPatch {
  editModeEnabled?: boolean;
  persistSessionEnabled?: boolean;
  profilePath?: string;
  profilePlaceholder?: string;
  effectiveProfilePath?: string;
  checkEnvFilteredOutput?: string;
  checkEnvRawOutput?: string;
  copyIconsPath?: string;
  variables?: EnvironmentVariableState[];
  batchRouting?: EnvironmentBatchRoutingState;
  routingEntries?: EnvironmentRoutingLanguageState[];
}

/**
 * Environment actor contract for storing and broadcasting environment-controls state.
 */
export interface IEnvironment extends vscode.Disposable {
  /**
   * Activates the Environment actor lifecycle with extension context for persistence.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  activate(context: vscode.ExtensionContext): void;

  /**
   * Applies a partial environment-controls update to the active Environment state.
   *
   * @param {EnvironmentControlsPatch} patch Partial state update to apply.
   * @returns {void} No return value.
   */
  patchEnvironmentControls(patch: EnvironmentControlsPatch): void;

  /**
   * Sets whether the extension should operate in editable mode.
   *
   * @param {boolean} enabled True to enable edit mode, false for read-only mode.
   * @returns {void} No return value.
   */
  setEditModeEnabled(enabled: boolean): void;

  /**
   * Toggles editable mode on/off in environment-controls state.
   *
   * @returns {void} No return value.
   */
  toggleEditModeEnabled(): void;

  /**
   * Returns the current persisted environment-controls state snapshot.
   *
   * @returns {EnvironmentControlsState} Current environment-controls state.
   */
  getEnvironmentControlsState(): EnvironmentControlsState;

  /**
   * Reloads profile-backed values from the effective shell profile path.
   *
   * @returns {Promise<void>} Resolves after profile values are applied.
   */
  refreshFromProfile(): Promise<void>;

  /**
   * Runs the init.sh check-environment operation using current Environment state.
   *
   * @returns {Promise<InitHandlerCheckEnvironmentResult>} Check-environment result.
   */
  runCheckEnvironment(): Promise<InitHandlerCheckEnvironmentResult>;

  /**
   * Runs the init.sh copy-icons operation using current Environment state.
   *
   * @returns {Promise<InitHandlerCopyIconsResult>} Copy-icons result.
   */
  runCopyIcons(): Promise<InitHandlerCopyIconsResult>;

  /**
   * Subscribes to environment-controls state changes.
   *
   * @param {(state: EnvironmentControlsState) => void} listener Listener invoked on state changes.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  subscribeToStateChanges(listener: (state: EnvironmentControlsState) => void): vscode.Disposable;
}
