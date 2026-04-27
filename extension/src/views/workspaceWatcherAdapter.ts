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
  return {
    activate(): vscode.Disposable {
      const workspaceWatcher = vscode.workspace.createFileSystemWatcher("**/*");
      const workspaceCreateWatcher = workspaceWatcher.onDidCreate((uri) => {
        input.conductor.handleWorkspacePathChanged?.({
          targetPath: uri.fsPath,
          filesystem: input.filesystem,
          algorithmsIndex: input.algorithmsIndex,
          refreshAlgorithmsTree: input.refreshAlgorithmsTree,
          refreshStandardLibraryTree: input.refreshStandardLibraryTree,
        });
      });
      const workspaceChangeWatcher = workspaceWatcher.onDidChange((uri) => {
        input.conductor.handleWorkspacePathChanged?.({
          targetPath: uri.fsPath,
          filesystem: input.filesystem,
          algorithmsIndex: input.algorithmsIndex,
          refreshAlgorithmsTree: input.refreshAlgorithmsTree,
          refreshStandardLibraryTree: input.refreshStandardLibraryTree,
        });
      });
      const workspaceDeleteWatcher = workspaceWatcher.onDidDelete((uri) => {
        input.conductor.handleWorkspacePathChanged?.({
          targetPath: uri.fsPath,
          filesystem: input.filesystem,
          algorithmsIndex: input.algorithmsIndex,
          refreshAlgorithmsTree: input.refreshAlgorithmsTree,
          refreshStandardLibraryTree: input.refreshStandardLibraryTree,
        });
      });
      const workspaceFoldersChangeWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        const updatedFolderPaths = (vscode.workspace.workspaceFolders ?? []).map(
          (workspaceFolder) => workspaceFolder.uri.fsPath
        );
        void input.conductor.refreshWorkspaceSupportedContext({
          workspaceFolderPaths: updatedFolderPaths,
        });
        input.conductor.handleWorkspaceRootsChanged?.({
          filesystem: input.filesystem,
          algorithmsIndex: input.algorithmsIndex,
          refreshAlgorithmsTree: input.refreshAlgorithmsTree,
          refreshStandardLibraryTree: input.refreshStandardLibraryTree,
        });
      });

      return vscode.Disposable.from(
        workspaceWatcher,
        workspaceCreateWatcher,
        workspaceChangeWatcher,
        workspaceDeleteWatcher,
        workspaceFoldersChangeWatcher
      );
    },
  };
}
