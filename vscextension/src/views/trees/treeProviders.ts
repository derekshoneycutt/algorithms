import * as path from "node:path";
import type { Dirent } from "node:fs";

import * as vscode from "vscode";

import type { IFilesystem } from "../../filesystem";
import type { ILanguages } from "../../languages";

/**
 * One tree node rendered in the workspace tree panels.
 */
export interface WorkspaceTreeNode {
  kind: "directory" | "file";
  filePath: string;
}

/**
 * Tree data provider contract with explicit refresh support.
 */
export interface RefreshableWorkspaceTreeDataProvider
  extends vscode.TreeDataProvider<WorkspaceTreeNode> {
  /**
   * Triggers a tree refresh.
   *
   * @returns {void}
   */
  refresh(): void;
}

/**
 * Dependencies for restricted tree node discovery.
 */
export interface RestrictedTreeDiscoveryDependencies {
  filesystem: IFilesystem;
  languages: ILanguages;
}

/**
 * Dependencies for resolving an algorithms tree root.
 */
export interface AlgorithmsTreeRootDependencies {
  filesystem: IFilesystem;
  workspaceFolderPaths: readonly string[];
}

/**
 * Dependencies for resolving a standard-library tree root.
 */
export interface StandardLibraryTreeRootDependencies {
  filesystem: IFilesystem;
  workspaceFolderPaths: readonly string[];
}

/**
 * Dependencies for creating one algorithms tree data provider.
 */
export interface AlgorithmsTreeDataProviderDependencies {
  filesystem: IFilesystem;
  languages: ILanguages;
  workspaceFolderPaths?: readonly string[];
}

/**
 * Dependencies for creating one standard-library tree data provider.
 */
export interface StandardLibraryTreeDataProviderDependencies {
  filesystem: IFilesystem;
  languages: ILanguages;
  workspaceFolderPaths?: readonly string[];
}

/**
 * Returns true when a path segment should be hidden from tree views.
 *
 * @param {string} name Path segment name.
 * @returns {boolean} True when hidden.
 */
function isHiddenName(name: string): boolean {
  return name.startsWith(".");
}

/**
 * Returns true when a directory segment is the reserved output directory.
 *
 * @param {string} name Path segment name.
 * @returns {boolean} True when the directory is output.
 */
function isOutputDirectoryName(name: string): boolean {
  return name.trim().toLowerCase() === "output";
}

/**
 * Compares two path names for stable tree ordering.
 *
 * @param {string} leftName Left item name.
 * @param {boolean} leftIsDirectory Left item directory flag.
 * @param {string} rightName Right item name.
 * @param {boolean} rightIsDirectory Right item directory flag.
 * @returns {number} Sort order.
 */
function compareTreeNames(
  leftName: string,
  leftIsDirectory: boolean,
  rightName: string,
  rightIsDirectory: boolean
): number {
  if (leftIsDirectory && !rightIsDirectory) {
    return -1;
  }

  if (!leftIsDirectory && rightIsDirectory) {
    return 1;
  }

  return leftName.localeCompare(rightName);
}

/**
 * Resolves one source root when a workspace folder points at a repo root.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @param {string} workspaceFolderPath Workspace folder path.
 * @returns {Promise<string | null>} Canonical src root path when present.
 */
async function resolveSourceRootForWorkspaceFolder(
  filesystem: IFilesystem,
  workspaceFolderPath: string
): Promise<string | null> {
  const canonicalWorkspaceFolderPath = await filesystem.realpath(workspaceFolderPath);
  const sourceDirectoryPath = path.join(canonicalWorkspaceFolderPath, "src");

  if (await filesystem.isDirectory(sourceDirectoryPath)) {
    return await filesystem.realpath(sourceDirectoryPath);
  }

  return null;
}

/**
 * Returns true when a path contains a src segment.
 *
 * @param {string} inputPath Candidate path.
 * @returns {boolean} True when the path contains src as one segment.
 */
function hasSourceSegment(inputPath: string): boolean {
  const parsedPath = path.parse(inputPath);
  const rootLength = parsedPath.root.length;
  const relativePath = inputPath.slice(rootLength);
  const segments = relativePath.split(path.sep).filter(Boolean);
  return segments.includes("src");
}

/**
 * Resolves the repository root from one path that may be inside src.
 *
 * @param {string} sourcePath Path that may include src.
 * @returns {string | null} Repository root when src is found.
 */
function resolveRepositoryRootFromSourcePath(sourcePath: string): string | null {
  let cursor = path.resolve(sourcePath);

  while (true) {
    if (path.basename(cursor) === "src") {
      return path.dirname(cursor);
    }

    const parentPath = path.dirname(cursor);
    if (parentPath === cursor) {
      return null;
    }

    cursor = parentPath;
  }
}

/**
 * Resolves one algorithms tree root for the current workspace.
 *
 * Rules:
 * 1. Workspace folder with a src directory uses that src directory.
 * 2. Workspace folder inside src uses the folder path directly.
 *
 * @param {AlgorithmsTreeRootDependencies} dependencies Resolver dependencies.
 * @returns {Promise<string | null>} Canonical root path or null when unsupported.
 */
export async function resolveAlgorithmsTreeRootPath(
  dependencies: AlgorithmsTreeRootDependencies
): Promise<string | null> {
  const { filesystem, workspaceFolderPaths } = dependencies;

  for (const workspaceFolderPath of workspaceFolderPaths) {
    const srcRootPath = await resolveSourceRootForWorkspaceFolder(
      filesystem,
      workspaceFolderPath
    );

    if (srcRootPath !== null) {
      return srcRootPath;
    }

    const canonicalWorkspaceFolderPath = await filesystem.realpath(workspaceFolderPath);

    if (hasSourceSegment(canonicalWorkspaceFolderPath)) {
      return canonicalWorkspaceFolderPath;
    }
  }

  return null;
}

/**
 * Resolves one standard-library tree root for the current workspace.
 *
 * Rules:
 * 1. Workspace folder with stdlib directory uses that stdlib directory.
 * 2. Workspace folder inside src resolves repoRoot/stdlib when present.
 *
 * @param {StandardLibraryTreeRootDependencies} dependencies Resolver dependencies.
 * @returns {Promise<string | null>} Canonical stdlib root path or null when unsupported.
 */
export async function resolveStandardLibraryTreeRootPath(
  dependencies: StandardLibraryTreeRootDependencies
): Promise<string | null> {
  const { filesystem, workspaceFolderPaths } = dependencies;

  for (const workspaceFolderPath of workspaceFolderPaths) {
    const canonicalWorkspaceFolderPath = await filesystem.realpath(workspaceFolderPath);
    const workspaceStdlibPath = path.join(canonicalWorkspaceFolderPath, "stdlib");

    if (await filesystem.isDirectory(workspaceStdlibPath)) {
      return await filesystem.realpath(workspaceStdlibPath);
    }

    if (!hasSourceSegment(canonicalWorkspaceFolderPath)) {
      continue;
    }

    const repositoryRootPath = resolveRepositoryRootFromSourcePath(
      canonicalWorkspaceFolderPath
    );

    if (repositoryRootPath === null) {
      continue;
    }

    const repositoryStdlibPath = path.join(repositoryRootPath, "stdlib");
    if (await filesystem.isDirectory(repositoryStdlibPath)) {
      return await filesystem.realpath(repositoryStdlibPath);
    }
  }

  return null;
}

/**
 * Resolves a context value for an Algorithms tree element based on its depth relative to tree root.
 *
 * Rules:
 * 1. First-level directory (e.g., src/numeric): "algos.algorithmsFirstLevelDirectory"
 * 2. Second-level directory (e.g., src/numeric/euclidgcd): "algos.algorithmsSecondLevelDirectory"
 * 3. File at any level: "algos.algorithmFile"
 *
 * @param {WorkspaceTreeNode} element Tree element.
 * @param {string} treeRootPath Canonical algorithms tree root path (e.g., src/).
 * @returns {string | undefined} Context value for the element or undefined for no context assignment.
 */
function resolveAlgorithmsElementContextValue(
  element: WorkspaceTreeNode,
  treeRootPath: string
): string | undefined {
  if (element.kind === "file") {
    return "algos.algorithmFile";
  }

  const relativePath = path.relative(treeRootPath, element.filePath);
  const depthSegments = relativePath.split(path.sep).filter((segment) => segment.length > 0);

  if (depthSegments.length === 1) {
    return "algos.algorithmsFirstLevelDirectory";
  }

  if (depthSegments.length === 2) {
    return "algos.algorithmsSecondLevelDirectory";
  }

  return undefined;
}

/**
 * Returns true when one file is mapped to a supported language key.
 *
 * @param {ILanguages} languages Languages dependency.
 * @param {string} filePath File path.
 * @returns {boolean} True when the file extension resolves to a language key.
 */
function isSupportedLanguageFile(languages: ILanguages, filePath: string): boolean {
  return languages.normalizeFileExtension(filePath) !== undefined;
}

/**
 * Returns true when one directory-list entry is a Dirent object.
 *
 * @param {string | Dirent} entry Directory entry.
 * @returns {entry is Dirent} True when the entry exposes Dirent APIs.
 */
function isDirentEntry(entry: string | Dirent): entry is Dirent {
  return typeof entry !== "string";
}

/**
 * Reads visible child nodes for one directory with restricted filtering.
 *
 * @param {string} directoryPath Directory path to inspect.
 * @param {RestrictedTreeDiscoveryDependencies} dependencies Discovery dependencies.
 * @returns {Promise<WorkspaceTreeNode[]>} Visible child nodes.
 */
export async function readRestrictedDirectoryChildren(
  directoryPath: string,
  dependencies: RestrictedTreeDiscoveryDependencies
): Promise<WorkspaceTreeNode[]> {
  const { filesystem, languages } = dependencies;
  const canonicalDirectoryPath = await filesystem.realpath(directoryPath);
  const entries = await filesystem.listDirectory(canonicalDirectoryPath, {
    withFileTypes: true,
  });

  if (entries === null) {
    return [];
  }

  const directoryEntries = entries.filter(isDirentEntry);

  directoryEntries.sort((leftEntry, rightEntry) => {
    return compareTreeNames(
      leftEntry.name,
      leftEntry.isDirectory(),
      rightEntry.name,
      rightEntry.isDirectory()
    );
  });

  const visibleChildren: WorkspaceTreeNode[] = [];

  for (const directoryEntry of directoryEntries) {
    if (isHiddenName(directoryEntry.name)) {
      continue;
    }

    const entryPath = path.join(canonicalDirectoryPath, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      if (isOutputDirectoryName(directoryEntry.name)) {
        continue;
      }

      const nestedChildren = await readRestrictedDirectoryChildren(entryPath, dependencies);
      if (nestedChildren.length === 0) {
        continue;
      }

      visibleChildren.push({
        kind: "directory",
        filePath: entryPath,
      });

      continue;
    }

    if (!directoryEntry.isFile()) {
      continue;
    }

    if (!isSupportedLanguageFile(languages, entryPath)) {
      continue;
    }

    visibleChildren.push({
      kind: "file",
      filePath: entryPath,
    });
  }

  return visibleChildren;
}

/**
 * Returns workspace folder paths from either explicit input or VS Code state.
 *
 * @param {readonly string[] | undefined} workspaceFolderPaths Optional explicit folder paths.
 * @returns {readonly string[]} Workspace folder paths.
 */
function getWorkspaceFolderPaths(
  workspaceFolderPaths: readonly string[] | undefined
): readonly string[] {
  if (workspaceFolderPaths !== undefined) {
    return workspaceFolderPaths;
  }

  return (vscode.workspace.workspaceFolders ?? []).map((workspaceFolder) => {
    return workspaceFolder.uri.fsPath;
  });
}

/**
 * Creates one TreeItem for the given node.
 *
 * @param {WorkspaceTreeNode} element Tree element.
 * @returns {vscode.TreeItem} Tree item instance.
 */
function createTreeItem(
  element: WorkspaceTreeNode,
  contextValue?: string
): vscode.TreeItem {
  const label = path.basename(element.filePath);

  if (element.kind === "directory") {
    const treeItem = new vscode.TreeItem(
      label,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    treeItem.resourceUri = vscode.Uri.file(element.filePath);
    if (contextValue !== undefined) {
      treeItem.contextValue = contextValue;
    }
    return treeItem;
  }

  const treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
  treeItem.resourceUri = vscode.Uri.file(element.filePath);
  treeItem.command = {
    command: "vscode.open",
    title: "Open File",
    arguments: [vscode.Uri.file(element.filePath)],
  };
  if (contextValue !== undefined) {
    treeItem.contextValue = contextValue;
  }
  return treeItem;
}

/**
 * Creates one algorithms tree data provider.
 *
 * @param {AlgorithmsTreeDataProviderDependencies} dependencies Provider dependencies.
 * @returns {vscode.TreeDataProvider<WorkspaceTreeNode>} Algorithms tree provider.
 */
export function createWorkspaceAlgorithmsTreeDataProvider(
  dependencies: AlgorithmsTreeDataProviderDependencies
): RefreshableWorkspaceTreeDataProvider {
  const { filesystem, languages } = dependencies;
  const onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    WorkspaceTreeNode | undefined | null | void
  >();
  let cachedTreeRootPath: string | null | undefined = undefined;

  return {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,

    async getChildren(element?: WorkspaceTreeNode): Promise<WorkspaceTreeNode[]> {
      if (element !== undefined) {
        if (element.kind !== "directory") {
          return [];
        }

        return await readRestrictedDirectoryChildren(element.filePath, {
          filesystem,
          languages,
        });
      }

      if (cachedTreeRootPath === undefined) {
        cachedTreeRootPath = await resolveAlgorithmsTreeRootPath({
          filesystem,
          workspaceFolderPaths: getWorkspaceFolderPaths(dependencies.workspaceFolderPaths),
        });
      }

      if (cachedTreeRootPath === null) {
        return [];
      }

      return await readRestrictedDirectoryChildren(cachedTreeRootPath, {
        filesystem,
        languages,
      });
    },

    getTreeItem(element: WorkspaceTreeNode): vscode.TreeItem {
      if (cachedTreeRootPath === null || cachedTreeRootPath === undefined) {
        return createTreeItem(element);
      }

      const contextValue = resolveAlgorithmsElementContextValue(element, cachedTreeRootPath);
      return createTreeItem(element, contextValue);
    },

    refresh(): void {
      onDidChangeTreeDataEmitter.fire();
    },
  };
}

/**
 * Creates one standard-library tree data provider.
 *
 * @param {StandardLibraryTreeDataProviderDependencies} dependencies Provider dependencies.
 * @returns {vscode.TreeDataProvider<WorkspaceTreeNode>} Standard-library tree provider.
 */
export function createWorkspaceStandardLibraryTreeDataProvider(
  dependencies: StandardLibraryTreeDataProviderDependencies
): RefreshableWorkspaceTreeDataProvider {
  const { filesystem, languages } = dependencies;
  const onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    WorkspaceTreeNode | undefined | null | void
  >();

  return {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,

    async getChildren(element?: WorkspaceTreeNode): Promise<WorkspaceTreeNode[]> {
      if (element !== undefined) {
        if (element.kind !== "directory") {
          return [];
        }

        return await readRestrictedDirectoryChildren(element.filePath, {
          filesystem,
          languages,
        });
      }

      const workspaceRootPath = await resolveStandardLibraryTreeRootPath({
        filesystem,
        workspaceFolderPaths: getWorkspaceFolderPaths(dependencies.workspaceFolderPaths),
      });

      if (workspaceRootPath === null) {
        return [];
      }

      return await readRestrictedDirectoryChildren(workspaceRootPath, {
        filesystem,
        languages,
      });
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
