const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { resolveEligibilityState } = require("../runtime/pathResolver");
const {
  getSupportedLanguageKeys,
  normalizeExtensionToLanguageKey,
} = require("../validation/inputValidation");

// Stable view identifier contributed in package.json.
const STANDARD_LIBRARY_VIEW_ID = "algosWorkspaceStandardLibraryView";

/**
 * Resolves a canonical path and falls back to absolute normalization if needed.
 *
 * @param {string} targetPath Input path to normalize.
 * @returns {string} Canonical or normalized absolute path.
 */
function realpathSafe(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch (_) {
    return path.resolve(targetPath);
  }
}

/**
 * Returns workspace folders from VS Code API.
 *
 * @param {typeof vscode} vscodeApi VS Code API object.
 * @returns {import("vscode").WorkspaceFolder[]} Open workspace folders.
 */
function getWorkspaceFolders(vscodeApi) {
  return vscodeApi.workspace.workspaceFolders || [];
}

/**
 * Checks whether a filesystem path exists and is a directory.
 *
 * @param {string} directoryPath Candidate directory path.
 * @returns {boolean} True when the path exists and is a directory.
 */
function directoryExists(directoryPath) {
  try {
    return fs.statSync(directoryPath).isDirectory();
  } catch (_) {
    return false;
  }
}

/**
 * Resolves the first eligible repository root from current workspace folders.
 *
 * @param {import("vscode").WorkspaceFolder[]} workspaceFolders Open workspace folders.
 * @returns {{resolvedRootPath: string|null, stdlibRootPath: string|null}} Resolved root and stdlib path.
 */
function resolveStandardLibraryRoots(workspaceFolders) {
  if (!Array.isArray(workspaceFolders) || workspaceFolders.length === 0) {
    return {
      resolvedRootPath: null,
      stdlibRootPath: null,
    };
  }

  for (const workspaceFolder of workspaceFolders) {
    const statusState = resolveEligibilityState([workspaceFolder]);
    const resolvedRootPath = statusState.selected?.resolvedRoot || null;

    if (statusState.status !== "eligible" || !resolvedRootPath) {
      continue;
    }

    const stdlibRootPath = path.join(realpathSafe(resolvedRootPath), "stdlib");

    if (directoryExists(stdlibRootPath)) {
      return {
        resolvedRootPath: realpathSafe(resolvedRootPath),
        stdlibRootPath: realpathSafe(stdlibRootPath),
      };
    }
  }

  return {
    resolvedRootPath: null,
    stdlibRootPath: null,
  };
}

/**
 * Checks whether a directory entry is hidden.
 *
 * @param {string} entryName Directory entry name.
 * @returns {boolean} True when the entry should be treated as hidden.
 */
function isHiddenEntry(entryName) {
  return String(entryName || "").startsWith(".");
}

/**
 * Checks whether a directory should always be hidden in the stdlib tree.
 *
 * @param {string} directoryName Directory name.
 * @returns {boolean} True when the directory must be suppressed.
 */
function isAlwaysHiddenDirectory(directoryName) {
  return String(directoryName || "").toLowerCase() === "output";
}

/**
 * Checks whether a file should be shown as a supported stdlib source file.
 *
 * @param {string} filePath Absolute file path.
 * @param {Set<string>} supportedLanguageKeys Supported language key set.
 * @returns {boolean} True when file extension maps to a supported language key.
 */
function isSupportedStandardLibraryFile(filePath, supportedLanguageKeys) {
  const normalizedLanguageKey = normalizeExtensionToLanguageKey(filePath);

  if (!normalizedLanguageKey) {
    return false;
  }

  return supportedLanguageKeys.has(normalizedLanguageKey);
}

/**
 * Compares directory entries for stable tree ordering.
 *
 * Directories sort before files, then names sort alphabetically.
 *
 * @param {fs.Dirent} left Left directory entry.
 * @param {fs.Dirent} right Right directory entry.
 * @returns {number} Sort result.
 */
function compareDirectoryEntries(left, right) {
  if (left.isDirectory() && !right.isDirectory()) {
    return -1;
  }

  if (!left.isDirectory() && right.isDirectory()) {
    return 1;
  }

  return left.name.localeCompare(right.name);
}

/**
 * Creates a tree node for one directory path.
 *
 * @param {string} directoryPath Directory path.
 * @returns {{type: "directory", filePath: string, label: string, resourceUri: import("vscode").Uri}} Directory node.
 */
function createDirectoryNode(directoryPath) {
  return {
    type: "directory",
    filePath: directoryPath,
    label: path.basename(directoryPath),
    resourceUri: vscode.Uri.file(directoryPath),
  };
}

/**
 * Creates a tree node for one file path.
 *
 * @param {string} filePath File path.
 * @returns {{type: "file", filePath: string, label: string, resourceUri: import("vscode").Uri}} File node.
 */
function createFileNode(filePath) {
  return {
    type: "file",
    filePath,
    label: path.basename(filePath),
    resourceUri: vscode.Uri.file(filePath),
  };
}

/**
 * Reads visible children for one standard-library directory.
 *
 * Empty directories are intentionally visible. Directories named "output"
 * are always hidden at any depth.
 *
 * @param {string} directoryPath Parent directory path.
 * @param {Set<string>} supportedLanguageKeys Supported language key set.
 * @returns {Array<{type: "directory"|"file", filePath: string, label: string, resourceUri: import("vscode").Uri}>} Visible nodes.
 */
function readStandardLibraryChildren(directoryPath, supportedLanguageKeys) {
  if (!directoryExists(directoryPath)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    entries.sort(compareDirectoryEntries);
    const nodes = [];

    for (const entry of entries) {
      if (isHiddenEntry(entry.name)) {
        continue;
      }

      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        if (isAlwaysHiddenDirectory(entry.name)) {
          continue;
        }

        nodes.push(createDirectoryNode(entryPath));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!isSupportedStandardLibraryFile(entryPath, supportedLanguageKeys)) {
        continue;
      }

      nodes.push(createFileNode(entryPath));
    }

    return nodes;
  } catch (_) {
    return [];
  }
}

/**
 * Provides the tree UI for stdlib source browsing.
 */
class StandardLibraryTreeDataProvider {
  /**
   * Creates one provider instance.
   *
   * @param {typeof vscode} vscodeApi VS Code API object.
   * @returns {void}
   */
  constructor(vscodeApi) {
    this._vscode = vscodeApi;
    this._supportedLanguageKeys = null;
    this._supportedLanguageKeysRoot = null;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  /**
   * Refreshes tree data for the active view.
   *
   * @param {void} _unused Unused parameter.
   * @returns {void}
   */
  refresh(_unused) {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Resolves and caches supported language keys for one repository root.
   *
   * @param {string} resolvedRootPath Canonical repository root path.
   * @returns {Set<string>} Supported language key set.
   */
  getSupportedLanguageKeysForRoot(resolvedRootPath) {
    const canonicalRoot = realpathSafe(resolvedRootPath);

    if (
      this._supportedLanguageKeys
      && this._supportedLanguageKeysRoot
      && this._supportedLanguageKeysRoot === canonicalRoot
    ) {
      return this._supportedLanguageKeys;
    }

    this._supportedLanguageKeys = getSupportedLanguageKeys(canonicalRoot);
    this._supportedLanguageKeysRoot = canonicalRoot;
    return this._supportedLanguageKeys;
  }

  /**
   * Returns a TreeItem for one node.
   *
   * @param {{type: "directory"|"file", filePath: string, label: string, resourceUri: import("vscode").Uri}} element Tree node element.
   * @returns {import("vscode").TreeItem} Rendered tree item.
   */
  getTreeItem(element) {
    if (element.type === "directory") {
      const directoryItem = new vscode.TreeItem(
        element.resourceUri,
        vscode.TreeItemCollapsibleState.Collapsed
      );
      directoryItem.tooltip = element.filePath;
      directoryItem.contextValue = "standardLibraryDirectory";
      return directoryItem;
    }

    const fileItem = new vscode.TreeItem(
      element.resourceUri,
      vscode.TreeItemCollapsibleState.None
    );
    fileItem.tooltip = element.filePath;
    fileItem.contextValue = "standardLibraryFile";
    fileItem.command = {
      title: "Open File",
      command: "vscode.open",
      arguments: [element.resourceUri],
    };
    return fileItem;
  }

  /**
   * Returns visible children for one element or top-level root.
   *
   * @param {{type: "directory"|"file", filePath: string, label: string, resourceUri: import("vscode").Uri}|undefined} element Parent element.
   * @returns {Promise<Array<{type: "directory"|"file", filePath: string, label: string, resourceUri: import("vscode").Uri}>>} Child nodes.
   */
  getChildren(element) {
    const workspaceFolders = getWorkspaceFolders(this._vscode);
    const resolvedRoots = resolveStandardLibraryRoots(workspaceFolders);

    if (!resolvedRoots.resolvedRootPath || !resolvedRoots.stdlibRootPath) {
      return Promise.resolve([]);
    }

    const supportedLanguageKeys = this.getSupportedLanguageKeysForRoot(
      resolvedRoots.resolvedRootPath
    );

    if (!element) {
      return Promise.resolve(
        readStandardLibraryChildren(
          resolvedRoots.stdlibRootPath,
          supportedLanguageKeys
        )
      );
    }

    if (element.type !== "directory") {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      readStandardLibraryChildren(element.filePath, supportedLanguageKeys)
    );
  }

  /**
   * Disposes provider-owned resources.
   *
   * @param {void} _unused Unused parameter.
   * @returns {void}
   */
  dispose(_unused) {
    this._onDidChangeTreeData.dispose();
  }
}

/**
 * Registers the standard-library tree view and refresh hooks.
 *
 * @param {typeof vscode} vscodeApi VS Code API object.
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerStandardLibraryView(vscodeApi = vscode) {
  const provider = new StandardLibraryTreeDataProvider(vscodeApi);
  const view = vscodeApi.window.createTreeView(STANDARD_LIBRARY_VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: false,
  });

  const workspaceChangeDisposable = vscodeApi.workspace.onDidChangeWorkspaceFolders(
    () => {
      provider.refresh();
    }
  );

  return {
    refresh: () => {
      provider.refresh();
    },
    disposables: [provider, view, workspaceChangeDisposable],
  };
}

// Public exports for standard-library view registration.
module.exports = {
  registerStandardLibraryView,
};
