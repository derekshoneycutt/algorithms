import * as path from "node:path";
import type { Dirent } from "node:fs";

import * as vscode from "vscode";

import type { IFilesystem } from "../../filesystem";
import type { ILanguages } from "../../languages";
import type { RestrictedTreeDiscoveryDependencies, WorkspaceTreeNode } from "./types";

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
 * URI fragments for FileDecoration provider.
 */
const URI_FRAGMENT_FLAGGED = "algos-language-flagged";
const URI_FRAGMENT_FLAGGED_ABSENT = "algos-language-flagged-absent";
const URI_FRAGMENT_ABSENT = "algos-language-absent";

/**
 * Creates one TreeItem for the given node.
 *
 * @param {WorkspaceTreeNode} element Tree element.
 * @returns {vscode.TreeItem} Tree item instance.
 */
export function createTreeItem(
  element: WorkspaceTreeNode,
  contextValue?: string
): vscode.TreeItem {
  let resourceUri = vscode.Uri.file(element.filePath);

  // Apply URI fragment based on isFlagged and isMissing state.
  // This allows the FileDecoration provider to style problem rows.
  if (element.isFlagged === true && element.isMissing === true) {
    resourceUri = resourceUri.with({ fragment: URI_FRAGMENT_FLAGGED_ABSENT });
  } else if (element.isFlagged === true && element.isMissing !== true) {
    resourceUri = resourceUri.with({ fragment: URI_FRAGMENT_FLAGGED });
  } else if (element.isFlagged !== true && element.isMissing === true) {
    resourceUri = resourceUri.with({ fragment: URI_FRAGMENT_ABSENT });
  }

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
 * Creates a FileDecoration provider for problem row styling.
 * Returns a provider that decorates flagged rows with a red badge (●).
 *
 * @returns {vscode.FileDecorationProvider} The FileDecoration provider.
 */
export function createLanguageStatusDecorationProvider(): vscode.FileDecorationProvider {
  return {
    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
      if (uri.fragment === URI_FRAGMENT_FLAGGED) {
        return {
          badge: "●",
          color: new vscode.ThemeColor("testing.iconFailed"),
          tooltip: "Language flagged in .flag-lang",
        };
      }

      if (uri.fragment === URI_FRAGMENT_FLAGGED_ABSENT) {
        return {
          badge: "●",
          color: new vscode.ThemeColor("testing.iconFailed"),
          tooltip: "Language flagged in .flag-lang and not present in algorithm",
        };
      }

      if (uri.fragment === URI_FRAGMENT_ABSENT) {
        return {
          badge: "●",
          color: new vscode.ThemeColor("testing.iconQueued"),
          tooltip: "Language not present in algorithm",
        };
      }

      return undefined;
    },
  };
}
