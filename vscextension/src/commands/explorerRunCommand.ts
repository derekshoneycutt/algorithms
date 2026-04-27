import * as vscode from "vscode";

import type { IConductor } from "../conductor";
import type { ConductorRunActionKind } from "../conductor";
import type { IFilesystem } from "../filesystem";
import type { ILanguages } from "../languages";
import type { INotificationRouter } from "../notifications";
import type { IStateMachine } from "../state";

/**
 * Dependencies for Explorer context menu run commands.
 */
export interface ExplorerRunCommandDependencies {
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
 * Creates a command handler for a specific Explorer run action.
 *
 * @param {ExplorerRunCommandDependencies} dependencies Command dependencies.
 * @param {ConductorRunActionKind} actionKind The action kind to dispatch.
 * @returns {(clickedUri?: vscode.Uri) => Promise<void>} Command handler.
 */
function createExplorerRunCommandForAction(
  dependencies: ExplorerRunCommandDependencies,
  actionKind: ConductorRunActionKind
): (clickedUri?: vscode.Uri) => Promise<void> {
  return async (clickedUri?: vscode.Uri): Promise<void> => {
    if (clickedUri === undefined || clickedUri.fsPath.trim().length === 0) {
      await dependencies.notificationRouter.warn("Select a file under src/{category}/{algorithm}/ and try again.");
      return;
    }

    // For simple run-file action, use direct dispatch; for other actions, use conductor's full orchestration
    if (actionKind === "run-file") {
      await dependencies.conductor.runAlgorithmFile(clickedUri);
      return;
    }

    // For other actions (compile-only, check-only, clean, localclean), use full conductor orchestration
    // Convert URI to a tree node-like object for conductor.runFile()
    await dependencies.conductor.runFile({
      actionKind,
      filesystem: dependencies.filesystem,
      hostState: dependencies.hostState,
      languages: dependencies.languages,
      notificationRouter: dependencies.notificationRouter,
      refreshAlgorithmsTree: dependencies.refreshAlgorithmsTree,
      treeNode: {
        kind: "file",
        filePath: clickedUri.fsPath,
      },
      workspaceFolderPaths: getWorkspaceFolderPaths(),
    });
  };
}

/**
 * Creates all Explorer context menu run command handlers.
 *
 * @param {ExplorerRunCommandDependencies} dependencies Command dependencies.
 * @returns {Object} Object with command handler functions.
 */
export function createAlgorithmsExplorerRunCommands(
  dependencies: ExplorerRunCommandDependencies
): {
  runFile: (clickedUri?: vscode.Uri) => Promise<void>;
  compileOnly: (clickedUri?: vscode.Uri) => Promise<void>;
  checkOnly: (clickedUri?: vscode.Uri) => Promise<void>;
  clean: (clickedUri?: vscode.Uri) => Promise<void>;
  localClean: (clickedUri?: vscode.Uri) => Promise<void>;
} {
  return {
    runFile: createExplorerRunCommandForAction(dependencies, "run-file"),
    compileOnly: createExplorerRunCommandForAction(dependencies, "compile-only"),
    checkOnly: createExplorerRunCommandForAction(dependencies, "check-only"),
    clean: createExplorerRunCommandForAction(dependencies, "clean"),
    localClean: createExplorerRunCommandForAction(dependencies, "localclean"),
  };
}
