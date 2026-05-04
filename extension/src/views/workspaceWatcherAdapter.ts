import * as vscode from "vscode";

import type { IAlgorithmsIndex } from "../algorithms";
import type { IConductor } from "../conductor";
import type { IFilesystem } from "../filesystem";

/**
 * DI contract for workspace watcher composition.
 */
export interface IWorkspaceWatcherAdapter {
  /**
   * Activates workspace file and folder watchers.
   *
   * @returns {vscode.Disposable} Composite watcher disposable.
   */
  activate(): vscode.Disposable;
}

/**
 * Input for creating the workspace watcher adapter.
 */
export interface CreateWorkspaceWatcherAdapterInput {
  conductor: IConductor;
  filesystem: IFilesystem;
  algorithmsIndex: IAlgorithmsIndex;
  refreshAlgorithmsTree: () => void;
  refreshStandardLibraryTree: () => void;
}

/**
 * Creates a workspace watcher adapter.
 *
 * @param {CreateWorkspaceWatcherAdapterInput} input Watcher dependencies.
 * @returns {IWorkspaceWatcherAdapter} Workspace watcher adapter.
 */
export function createWorkspaceWatcherAdapter(
  input: CreateWorkspaceWatcherAdapterInput
): IWorkspaceWatcherAdapter {
  /**
   * Returns current workspace folder paths.
   *
   * @returns {readonly string[]} Current workspace folder paths.
   */
  function getWorkspaceFolderPaths(): readonly string[] {
    return (vscode.workspace.workspaceFolders ?? []).map((workspaceFolder) => {
      return workspaceFolder.uri.fsPath;
    });
  }

  /**
   * Registers one file watcher and forwards events to workspace-path invalidation.
   *
   * @param {string} globPattern Glob pattern to watch.
   * @returns {vscode.Disposable} Combined watcher disposable.
   */
  function registerPathWatcher(globPattern: string): vscode.Disposable {
    const workspaceWatcher = vscode.workspace.createFileSystemWatcher(globPattern);
    const workspaceCreateWatcher = workspaceWatcher.onDidCreate((uri) => {
      input.conductor.handleWorkspacePathChanged?.({
        targetPath: uri.fsPath,
        filesystem: input.filesystem,
        algorithmsIndex: input.algorithmsIndex,
        workspaceFolderPaths: getWorkspaceFolderPaths(),
        refreshAlgorithmsTree: input.refreshAlgorithmsTree,
        refreshStandardLibraryTree: input.refreshStandardLibraryTree,
      });
    });
    const workspaceChangeWatcher = workspaceWatcher.onDidChange((uri) => {
      input.conductor.handleWorkspacePathChanged?.({
        targetPath: uri.fsPath,
        filesystem: input.filesystem,
        algorithmsIndex: input.algorithmsIndex,
        workspaceFolderPaths: getWorkspaceFolderPaths(),
        refreshAlgorithmsTree: input.refreshAlgorithmsTree,
        refreshStandardLibraryTree: input.refreshStandardLibraryTree,
      });
    });
    const workspaceDeleteWatcher = workspaceWatcher.onDidDelete((uri) => {
      input.conductor.handleWorkspacePathChanged?.({
        targetPath: uri.fsPath,
        filesystem: input.filesystem,
        algorithmsIndex: input.algorithmsIndex,
        workspaceFolderPaths: getWorkspaceFolderPaths(),
        refreshAlgorithmsTree: input.refreshAlgorithmsTree,
        refreshStandardLibraryTree: input.refreshStandardLibraryTree,
      });
    });

    return vscode.Disposable.from(
      workspaceWatcher,
      workspaceCreateWatcher,
      workspaceChangeWatcher,
      workspaceDeleteWatcher
    );
  }

  /**
   * Registers watchers for marker scripts that affect eligibility canary outcomes.
   *
   * @returns {vscode.Disposable} Combined marker watcher disposable.
   */
  function registerEligibilityMarkerWatcher(): vscode.Disposable {
    const markerWatcher = vscode.workspace.createFileSystemWatcher("**/{run.sh,init.sh}");

    const refreshWorkspaceSupported = (): void => {
      input.conductor.invalidateWorkspaceSupportCache?.();
      void input.conductor.refreshWorkspaceSupportedContext({
        workspaceFolderPaths: getWorkspaceFolderPaths(),
      });
    };

    const markerCreateWatcher = markerWatcher.onDidCreate(() => {
      refreshWorkspaceSupported();
    });
    const markerChangeWatcher = markerWatcher.onDidChange(() => {
      refreshWorkspaceSupported();
    });
    const markerDeleteWatcher = markerWatcher.onDidDelete(() => {
      refreshWorkspaceSupported();
    });

    return vscode.Disposable.from(
      markerWatcher,
      markerCreateWatcher,
      markerChangeWatcher,
      markerDeleteWatcher
    );
  }

  return {
    activate(): vscode.Disposable {
      const srcWatcher = registerPathWatcher("**/src/**/*");
      const stdlibWatcher = registerPathWatcher("**/stdlib/**/*");
      const eligibilityMarkerWatcher = registerEligibilityMarkerWatcher();
      const workspaceFoldersChangeWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        const updatedFolderPaths = (vscode.workspace.workspaceFolders ?? []).map(
          (workspaceFolder) => workspaceFolder.uri.fsPath
        );
        input.conductor.handleWorkspaceRootsChanged?.({
          filesystem: input.filesystem,
          algorithmsIndex: input.algorithmsIndex,
          refreshAlgorithmsTree: input.refreshAlgorithmsTree,
          refreshStandardLibraryTree: input.refreshStandardLibraryTree,
          workspaceFolderPaths: updatedFolderPaths,
        });
      });

      return vscode.Disposable.from(
        srcWatcher,
        stdlibWatcher,
        eligibilityMarkerWatcher,
        workspaceFoldersChangeWatcher
      );
    },
  };
}
