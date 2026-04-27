import * as vscode from "vscode";

import type { IConductor } from "../conductor";
import type { IFilesystem } from "../filesystem";
import type { ILanguages } from "../languages";
import type { INotificationRouter } from "../notifications";
import type { IStateMachine } from "../state";

type CheckOnlyRoute = "native" | "docker" | "ssh";

/**
 * Dependencies for the editor-title Run File command.
 */
export interface EditorTitleRunCommandDependencies {
  conductor: IConductor;
  filesystem: IFilesystem;
  hostState: IStateMachine;
  languages: ILanguages;
  notificationRouter: INotificationRouter;
  refreshAlgorithmsTree: () => void;
}

/**
 * Returns currently opened workspace folder paths.
 *
 * @returns {readonly string[]} Workspace folder paths.
 */
function getWorkspaceFolderPaths(): readonly string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((workspaceFolder) => {
    return workspaceFolder.uri.fsPath;
  });
}

/**
 * Creates one editor-title command handler for one specific run action.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @param {"run-file" | "compile-only" | "check-only" | "clean" | "localclean"} actionKind Action to execute.
 * @param {CheckOnlyRoute} [checkOnlyRouteOverride] Optional one-off check-only route override.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
function createAlgorithmsEditorTitleCommandForAction(
  dependencies: EditorTitleRunCommandDependencies,
  actionKind: "run-file" | "compile-only" | "check-only" | "clean" | "localclean",
  checkOnlyRouteOverride?: CheckOnlyRoute
): (...commandArgs: unknown[]) => Promise<void> {
  return async (): Promise<void> => {
    const uri = vscode.window.activeTextEditor?.document.uri;
    if (uri === undefined) {
      await dependencies.notificationRouter.warn("Open a file under src/{category}/{algorithm}/ and try again.");
      return;
    }

    await dependencies.conductor.runFile({
      actionKind,
      checkOnlyRouteOverride,
      filesystem: dependencies.filesystem,
      hostState: dependencies.hostState,
      languages: dependencies.languages,
      notificationRouter: dependencies.notificationRouter,
      refreshAlgorithmsTree: dependencies.refreshAlgorithmsTree,
      treeNode: {
        kind: "file",
        filePath: uri.fsPath,
      },
      workspaceFolderPaths: getWorkspaceFolderPaths(),
    });
  };
}

/**
 * Creates the editor-title Run File command.
 *
 * Delegates to conductor orchestration via the active editor.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
export function createAlgorithmsEditorTitleRunFileCommand(
  dependencies: EditorTitleRunCommandDependencies
): (...commandArgs: unknown[]) => Promise<void> {
  return createAlgorithmsEditorTitleCommandForAction(dependencies, "run-file");
}

/**
 * Creates the editor-title Compile Only command.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
export function createAlgorithmsEditorTitleCompileOnlyCommand(
  dependencies: EditorTitleRunCommandDependencies
): (...commandArgs: unknown[]) => Promise<void> {
  return createAlgorithmsEditorTitleCommandForAction(dependencies, "compile-only");
}

/**
 * Creates the editor-title Check Only (Native) command.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
export function createAlgorithmsEditorTitleCheckOnlyNativeCommand(
  dependencies: EditorTitleRunCommandDependencies
): (...commandArgs: unknown[]) => Promise<void> {
  return createAlgorithmsEditorTitleCommandForAction(dependencies, "check-only", "native");
}

/**
 * Creates the editor-title Check Only (Docker) command.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
export function createAlgorithmsEditorTitleCheckOnlyDockerCommand(
  dependencies: EditorTitleRunCommandDependencies
): (...commandArgs: unknown[]) => Promise<void> {
  return createAlgorithmsEditorTitleCommandForAction(dependencies, "check-only", "docker");
}

/**
 * Creates the editor-title Check Only (SSH) command.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
export function createAlgorithmsEditorTitleCheckOnlySshCommand(
  dependencies: EditorTitleRunCommandDependencies
): (...commandArgs: unknown[]) => Promise<void> {
  return createAlgorithmsEditorTitleCommandForAction(dependencies, "check-only", "ssh");
}

/**
 * Creates the editor-title Clean command.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
export function createAlgorithmsEditorTitleCleanCommand(
  dependencies: EditorTitleRunCommandDependencies
): (...commandArgs: unknown[]) => Promise<void> {
  return createAlgorithmsEditorTitleCommandForAction(dependencies, "clean");
}

/**
 * Creates the editor-title Local Clean command.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
export function createAlgorithmsEditorTitleLocalCleanCommand(
  dependencies: EditorTitleRunCommandDependencies
): (...commandArgs: unknown[]) => Promise<void> {
  return createAlgorithmsEditorTitleCommandForAction(dependencies, "localclean");
}

