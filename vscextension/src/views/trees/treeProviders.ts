import * as path from "node:path";
import type { Dirent } from "node:fs";

import * as vscode from "vscode";

import type { IFilesystem } from "../../filesystem";
import type { ILanguages } from "../../languages";
import type { IAlgorithmsIndex } from "../../algorithms";
import type { IViewModeService } from "../../state/viewMode";

/**
 * One tree node rendered in the workspace tree panels.
 *
 * Node kinds:
 * - "directory": generic folder (category-level dir, stdlib dir)
 * - "algorithmDir": algorithm directory (second-level in algorithms tree, has implementations)
 * - "file": plain file (non-collapsible)
 * - "mainFile": algorithm main file (collapsible, may have includes)
 * - "languageSummary": language grouping row for LANGUAGE view (collapsible)
 *
 * Algorithm directories have:
 * - kind: "algorithmDir"
 * - filePath: the algorithm directory path
 *
 * Main files (in FILES view) have:
 * - kind: "mainFile"
 * - filePath: the main file path
 * - languageKey: the language of this main file
 * - parentAlgorithmPath: the algorithm directory
 *
 * Language summary rows (in LANGUAGE view) have:
 * - kind: "languageSummary"
 * - filePath: the main file path (for opening)
 * - languageKey: the language key (for label display)
 * - parentAlgorithmPath: the algorithm directory
 *
 * Include files have:
 * - kind: "file"
 * - filePath: the include file path
 * - languageKey: the language of the include file
 * - isIncludeFile: true
 */
export interface WorkspaceTreeNode {
  kind: "directory" | "algorithmDir" | "file" | "mainFile" | "languageSummary";
  filePath: string;
  filePathsByLanguage?: Record<string, string[]>;
  languageKey?: string;
  parentAlgorithmPath?: string;
  isIncludeFile?: boolean;
  /** True when this node has include files nested under it. Controls collapse arrow. */
  hasIncludes?: boolean;
  /** Total language file count in the current algorithm (main and include files). */
  languageFileCount?: number;
  /** True when this row has a concrete open target file. */
  hasOpenTarget?: boolean;
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
 * Dependencies for creating one algorithms tree data provider.
 */
export interface AlgorithmsTreeDataProviderDependencies {
  algorithmsIndex: IAlgorithmsIndex;
  viewModeService: IViewModeService;
  languages: ILanguages;
}

/**
 * Dependencies for creating one standard-library tree data provider.
 */
export interface StandardLibraryTreeDataProviderDependencies {
  algorithmsIndex: IAlgorithmsIndex;
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
 * Returns true when a directory name matches the {languageKey}_include pattern.
 *
 * @param {string} directoryName Directory name to check.
 * @returns {boolean} True when the name matches {languageKey}_include pattern.
 */
export function isLanguageIncludeDirectoryName(directoryName: string): boolean {
  const trimmed = directoryName.trim();
  if (trimmed.length < 9) {
    return false;
  }
  return trimmed.endsWith("_include");
}

/**
 * Reads include files from one {languageKey}_include directory.
 *
 * @param {string} includeDirectoryPath Path to the include directory.
 * @param {string} parentAlgorithmPath Path to the parent algorithm directory.
 * @param {string} languageKey Language key for validation.
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @param {ILanguages} languages Languages dependency.
 * @returns {Promise<WorkspaceTreeNode[]>} Include file nodes.
 */
export async function readIncludeFiles(
  includeDirectoryPath: string,
  parentAlgorithmPath: string,
  languageKey: string,
  filesystem: IFilesystem,
  languages: ILanguages
): Promise<WorkspaceTreeNode[]> {
  const directoryEntries = await filesystem.listDirectory(includeDirectoryPath, {
    withFileTypes: true,
  });

  if (directoryEntries === null) {
    return [];
  }

  const entries = (directoryEntries as Dirent[]).filter((entry) => {
    return isDirentEntry(entry);
  });
  entries.sort((leftEntry, rightEntry) => {
    return compareTreeNames(
      leftEntry.name,
      leftEntry.isDirectory(),
      rightEntry.name,
      rightEntry.isDirectory()
    );
  });

  const includeFiles: WorkspaceTreeNode[] = [];

  for (const directoryEntry of entries) {
    if (isHiddenName(directoryEntry.name)) {
      continue;
    }

    if (directoryEntry.isDirectory()) {
      continue;
    }

    if (!directoryEntry.isFile()) {
      continue;
    }

    const entryPath = path.join(includeDirectoryPath, directoryEntry.name);

    if (!isSupportedLanguageFile(languages, entryPath)) {
      continue;
    }

    const fileLanguageKey = languages.normalizeFileExtension(entryPath);
    if (fileLanguageKey !== languageKey) {
      continue;
    }

    includeFiles.push({
      kind: "file",
      filePath: entryPath,
      languageKey,
      isIncludeFile: true,
    });
  }

  return includeFiles;
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
 * Creates one TreeItem for the given node.
 *
 * @param {WorkspaceTreeNode} element Tree element.
 * @returns {vscode.TreeItem} Tree item instance.
 */
function createTreeItem(
  element: WorkspaceTreeNode,
  contextValue?: string
): vscode.TreeItem {
  const resourceUri = vscode.Uri.file(element.filePath);

  // Handle language summary rows
  if (element.kind === "languageSummary" && element.languageKey) {
    const collapsibleState = element.hasIncludes
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
    // Pass the URI as the constructor arg so VS Code applies the file icon theme,
    // then override label with the language key string.
    const treeItem = new vscode.TreeItem(resourceUri, collapsibleState);
    treeItem.label = element.languageKey;
    if (element.languageFileCount !== undefined) {
      treeItem.description = String(element.languageFileCount);
    }
    treeItem.resourceUri = resourceUri;
    if (element.hasIncludes) {
      // Collapsible items would otherwise get a folder icon; force file styling.
      treeItem.iconPath = vscode.ThemeIcon.File;
    }
    if (element.hasOpenTarget !== false) {
      treeItem.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [resourceUri],
      };
    }
    if (contextValue !== undefined) {
      treeItem.contextValue = contextValue;
    }
    return treeItem;
  }

  // Handle mainFile nodes (FILES view collapsible main files)
  if (element.kind === "mainFile") {
    const collapsibleState = element.hasIncludes
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
    const treeItem = new vscode.TreeItem(resourceUri, collapsibleState);
    treeItem.resourceUri = resourceUri;
    if (element.hasIncludes) {
      // Collapsible items would otherwise get a folder icon; force file styling.
      treeItem.iconPath = vscode.ThemeIcon.File;
    }
    treeItem.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [resourceUri],
    };
    if (contextValue !== undefined) {
      treeItem.contextValue = contextValue;
    }
    return treeItem;
  }

  if (element.kind === "directory" || element.kind === "algorithmDir") {
    const treeItem = new vscode.TreeItem(
      resourceUri,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    treeItem.resourceUri = resourceUri;
    if (contextValue !== undefined) {
      treeItem.contextValue = contextValue;
    }
    return treeItem;
  }

  const treeItem = new vscode.TreeItem(resourceUri, vscode.TreeItemCollapsibleState.None);
  treeItem.resourceUri = resourceUri;
  treeItem.command = {
    command: "vscode.open",
    title: "Open File",
    arguments: [resourceUri],
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
  const { algorithmsIndex, viewModeService, languages } = dependencies;
  const onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    WorkspaceTreeNode | undefined | null | void
  >();

  // Refresh the tree whenever the user switches view modes
  viewModeService.onDidChangeViewMode(() => {
    onDidChangeTreeDataEmitter.fire();
  });

  return {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,

    async getChildren(element?: WorkspaceTreeNode): Promise<WorkspaceTreeNode[]> {
      const viewMode = viewModeService.getViewMode();

      // Include file parents: return include files from precomputed paths
      if (
        element !== undefined &&
        (element.kind === "languageSummary" || element.kind === "mainFile") &&
        element.languageKey &&
        element.parentAlgorithmPath
      ) {
        const implementations = await algorithmsIndex.getImplementations(
          element.parentAlgorithmPath
        );
        const impl = implementations.find(
          (i) => i.languageKey === element.languageKey
        );
        if (impl === undefined) {
          return [];
        }
        return impl.includeFilePaths.map((filePath) => ({
          kind: "file" as const,
          filePath,
          languageKey: element.languageKey,
          isIncludeFile: true,
        }));
      }

      // Algorithm directory: return mainFile or languageSummary nodes
      if (element !== undefined && element.kind === "algorithmDir") {
        const implementations = await algorithmsIndex.getImplementations(element.filePath);

        if (viewMode === "language") {
          const implementationsByLanguage = new Map(
            implementations.map((implementation) => {
              return [implementation.languageKey, implementation] as const;
            })
          );

          return languages.getAll().map((languageRecord) => {
            const implementation = implementationsByLanguage.get(languageRecord.key);
            return {
              kind: "languageSummary" as const,
              filePath: implementation?.filePath ?? element.filePath,
              filePathsByLanguage: implementation !== undefined
                ? { [implementation.languageKey]: implementation.filePaths }
                : undefined,
              languageKey: languageRecord.key,
              parentAlgorithmPath: element.filePath,
              hasIncludes: (implementation?.includeFilePaths.length ?? 0) > 0,
              languageFileCount: (implementation?.filePaths.length ?? 0)
                + (implementation?.includeFilePaths.length ?? 0),
              hasOpenTarget: implementation !== undefined,
            };
          });
        } else {
          const mainFileNodes = implementations.map((impl) => ({
            kind: "mainFile" as const,
            filePath: impl.filePath,
            filePathsByLanguage: { [impl.languageKey]: impl.filePaths },
            languageKey: impl.languageKey,
            parentAlgorithmPath: element.filePath,
            hasIncludes: impl.hasIncludes,
          }));

          const representativePathSet = new Set(
            implementations.map((implementation) => implementation.filePath)
          );
          const extraFilePaths = implementations
            .flatMap((implementation) => implementation.filePaths)
            .filter((filePath) => !representativePathSet.has(filePath))
            .sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));

          const extraFileNodes = extraFilePaths.map((filePath) => ({
            kind: "file" as const,
            filePath,
          }));

          return [...mainFileNodes, ...extraFileNodes];
        }
      }

      // Category directory: return algorithm dirs
      if (element !== undefined && element.kind === "directory") {
        const algorithms = await algorithmsIndex.getAlgorithms(element.filePath);
        return algorithms.map((algo) => ({
          kind: "algorithmDir" as const,
          filePath: algo.path,
        }));
      }

      if (element !== undefined) {
        return [];
      }

      // Root: return categories
      const categories = await algorithmsIndex.getCategories();
      return categories.map((category) => ({
        kind: "directory" as const,
        filePath: category.path,
      }));
    },

    getTreeItem(element: WorkspaceTreeNode): vscode.TreeItem {
      let contextValue: string | undefined;

      if (element.kind === "languageSummary" && element.languageKey) {
        contextValue = "algos.algorithmsLanguageSummary";
      } else if (element.kind === "mainFile") {
        contextValue = "algos.algorithmsMainFile";
      } else if (element.isIncludeFile) {
        contextValue = "algos.algorithmsIncludeFile";
      } else if (element.kind === "algorithmDir") {
        contextValue = "algos.algorithmsSecondLevelDirectory";
      } else if (element.kind === "directory") {
        contextValue = "algos.algorithmsFirstLevelDirectory";
      } else if (element.kind === "file") {
        contextValue = "algos.algorithmFile";
      }

      const treeItem = createTreeItem(element, contextValue);

      if (element.kind === "languageSummary" && element.languageKey) {
        treeItem.label =
          languages.getDisplayLabel(element.languageKey)
          ?? element.languageKey;
      }

      return treeItem;
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
