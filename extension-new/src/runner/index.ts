import * as vscode from "vscode";

/**
 * Persistent run-options state shared between the run webview and Runner.
 */
export interface RunOptionsState {
  runArgsEnabled: boolean;
  runArgsText: string;
  sourceProfileEnabled: boolean;
  sourceProfileText: string;
  runChecksMode: "none" | "compile-only" | "check-only";
  runChecksRoute: "native" | "docker" | "ssh";
  cleanStdlibEnabled: boolean;
  cleanArchivesEnabled: boolean;
}

/**
 * Partial update payload for run-options state.
 */
export interface RunOptionsPatch {
  runArgsEnabled?: boolean;
  runArgsText?: string;
  sourceProfileEnabled?: boolean;
  sourceProfileText?: string;
  runChecksMode?: "none" | "compile-only" | "check-only";
  runChecksRoute?: "native" | "docker" | "ssh";
  cleanStdlibEnabled?: boolean;
  cleanArchivesEnabled?: boolean;
}

/**
 * Runner contract for storing and broadcasting run-options state.
 */
export interface IRunner extends vscode.Disposable {
  /**
   * Activates the Runner lifecycle with extension context for persistence.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  activate(context: vscode.ExtensionContext) : void;

  /**
   * Applies a partial run-options update to the active Runner state.
   *
   * @param {RunOptionsPatch} patch Partial state update to apply.
   * @returns {void} No return value.
   */
  patchRunOptions(patch: RunOptionsPatch) : void;

  /**
   * Returns the current persisted run-options state snapshot.
   *
   * @returns {RunOptionsState} Current run-options state.
   */
  getRunOptionsState() : RunOptionsState;

  /**
   * Subscribes to run-options state changes.
   *
   * @param {(state: RunOptionsState) => void} listener Listener invoked on state changes.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  subscribeToStateChanges(listener: (state: RunOptionsState) => void) : vscode.Disposable;
}
