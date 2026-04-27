import * as vscode from "vscode";

import type {
  StandardLibraryTreeDataProviderDependencies,
  RefreshableWorkspaceTreeDataProvider,
  WorkspaceTreeNode,
} from "./types";
import { createTreeItem } from "./treeProviders";

/**
 * Creates one standard-library tree data provider.
 *
 * @param {StandardLibraryTreeDataProviderDependencies} dependencies Provider dependencies.
 * @returns {RefreshableWorkspaceTreeDataProvider} Standard-library tree provider.
 */
export function createWorkspaceStandardLibraryTreeDataProvider(
  dependencies: StandardLibraryTreeDataProviderDependencies
): RefreshableWorkspaceTreeDataProvider {
  const { algorithmsIndex } = dependencies;
  const onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    WorkspaceTreeNode | undefined | null | void
  >();

  return {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,

    async getChildren(element?: WorkspaceTreeNode): Promise<WorkspaceTreeNode[]> {
      const dirPath = element !== undefined
        ? (element.kind === "directory" ? element.filePath : undefined)
        : undefined;

      if (element !== undefined && element.kind !== "directory") {
        return [];
      }

      const entries = await algorithmsIndex.getStandardLibraryEntries(dirPath);
      return entries.map((entry) => ({
        kind: entry.kind === "directory" ? "directory" as const : "file" as const,
        filePath: entry.path,
      }));
    },

    getTreeItem(element: WorkspaceTreeNode): vscode.TreeItem {
      if (element.kind === "directory") {
        return createTreeItem(element, "algos.standardLibraryDirectory");
      }

      return createTreeItem(element, "algos.standardLibraryFile");
    },

    refresh(): void {
      onDidChangeTreeDataEmitter.fire();
    },
  };
}
