const path = require("path");
const vscode = require("vscode");
const { VIEW_IDS } = require("../runtime/viewConstants");
const {
  realpathSafe,
  resolveEligibilityState,
} = require("../runtime/pathResolver");
const {
  createEmptyFilePath,
  deleteWithTrashFallback,
  ensureDirectoryPath,
  isDirectoryPath,
  isFilePath,
  readDirectoryEntries,
} = require("../runtime/workspaceFilesystem");
const {
  getWorkspaceFolders,
  isPathWithinRoot,
} = require("./uiWorkspaceFsUtils");
const {
  getSupportedLanguageKeys,
  normalizeExtensionToLanguageKey,
} = require("../runtime/languageMetadata");

const DELETE_CONFIRM_ACTION = "Delete";
const CREATE_ANYWAY_ACTION = "Create Anyway";

/**
 * Checks whether a filesystem path exists and is a directory.
 *
 * @param {string} directoryPath Candidate directory path.
 * @returns {boolean} True when the path exists and is a directory.
 */
function directoryExists(directoryPath) {
  return isDirectoryPath(directoryPath, { useCache: false });
}

/**
 * Checks whether a filesystem path exists and is a regular file.
 *
 * @param {string} filePath Candidate file path.
 * @returns {boolean} True when the path exists and is a file.
 */
function fileExists(filePath) {
  return isFilePath(filePath, { useCache: false });
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
 * Returns operation roots and supported language keys for stdlib operations.
 *
 * @param {typeof vscode} vscodeApi VS Code API object.
 * @returns {{resolvedRootPath: string, stdlibRootPath: string, supportedLanguageKeys: Set<string>}|null} Operation context or null.
 */
function getStandardLibraryOperationContext(vscodeApi) {
  const workspaceFolders = getWorkspaceFolders(vscodeApi);
  const resolvedRoots = resolveStandardLibraryRoots(workspaceFolders);

  if (!resolvedRoots.resolvedRootPath || !resolvedRoots.stdlibRootPath) {
    return null;
  }

  return {
    resolvedRootPath: resolvedRoots.resolvedRootPath,
    stdlibRootPath: resolvedRoots.stdlibRootPath,
    supportedLanguageKeys: getSupportedLanguageKeys(resolvedRoots.resolvedRootPath),
  };
}

/**
 * Resolves a parent directory target for create operations.
 *
 * @param {{type?: string, filePath?: string}|undefined} item Selected tree item.
 * @param {string} stdlibRootPath Canonical stdlib root path.
 * @returns {string} Parent directory target for create operations.
 */
function resolveCreateTargetDirectory(item, stdlibRootPath) {
  if (!item || !item.filePath) {
    return stdlibRootPath;
  }

  if (item.type === "directory") {
    return item.filePath;
  }

  if (item.type === "file") {
    return path.dirname(item.filePath);
  }

  return stdlibRootPath;
}

/**
 * Resolves delete target path from one selected item.
 *
 * @param {{type?: string, filePath?: string}|undefined} item Selected tree item.
 * @returns {string|null} Delete target path or null.
 */
function resolveDeleteTargetPath(item) {
  if (!item || !item.filePath) {
    return null;
  }

  return item.filePath;
}

/**
 * Resolves and validates a relative user path against one parent directory.
 *
 * @param {string} parentDirectory Parent directory path.
 * @param {string} userInput User-entered relative path segment.
 * @param {string} stdlibRootPath Canonical stdlib root path.
 * @returns {{ok: true, targetPath: string}|{ok: false, message: string}} Validation result.
 */
function resolveUserTargetPath(parentDirectory, userInput, stdlibRootPath) {
  const trimmedInput = String(userInput || "").trim();

  if (!trimmedInput) {
    return {
      ok: false,
      message: "Name cannot be empty.",
    };
  }

  if (path.isAbsolute(trimmedInput)) {
    return {
      ok: false,
      message: "Use a relative name inside stdlib.",
    };
  }

  const targetPath = path.resolve(parentDirectory, trimmedInput);

  if (!isPathWithinRoot(stdlibRootPath, targetPath)) {
    return {
      ok: false,
      message: "Target must stay inside stdlib.",
    };
  }

  return {
    ok: true,
    targetPath,
  };
}

/**
 * Prompts the user for one new folder path segment.
 *
 * @param {typeof vscode} vscodeApi VS Code API object.
 * @returns {Promise<string|undefined>} Entered value or undefined when canceled.
 */
async function promptForNewFolderName(vscodeApi) {
  return vscodeApi.window.showInputBox({
    title: "Standard Library: Create Folder",
    prompt: "Enter a folder name relative to the selected folder",
    placeHolder: "example: math/new-module",
    ignoreFocusOut: true,
    value: "",
  });
}

/**
 * Prompts the user for one new file path segment.
 *
 * @param {typeof vscode} vscodeApi VS Code API object.
 * @returns {Promise<string|undefined>} Entered value or undefined when canceled.
 */
async function promptForNewFileName(vscodeApi) {
  return vscodeApi.window.showInputBox({
    title: "Standard Library: Create File",
    prompt: "Enter a file name relative to the selected folder",
    placeHolder: "example: ParseNumber-All.asm",
    ignoreFocusOut: true,
    value: "",
  });
}

/**
 * Shows unsupported-file warning and asks user whether to continue.
 *
 * @param {typeof vscode} vscodeApi VS Code API object.
 * @param {string} filePath Candidate file path.
 * @returns {Promise<boolean>} True when creation should continue.
 */
async function confirmUnsupportedFileVisibility(vscodeApi, filePath) {
  const fileName = path.basename(filePath);
  const selection = await vscodeApi.window.showWarningMessage(
    `"${fileName}" has an unsupported or missing extension. It will be hidden in the Standard Library tree.`,
    { modal: true },
    CREATE_ANYWAY_ACTION
  );

  return selection === CREATE_ANYWAY_ACTION;
}

/**
 * Shows delete confirmation for one file or directory target.
 *
 * @param {typeof vscode} vscodeApi VS Code API object.
 * @param {string} targetPath Delete target path.
 * @returns {Promise<boolean>} True when deletion is confirmed.
 */
async function confirmDelete(vscodeApi, targetPath) {
  const baseName = path.basename(targetPath);
  const isDirectoryTarget = directoryExists(targetPath);
  const promptMessage = isDirectoryTarget
    ? `Delete folder "${baseName}" and all of its contents?`
    : `Delete file "${baseName}"?`;

  const selection = await vscodeApi.window.showWarningMessage(
    promptMessage,
    {
      detail: targetPath,
      modal: true,
    },
    DELETE_CONFIRM_ACTION
  );

  return selection === DELETE_CONFIRM_ACTION;
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
    const entries = readDirectoryEntries(directoryPath, {
      withFileTypes: true,
      useCache: false,
    });

    if (!Array.isArray(entries)) {
      return [];
    }

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
  const view = vscodeApi.window.createTreeView(VIEW_IDS.STANDARD_LIBRARY, {
    treeDataProvider: provider,
    showCollapseAll: false,
  });

  const workspaceChangeDisposable = vscodeApi.workspace.onDidChangeWorkspaceFolders(
    () => {
      provider.refresh();
    }
  );

  /**
   * Creates one folder under stdlib based on selected tree context.
   *
   * @param {{type?: string, filePath?: string}|undefined} item Selected tree item.
   * @returns {Promise<void>} Promise that resolves when operation completes.
   */
  async function createFolder(item) {
    await createFolderInternal(item, false);
  }

  /**
   * Creates one folder under stdlib root regardless of selection context.
   *
   * @returns {Promise<void>} Promise that resolves when operation completes.
   */
  async function createFolderAtRoot() {
    await createFolderInternal(undefined, true);
  }

  /**
   * Creates one folder under stdlib using contextual or forced-root targeting.
   *
   * @param {{type?: string, filePath?: string}|undefined} item Selected tree item.
   * @param {boolean} forceRoot When true, always target stdlib root.
   * @returns {Promise<void>} Promise that resolves when operation completes.
   */
  async function createFolderInternal(item, forceRoot) {
    const operationContext = getStandardLibraryOperationContext(vscodeApi);

    if (!operationContext) {
      vscodeApi.window.showWarningMessage(
        "Standard Library folder creation is unavailable for the current workspace."
      );
      return;
    }

    const targetDirectory = forceRoot
      ? operationContext.stdlibRootPath
      : resolveCreateTargetDirectory(item, operationContext.stdlibRootPath);

    if (!isPathWithinRoot(operationContext.stdlibRootPath, targetDirectory)) {
      vscodeApi.window.showWarningMessage(
        "Folder creation target must stay inside stdlib."
      );
      return;
    }

    const newFolderName = await promptForNewFolderName(vscodeApi);

    if (typeof newFolderName !== "string") {
      return;
    }

    const pathResolution = resolveUserTargetPath(
      targetDirectory,
      newFolderName,
      operationContext.stdlibRootPath
    );

    if (!pathResolution.ok) {
      vscodeApi.window.showWarningMessage(pathResolution.message);
      return;
    }

    if (directoryExists(pathResolution.targetPath) || fileExists(pathResolution.targetPath)) {
      vscodeApi.window.showWarningMessage("A file or folder with that name already exists.");
      return;
    }

    ensureDirectoryPath(pathResolution.targetPath, { recursive: true });
    provider.refresh();
    vscodeApi.window.showInformationMessage(
      `Created folder: ${path.relative(operationContext.stdlibRootPath, pathResolution.targetPath) || path.basename(pathResolution.targetPath)}`
    );
  }

  /**
   * Creates one file under stdlib based on selected tree context.
   *
   * @param {{type?: string, filePath?: string}|undefined} item Selected tree item.
   * @returns {Promise<void>} Promise that resolves when operation completes.
   */
  async function createFile(item) {
    await createFileInternal(item, false);
  }

  /**
   * Creates one file under stdlib root regardless of selection context.
   *
   * @returns {Promise<void>} Promise that resolves when operation completes.
   */
  async function createFileAtRoot() {
    await createFileInternal(undefined, true);
  }

  /**
   * Creates one file under stdlib using contextual or forced-root targeting.
   *
   * @param {{type?: string, filePath?: string}|undefined} item Selected tree item.
   * @param {boolean} forceRoot When true, always target stdlib root.
   * @returns {Promise<void>} Promise that resolves when operation completes.
   */
  async function createFileInternal(item, forceRoot) {
    const operationContext = getStandardLibraryOperationContext(vscodeApi);

    if (!operationContext) {
      vscodeApi.window.showWarningMessage(
        "Standard Library file creation is unavailable for the current workspace."
      );
      return;
    }

    const targetDirectory = forceRoot
      ? operationContext.stdlibRootPath
      : resolveCreateTargetDirectory(item, operationContext.stdlibRootPath);

    if (!isPathWithinRoot(operationContext.stdlibRootPath, targetDirectory)) {
      vscodeApi.window.showWarningMessage(
        "File creation target must stay inside stdlib."
      );
      return;
    }

    const newFileName = await promptForNewFileName(vscodeApi);

    if (typeof newFileName !== "string") {
      return;
    }

    const pathResolution = resolveUserTargetPath(
      targetDirectory,
      newFileName,
      operationContext.stdlibRootPath
    );

    if (!pathResolution.ok) {
      vscodeApi.window.showWarningMessage(pathResolution.message);
      return;
    }

    if (directoryExists(pathResolution.targetPath) || fileExists(pathResolution.targetPath)) {
      vscodeApi.window.showWarningMessage("A file or folder with that name already exists.");
      return;
    }

    const parentDirectory = path.dirname(pathResolution.targetPath);
    ensureDirectoryPath(parentDirectory, { recursive: true });

    const isSupportedFile = isSupportedStandardLibraryFile(
      pathResolution.targetPath,
      operationContext.supportedLanguageKeys
    );

    if (!isSupportedFile) {
      const shouldCreateUnsupported = await confirmUnsupportedFileVisibility(
        vscodeApi,
        pathResolution.targetPath
      );

      if (!shouldCreateUnsupported) {
        return;
      }
    }

    createEmptyFilePath(pathResolution.targetPath, {
      ensureParentDirectory: false,
      exclusive: true,
    });
    provider.refresh();

    const targetUri = vscodeApi.Uri.file(pathResolution.targetPath);
    await vscodeApi.commands.executeCommand("vscode.open", targetUri);

    if (!isSupportedFile) {
      vscodeApi.window.showInformationMessage(
        "File was created, but it is hidden in the Standard Library tree because its extension is unsupported."
      );
    }
  }

  /**
   * Deletes one file or directory in stdlib after confirmation.
   *
   * @param {{type?: string, filePath?: string}|undefined} item Selected tree item.
   * @returns {Promise<void>} Promise that resolves when operation completes.
   */
  async function deleteItem(item) {
    const operationContext = getStandardLibraryOperationContext(vscodeApi);

    if (!operationContext) {
      vscodeApi.window.showWarningMessage(
        "Standard Library delete is unavailable for the current workspace."
      );
      return;
    }

    const deleteTargetPath = resolveDeleteTargetPath(item);

    if (!deleteTargetPath) {
      vscodeApi.window.showWarningMessage("Select a file or folder to delete.");
      return;
    }

    if (!isPathWithinRoot(operationContext.stdlibRootPath, deleteTargetPath)) {
      vscodeApi.window.showWarningMessage("Delete target must stay inside stdlib.");
      return;
    }

    if (realpathSafe(deleteTargetPath) === operationContext.stdlibRootPath) {
      vscodeApi.window.showWarningMessage("Deleting the stdlib root is not allowed.");
      return;
    }

    if (!directoryExists(deleteTargetPath) && !fileExists(deleteTargetPath)) {
      vscodeApi.window.showWarningMessage("Target no longer exists.");
      provider.refresh();
      return;
    }

    const isDirectoryTarget = directoryExists(deleteTargetPath);
    const isConfirmed = await confirmDelete(vscodeApi, deleteTargetPath);

    if (!isConfirmed) {
      return;
    }

    const targetUri = vscodeApi.Uri.file(deleteTargetPath);
    const deleteResult = await deleteWithTrashFallback(
      vscodeApi,
      targetUri,
      isDirectoryTarget
    );
    provider.refresh();

    if (deleteResult.usedTrash) {
      vscodeApi.window.showInformationMessage(
        `Moved to trash: ${path.basename(deleteTargetPath)}`
      );
      return;
    }

    vscodeApi.window.showInformationMessage(
      `Deleted permanently: ${path.basename(deleteTargetPath)}`
    );
  }

  return {
    refresh: () => {
      provider.refresh();
    },
    createFile,
    createFileAtRoot,
    createFolder,
    createFolderAtRoot,
    deleteItem,
    disposables: [provider, view, workspaceChangeDisposable],
  };
}

// Public exports for standard-library view registration.
module.exports = {
  registerStandardLibraryView,
};
