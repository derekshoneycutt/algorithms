import * as vscode from "vscode";

import type { IConductor } from "../conductor";
import type { ConductorRunActionKind } from "../conductor";
import type { IFilesystem } from "../filesystem";
import type { ILanguages } from "../languages";
import type { INotificationRouter } from "../notifications";
import type { IStateMachine } from "../state";
import { getOwningWorkspaceFolderPath, getWorkspaceFolderPaths } from "./workspaceFolders";

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

type CheckOnlyRoute = "native" | "docker" | "ssh";

/**
 * Creates a command handler for a specific Explorer run action.
 *
 * @param {ExplorerRunCommandDependencies} dependencies Command dependencies.
 * @param {ConductorRunActionKind} actionKind The action kind to dispatch.
 * @returns {(clickedUri?: vscode.Uri) => Promise<void>} Command handler.
 */
function createExplorerRunCommandForAction(
  dependencies: ExplorerRunCommandDependencies,
  actionKind: ConductorRunActionKind,
  checkOnlyRouteOverride?: CheckOnlyRoute
): (clickedUri?: vscode.Uri) => Promise<void> {
  return async (clickedUri?: vscode.Uri): Promise<void> => {
    if (clickedUri === undefined || clickedUri.fsPath.trim().length === 0) {
      await dependencies.notificationRouter.warn("Select a file under src/{category}/{algorithm}/ and try again.");
      return;
    }

    const workspaceFolderPaths = getWorkspaceFolderPaths();

    // Use full conductor orchestration for all actions so run status tracking is preserved.
    // Convert URI to a tree node-like object for conductor.runFile()
    await dependencies.conductor.runFile({
      actionKind,
      checkOnlyRouteOverride,
      filesystem: dependencies.filesystem,
      hostState: dependencies.hostState,
      languages: dependencies.languages,
      notificationRouter: dependencies.notificationRouter,
      owningWorkspaceFolderPath: getOwningWorkspaceFolderPath(clickedUri.fsPath),
      refreshAlgorithmsTree: dependencies.refreshAlgorithmsTree,
      treeNode: {
        kind: "file",
        filePath: clickedUri.fsPath,
      },
      workspaceFolderPaths,
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
  checkOnlyNative: (clickedUri?: vscode.Uri) => Promise<void>;
  checkOnlyDocker: (clickedUri?: vscode.Uri) => Promise<void>;
  checkOnlySsh: (clickedUri?: vscode.Uri) => Promise<void>;
  clean: (clickedUri?: vscode.Uri) => Promise<void>;
  localClean: (clickedUri?: vscode.Uri) => Promise<void>;
} {
  return {
    runFile: createExplorerRunCommandForAction(dependencies, "run-file"),
    compileOnly: createExplorerRunCommandForAction(dependencies, "compile-only"),
    checkOnlyNative: createExplorerRunCommandForAction(dependencies, "check-only", "native"),
    checkOnlyDocker: createExplorerRunCommandForAction(dependencies, "check-only", "docker"),
    checkOnlySsh: createExplorerRunCommandForAction(dependencies, "check-only", "ssh"),
    clean: createExplorerRunCommandForAction(dependencies, "clean"),
    localClean: createExplorerRunCommandForAction(dependencies, "localclean"),
  };
}
