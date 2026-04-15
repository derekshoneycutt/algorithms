const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { resolveEligibilityState } = require("../runtime/pathResolver");
const {
  getSupportedLanguageKeys,
  normalizeExtensionToLanguageKey,
} = require("../validation/inputValidation");

const LANGUAGE_ICON_DIRECTORY_SEGMENT = ".algos-language-icons";

const LANGUAGE_ICON_SAMPLE_EXTENSIONS = {
  ada: "adb",
  arm64asm: "s",
  asm: "asm",
  ballerina: "bal",
  c: "c",
  clojure: "clj",
  cobol: "cob",
  cpp: "cpp",
  csharp: "cs",
  d: "d",
  dart: "dart",
  eiffel: "e",
  elixir: "exs",
  erlang: "erl",
  factor: "factor",
  forth: "fth",
  fortran: "f90",
  freebasic: "bas",
  fsharp: "fs",
  gleam: "gleam",
  go: "go",
  haskell: "hs",
  haxe: "hx",
  icon: "icn",
  idris: "idr",
  java: "java",
  javascript: "js",
  julia: "jl",
  kit: "kit",
  kotlin: "kt",
  llvmir: "ll",
  lua: "lua",
  mercury: "moo",
  mmixal: "mms",
  modula3: "m3",
  mojo: "mojo",
  nasm: "nasm",
  nim: "nim",
  oberon: "mod",
  objectivec: "m",
  ocaml: "ml",
  octave: "mat",
  pascal: "pas",
  perl: "plx",
  php: "php",
  prolog: "pl",
  python: "py",
  r: "r",
  racket: "rkt",
  ruby: "rb",
  rust: "rs",
  scala: "scala",
  scheme: "scm",
  simula: "sim",
  smalltalk: "st",
  swift: "swift",
  tcl: "tcl",
  typescript: "ts",
  v: "v",
  visualbasic: "vb",
  wat: "wat",
  zig: "zig",
};

/**
 * Creates a default ineligible state for empty workspaces.
 *
 * @returns {{status: string, reason: string, guidance: string, selected: null, evaluations: object[]}} Empty-workspace state.
 */
function createEmptyWorkspaceState() {
  return {
    status: "ineligible",
    reason: "no-workspace-folders",
    guidance: "No workspace folders are open.",
    selected: null,
    evaluations: [],
  };
}

/**
 * Returns workspace folders from VS Code API.
 *
 * @returns {import("vscode").WorkspaceFolder[]} Open workspace folders.
 */
function getWorkspaceFolders() {
  return vscode.workspace.workspaceFolders || [];
}

/**
 * Resolves a canonical path and falls back to absolute normalization if needed.
 *
 * @param {string} targetPath Path to normalize.
 * @returns {string} Canonical or normalized path.
 */
function realpathSafe(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch (_) {
    return path.resolve(targetPath);
  }
}

/**
 * Determines whether the opened workspace folder is supported by the sidebar.
 *
 * Supported entry points are repo root, `src`, `src/<category>`, and
 * `src/<category>/<algorithm>` only.
 *
 * @param {string} workspaceFolderPath Canonical workspace folder path.
 * @param {string} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when the folder is a supported sidebar entry point.
 */
function isSupportedSidebarFolder(workspaceFolderPath, resolvedRoot) {
  const canonicalWorkspaceFolderPath = realpathSafe(workspaceFolderPath);
  const canonicalResolvedRoot = realpathSafe(resolvedRoot);
  const relativePath = path.relative(canonicalResolvedRoot, canonicalWorkspaceFolderPath);

  if (!relativePath) {
    return true;
  }

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return false;
  }

  const parts = relativePath.split(path.sep).filter(Boolean);

  if (parts[0] !== "src") {
    return false;
  }

  return parts.length >= 1 && parts.length <= 3;
}

/**
 * Derives the display root path for the sidebar tree.
 *
 * Repo root is intentionally narrowed to `src/`. More specific supported
 * folders keep their own narrower scope.
 *
 * @param {string} workspaceFolderPath Canonical workspace folder path.
 * @param {string} resolvedRoot Canonical repository root path.
 * @returns {string} Canonical display root path for the sidebar tree.
 */
function deriveSidebarDisplayRootPath(workspaceFolderPath, resolvedRoot) {
  const canonicalWorkspaceFolderPath = realpathSafe(workspaceFolderPath);
  const canonicalResolvedRoot = realpathSafe(resolvedRoot);
  const relativePath = path.relative(canonicalResolvedRoot, canonicalWorkspaceFolderPath);

  if (!relativePath) {
    return path.join(canonicalResolvedRoot, "src");
  }

  return canonicalWorkspaceFolderPath;
}

/**
 * Resolves the sidebar state by selecting the first supported workspace folder.
 *
 * @param {import("vscode").WorkspaceFolder[]} workspaceFolders Open workspace folders.
 * @returns {{supported: boolean, statusState: {status?: string, reason?: string, guidance?: string, selected?: {resolvedRoot?: string, workspaceFolderPath?: string}|null, evaluations?: object[]}, displayRootPath: string|null}} Sidebar workspace state.
 */
function resolveSidebarWorkspaceState(workspaceFolders) {
  if (!Array.isArray(workspaceFolders) || workspaceFolders.length === 0) {
    return {
      supported: false,
      statusState: createEmptyWorkspaceState(),
      displayRootPath: null,
    };
  }

  for (const workspaceFolder of workspaceFolders) {
    const folderState = resolveEligibilityState([workspaceFolder]);
    const workspaceFolderPath = folderState.selected?.workspaceFolderPath;
    const resolvedRoot = folderState.selected?.resolvedRoot;

    if (
      folderState.status === "eligible" &&
      workspaceFolderPath &&
      resolvedRoot &&
      isSupportedSidebarFolder(workspaceFolderPath, resolvedRoot)
    ) {
      return {
        supported: true,
        statusState: folderState,
        displayRootPath: deriveSidebarDisplayRootPath(workspaceFolderPath, resolvedRoot),
      };
    }
  }

  return {
    supported: false,
    statusState: resolveEligibilityState(workspaceFolders),
    displayRootPath: null,
  };
}

/**
 * Returns path parts for a path relative to the repository src directory.
 *
 * @param {string} fileSystemPath Candidate absolute path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {string[]|null} Relative src parts, or null when outside src.
 */
function getPathPartsRelativeToSrc(fileSystemPath, resolvedRoot) {
  if (!resolvedRoot) {
    return null;
  }

  const canonicalPath = realpathSafe(fileSystemPath);
  const srcRoot = path.join(realpathSafe(resolvedRoot), "src");
  const relativePath = path.relative(srcRoot, canonicalPath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return relativePath.split(path.sep).filter(Boolean);
}

/**
 * Checks whether a directory name represents a language include folder.
 *
 * @param {string} name Directory name.
 * @returns {boolean} True when name follows <lang>_include convention.
 */
function isLanguageIncludeDirectoryName(name) {
  return typeof name === "string" && name.endsWith("_include") && name.length > 8;
}

/**
 * Checks whether a file is allowed by sidebar filtering rules.
 *
 * Allowed:
 * - src/<category>/<algorithm>/<any>.<supported-extension>
 * - src/<category>/<algorithm>/<lang>_include/<any>.<same-lang-extension>
 *
 * @param {string} filePath Candidate absolute file path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {boolean} True when the file should be shown.
 */
function isAllowedSidebarFile(filePath, resolvedRoot, supportedLanguageKeys) {
  const relativeParts = getPathPartsRelativeToSrc(filePath, resolvedRoot);

  if (!relativeParts) {
    return false;
  }

  const normalizedFileLanguage = normalizeExtensionToLanguageKey(filePath);

  if (!normalizedFileLanguage || !supportedLanguageKeys.has(normalizedFileLanguage)) {
    return false;
  }

  if (relativeParts.length === 3) {
    return true;
  }

  if (relativeParts.length === 4 && isLanguageIncludeDirectoryName(relativeParts[2])) {
    const includeLanguage = relativeParts[2].slice(0, -8).toLowerCase();
    return normalizedFileLanguage === includeLanguage;
  }

  return false;
}

/**
 * Checks whether a directory path can contain allowed sidebar files.
 *
 * @param {string} directoryPath Candidate absolute directory path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when the directory can contain allowed files.
 */
function isPotentialSidebarDirectory(directoryPath, resolvedRoot) {
  const relativeParts = getPathPartsRelativeToSrc(directoryPath, resolvedRoot);

  if (!relativeParts) {
    return false;
  }

  if (relativeParts.length <= 2) {
    return true;
  }

  if (relativeParts.length === 3) {
    return isLanguageIncludeDirectoryName(relativeParts[2]);
  }

  return false;
}

/**
 * Checks whether a directory has at least one allowed descendant file.
 *
 * @param {string} directoryPath Directory path to inspect.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {boolean} True when at least one allowed file exists beneath the directory.
 */
function hasAllowedSidebarDescendant(directoryPath, resolvedRoot, supportedLanguageKeys) {
  if (!isPotentialSidebarDirectory(directoryPath, resolvedRoot)) {
    return false;
  }

  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isFile() && isAllowedSidebarFile(entryPath, resolvedRoot, supportedLanguageKeys)) {
        return true;
      }

      if (entry.isDirectory() && hasAllowedSidebarDescendant(entryPath, resolvedRoot, supportedLanguageKeys)) {
        return true;
      }
    }
  } catch (_) {
    return false;
  }

  return false;
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
 * Creates a tree node for a sidebar file-system entry.
 *
 * @param {string} entryPath Canonical entry path.
 * @param {fs.Dirent} entry Directory entry metadata.
 * @returns {{filePath: string, fsPath: string, label: string, isDirectory: boolean, isRunnableFile: boolean, resourceUri: import("vscode").Uri}} Sidebar tree node.
 */
function createSidebarTreeNode(entryPath, entry, isRunnableFile) {
  return {
    filePath: entryPath,
    fsPath: entryPath,
    label: entry.name,
    isDirectory: entry.isDirectory(),
    isRunnableFile: Boolean(isRunnableFile),
    resourceUri: vscode.Uri.file(entryPath),
  };
}

/**
 * Creates a language summary tree node for language-mode sidebar rendering.
 *
 * @param {string} languageKey Canonical language key.
 * @param {number} fileCount Count of matching algorithm files.
 * @param {string} algorithmPath Algorithm directory absolute path.
 * @param {string|null} openTargetPath Deterministic first-sorted matching file path.
 * @returns {{label: string, fileCount: number, hasFiles: boolean, isLanguageSummary: boolean, resourceUri: import("vscode").Uri, openTargetUri: import("vscode").Uri|null, tooltip: string}} Language summary node.
 */
function createLanguageSummaryTreeNode(
  languageKey,
  fileCount,
  algorithmPath,
  openTargetPath
) {
  const sampleExtension = LANGUAGE_ICON_SAMPLE_EXTENSIONS[languageKey] || "txt";
  const sampleFileName = `${languageKey}.${sampleExtension}`;
  const resourceUri = vscode.Uri.file(
    path.join(algorithmPath, LANGUAGE_ICON_DIRECTORY_SEGMENT, sampleFileName)
  ).with({
    fragment: fileCount > 0 ? "present" : "absent",
  });
  const openTargetUri = openTargetPath ? vscode.Uri.file(openTargetPath) : null;

  return {
    label: languageKey,
    fileCount,
    hasFiles: fileCount > 0,
    isLanguageSummary: true,
    resourceUri,
    openTargetUri,
    tooltip:
      fileCount > 0 && openTargetPath
        ? `${languageKey}: present (${fileCount})\nOpens: ${openTargetPath}`
        : `${languageKey}: not present (${fileCount})`,
  };
}

/**
 * Returns whether a directory path is an algorithm directory: src/<category>/<algorithm>.
 *
 * @param {string|null} directoryPath Candidate absolute directory path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when the directory is an algorithm root.
 */
function isAlgorithmDirectoryPath(directoryPath, resolvedRoot) {
  if (!directoryPath) {
    return false;
  }

  const relativeParts = getPathPartsRelativeToSrc(directoryPath, resolvedRoot);
  return Array.isArray(relativeParts) && relativeParts.length === 2;
}

/**
 * Checks whether a file is directly in src/<category>/<algorithm>.
 *
 * @param {string} filePath Candidate absolute file path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when file is directly under algorithm root.
 */
function isDirectAlgorithmRootFile(filePath, resolvedRoot) {
  const relativeParts = getPathPartsRelativeToSrc(filePath, resolvedRoot);
  return Array.isArray(relativeParts) && relativeParts.length === 3;
}

/**
 * Normalizes algorithm/file tokens for deterministic basename matching.
 *
 * @param {string} value Raw token value.
 * @returns {string} Normalized token.
 */
function normalizeAlgorithmToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Returns accepted algorithm basename candidates for filename fallback matching.
 *
 * For `hello_world`, both `hello_world` and `hello` are accepted roots.
 *
 * @param {string} algorithmName Algorithm directory name.
 * @returns {Set<string>} Accepted normalized basename candidates.
 */
function getAlgorithmNameCandidates(algorithmName) {
  const normalizedAlgorithmName = normalizeAlgorithmToken(algorithmName);
  const candidateSet = new Set();

  if (!normalizedAlgorithmName) {
    return candidateSet;
  }

  candidateSet.add(normalizedAlgorithmName);
  const shortAlgorithmName = normalizedAlgorithmName.split("_")[0];

  if (shortAlgorithmName) {
    candidateSet.add(shortAlgorithmName);
  }

  return candidateSet;
}

/**
 * Checks whether a file basename matches algorithm naming conventions.
 *
 * @param {string} filePath Candidate file path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when basename matches algorithm folder conventions.
 */
function isAlgorithmBasenameMatch(filePath, resolvedRoot) {
  const relativeParts = getPathPartsRelativeToSrc(filePath, resolvedRoot);

  if (!Array.isArray(relativeParts) || relativeParts.length !== 3) {
    return false;
  }

  const algorithmName = relativeParts[1];
  const fileName = relativeParts[2];
  const fileBaseName = normalizeAlgorithmToken(path.parse(fileName).name);

  if (!fileBaseName) {
    return false;
  }

  return getAlgorithmNameCandidates(algorithmName).has(fileBaseName);
}

/**
 * Collects allowed sidebar files recursively beneath the display root.
 *
 * @param {string|null} directoryPath Directory to scan.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {string[]} Allowed file paths.
 */
function collectAllowedSidebarFiles(directoryPath, resolvedRoot, supportedLanguageKeys) {
  if (!directoryPath) {
    return [];
  }

  const collectedFiles = [];

  /**
   * Recursively walks directories that can contain allowed sidebar files.
   *
   * @param {string} currentPath Current directory path.
   * @returns {void}
   */
  function walk(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);

        if (entry.isFile()) {
          if (isAllowedSidebarFile(entryPath, resolvedRoot, supportedLanguageKeys)) {
            collectedFiles.push(entryPath);
          }
          continue;
        }

        if (!entry.isDirectory()) {
          continue;
        }

        if (!hasAllowedSidebarDescendant(entryPath, resolvedRoot, supportedLanguageKeys)) {
          continue;
        }

        walk(entryPath);
      }
    } catch (_) {
      // Ignore unreadable folders and continue scanning remaining branches.
    }
  }

  walk(directoryPath);
  return collectedFiles;
}

/**
 * Builds language summary nodes for an algorithm directory in language view mode.
 *
 * @param {string} algorithmPath Algorithm directory path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {{label: string, fileCount: number, hasFiles: boolean, isLanguageSummary: boolean, resourceUri: import("vscode").Uri, openTargetUri: import("vscode").Uri|null, tooltip: string}[]} Language summary nodes.
 */
function readAlgorithmLanguageSummary(algorithmPath, resolvedRoot, supportedLanguageKeys) {
  const sortedLanguageKeys = [...supportedLanguageKeys].sort((left, right) =>
    left.localeCompare(right)
  );
  const languageCountMap = new Map(
    sortedLanguageKeys.map((languageKey) => [languageKey, 0])
  );
  const languageFilePathMap = new Map(
    sortedLanguageKeys.map((languageKey) => [languageKey, []])
  );

  const allowedFiles = collectAllowedSidebarFiles(algorithmPath, resolvedRoot, supportedLanguageKeys);

  for (const filePath of allowedFiles) {
    const relativeParts = getPathPartsRelativeToSrc(filePath, resolvedRoot);

    if (!Array.isArray(relativeParts)) {
      continue;
    }

    const isDirectAlgorithmFile = relativeParts.length === 3;
    const isMatchingIncludeFile =
      relativeParts.length === 4 && isLanguageIncludeDirectoryName(relativeParts[2]);

    if (!isDirectAlgorithmFile && !isMatchingIncludeFile) {
      continue;
    }

    if (isDirectAlgorithmFile && !isAlgorithmBasenameMatch(filePath, resolvedRoot)) {
      continue;
    }

    const normalizedLanguage = normalizeExtensionToLanguageKey(filePath);

    if (!normalizedLanguage || !languageCountMap.has(normalizedLanguage)) {
      continue;
    }

    languageCountMap.set(
      normalizedLanguage,
      languageCountMap.get(normalizedLanguage) + 1
    );
    languageFilePathMap.get(normalizedLanguage).push(filePath);
  }

  return sortedLanguageKeys.map((languageKey) => {
    const matchingFiles = languageFilePathMap.get(languageKey);
    matchingFiles.sort((left, right) => left.localeCompare(right));

    return createLanguageSummaryTreeNode(
      languageKey,
      languageCountMap.get(languageKey),
      algorithmPath,
      matchingFiles.length > 0 ? matchingFiles[0] : null
    );
  });
}

/**
 * Reads direct children for a directory path as sidebar tree nodes.
 *
 * @param {string|null} directoryPath Canonical directory path.
 * @returns {{filePath: string, fsPath: string, label: string, isDirectory: boolean, isRunnableFile: boolean, resourceUri: import("vscode").Uri}[]} Child nodes.
 */
function readSidebarDirectoryChildren(directoryPath, resolvedRoot, supportedLanguageKeys) {
  if (!directoryPath) {
    return [];
  }

  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    entries.sort(compareDirectoryEntries);
    const visibleEntries = [];

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isFile()) {
        if (isAllowedSidebarFile(entryPath, resolvedRoot, supportedLanguageKeys)) {
          visibleEntries.push(
            createSidebarTreeNode(
              entryPath,
              entry,
              isDirectAlgorithmRootFile(entryPath, resolvedRoot)
            )
          );
        }
        continue;
      }

      if (!entry.isDirectory()) {
        continue;
      }

      if (!hasAllowedSidebarDescendant(entryPath, resolvedRoot, supportedLanguageKeys)) {
        continue;
      }

      visibleEntries.push(createSidebarTreeNode(entryPath, entry, false));
    }

    return visibleEntries;
  } catch (_) {
    return [];
  }
}

/**
 * Provides a scoped file tree for the Algorithms sidebar view.
 */
class WorkspaceStatusTreeDataProvider {
  /**
   * Creates a workspace status provider.
   */
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this._statusState = createEmptyWorkspaceState();
    this._displayRootPath = null;
    this._resolvedRootPath = null;
    this._supportedLanguageKeys = new Set();
    this._viewMode = "files";
  }

  /**
   * Updates the cached sidebar state used by the tree view.
   *
   * @param {{status?: string, reason?: string, guidance?: string, selected?: {resolvedRoot?: string}|null, evaluations?: object[]}} statusState Sidebar status state.
   * @param {string|null} displayRootPath Sidebar display root path.
   * @returns {void}
   */
  setSidebarState(statusState, displayRootPath) {
    this._statusState = statusState || createEmptyWorkspaceState();
    this._displayRootPath = displayRootPath || null;
    this._resolvedRootPath = this._statusState?.selected?.resolvedRoot || null;
    this._supportedLanguageKeys = this._resolvedRootPath
      ? getSupportedLanguageKeys(this._resolvedRootPath)
      : new Set();
  }

  /**
   * Sets the active sidebar tree mode.
   *
   * @param {"files"|"language"} viewMode Desired sidebar view mode.
   * @returns {void}
   */
  setViewMode(viewMode) {
    this._viewMode = viewMode === "language" ? "language" : "files";
  }

  /**
   * Refreshes the view's tree data.
   *
   * @returns {void}
   */
  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Returns tree item metadata for a file-system tree node.
   *
  * @param {{filePath?: string, fsPath?: string, label: string, isDirectory?: boolean, isRunnableFile?: boolean, isLanguageSummary?: boolean, fileCount?: number, hasFiles?: boolean, resourceUri?: import("vscode").Uri, openTargetUri?: import("vscode").Uri|null, tooltip?: string}} element Tree element.
   * @returns {import("vscode").TreeItem} Tree item.
   */
  getTreeItem(element) {
    if (element.isLanguageSummary) {
      const treeItem = new vscode.TreeItem(
        element.resourceUri,
        vscode.TreeItemCollapsibleState.None
      );

      treeItem.label = element.label;
      treeItem.resourceUri = element.resourceUri;
      treeItem.description = String(element.fileCount);
      treeItem.contextValue = "algos.languageSummaryItem";
      treeItem.tooltip = element.tooltip;

      if (element.hasFiles && element.openTargetUri) {
        treeItem.command = {
          command: "vscode.open",
          title: "Open File",
          arguments: [element.openTargetUri],
        };
      }

      return treeItem;
    }

    const treeItem = new vscode.TreeItem(
      element.resourceUri,
      element.isDirectory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.label = element.label;
    treeItem.resourceUri = element.resourceUri;
    treeItem.contextValue = element.isDirectory
      ? "algos.workspaceDirectory"
      : element.isRunnableFile
      ? "algos.workspaceRunnableFile"
      : "algos.workspaceFile";
    treeItem.tooltip = element.filePath;

    if (!element.isDirectory) {
      treeItem.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [element.resourceUri],
      };
    }

    return treeItem;
  }

  /**
   * Returns child entries for the root or a directory node.
   *
  * @param {{filePath?: string, fsPath?: string, label?: string, isDirectory?: boolean, isRunnableFile?: boolean, resourceUri?: import("vscode").Uri, isLanguageSummary?: boolean}|undefined} element Parent element.
   * @returns {Thenable<import("vscode").TreeItem[]>} Tree items.
   */
  getChildren(element) {
    if (!this._displayRootPath) {
      return Promise.resolve([]);
    }

    if (this._viewMode === "language") {
      if (!element) {
        if (isAlgorithmDirectoryPath(this._displayRootPath, this._resolvedRootPath)) {
          return Promise.resolve(
            readAlgorithmLanguageSummary(
              this._displayRootPath,
              this._resolvedRootPath,
              this._supportedLanguageKeys
            )
          );
        }

        return Promise.resolve(
          readSidebarDirectoryChildren(
            this._displayRootPath,
            this._resolvedRootPath,
            this._supportedLanguageKeys
          )
        );
      }

      if (element.isLanguageSummary || !element.isDirectory) {
        return Promise.resolve([]);
      }

      if (isAlgorithmDirectoryPath(element.filePath, this._resolvedRootPath)) {
        return Promise.resolve(
          readAlgorithmLanguageSummary(
            element.filePath,
            this._resolvedRootPath,
            this._supportedLanguageKeys
          )
        );
      }

      return Promise.resolve(
        readSidebarDirectoryChildren(
          element.filePath,
          this._resolvedRootPath,
          this._supportedLanguageKeys
        )
      );
    }

    if (!element) {
      return Promise.resolve(
        readSidebarDirectoryChildren(
          this._displayRootPath,
          this._resolvedRootPath,
          this._supportedLanguageKeys
        )
      );
    }

    if (!element.isDirectory) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      readSidebarDirectoryChildren(
        element.filePath,
        this._resolvedRootPath,
        this._supportedLanguageKeys
      )
    );
  }

  /**
   * Disposes provider-owned resources.
   *
   * @returns {void}
   */
  dispose() {
    this._onDidChangeTreeData.dispose();
  }
}

/**
 * Registers the workspace status view and refresh hooks.
 *
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerWorkspaceAlgorithmsRunView() {
  const provider = new WorkspaceStatusTreeDataProvider();
  const languageStatusDecorationProvider = {
    provideFileDecoration(uri) {
      if (uri.scheme !== "file" || !uri.path.includes(`/${LANGUAGE_ICON_DIRECTORY_SEGMENT}/`)) {
        return undefined;
      }

      const hasFiles = uri.fragment === "present";

      return {
        badge: "●",
        color: new vscode.ThemeColor(
          hasFiles ? "testing.iconPassed" : "testing.iconQueued"
        ),
        tooltip: hasFiles ? "Language present in algorithm" : "Language not present in algorithm",
      };
    },
  };

  const decorationRegistration = vscode.window.registerFileDecorationProvider(
    languageStatusDecorationProvider
  );

  const view = vscode.window.createTreeView("algosWorkspaceAlgorithmsRunView", {
    treeDataProvider: provider,
    showCollapseAll: false,
  });

  /**
   * Refreshes cached sidebar state and visibility context.
   *
   * @returns {Thenable<void>} Completion result.
   */
  function refreshWorkspaceViewState() {
    const sidebarState = resolveSidebarWorkspaceState(getWorkspaceFolders());
    provider.setSidebarState(sidebarState.statusState, sidebarState.displayRootPath);
    provider.refresh();

    return vscode.commands.executeCommand(
      "setContext",
      "algos.workspaceSupported",
      sidebarState.supported
    );
  }

  const refreshOnFolderChange = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    void refreshWorkspaceViewState();
  });

  /**
   * Applies the requested sidebar mode and updates context visibility keys.
   *
   * @param {"files"|"language"} viewMode Requested sidebar mode.
   * @returns {Thenable<void>} Completion result.
   */
  function applySidebarViewMode(viewMode) {
    const nextViewMode = viewMode === "language" ? "language" : "files";
    provider.setViewMode(nextViewMode);
    provider.refresh();

    return vscode.commands.executeCommand(
      "setContext",
      "algos.sidebarViewMode",
      nextViewMode
    );
  }

  void refreshWorkspaceViewState();
  void applySidebarViewMode("files");

  return {
    refresh: () => {
      void refreshWorkspaceViewState();
    },
    setViewMode: async (viewMode) => {
      await applySidebarViewMode(viewMode);
    },
    disposables: [view, refreshOnFolderChange, provider, decorationRegistration],
  };
}

// Public API for the workspace algorithms run view.
module.exports = {
  registerWorkspaceAlgorithmsRunView,
};
