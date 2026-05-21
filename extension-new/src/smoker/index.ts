import * as vscode from "vscode";

/**
 * One smoke-language row persisted in smoke-controls state.
 */
export interface SmokeLanguageState {
  languageKey: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  disabledReason: string;
  iconUri: string;
}

/**
 * Persistent smoke-controls state shared between the smoke webview and Smoker.
 */
export interface SmokeControlsState {
  reportEnabled: boolean;
  markdownPath: string;
  timeoutSeconds: string;
  slowTimeoutSeconds: string;
  languages: SmokeLanguageState[];
}

/**
 * Partial update payload for smoke-controls state.
 */
export interface SmokeControlsPatch {
  reportEnabled?: boolean;
  markdownPath?: string;
  timeoutSeconds?: string;
  slowTimeoutSeconds?: string;
  languages?: SmokeLanguageState[];
}

export interface ISmoker extends vscode.Disposable {
  /**
   * Activates the Smoker lifecycle with extension context for persistence.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  activate(context: vscode.ExtensionContext) : void;

  /**
   * Applies a partial smoke-controls update to the active Smoker state.
   *
   * @param {SmokeControlsPatch} patch Partial state update to apply.
   * @returns {void} No return value.
   */
  patchSmokeControls(patch: SmokeControlsPatch) : void;

  /**
   * Returns the current persisted smoke-controls state snapshot.
   *
   * @returns {SmokeControlsState} Current smoke-controls state.
   */
  getSmokeControlsState() : SmokeControlsState;

  /**
   * Subscribes to smoke-controls state changes.
   *
   * @param {(state: SmokeControlsState) => void} listener Listener invoked on state changes.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  subscribeToStateChanges(listener: (state: SmokeControlsState) => void) : vscode.Disposable;
}
