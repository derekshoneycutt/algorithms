import * as path from "node:path";

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
  const { algorithmsIndex, viewId } = dependencies;
  const onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    WorkspaceTreeNode | undefined | null | void
  >();

  let cachedStdlibRoot: string | undefined;
  const filePathToStdlibNode = new Map<string, WorkspaceTreeNode>();

  /**
   * Resolves and memoizes the stdlib root directory path.
   *
   * @returns {Promise<string | undefined>} Stdlib root path when discoverable.
   */
  async function getStdlibRoot(): Promise<string | undefined> {
    if (cachedStdlibRoot !== undefined) {
      return cachedStdlibRoot;
    }
    const rootEntries = await algorithmsIndex.getStandardLibraryEntries();
    if (rootEntries.length > 0) {
      cachedStdlibRoot = path.dirname(rootEntries[0].path);
    }
    return cachedStdlibRoot;
  }

  /**
   * Recursively searches the stdlib tree for one target file path.
   *
   * @param {string} targetPath Absolute path to find.
   * @param {string | undefined} dirPath Current stdlib directory path.
   * @returns {Promise<WorkspaceTreeNode | null>} Matching node when found.
   */
  async function findInStdlib(
    targetPath: string,
    dirPath: string | undefined
  ): Promise<WorkspaceTreeNode | null> {
    const entries = await algorithmsIndex.getStandardLibraryEntries(dirPath);
    for (const entry of entries) {
      if (entry.path === targetPath) {
        return {
          kind: entry.kind === "directory" ? "directory" : "file",
          filePath: entry.path,
        };
      }
      if (entry.kind === "directory" && targetPath.startsWith(entry.path + path.sep)) {
        return findInStdlib(targetPath, entry.path);
      }
    }
    return null;
  }

  return {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,

    /**
     * Resolves one parent node for a standard-library element.
     *
     * @param {WorkspaceTreeNode} element Tree element.
     * @returns {Promise<WorkspaceTreeNode | undefined>} Parent node when present.
     */
    async getParent(element: WorkspaceTreeNode): Promise<WorkspaceTreeNode | undefined> {
      const stdlibRoot = await getStdlibRoot();
      const parentDirPath = path.dirname(element.filePath);
      if (parentDirPath === stdlibRoot || stdlibRoot === undefined) {
        return undefined;
      }
      return { kind: "directory", filePath: parentDirPath };
    },

    /**
     * Resolves child nodes for the given parent element.
     *
     * @param {WorkspaceTreeNode} [element] Parent element.
     * @returns {Promise<WorkspaceTreeNode[]>} Child nodes.
     */
    async getChildren(element?: WorkspaceTreeNode): Promise<WorkspaceTreeNode[]> {
      const dirPath = element !== undefined
        ? (element.kind === "directory" ? element.filePath : undefined)
        : undefined;

      if (element !== undefined && element.kind !== "directory") {
        return [];
      }

      const entries = await algorithmsIndex.getStandardLibraryEntries(dirPath);
      return entries.map((entry) => {
        const node: WorkspaceTreeNode = {
          kind: entry.kind === "directory" ? "directory" as const : "file" as const,
          filePath: entry.path,
        };
        filePathToStdlibNode.set(entry.path, node);
        return node;
      });
    },

    getTreeItem(element: WorkspaceTreeNode): vscode.TreeItem {
      if (element.kind === "directory") {
        return createTreeItem(element, "algos.standardLibraryDirectory");
      }

      return createTreeItem(element, "algos.standardLibraryFile");
    },

    /**
     * Triggers a tree refresh.
     *
     * @returns {void}
     */
    refresh(): void {
      cachedStdlibRoot = undefined;
      filePathToStdlibNode.clear();
      onDidChangeTreeDataEmitter.fire();
    },

    /**
     * Finds one tree node that corresponds to the given file path.
     *
     * @param {string} filePath Absolute file path.
     * @returns {Promise<{ node: WorkspaceTreeNode; viewId: string } | null>} Found node and owner view id, or null.
     */
    async findNodeForFilePath(
      filePath: string
    ): Promise<{ node: WorkspaceTreeNode; viewId: string } | null> {
      const cached = filePathToStdlibNode.get(filePath);
      if (cached !== undefined) {
        return { node: cached, viewId };
      }
      const node = await findInStdlib(filePath, undefined);
      if (node === null) {
        return null;
      }
      return { node, viewId };
    },
  };
}
