import * as vscode from "vscode";
import type {
  RunHandlerExecuteResult,
} from "./runHandler";

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
 * Supported runner action kinds routed through run.sh.
 */
export type RunnerRunActionKind =
  | "run-file"
  | "compile-only"
  | "check-only"
  | "clean"
  | "localclean";

/**
 * Route override values used for check-only execution.
 */
export type RunnerCheckOnlyRoute = "native" | "docker" | "ssh";

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
 * Input for one run request routed through IRunner.
 */
export interface RunnerExecuteRunRequest {
  algorithmDirectoryPath: string;
  targetToken: string;
  targetFilePath: string;
  languageKey?: string;
  runId?: string;
}

/**
 * Input for one run action request routed through IRunner.
 */
export interface RunnerExecuteRunActionRequest {
  algorithmDirectoryPath: string;
  actionKind?: RunnerRunActionKind;
  checkOnlyRouteOverride?: RunnerCheckOnlyRoute;
  targetToken?: string;
  targetFilePath?: string;
  languageKey?: string;
  runId?: string;
}

/**
 * Result for one run request routed through IRunner.
 */
export type RunnerExecuteRunResult = RunHandlerExecuteResult;

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
   * Executes one run.sh operation through the Runner command pipeline.
   *
   * @param {RunnerExecuteRunRequest} request Run execution request.
   * @returns {Promise<RunnerExecuteRunResult>} Run execution result.
   */
  executeRun(request: RunnerExecuteRunRequest): Promise<RunnerExecuteRunResult>;

  /**
   * Executes one run.sh action through the Runner command pipeline.
   *
   * @param {RunnerExecuteRunActionRequest} request Run action execution request.
   * @returns {Promise<RunnerExecuteRunResult>} Run execution result.
   */
  executeRunAction(request: RunnerExecuteRunActionRequest): Promise<RunnerExecuteRunResult>;

  /**
   * Sends Ctrl+C to the active runner terminal to interrupt a stuck run.
   *
   * @returns {boolean} True when interrupt was sent; false when no active runner terminal exists.
   */
  interruptActiveRun(): boolean;

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
