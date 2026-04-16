const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const vscode = require("vscode");
const { VIEW_IDS } = require("../runtime/viewConstants");
const {
  realpathSafe,
  resolveEligibilityState,
} = require("../runtime/pathResolver");
const { getEffectiveSidebarSmokeArgs } = require("../runtime/sidebarRunArgsState");
const {
  LANGUAGE_ICON_SAMPLE_EXTENSIONS,
  getSupportedLanguageKeys,
  normalizeExtensionToLanguageKey,
} = require("../runtime/languageMetadata");
const {
  applyRemainingSmokeStatus,
  buildSmokeStatusSummary,
} = require("../runtime/smokeStatusState");

const LANGUAGE_ICON_DIRECTORY_SEGMENT = ".algos-language-icons";
const LANGUAGE_PRESENT_URI_FRAGMENT = "algos-language-present";
const LANGUAGE_ABSENT_URI_FRAGMENT = "algos-language-absent";
const LANGUAGE_FLAGGED_URI_FRAGMENT = "algos-language-flagged";
const LANGUAGE_FLAGGED_ABSENT_URI_FRAGMENT = "algos-language-flagged-absent";
const SMOKE_QUEUED_URI_FRAGMENT = "algos-smoke-queued";
const SMOKE_RUNNING_URI_FRAGMENT = "algos-smoke-running";
const SMOKE_PASSED_URI_FRAGMENT = "algos-smoke-passed";
const SMOKE_FAILED_URI_FRAGMENT = "algos-smoke-failed";
const SMOKE_STOPPED_URI_FRAGMENT = "algos-smoke-stopped";
const SMOKE_TEST_OUTPUT_CHANNEL_NAME = "Algorithms Smoke Test";

const SMOKE_STATUS_LABELS = {
  queued: "Queued",
  running: "Running",
  passed: "Passed",
  failed: "Failed",
  stopped: "Stopped",
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
 * Returns the canonical src root for one resolved repository root.
 *
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {string|null} Canonical src root path when available.
 */
function resolveSrcRootPath(resolvedRoot) {
  if (!resolvedRoot) {
    return null;
  }

  const srcRootPath = path.join(realpathSafe(resolvedRoot), "src");

  try {
    if (fs.statSync(srcRootPath).isDirectory()) {
      return realpathSafe(srcRootPath);
    }
  } catch (_) {
    return null;
  }

  return null;
}

/**
 * Checks whether one candidate path is inside a root directory.
 *
 * @param {string} rootPath Root directory path.
 * @param {string} candidatePath Candidate path.
 * @returns {boolean} True when candidate path is inside root.
 */
function isPathWithinRoot(rootPath, candidatePath) {
  const canonicalRootPath = realpathSafe(rootPath);
  const normalizedCandidatePath = path.resolve(candidatePath);
  const relativePath = path.relative(canonicalRootPath, normalizedCandidatePath);

  if (!relativePath || relativePath === ".") {
    return true;
  }

  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
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
 * Returns whether a path is one first-layer category directory: src/<category>.
 *
 * @param {string|null} directoryPath Candidate absolute path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when path is a first-layer category directory.
 */
function isFirstLayerDirectoryPath(directoryPath, resolvedRoot) {
  if (!directoryPath) {
    return false;
  }

  const relativeParts = getPathPartsRelativeToSrc(directoryPath, resolvedRoot);
  return Array.isArray(relativeParts) && relativeParts.length === 1;
}

/**
 * Returns whether a directory path is an include folder: src/<category>/<algorithm>/<lang>_include.
 *
 * @param {string|null} directoryPath Candidate absolute path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when path is a language include directory.
 */
function isIncludeDirectoryPath(directoryPath, resolvedRoot) {
  if (!directoryPath) {
    return false;
  }

  const relativeParts = getPathPartsRelativeToSrc(directoryPath, resolvedRoot);

  return Array.isArray(relativeParts)
    && relativeParts.length === 3
    && isLanguageIncludeDirectoryName(relativeParts[2]);
}

/**
 * Returns whether a file path is an include child file.
 *
 * @param {string|null} filePath Candidate absolute path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when file path is under <lang>_include.
 */
function isIncludeChildFilePath(filePath, resolvedRoot) {
  if (!filePath) {
    return false;
  }

  const relativeParts = getPathPartsRelativeToSrc(filePath, resolvedRoot);

  return Array.isArray(relativeParts)
    && relativeParts.length === 4
    && isLanguageIncludeDirectoryName(relativeParts[2]);
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
 * Reads flagged language keys from one algorithm directory's .flag-lang file.
 *
 * @param {string|null} algorithmPath Algorithm directory path.
 * @returns {Set<string>} Flagged language keys.
 */
function readFlaggedLanguageKeysForAlgorithm(algorithmPath) {
  if (!algorithmPath) {
    return new Set();
  }

  const flagFilePath = path.join(algorithmPath, ".flag-lang");

  try {
    if (!fs.existsSync(flagFilePath)) {
      return new Set();
    }

    const fileContent = fs.readFileSync(flagFilePath, "utf8");
    const keys = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.length > 0);

    return new Set(keys);
  } catch (_) {
    return new Set();
  }
}

/**
 * Resolves the algorithm directory path for one sidebar file.
 *
 * @param {string} filePath Candidate file path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {string|null} Algorithm directory path when file belongs to one algorithm.
 */
function resolveAlgorithmPathForSidebarFile(filePath, resolvedRoot) {
  const relativeParts = getPathPartsRelativeToSrc(filePath, resolvedRoot);

  if (!Array.isArray(relativeParts) || (relativeParts.length !== 3 && relativeParts.length !== 4)) {
    return null;
  }

  const srcRoot = path.join(realpathSafe(resolvedRoot), "src");
  return path.join(srcRoot, relativeParts[0], relativeParts[1]);
}

/**
 * Resolves one sidebar file path to its canonical language key.
 *
 * @param {string} filePath Candidate file path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {string|null} Canonical language key when file is mappable.
 */
function resolveSidebarFileLanguageKey(filePath, resolvedRoot) {
  const relativeParts = getPathPartsRelativeToSrc(filePath, resolvedRoot);

  if (!Array.isArray(relativeParts)) {
    return null;
  }

  const normalizedLanguage = normalizeExtensionToLanguageKey(filePath);

  if (!normalizedLanguage) {
    return null;
  }

  if (relativeParts.length === 3) {
    return normalizedLanguage;
  }

  if (relativeParts.length === 4 && isLanguageIncludeDirectoryName(relativeParts[2])) {
    const includeLanguage = relativeParts[2].slice(0, -8).toLowerCase();
    return normalizedLanguage === includeLanguage ? normalizedLanguage : null;
  }

  return null;
}

/**
 * Creates a tree node for a sidebar file-system entry.
 *
 * @param {string} entryPath Canonical entry path.
 * @param {fs.Dirent} entry Directory entry metadata.
 * @param {boolean} isRunnableFile Whether the entry is directly runnable.
 * @param {string|null} algorithmPath Containing algorithm directory path.
 * @param {string|null} languageKey Canonical language key for the entry.
 * @param {boolean} hasIncludeChildren Whether the entry should expose include-file children.
 * @param {boolean} isFlagged Whether the entry language is flagged.
 * @returns {{filePath: string, fsPath: string, label: string, isDirectory: boolean, isRunnableFile: boolean, algorithmPath: string|null, languageKey: string|null, hasIncludeChildren: boolean, isFlagged: boolean, resourceUri: import("vscode").Uri}} Sidebar tree node.
 */
function createSidebarTreeNode(
  entryPath,
  entry,
  isRunnableFile,
  algorithmPath,
  languageKey,
  hasIncludeChildren,
  isFlagged
) {
  const baseResourceUri = vscode.Uri.file(entryPath);

  return {
    filePath: entryPath,
    fsPath: entryPath,
    label: entry.name,
    isDirectory: entry.isDirectory(),
    isRunnableFile: Boolean(isRunnableFile),
    algorithmPath: algorithmPath || null,
    languageKey: languageKey || null,
    hasIncludeChildren: Boolean(hasIncludeChildren),
    isIncludeFileChild: false,
    isFlagged: Boolean(isFlagged),
    resourceUri:
      !entry.isDirectory() && isFlagged
        ? baseResourceUri.with({ fragment: LANGUAGE_FLAGGED_URI_FRAGMENT })
        : baseResourceUri,
  };
}

/**
 * Creates one child node for an include-file entry.
 *
 * @param {string} filePath Include-file absolute path.
 * @param {string|null} algorithmPath Containing algorithm directory path.
 * @param {string|null} languageKey Canonical language key.
 * @param {boolean} isFlagged Whether the include language is flagged.
 * @returns {{filePath: string, fsPath: string, label: string, isDirectory: boolean, isRunnableFile: boolean, algorithmPath: string|null, languageKey: string|null, hasIncludeChildren: boolean, isFlagged: boolean, resourceUri: import("vscode").Uri}} Sidebar tree node.
 */
function createIncludeFileTreeNode(filePath, algorithmPath, languageKey, isFlagged) {
  const baseResourceUri = vscode.Uri.file(filePath);

  return {
    filePath,
    fsPath: filePath,
    label: path.basename(filePath),
    isDirectory: false,
    isRunnableFile: false,
    algorithmPath: algorithmPath || null,
    languageKey: languageKey || null,
    hasIncludeChildren: false,
    isIncludeFileChild: true,
    isFlagged: Boolean(isFlagged),
    resourceUri: isFlagged
      ? baseResourceUri.with({ fragment: LANGUAGE_FLAGGED_URI_FRAGMENT })
      : baseResourceUri,
  };
}

/**
 * Returns the canonical language key for one primary algorithm file row.
 *
 * @param {string} filePath Candidate primary file path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {string|null} Matching language key when the file can own include children.
 */
function getPrimaryAlgorithmFileLanguageKey(filePath, resolvedRoot) {
  if (!isDirectAlgorithmRootFile(filePath, resolvedRoot)) {
    return null;
  }

  if (!isAlgorithmBasenameMatch(filePath, resolvedRoot)) {
    return null;
  }

  return normalizeExtensionToLanguageKey(filePath);
}

/**
 * Returns the matching include directory path for one algorithm/language pair.
 *
 * @param {string|null} algorithmPath Algorithm directory path.
 * @param {string|null} languageKey Canonical language key.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {string|null} Matching include directory path when it exists and has visible children.
 */
function resolveMatchingIncludeDirectoryPath(
  algorithmPath,
  languageKey,
  resolvedRoot,
  supportedLanguageKeys
) {
  if (!algorithmPath || !languageKey) {
    return null;
  }

  const includeDirectoryPath = path.join(algorithmPath, `${languageKey}_include`);

  if (!hasAllowedSidebarDescendant(includeDirectoryPath, resolvedRoot, supportedLanguageKeys)) {
    return null;
  }

  return includeDirectoryPath;
}

/**
 * Reads same-language include-file children from one include directory.
 *
 * @param {string|null} includeDirectoryPath Include directory path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {string[]} Matching include-file paths sorted like the sidebar.
 */
function readMatchingIncludeFilePaths(
  includeDirectoryPath,
  resolvedRoot,
  supportedLanguageKeys
) {
  if (!includeDirectoryPath) {
    return [];
  }

  try {
    const entries = fs.readdirSync(includeDirectoryPath, { withFileTypes: true });
    entries.sort(compareDirectoryEntries);

    const matchingFiles = [];

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const entryPath = path.join(includeDirectoryPath, entry.name);

      if (isAllowedSidebarFile(entryPath, resolvedRoot, supportedLanguageKeys)) {
        matchingFiles.push(entryPath);
      }
    }

    return matchingFiles;
  } catch (_) {
    return [];
  }
}

/**
 * Returns include-file child nodes for one composite main row.
 *
 * @param {string|null} algorithmPath Algorithm directory path.
 * @param {string|null} languageKey Canonical language key.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @param {Set<string>|null} flaggedLanguageKeys Flagged language keys for the algorithm.
 * @returns {{filePath: string, fsPath: string, label: string, isDirectory: boolean, isRunnableFile: boolean, algorithmPath: string|null, languageKey: string|null, hasIncludeChildren: boolean, isFlagged: boolean, resourceUri: import("vscode").Uri}[]} Include-file tree nodes.
 */
function readIncludeFileChildren(
  algorithmPath,
  languageKey,
  resolvedRoot,
  supportedLanguageKeys,
  flaggedLanguageKeys
) {
  const resolvedFlaggedLanguageKeys = flaggedLanguageKeys || readFlaggedLanguageKeysForAlgorithm(algorithmPath);
  const isFlaggedLanguage = Boolean(
    languageKey && resolvedFlaggedLanguageKeys.has(languageKey)
  );
  const includeDirectoryPath = resolveMatchingIncludeDirectoryPath(
    algorithmPath,
    languageKey,
    resolvedRoot,
    supportedLanguageKeys
  );
  const includeFilePaths = readMatchingIncludeFilePaths(
    includeDirectoryPath,
    resolvedRoot,
    supportedLanguageKeys
  );

  return includeFilePaths.map((filePath) =>
    createIncludeFileTreeNode(
      filePath,
      algorithmPath,
      languageKey,
      isFlaggedLanguage
    )
  );
}

/**
 * Creates a language summary tree node for language-mode sidebar rendering.
 *
 * @param {string} languageKey Canonical language key.
 * @param {number} fileCount Count of matching algorithm files.
 * @param {string} algorithmPath Algorithm directory absolute path.
 * @param {string|null} openTargetPath Deterministic matching file path.
 * @param {boolean} targetIsRunnable Whether the matching file is a direct algorithm-root file.
 * @param {boolean} hasIncludeChildren Whether the language row should expose include-file children.
 * @param {boolean} isFlagged Whether the language is flagged in .flag-lang.
 * @param {import("vscode").Uri} suggestedUntitledUri Suggested untitled file URI for missing-language creation.
 * @returns {{label: string, languageKey: string, algorithmPath: string, filePath: string, fsPath: string, fileCount: number, hasFiles: boolean, isLanguageSummary: boolean, isRunnableFile: boolean, hasIncludeChildren: boolean, isFlagged: boolean, resourceUri: import("vscode").Uri, openTargetUri: import("vscode").Uri|null, suggestedUntitledUri: import("vscode").Uri, contextValue: string, tooltip: string}} Language summary node.
 */
function createLanguageSummaryTreeNode(
  languageKey,
  fileCount,
  algorithmPath,
  openTargetPath,
  targetIsRunnable,
  hasIncludeChildren,
  isFlagged,
  suggestedUntitledUri
) {
  const sampleExtension = LANGUAGE_ICON_SAMPLE_EXTENSIONS[languageKey] || "txt";
  const sampleFileName = `${languageKey}.${sampleExtension}`;
  const openTargetUri = openTargetPath ? vscode.Uri.file(openTargetPath) : null;
  const absentSampleUri = vscode.Uri.file(
    path.join(algorithmPath, LANGUAGE_ICON_DIRECTORY_SEGMENT, sampleFileName)
  );
  const resourceUri = isFlagged
    ? (openTargetUri || absentSampleUri).with({
        fragment: openTargetUri
          ? LANGUAGE_FLAGGED_URI_FRAGMENT
          : LANGUAGE_FLAGGED_ABSENT_URI_FRAGMENT,
      })
    : openTargetUri
    ? openTargetUri.with({ fragment: LANGUAGE_PRESENT_URI_FRAGMENT })
    : absentSampleUri.with({ fragment: LANGUAGE_ABSENT_URI_FRAGMENT });

  return {
    label: languageKey,
    languageKey,
    algorithmPath,
    filePath: algorithmPath,
    fsPath: algorithmPath,
    fileCount,
    hasFiles: fileCount > 0,
    isLanguageSummary: true,
    isRunnableFile: Boolean(targetIsRunnable),
    hasIncludeChildren: Boolean(hasIncludeChildren),
    isFlagged: Boolean(isFlagged),
    resourceUri,
    openTargetUri,
    suggestedUntitledUri,
    contextValue: isFlagged
      ? openTargetUri
        ? "algos.languagePresentFlagged"
        : "algos.languageMissingFlagged"
      : openTargetUri
      ? "algos.languagePresentUnflagged"
      : "algos.languageMissingUnflagged",
    tooltip:
      fileCount > 0 && openTargetPath
        ? `${languageKey}: present (${fileCount})\nOpens: ${openTargetPath}`
        : `${languageKey}: not present (${fileCount})\nCreate: ${suggestedUntitledUri.fsPath}`,
  };
}

/**
 * Builds a deterministic representative language file candidate.
 *
 * Direct algorithm-root files are preferred so existing inline Play actions can
 * be reused. Within each candidate set, the closest basename match to the
 * algorithm directory name is selected.
 *
 * @param {string[]} matchingFiles Matching file paths for one language.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {string} algorithmPath Algorithm directory path.
 * @returns {{filePath: string|null, isRunnable: boolean}} Representative file metadata.
 */
function selectRepresentativeLanguageFile(matchingFiles, resolvedRoot, algorithmPath) {
  const sortedFiles = [...matchingFiles].sort((left, right) =>
    left.localeCompare(right)
  );
  const directAlgorithmFiles = sortedFiles.filter((filePath) =>
    isDirectAlgorithmRootFile(filePath, resolvedRoot)
  );
  const algorithmName = path.basename(String(algorithmPath || ""));

  if (directAlgorithmFiles.length > 0) {
    return {
      filePath: selectBestMatchingFilePath(directAlgorithmFiles, algorithmName),
      isRunnable: true,
    };
  }

  return {
    filePath: selectBestMatchingFilePath(sortedFiles, algorithmName),
    isRunnable: false,
  };
}

/**
 * Normalizes one token for fuzzy basename matching.
 *
 * @param {string} value Raw token value.
 * @returns {string} Lowercase alphanumeric token.
 */
function normalizeCandidateIdentifier(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Scores one file basename against an algorithm directory basename.
 *
 * Lower scores indicate better matches.
 *
 * @param {string} fileBasename Candidate file basename.
 * @param {string} algorithmName Algorithm directory basename.
 * @returns {number} Match score.
 */
function scoreFileBasenameForAlgorithmName(fileBasename, algorithmName) {
  const rawFileBasename = String(fileBasename || "");
  const rawAlgorithmName = String(algorithmName || "");
  const fileBasenameLower = rawFileBasename.toLowerCase();
  const algorithmNameLower = rawAlgorithmName.toLowerCase();
  const normalizedFileBasename = normalizeCandidateIdentifier(rawFileBasename);
  const normalizedAlgorithmName = normalizeCandidateIdentifier(rawAlgorithmName);

  if (rawFileBasename === rawAlgorithmName) {
    return 0;
  }

  if (fileBasenameLower === algorithmNameLower) {
    return 1;
  }

  if (
    normalizedFileBasename
    && normalizedAlgorithmName
    && normalizedFileBasename === normalizedAlgorithmName
  ) {
    return 2;
  }

  if (
    normalizedFileBasename
    && normalizedAlgorithmName.endsWith(normalizedFileBasename)
  ) {
    return 3;
  }

  if (
    normalizedFileBasename
    && normalizedAlgorithmName.includes(normalizedFileBasename)
  ) {
    return 4;
  }

  if (
    normalizedAlgorithmName
    && normalizedFileBasename.includes(normalizedAlgorithmName)
  ) {
    return 5;
  }

  return 99;
}

/**
 * Selects the best matching file path from one candidate list.
 *
 * Candidates are sorted first for deterministic tie resolution.
 *
 * @param {string[]} candidateFiles Candidate file paths.
 * @param {string} algorithmName Algorithm directory basename.
 * @returns {string|null} Best matching file path.
 */
function selectBestMatchingFilePath(candidateFiles, algorithmName) {
  const sortedCandidates = [...candidateFiles].sort((left, right) =>
    left.localeCompare(right)
  );

  if (sortedCandidates.length === 0) {
    return null;
  }

  let selectedPath = sortedCandidates[0];
  let selectedScore = Number.POSITIVE_INFINITY;

  for (const candidatePath of sortedCandidates) {
    const candidateBasename = path.parse(candidatePath).name;
    const candidateScore = scoreFileBasenameForAlgorithmName(
      candidateBasename,
      algorithmName
    );

    if (candidateScore < selectedScore) {
      selectedPath = candidatePath;
      selectedScore = candidateScore;
    }
  }

  return selectedPath;
}

/**
 * Returns the preferred basename for a new language file suggestion.
 *
 * The basename with the highest frequency among direct algorithm-root files is
 * used. Ties or empty sets fall back to the algorithm directory name.
 *
 * @param {string} algorithmPath Algorithm directory path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {string} Suggested basename for new files.
 */
function determineSuggestedAlgorithmBaseName(
  algorithmPath,
  resolvedRoot,
  supportedLanguageKeys
) {
  const basenameCounts = new Map();
  const directAlgorithmFiles = collectAllowedSidebarFiles(
    algorithmPath,
    resolvedRoot,
    supportedLanguageKeys
  )
    .filter((filePath) => isDirectAlgorithmRootFile(filePath, resolvedRoot))
    .sort((left, right) => left.localeCompare(right));

  for (const filePath of directAlgorithmFiles) {
    const basename = path.parse(filePath).name;
    basenameCounts.set(basename, (basenameCounts.get(basename) || 0) + 1);
  }

  let bestBasename = null;
  let bestCount = 0;
  let hasTie = false;

  for (const [basename, count] of basenameCounts.entries()) {
    if (count > bestCount) {
      bestBasename = basename;
      bestCount = count;
      hasTie = false;
      continue;
    }

    if (count === bestCount) {
      hasTie = true;
    }
  }

  if (!bestBasename || hasTie) {
    return path.basename(algorithmPath);
  }

  return bestBasename;
}

/**
 * Creates the untitled URI used when a missing language row is created.
 *
 * @param {string} languageKey Canonical language key.
 * @param {string} algorithmPath Algorithm directory path.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {import("vscode").Uri} Suggested untitled file URI.
 */
function createSuggestedUntitledLanguageUri(
  languageKey,
  algorithmPath,
  resolvedRoot,
  supportedLanguageKeys
) {
  const suggestedBasename = determineSuggestedAlgorithmBaseName(
    algorithmPath,
    resolvedRoot,
    supportedLanguageKeys
  );
  const sampleExtension = LANGUAGE_ICON_SAMPLE_EXTENSIONS[languageKey] || "txt";
  const targetFilePath = path.join(
    algorithmPath,
    `${suggestedBasename}.${sampleExtension}`
  );

  return vscode.Uri.file(targetFilePath).with({ scheme: "untitled" });
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
 * @returns {{label: string, languageKey: string, algorithmPath: string, filePath: string, fsPath: string, fileCount: number, hasFiles: boolean, isLanguageSummary: boolean, isRunnableFile: boolean, hasIncludeChildren: boolean, isFlagged: boolean, resourceUri: import("vscode").Uri, openTargetUri: import("vscode").Uri|null, suggestedUntitledUri: import("vscode").Uri, contextValue: string, tooltip: string}[]} Language summary nodes.
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
  const flaggedLanguageKeys = readFlaggedLanguageKeysForAlgorithm(algorithmPath);

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
    const isFlagged = flaggedLanguageKeys.has(languageKey);
    const matchingFiles = languageFilePathMap.get(languageKey);
    const representativeFile = selectRepresentativeLanguageFile(
      matchingFiles,
      resolvedRoot,
      algorithmPath
    );
    const includeChildren = representativeFile.isRunnable
      ? readIncludeFileChildren(
          algorithmPath,
          languageKey,
          resolvedRoot,
          supportedLanguageKeys,
          flaggedLanguageKeys
        )
      : [];
    const suggestedUntitledUri = createSuggestedUntitledLanguageUri(
      languageKey,
      algorithmPath,
      resolvedRoot,
      supportedLanguageKeys
    );

    return createLanguageSummaryTreeNode(
      languageKey,
      languageCountMap.get(languageKey),
      algorithmPath,
      representativeFile.filePath,
      representativeFile.isRunnable,
      includeChildren.length > 0,
      isFlagged,
      suggestedUntitledUri
    );
  });
}

/**
 * Reads direct children for a directory path as sidebar tree nodes.
 *
 * @param {string|null} directoryPath Canonical directory path.
 * @returns {{filePath: string, fsPath: string, label: string, isDirectory: boolean, isRunnableFile: boolean, algorithmPath: string|null, languageKey: string|null, hasIncludeChildren: boolean, isFlagged: boolean, resourceUri: import("vscode").Uri}[]} Child nodes.
 */
function readSidebarDirectoryChildren(directoryPath, resolvedRoot, supportedLanguageKeys) {
  if (!directoryPath) {
    return [];
  }

  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    entries.sort(compareDirectoryEntries);
    const visibleEntries = [];
    const isAlgorithmDirectory = isAlgorithmDirectoryPath(directoryPath, resolvedRoot);
    const attachedIncludeLanguages = new Set();
    const algorithmFlaggedLanguageCache = new Map();

    /**
     * Returns cached flagged language keys for one algorithm directory.
     *
     * @param {string|null} algorithmPath Algorithm directory path.
     * @returns {Set<string>} Flagged language keys.
     */
    function getFlaggedLanguageKeys(algorithmPath) {
      if (!algorithmPath) {
        return new Set();
      }

      if (!algorithmFlaggedLanguageCache.has(algorithmPath)) {
        algorithmFlaggedLanguageCache.set(
          algorithmPath,
          readFlaggedLanguageKeysForAlgorithm(algorithmPath)
        );
      }

      return algorithmFlaggedLanguageCache.get(algorithmPath);
    }

    if (isAlgorithmDirectory) {
      const algorithmFlaggedLanguageKeys = getFlaggedLanguageKeys(directoryPath);

      for (const entry of entries) {
        if (!entry.isFile()) {
          continue;
        }

        const entryPath = path.join(directoryPath, entry.name);

        if (!isAllowedSidebarFile(entryPath, resolvedRoot, supportedLanguageKeys)) {
          continue;
        }

        const languageKey = getPrimaryAlgorithmFileLanguageKey(entryPath, resolvedRoot);

        if (!languageKey) {
          continue;
        }

        const includeFileChildren = readIncludeFileChildren(
          directoryPath,
          languageKey,
          resolvedRoot,
          supportedLanguageKeys,
          algorithmFlaggedLanguageKeys
        );

        if (includeFileChildren.length > 0) {
          attachedIncludeLanguages.add(languageKey);
        }
      }
    }

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isFile()) {
        if (isAllowedSidebarFile(entryPath, resolvedRoot, supportedLanguageKeys)) {
          const algorithmPath = resolveAlgorithmPathForSidebarFile(entryPath, resolvedRoot);
          const fileLanguageKey = resolveSidebarFileLanguageKey(entryPath, resolvedRoot);
          const languageKey = isAlgorithmDirectory
            ? getPrimaryAlgorithmFileLanguageKey(entryPath, resolvedRoot)
            : null;
          const hasIncludeChildren = Boolean(
            languageKey && attachedIncludeLanguages.has(languageKey)
          );
          const flaggedLanguageKeys = getFlaggedLanguageKeys(algorithmPath);
          const isFlagged = Boolean(
            fileLanguageKey && flaggedLanguageKeys.has(fileLanguageKey)
          );

          visibleEntries.push(
            createSidebarTreeNode(
              entryPath,
              entry,
              isDirectAlgorithmRootFile(entryPath, resolvedRoot),
              algorithmPath,
              fileLanguageKey || languageKey,
              hasIncludeChildren,
              isFlagged
            )
          );
        }
        continue;
      }

      if (!entry.isDirectory()) {
        continue;
      }

      if (
        isAlgorithmDirectory
        && isLanguageIncludeDirectoryName(entry.name)
        && attachedIncludeLanguages.has(entry.name.slice(0, -8).toLowerCase())
      ) {
        continue;
      }

      if (
        isFirstLayerDirectoryPath(entryPath, resolvedRoot)
        || isAlgorithmDirectoryPath(entryPath, resolvedRoot)
      ) {
        visibleEntries.push(
          createSidebarTreeNode(entryPath, entry, false, null, null, false, false)
        );
        continue;
      }

      if (!hasAllowedSidebarDescendant(entryPath, resolvedRoot, supportedLanguageKeys)) {
        continue;
      }

      visibleEntries.push(
        createSidebarTreeNode(entryPath, entry, false, null, null, false, false)
      );
    }

    return visibleEntries;
  } catch (_) {
    return [];
  }
}

/**
 * Returns whether one language summary row is considered a problem.
 *
 * Problem semantics for language mode:
 * - flagged language rows
 * - missing language rows
 *
 * @param {{isFlagged?: boolean, hasFiles?: boolean}|undefined} node Language summary node.
 * @returns {boolean} True when the row should remain in problems filter mode.
 */
function isProblemLanguageSummaryNode(node) {
  if (!node) {
    return false;
  }

  return Boolean(node.isFlagged) || node.hasFiles === false;
}

/**
 * Returns whether one file-mode row is considered a problem.
 *
 * Problem semantics for file mode:
 * - flagged file rows
 *
 * @param {{isDirectory?: boolean, isLanguageSummary?: boolean, isFlagged?: boolean, isRunnableFile?: boolean}|undefined} node File node.
 * @returns {boolean} True when the row should remain in problems filter mode.
 */
function isProblemFileNode(node) {
  if (!node || node.isDirectory || node.isLanguageSummary) {
    return false;
  }

  return Boolean(node.isFlagged);
}

/**
 * Returns whether one sidebar row is a problem in the active view mode.
 *
 * @param {{isLanguageSummary?: boolean, isDirectory?: boolean, isFlagged?: boolean, hasFiles?: boolean, isRunnableFile?: boolean}|undefined} node Sidebar node.
 * @param {"files"|"language"} viewMode Active view mode.
 * @returns {boolean} True when the row should remain in problems filter mode.
 */
function isProblemNodeForViewMode(node, viewMode) {
  if (viewMode === "language") {
    if (node?.isLanguageSummary) {
      return isProblemLanguageSummaryNode(node);
    }

    return isProblemFileNode(node);
  }

  return isProblemFileNode(node);
}

/**
 * Returns whether one directory contains at least one problem descendant.
 *
 * @param {string|null|undefined} directoryPath Directory path.
 * @param {"files"|"language"} viewMode Active view mode.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {boolean} True when at least one problem row exists beneath the directory.
 */
function hasProblemDescendantForViewMode(
  directoryPath,
  viewMode,
  resolvedRoot,
  supportedLanguageKeys
) {
  if (!directoryPath) {
    return false;
  }

  if (viewMode === "language" && isAlgorithmDirectoryPath(directoryPath, resolvedRoot)) {
    const languageSummaryRows = readAlgorithmLanguageSummary(
      directoryPath,
      resolvedRoot,
      supportedLanguageKeys
    );

    return languageSummaryRows.some((row) => isProblemLanguageSummaryNode(row));
  }

  const childRows = readSidebarDirectoryChildren(
    directoryPath,
    resolvedRoot,
    supportedLanguageKeys
  );

  for (const child of childRows) {
    if (child.isDirectory) {
      if (
        hasProblemDescendantForViewMode(
          child.filePath,
          viewMode,
          resolvedRoot,
          supportedLanguageKeys
        )
      ) {
        return true;
      }

      continue;
    }

    if (isProblemNodeForViewMode(child, viewMode)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the language keys targeted by the smoke-test runner.
 *
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @param {Set<string>} supportedLanguageKeys Supported language keys.
 * @returns {string[]} Smoke-test language keys.
 */
function getSmokeTestLanguageKeys(resolvedRoot, supportedLanguageKeys) {
  if (!resolvedRoot) {
    return [];
  }

  const runScriptPath = path.join(realpathSafe(resolvedRoot), "run.sh");

  try {
    const runScriptText = fs.readFileSync(runScriptPath, "utf8");
    const lines = runScriptText.split(/\r?\n/);
    const smokeLanguageKeys = [];
    let inCatalogBlock = false;

    for (const line of lines) {
      if (!inCatalogBlock && /^get_language_catalog\(\)/.test(line)) {
        inCatalogBlock = true;
        continue;
      }

      if (inCatalogBlock && /^EOF$/.test(line.trim())) {
        break;
      }

      if (!inCatalogBlock || !line.includes("|")) {
        continue;
      }

      const languageKey = line.split("|")[0].trim().toLowerCase();

      if (
        languageKey
        && languageKey !== "arm64asm"
        && supportedLanguageKeys.has(languageKey)
      ) {
        smokeLanguageKeys.push(languageKey);
      }
    }

    if (smokeLanguageKeys.length > 0) {
      return smokeLanguageKeys;
    }
  } catch (_) {
    // Fall back to the supported language list when run.sh cannot be parsed.
  }

  return [...supportedLanguageKeys]
    .filter((languageKey) => languageKey !== "arm64asm")
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Parses one smoke-test status output line.
 *
 * @param {string} line One stdout line from the smoke-test runner.
 * @returns {{languageKey: string, smokeStatus: "running"|"passed"|"failed"}|null} Parsed smoke status.
 */
function parseSmokeStatusLine(line) {
  const trimmedLine = String(line || "").trim();
  const match = trimmedLine.match(
    /^SMOKE \[\d+\/\d+\] lang=([^ ]+) timeout=[^ ]+ \[(RUNNING|PASS|FAIL|TIMEOUT)\]$/
  );

  if (!match) {
    return null;
  }

  const languageKey = match[1].trim().toLowerCase();
  const rawStatus = match[2];
  let smokeStatus = "failed";

  if (rawStatus === "RUNNING") {
    smokeStatus = "running";
  } else if (rawStatus === "PASS") {
    smokeStatus = "passed";
  }

  return {
    languageKey,
    smokeStatus,
  };
}

/**
 * Returns the URI fragment used for one smoke status.
 *
 * @param {"queued"|"running"|"passed"|"failed"|"stopped"|null|undefined} smokeStatus Smoke status value.
 * @returns {string|null} Decoration fragment.
 */
function getSmokeStatusFragment(smokeStatus) {
  if (smokeStatus === "queued") {
    return SMOKE_QUEUED_URI_FRAGMENT;
  }

  if (smokeStatus === "running") {
    return SMOKE_RUNNING_URI_FRAGMENT;
  }

  if (smokeStatus === "passed") {
    return SMOKE_PASSED_URI_FRAGMENT;
  }

  if (smokeStatus === "failed") {
    return SMOKE_FAILED_URI_FRAGMENT;
  }

  if (smokeStatus === "stopped") {
    return SMOKE_STOPPED_URI_FRAGMENT;
  }

  return null;
}

/**
 * Returns the user-facing label for one smoke status.
 *
 * @param {"queued"|"running"|"passed"|"failed"|"stopped"|null|undefined} smokeStatus Smoke status value.
 * @returns {string} User-facing status label.
 */
function getSmokeStatusLabel(smokeStatus) {
  return SMOKE_STATUS_LABELS[smokeStatus] || "Unknown";
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
    this._filterMode = "all";
    this._smokeStateByAlgorithmPath = new Map();
    this._runningSmokeAlgorithmPaths = new Set();
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
   * Sets the active sidebar filter mode.
   *
   * @param {"all"|"problems"} filterMode Desired sidebar filter mode.
   * @returns {void}
   */
  setFilterMode(filterMode) {
    this._filterMode = filterMode === "problems" ? "problems" : "all";
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
   * Replaces the smoke-state snapshot for one algorithm directory.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {Map<string, {status: "queued"|"running"|"passed"|"failed", locked: boolean}>} smokeState Snapshot of language smoke states.
   * @returns {void}
   */
  replaceSmokeStateForAlgorithm(algorithmPath, smokeState) {
    this._smokeStateByAlgorithmPath.set(algorithmPath, new Map(smokeState));
    this.refresh();
  }

  /**
   * Sets whether one algorithm currently has an active smoke process.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {boolean} isRunning True when an active process exists.
   * @returns {void}
   */
  setSmokeProcessRunning(algorithmPath, isRunning) {
    if (!algorithmPath) {
      return;
    }

    const currentlyRunning = this._runningSmokeAlgorithmPaths.has(algorithmPath);

    if (isRunning && !currentlyRunning) {
      this._runningSmokeAlgorithmPaths.add(algorithmPath);
      this.refresh();
      return;
    }

    if (!isRunning && currentlyRunning) {
      this._runningSmokeAlgorithmPaths.delete(algorithmPath);
      this.refresh();
    }
  }

  /**
   * Returns whether one algorithm currently has an active smoke process.
   *
   * @param {string|null|undefined} algorithmPath Algorithm directory path.
   * @returns {boolean} True when the algorithm has a running smoke process.
   */
  isSmokeProcessRunningForAlgorithm(algorithmPath) {
    return Boolean(
      algorithmPath && this._runningSmokeAlgorithmPaths.has(algorithmPath)
    );
  }

  /**
   * Returns whether one algorithm has retained smoke-test results.
   *
   * @param {string|null|undefined} algorithmPath Algorithm directory path.
   * @returns {boolean} True when smoke-state entries exist.
   */
  hasSmokeResultsForAlgorithm(algorithmPath) {
    if (!algorithmPath) {
      return false;
    }

    const smokeState = this._smokeStateByAlgorithmPath.get(algorithmPath);
    return Boolean(smokeState && smokeState.size > 0);
  }

  /**
   * Clears retained smoke-test results for one algorithm.
   *
   * @param {string|null|undefined} algorithmPath Algorithm directory path.
   * @returns {boolean} True when smoke results were removed.
   */
  clearSmokeResultsForAlgorithm(algorithmPath) {
    if (!algorithmPath) {
      return false;
    }

    const didDelete = this._smokeStateByAlgorithmPath.delete(algorithmPath);

    if (didDelete) {
      this.refresh();
    }

    return didDelete;
  }

  /**
   * Returns the context value for one algorithm directory row.
   *
   * @param {string|null|undefined} algorithmPath Algorithm directory path.
   * @returns {string} Context value for view-item menu visibility.
   */
  getAlgorithmDirectoryContextValue(algorithmPath) {
    if (this.isSmokeProcessRunningForAlgorithm(algorithmPath)) {
      return "algos.workspaceAlgorithmDirectoryRunning";
    }

    if (this.hasSmokeResultsForAlgorithm(algorithmPath)) {
      return "algos.workspaceAlgorithmDirectoryResults";
    }

    return "algos.workspaceAlgorithmDirectory";
  }

  /**
   * Returns the context value for one non-language-summary directory row.
   *
   * @param {string|null|undefined} directoryPath Directory row path.
   * @returns {string} Context value for view-item menu visibility.
   */
  getDirectoryContextValue(directoryPath) {
    if (isAlgorithmDirectoryPath(directoryPath, this._resolvedRootPath)) {
      return this.getAlgorithmDirectoryContextValue(directoryPath);
    }

    if (isFirstLayerDirectoryPath(directoryPath, this._resolvedRootPath)) {
      return "algos.workspaceCategoryDirectory";
    }

    if (isIncludeDirectoryPath(directoryPath, this._resolvedRootPath)) {
      return "algos.workspaceIncludeDirectory";
    }

    return "algos.workspaceDirectory";
  }

  /**
   * Updates the smoke status for one algorithm/language pair.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {string} languageKey Canonical language key.
  * @param {"queued"|"running"|"passed"|"failed"|"stopped"} smokeStatus Smoke status value.
   * @returns {void}
   */
  setSmokeLanguageStatus(algorithmPath, languageKey, smokeStatus) {
    if (!algorithmPath || !languageKey) {
      return;
    }

    const smokeState = this._smokeStateByAlgorithmPath.get(algorithmPath);

    if (!smokeState || !smokeState.has(languageKey)) {
      return;
    }

    const previousEntry = smokeState.get(languageKey);

    if (previousEntry.locked && previousEntry.status === "failed") {
      return;
    }

    smokeState.set(languageKey, {
      status: smokeStatus,
      locked: false,
    });
    this.refresh();
  }

  /**
   * Marks queued or running smoke entries as failed after a run ends unexpectedly.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @returns {void}
   */
  markRemainingSmokeStatusesFailed(algorithmPath) {
    const smokeState = this._smokeStateByAlgorithmPath.get(algorithmPath);

    if (!smokeState) {
      return;
    }

    if (applyRemainingSmokeStatus(smokeState, "failed")) {
      this.refresh();
    }
  }

  /**
   * Marks queued or running smoke entries as stopped after manual cancellation.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @returns {void}
   */
  markRemainingSmokeStatusesStopped(algorithmPath) {
    const smokeState = this._smokeStateByAlgorithmPath.get(algorithmPath);

    if (!smokeState) {
      return;
    }

    if (applyRemainingSmokeStatus(smokeState, "stopped")) {
      this.refresh();
    }
  }

  /**
   * Returns the smoke-state entry for one algorithm/language pair.
   *
   * @param {string|null|undefined} algorithmPath Algorithm directory path.
   * @param {string|null|undefined} languageKey Canonical language key.
  * @returns {{status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}|null} Smoke-state entry.
   */
  getSmokeLanguageState(algorithmPath, languageKey) {
    if (!algorithmPath || !languageKey) {
      return null;
    }

    const smokeState = this._smokeStateByAlgorithmPath.get(algorithmPath);

    if (!smokeState || !smokeState.has(languageKey)) {
      return null;
    }

    return smokeState.get(languageKey);
  }

  /**
   * Returns the smoke status currently applied to one tree element.
   *
   * @param {{algorithmPath?: string, languageKey?: string, isDirectory?: boolean}|undefined} element Tree element.
  * @returns {"queued"|"running"|"passed"|"failed"|"stopped"|null} Smoke status for the element.
   */
  getSmokeStatusForElement(element) {
    if (!element || element.isDirectory) {
      return null;
    }

    const smokeState = this.getSmokeLanguageState(
      element.algorithmPath,
      element.languageKey
    );

    return smokeState ? smokeState.status : null;
  }

  /**
   * Returns the resource URI with smoke-status decoration applied when present.
   *
   * @param {{resourceUri?: import("vscode").Uri, algorithmPath?: string, languageKey?: string, isDirectory?: boolean}|undefined} element Tree element.
   * @returns {import("vscode").Uri|undefined} Decorated resource URI.
   */
  getDecoratedResourceUriForElement(element) {
    if (!element?.resourceUri) {
      return element?.resourceUri;
    }

    const smokeStatus = this.getSmokeStatusForElement(element);
    const smokeFragment = getSmokeStatusFragment(smokeStatus);

    if (!smokeFragment) {
      return element.resourceUri;
    }

    return element.resourceUri.with({ fragment: smokeFragment });
  }

  /**
   * Appends smoke status detail to one tree item tooltip.
   *
   * @param {{algorithmPath?: string, languageKey?: string, isDirectory?: boolean}|undefined} element Tree element.
   * @param {string|undefined} fallbackTooltip Existing tooltip text.
   * @returns {string|undefined} Tooltip text with smoke detail when present.
   */
  getDecoratedTooltipForElement(element, fallbackTooltip) {
    const smokeStatus = this.getSmokeStatusForElement(element);

    if (!smokeStatus) {
      return fallbackTooltip;
    }

    const smokeTooltipLine = `Smoke Test: ${getSmokeStatusLabel(smokeStatus)}`;

    if (!fallbackTooltip) {
      return smokeTooltipLine;
    }

    return `${fallbackTooltip}\n${smokeTooltipLine}`;
  }

  /**
   * Returns a smoke status summary for one algorithm directory.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @returns {{queued: number, running: number, passed: number, failed: number, stopped: number}} Smoke-status counts.
   */
  getSmokeStatusSummary(algorithmPath) {
    const smokeState = this._smokeStateByAlgorithmPath.get(algorithmPath);

    return buildSmokeStatusSummary(smokeState);
  }

  /**
   * Filters child rows according to the active sidebar filter mode.
   *
   * @param {Array<{filePath?: string, isDirectory?: boolean, isLanguageSummary?: boolean, isFlagged?: boolean, hasFiles?: boolean, isRunnableFile?: boolean}>} children Child rows.
   * @returns {Array<{filePath?: string, isDirectory?: boolean, isLanguageSummary?: boolean, isFlagged?: boolean, hasFiles?: boolean, isRunnableFile?: boolean}>} Filtered child rows.
   */
  filterVisibleChildren(children) {
    if (this._filterMode !== "problems") {
      return children;
    }

    return children.filter((child) => {
      if (child.isDirectory) {
        return hasProblemDescendantForViewMode(
          child.filePath,
          this._viewMode,
          this._resolvedRootPath,
          this._supportedLanguageKeys
        );
      }

      return isProblemNodeForViewMode(child, this._viewMode);
    });
  }

  /**
   * Returns tree item metadata for a file-system tree node.
   *
  * @param {{filePath?: string, fsPath?: string, label: string, languageKey?: string, algorithmPath?: string, isDirectory?: boolean, isRunnableFile?: boolean, isLanguageSummary?: boolean, fileCount?: number, hasFiles?: boolean, hasIncludeChildren?: boolean, isFlagged?: boolean, resourceUri?: import("vscode").Uri, openTargetUri?: import("vscode").Uri|null, suggestedUntitledUri?: import("vscode").Uri, contextValue?: string, tooltip?: string}} element Tree element.
   * @returns {import("vscode").TreeItem} Tree item.
   */
  getTreeItem(element) {
    if (element.isLanguageSummary) {
      const resourceUri = this.getDecoratedResourceUriForElement(element);
      const treeItem = new vscode.TreeItem(
        resourceUri,
        element.hasIncludeChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );

      treeItem.label = element.label;
      treeItem.resourceUri = resourceUri;
      treeItem.description = String(element.fileCount);
      treeItem.contextValue = element.contextValue;
      treeItem.tooltip = this.getDecoratedTooltipForElement(
        element,
        element.tooltip
      );

      if (element.hasIncludeChildren) {
        // Collapsible items default to folder-style icons; force file styling so
        // the language-row icon continues to reflect the file type.
        treeItem.iconPath = vscode.ThemeIcon.File;
      }

      if (element.hasFiles && element.openTargetUri) {
        treeItem.command = {
          command: "vscode.open",
          title: "Open File",
          arguments: [element.openTargetUri],
        };
      }

      return treeItem;
    }

    const resourceUri = this.getDecoratedResourceUriForElement(element);
    const treeItem = new vscode.TreeItem(
      resourceUri,
      element.isDirectory || element.hasIncludeChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.label = element.label;
    treeItem.resourceUri = resourceUri;
    treeItem.contextValue = element.isDirectory
      ? this.getDirectoryContextValue(element.filePath)
      : element.isIncludeFileChild || isIncludeChildFilePath(element.filePath, this._resolvedRootPath)
      ? "algos.workspaceIncludeFile"
      : element.isRunnableFile
      ? element.isFlagged
        ? "algos.workspaceRunnableFileFlagged"
        : "algos.workspaceRunnableFileUnflagged"
      : element.isFlagged
      ? "algos.workspaceFileFlagged"
      : "algos.workspaceFileUnflagged";
    treeItem.tooltip = this.getDecoratedTooltipForElement(
      element,
      element.filePath
    );

    if (!element.isDirectory && element.hasIncludeChildren) {
      // Collapsible items default to folder-style icons; force file styling for composite main-file rows.
      treeItem.iconPath = vscode.ThemeIcon.File;
    }

    if (!element.isDirectory) {
      treeItem.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [vscode.Uri.file(element.filePath)],
      };
    }

    return treeItem;
  }

  /**
   * Returns child entries for the root or a directory node.
   *
  * @param {{filePath?: string, fsPath?: string, label?: string, languageKey?: string, algorithmPath?: string, isDirectory?: boolean, isRunnableFile?: boolean, hasIncludeChildren?: boolean, isFlagged?: boolean, resourceUri?: import("vscode").Uri, isLanguageSummary?: boolean}|undefined} element Parent element.
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
            this.filterVisibleChildren(
              readAlgorithmLanguageSummary(
                this._displayRootPath,
                this._resolvedRootPath,
                this._supportedLanguageKeys
              )
            )
          );
        }

        return Promise.resolve(
          this.filterVisibleChildren(
            readSidebarDirectoryChildren(
              this._displayRootPath,
              this._resolvedRootPath,
              this._supportedLanguageKeys
            )
          )
        );
      }

      if (element.isLanguageSummary) {
        if (!element.hasIncludeChildren) {
          return Promise.resolve([]);
        }

        return Promise.resolve(
          this.filterVisibleChildren(
            readIncludeFileChildren(
              element.algorithmPath || null,
              element.languageKey || null,
              this._resolvedRootPath,
              this._supportedLanguageKeys,
              readFlaggedLanguageKeysForAlgorithm(element.algorithmPath || null)
            )
          )
        );
      }

      if (!element.isDirectory) {
        if (!element.hasIncludeChildren) {
          return Promise.resolve([]);
        }

        return Promise.resolve(
          this.filterVisibleChildren(
            readIncludeFileChildren(
              element.algorithmPath || path.dirname(element.filePath),
              element.languageKey || null,
              this._resolvedRootPath,
              this._supportedLanguageKeys,
              readFlaggedLanguageKeysForAlgorithm(
                element.algorithmPath || path.dirname(element.filePath)
              )
            )
          )
        );
      }

      if (isAlgorithmDirectoryPath(element.filePath, this._resolvedRootPath)) {
        return Promise.resolve(
          this.filterVisibleChildren(
            readAlgorithmLanguageSummary(
              element.filePath,
              this._resolvedRootPath,
              this._supportedLanguageKeys
            )
          )
        );
      }

      return Promise.resolve(
        this.filterVisibleChildren(
          readSidebarDirectoryChildren(
            element.filePath,
            this._resolvedRootPath,
            this._supportedLanguageKeys
          )
        )
      );
    }

    if (!element) {
      return Promise.resolve(
        this.filterVisibleChildren(
          readSidebarDirectoryChildren(
            this._displayRootPath,
            this._resolvedRootPath,
            this._supportedLanguageKeys
          )
        )
      );
    }

    if (!element.isDirectory) {
      if (!element.hasIncludeChildren) {
        return Promise.resolve([]);
      }

      return Promise.resolve(
        this.filterVisibleChildren(
          readIncludeFileChildren(
            element.algorithmPath || path.dirname(element.filePath),
            element.languageKey || null,
            this._resolvedRootPath,
            this._supportedLanguageKeys,
            readFlaggedLanguageKeysForAlgorithm(
              element.algorithmPath || path.dirname(element.filePath)
            )
          )
        )
      );
    }

    return Promise.resolve(
      this.filterVisibleChildren(
        readSidebarDirectoryChildren(
          element.filePath,
          this._resolvedRootPath,
          this._supportedLanguageKeys
        )
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
  const smokeOutputChannel = vscode.window.createOutputChannel(
    SMOKE_TEST_OUTPUT_CHANNEL_NAME
  );
  const smokeProcessByAlgorithmPath = new Map();
  const smokeRunTokenByAlgorithmPath = new Map();
  const stoppedSmokeRunTokenByAlgorithmPath = new Map();
  const languageStatusDecorationProvider = {
    provideFileDecoration(uri) {
      if (
        uri.fragment !== LANGUAGE_PRESENT_URI_FRAGMENT
        && uri.fragment !== LANGUAGE_ABSENT_URI_FRAGMENT
        && uri.fragment !== LANGUAGE_FLAGGED_URI_FRAGMENT
        && uri.fragment !== LANGUAGE_FLAGGED_ABSENT_URI_FRAGMENT
        && uri.fragment !== SMOKE_QUEUED_URI_FRAGMENT
        && uri.fragment !== SMOKE_RUNNING_URI_FRAGMENT
        && uri.fragment !== SMOKE_PASSED_URI_FRAGMENT
        && uri.fragment !== SMOKE_FAILED_URI_FRAGMENT
        && uri.fragment !== SMOKE_STOPPED_URI_FRAGMENT
      ) {
        return undefined;
      }

      if (uri.fragment === SMOKE_QUEUED_URI_FRAGMENT) {
        return {
          badge: "…",
          color: new vscode.ThemeColor("testing.iconQueued"),
          tooltip: "Smoke test queued",
        };
      }

      if (uri.fragment === SMOKE_RUNNING_URI_FRAGMENT) {
        return {
          badge: "~",
          color: new vscode.ThemeColor("charts.blue"),
          tooltip: "Smoke test running",
        };
      }

      if (uri.fragment === SMOKE_PASSED_URI_FRAGMENT) {
        return {
          badge: "✓",
          color: new vscode.ThemeColor("testing.iconPassed"),
          tooltip: "Smoke test passed",
        };
      }

      if (uri.fragment === SMOKE_FAILED_URI_FRAGMENT) {
        return {
          badge: "✕",
          color: new vscode.ThemeColor("testing.iconFailed"),
          tooltip: "Smoke test failed",
        };
      }

      if (uri.fragment === SMOKE_STOPPED_URI_FRAGMENT) {
        return {
          badge: "!",
          color: new vscode.ThemeColor("testing.iconQueued"),
          tooltip: "Smoke test stopped",
        };
      }

      if (uri.fragment === LANGUAGE_FLAGGED_URI_FRAGMENT) {
        return {
          badge: "●",
          color: new vscode.ThemeColor("testing.iconFailed"),
          tooltip: "Language flagged in .flag-lang",
        };
      }

      if (uri.fragment === LANGUAGE_FLAGGED_ABSENT_URI_FRAGMENT) {
        return {
          badge: "●",
          color: new vscode.ThemeColor("testing.iconFailed"),
          tooltip: "Language flagged in .flag-lang and not present in algorithm",
        };
      }

      const hasFiles = uri.fragment === LANGUAGE_PRESENT_URI_FRAGMENT;

      return {
        badge: "●",
        color: hasFiles
          ? undefined
          : new vscode.ThemeColor("testing.iconQueued"),
        tooltip: hasFiles ? "Language present in algorithm" : "Language not present in algorithm",
      };
    },
  };

  const decorationRegistration = vscode.window.registerFileDecorationProvider(
    languageStatusDecorationProvider
  );

  const view = vscode.window.createTreeView(VIEW_IDS.ALGORITHMS_RUN, {
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
   * Terminates any active smoke-test process for one algorithm directory.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @returns {void}
   */
  function stopActiveSmokeProcess(
    algorithmPath,
    options = {
      markStopped: false,
      invalidateRunToken: true,
    }
  ) {
    const activeProcess = smokeProcessByAlgorithmPath.get(algorithmPath);

    if (!activeProcess) {
      return false;
    }

    const markStopped = options.markStopped === true;
    const invalidateRunToken = options.invalidateRunToken !== false;
    const activeRunToken = smokeRunTokenByAlgorithmPath.get(algorithmPath) || 0;

    if (markStopped) {
      stoppedSmokeRunTokenByAlgorithmPath.set(algorithmPath, activeRunToken);
      provider.markRemainingSmokeStatusesStopped(algorithmPath);
    } else {
      stoppedSmokeRunTokenByAlgorithmPath.delete(algorithmPath);
    }

    if (invalidateRunToken) {
      smokeRunTokenByAlgorithmPath.set(algorithmPath, activeRunToken + 1);
    }

    smokeProcessByAlgorithmPath.delete(algorithmPath);
    provider.setSmokeProcessRunning(algorithmPath, false);

    try {
      activeProcess.kill();
    } catch (_) {
      // Ignore process termination errors during replacement/disposal.
    }

    return true;
  }

  /**
   * Returns whether one smoke-test callback belongs to a manually stopped run.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number} runToken Smoke run token.
   * @returns {boolean} True when the callback belongs to a stopped run token.
   */
  function isStoppedSmokeRun(algorithmPath, runToken) {
    return stoppedSmokeRunTokenByAlgorithmPath.get(algorithmPath) === runToken;
  }

  /**
   * Returns whether one smoke-test callback belongs to the latest run token.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number} runToken Smoke run token.
   * @returns {boolean} True when the callback should still mutate provider state.
   */
  function isCurrentSmokeRun(algorithmPath, runToken) {
    return smokeRunTokenByAlgorithmPath.get(algorithmPath) === runToken;
  }

  /**
   * Seeds smoke-test status for every language row in one algorithm.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {string|null} resolvedRoot Canonical repository root path.
   * @param {string[]|null} selectedLanguageKeys Optional selected smoke languages.
   * @returns {string[]} Smoke-test language keys for the run.
   */
  function initializeSmokeStatusesForAlgorithm(
    algorithmPath,
    resolvedRoot,
    selectedLanguageKeys
  ) {
    const supportedLanguageKeys = getSupportedLanguageKeys(resolvedRoot);
    const defaultSmokeLanguageKeys = getSmokeTestLanguageKeys(
      resolvedRoot,
      supportedLanguageKeys
    );
    const requestedLanguageKeys = Array.isArray(selectedLanguageKeys)
      ? selectedLanguageKeys
      : defaultSmokeLanguageKeys;
    const smokeLanguageKeys = requestedLanguageKeys.filter((languageKey) =>
      defaultSmokeLanguageKeys.includes(languageKey)
    );
    const languageSummaryRows = readAlgorithmLanguageSummary(
      algorithmPath,
      resolvedRoot,
      supportedLanguageKeys
    );
    const hasFilesByLanguageKey = new Map(
      languageSummaryRows.map((row) => [row.languageKey, row.hasFiles])
    );
    const smokeState = new Map();

    for (const languageKey of smokeLanguageKeys) {
      const hasFiles = hasFilesByLanguageKey.get(languageKey) === true;
      smokeState.set(languageKey, {
        status: hasFiles ? "queued" : "failed",
        locked: !hasFiles,
      });
    }

    provider.replaceSmokeStateForAlgorithm(algorithmPath, smokeState);
    return smokeLanguageKeys;
  }

  /**
   * Appends smoke-test process output and updates provider state from parsed lines.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number} runToken Smoke run token.
   * @param {string} chunk Output chunk text.
   * @param {string} bufferKey Buffer state property name.
   * @param {{stdoutBuffer: string, stderrBuffer: string}} bufferState Output buffer state.
   * @returns {void}
   */
  function processSmokeOutputChunk(
    algorithmPath,
    runToken,
    chunk,
    bufferKey,
    bufferState
  ) {
    bufferState[bufferKey] += chunk;
    smokeOutputChannel.append(chunk);

    const lines = bufferState[bufferKey].split(/\r?\n/);
    bufferState[bufferKey] = lines.pop() || "";

    for (const line of lines) {
      const parsedLine = parseSmokeStatusLine(line);

      if (!parsedLine || !isCurrentSmokeRun(algorithmPath, runToken)) {
        continue;
      }

      provider.setSmokeLanguageStatus(
        algorithmPath,
        parsedLine.languageKey,
        parsedLine.smokeStatus
      );
    }
  }

  /**
   * Runs one algorithm-level smoke test and streams smoke-state updates.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @param {{filePath?: string, fsPath?: string}|undefined} item Sidebar item payload.
   * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
   */
  async function runSmokeTest(vscodeApi, eligibilityState, item) {
    const resolvedRoot = eligibilityState?.selected?.resolvedRoot || null;
    const algorithmPath = item?.filePath || item?.fsPath || null;

    if (!resolvedRoot || !algorithmPath) {
      vscodeApi.window.showInformationMessage(
        "Select an algorithm directory row in the sidebar and try again."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "missing-algorithm-sidebar-item",
      };
    }

    if (!isAlgorithmDirectoryPath(algorithmPath, resolvedRoot)) {
      vscodeApi.window.showInformationMessage(
        "Smoke Test is only available on src/<category>/<algorithm> directory rows."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "not-algorithm-directory",
      };
    }

    const smokeScriptPath = path.join(
      realpathSafe(resolvedRoot),
      "shlib",
      "run-smoke-test.sh"
    );

    if (!fs.existsSync(smokeScriptPath)) {
      vscodeApi.window.showErrorMessage(
        `Smoke test runner not found: ${smokeScriptPath}`
      );
      return {
        ok: false,
        status: "blocked",
        reason: "missing-smoke-script",
      };
    }

    stopActiveSmokeProcess(algorithmPath);
    stoppedSmokeRunTokenByAlgorithmPath.delete(algorithmPath);

    const runToken = (smokeRunTokenByAlgorithmPath.get(algorithmPath) || 0) + 1;
    smokeRunTokenByAlgorithmPath.set(algorithmPath, runToken);
    const smokeOptions = getEffectiveSidebarSmokeArgs();

    if (!smokeOptions.ok) {
      vscodeApi.window.showWarningMessage(
        smokeOptions.reason || "Smoke Controls are invalid."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "invalid-smoke-controls",
      };
    }

    const smokeLanguageKeys = initializeSmokeStatusesForAlgorithm(
      algorithmPath,
      resolvedRoot,
      smokeOptions.selectedLanguages
    );

    if (smokeLanguageKeys.length === 0) {
      vscodeApi.window.showWarningMessage(
        "No compatible smoke-test languages are selected for this algorithm."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "no-smoke-languages-selected",
      };
    }

    const smokeCommandArgs = [smokeScriptPath, `--dir=${algorithmPath}`, ...smokeOptions.args];

    const smokeProcess = spawn("sh", smokeCommandArgs, {
      cwd: algorithmPath,
    });
    const bufferState = {
      stdoutBuffer: "",
      stderrBuffer: "",
    };

    smokeProcessByAlgorithmPath.set(algorithmPath, smokeProcess);
    provider.setSmokeProcessRunning(algorithmPath, true);
    smokeOutputChannel.appendLine("");
    smokeOutputChannel.appendLine(`=== Smoke Test: ${algorithmPath} ===`);
    smokeOutputChannel.show(true);

    smokeProcess.stdout.setEncoding("utf8");
    smokeProcess.stderr.setEncoding("utf8");

    smokeProcess.stdout.on("data", (chunk) => {
      processSmokeOutputChunk(
        algorithmPath,
        runToken,
        chunk,
        "stdoutBuffer",
        bufferState
      );
    });

    smokeProcess.stderr.on("data", (chunk) => {
      processSmokeOutputChunk(
        algorithmPath,
        runToken,
        chunk,
        "stderrBuffer",
        bufferState
      );
    });

    smokeProcess.on("error", (error) => {
      if (isStoppedSmokeRun(algorithmPath, runToken)) {
        stoppedSmokeRunTokenByAlgorithmPath.delete(algorithmPath);
        return;
      }

      if (!isCurrentSmokeRun(algorithmPath, runToken)) {
        return;
      }

      smokeProcessByAlgorithmPath.delete(algorithmPath);
      provider.setSmokeProcessRunning(algorithmPath, false);
      provider.markRemainingSmokeStatusesFailed(algorithmPath);
      smokeOutputChannel.appendLine(`Process error: ${error.message}`);
      vscodeApi.window.showErrorMessage(
        `Smoke Test failed to start for ${path.basename(algorithmPath)}.`
      );
    });

    smokeProcess.on("close", (code, signal) => {
      if (isStoppedSmokeRun(algorithmPath, runToken)) {
        stoppedSmokeRunTokenByAlgorithmPath.delete(algorithmPath);
        return;
      }

      if (!isCurrentSmokeRun(algorithmPath, runToken)) {
        return;
      }

      smokeProcessByAlgorithmPath.delete(algorithmPath);
      provider.setSmokeProcessRunning(algorithmPath, false);
      provider.markRemainingSmokeStatusesFailed(algorithmPath);

      const summary = provider.getSmokeStatusSummary(algorithmPath);
      const summaryLine = `Smoke summary for ${path.basename(algorithmPath)}: queued=${summary.queued} running=${summary.running} passed=${summary.passed} failed=${summary.failed} stopped=${summary.stopped}`;

      if (signal) {
        smokeOutputChannel.appendLine(`Smoke process terminated by signal: ${signal}`);
      } else {
        smokeOutputChannel.appendLine(`Smoke process exited with code: ${code}`);
      }

      smokeOutputChannel.appendLine(summaryLine);

      if (summary.failed > 0 || code !== 0) {
        vscodeApi.window.showWarningMessage(summaryLine);
        return;
      }

      vscodeApi.window.showInformationMessage(summaryLine);
    });

    vscodeApi.window.showInformationMessage(
      `Smoke Test started for ${path.basename(algorithmPath)}.`
    );

    return {
      ok: true,
      status: "started",
      reason: null,
    };
  }

  /**
   * Stops one algorithm-level smoke test that is currently in progress.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @param {{filePath?: string, fsPath?: string}|undefined} item Sidebar item payload.
   * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
   */
  async function stopSmokeTest(vscodeApi, eligibilityState, item) {
    const resolvedRoot = eligibilityState?.selected?.resolvedRoot || null;
    const algorithmPath = item?.filePath || item?.fsPath || null;

    if (!resolvedRoot || !algorithmPath) {
      vscodeApi.window.showInformationMessage(
        "Select an algorithm directory row in the sidebar and try again."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "missing-algorithm-sidebar-item",
      };
    }

    if (!isAlgorithmDirectoryPath(algorithmPath, resolvedRoot)) {
      vscodeApi.window.showInformationMessage(
        "Stop Smoke Test is only available on src/<category>/<algorithm> directory rows."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "not-algorithm-directory",
      };
    }

    const activeProcess = smokeProcessByAlgorithmPath.get(algorithmPath);

    if (!activeProcess) {
      vscodeApi.window.showInformationMessage(
        `No smoke test is running for ${path.basename(algorithmPath)}.`
      );
      return {
        ok: false,
        status: "noop",
        reason: "no-active-smoke-process",
      };
    }

    stopActiveSmokeProcess(algorithmPath, {
      markStopped: true,
      invalidateRunToken: true,
    });
    vscodeApi.window.showInformationMessage(
      `Stop requested for smoke test: ${path.basename(algorithmPath)}.`
    );

    return {
      ok: true,
      status: "stopping",
      reason: null,
    };
  }

  /**
   * Clears retained smoke-test visual results for one algorithm directory.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @param {{filePath?: string, fsPath?: string}|undefined} item Sidebar item payload.
   * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
   */
  async function clearSmokeResults(vscodeApi, eligibilityState, item) {
    const resolvedRoot = eligibilityState?.selected?.resolvedRoot || null;
    const algorithmPath = item?.filePath || item?.fsPath || null;

    if (!resolvedRoot || !algorithmPath) {
      vscodeApi.window.showInformationMessage(
        "Select an algorithm directory row in the sidebar and try again."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "missing-algorithm-sidebar-item",
      };
    }

    if (!isAlgorithmDirectoryPath(algorithmPath, resolvedRoot)) {
      vscodeApi.window.showInformationMessage(
        "Clear Smoke Results is only available on src/<category>/<algorithm> directory rows."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "not-algorithm-directory",
      };
    }

    if (provider.isSmokeProcessRunningForAlgorithm(algorithmPath)) {
      vscodeApi.window.showInformationMessage(
        "Stop the smoke test before clearing results."
      );
      return {
        ok: false,
        status: "blocked",
        reason: "smoke-test-running",
      };
    }

    const didClear = provider.clearSmokeResultsForAlgorithm(algorithmPath);

    if (!didClear) {
      vscodeApi.window.showInformationMessage(
        `No smoke results to clear for ${path.basename(algorithmPath)}.`
      );
      return {
        ok: false,
        status: "noop",
        reason: "no-smoke-results",
      };
    }

    vscodeApi.window.showInformationMessage(
      `Cleared smoke results for ${path.basename(algorithmPath)}.`
    );

    return {
      ok: true,
      status: "cleared",
      reason: null,
    };
  }

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

  /**
   * Applies the requested sidebar filter mode and updates context visibility keys.
   *
   * @param {"all"|"problems"} filterMode Requested sidebar filter mode.
   * @returns {Thenable<void>} Completion result.
   */
  function applySidebarFilterMode(filterMode) {
    const nextFilterMode = filterMode === "problems" ? "problems" : "all";
    provider.setFilterMode(nextFilterMode);
    provider.refresh();

    return vscode.commands.executeCommand(
      "setContext",
      "algos.sidebarFilterMode",
      nextFilterMode
    );
  }

  void refreshWorkspaceViewState();
  void applySidebarViewMode("files");
  void applySidebarFilterMode("all");

  /**
   * Returns the canonical src root path used by Algorithms pane operations.
   *
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @returns {string|null} Canonical src root path when available.
   */
  function getCommandSrcRootPath(eligibilityState) {
    const resolvedRoot = eligibilityState?.selected?.resolvedRoot || null;
    return resolveSrcRootPath(resolvedRoot);
  }

  /**
   * Returns whether one user-provided name is a valid immediate child name.
   *
   * @param {string} candidateName User-entered name.
   * @returns {boolean} True when candidate name is one immediate child segment.
   */
  function isValidImmediateChildName(candidateName) {
    const trimmedName = String(candidateName || "").trim();

    if (!trimmedName || trimmedName === "." || trimmedName === "..") {
      return false;
    }

    return !trimmedName.includes("/") && !trimmedName.includes("\\");
  }

  /**
   * Returns whether one file-system path currently exists.
   *
   * @param {string} targetPath Candidate file-system path.
   * @returns {boolean} True when path exists.
   */
  function pathExists(targetPath) {
    try {
      fs.lstatSync(targetPath);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Returns whether one existing file-system path is a directory.
   *
   * @param {string} targetPath Candidate file-system path.
   * @returns {boolean} True when existing path is a directory.
   */
  function isDirectoryPath(targetPath) {
    try {
      return fs.lstatSync(targetPath).isDirectory();
    } catch (_) {
      return false;
    }
  }

  /**
   * Prompts for one immediate child name and validates slash-free input.
   *
   * @param {string} title Prompt title.
   * @param {string} prompt Prompt description.
   * @param {string} placeholder Placeholder example.
   * @returns {Promise<string|undefined>} Valid name, or undefined when canceled/invalid.
   */
  async function promptImmediateChildName(title, prompt, placeholder) {
    const value = await vscode.window.showInputBox({
      title,
      prompt,
      placeHolder: placeholder,
      ignoreFocusOut: true,
      value: "",
    });

    if (typeof value !== "string") {
      return undefined;
    }

    const trimmedValue = value.trim();

    if (!isValidImmediateChildName(trimmedValue)) {
      vscode.window.showWarningMessage(
        "Use one immediate name only (no slashes, no empty value)."
      );
      return undefined;
    }

    return trimmedValue;
  }

  /**
   * Shows unsupported-file warning and asks whether creation should continue.
   *
   * @param {string} targetPath Candidate file path.
   * @returns {Promise<boolean>} True when creation should continue.
   */
  async function confirmUnsupportedFileCreation(targetPath) {
    const fileName = path.basename(targetPath);
    const selection = await vscode.window.showWarningMessage(
      `"${fileName}" uses an unsupported extension and will be hidden in the Algorithms tree.`,
      { modal: true },
      "Create Anyway"
    );

    return selection === "Create Anyway";
  }

  /**
   * Shows delete confirmation for one operation target label.
   *
   * @param {string} message Confirmation message.
   * @returns {Promise<boolean>} True when deletion is confirmed.
   */
  async function confirmDeleteAction(message) {
    const selection = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      "Delete"
    );

    return selection === "Delete";
  }

  /**
   * Deletes one URI by trying OS trash first, then falling back to direct delete.
   *
   * @param {import("vscode").Uri} targetUri Target URI.
   * @param {boolean} recursive Whether deletion should recurse.
   * @returns {Promise<boolean>} True when target was moved to trash.
   */
  async function deleteWithTrashFallback(targetUri, recursive) {
    try {
      await vscode.workspace.fs.delete(targetUri, {
        recursive,
        useTrash: true,
      });
      return true;
    } catch (_) {
      await vscode.workspace.fs.delete(targetUri, {
        recursive,
        useTrash: false,
      });
      return false;
    }
  }

  /**
   * Creates a new folder directly under src root.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
   */
  async function createFolderAtSrcRoot(vscodeApi, eligibilityState) {
    const srcRootPath = getCommandSrcRootPath(eligibilityState);

    if (!srcRootPath) {
      vscodeApi.window.showWarningMessage(
        "Algorithms source root is unavailable for this workspace."
      );
      return { ok: false, status: "blocked", reason: "missing-src-root" };
    }

    const folderName = await promptImmediateChildName(
      "Algorithms: New Folder",
      "Enter a new folder name under src/.",
      "example: numeric"
    );

    if (!folderName) {
      return { ok: false, status: "cancelled", reason: "invalid-or-cancelled-name" };
    }

    const targetPath = path.join(srcRootPath, folderName);

    if (pathExists(targetPath)) {
      vscodeApi.window.showWarningMessage("A file or folder with that name already exists.");
      return { ok: false, status: "blocked", reason: "target-exists" };
    }

    fs.mkdirSync(targetPath, { recursive: false });
    provider.refresh();
    vscodeApi.window.showInformationMessage(`Created folder: src/${folderName}`);
    return { ok: true, status: "created", reason: null };
  }

  /**
   * Creates a child folder under a selected first-layer category directory.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @param {{filePath?: string, isDirectory?: boolean}|undefined} item Sidebar item payload.
   * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
   */
  async function createFolder(vscodeApi, eligibilityState, item) {
    const resolvedRoot = eligibilityState?.selected?.resolvedRoot || null;
    const srcRootPath = getCommandSrcRootPath(eligibilityState);
    const targetParentPath = item?.filePath || null;

    if (!srcRootPath || !targetParentPath || !item?.isDirectory) {
      vscodeApi.window.showInformationMessage(
        "Select a first-layer src/<category> folder row and try again."
      );
      return { ok: false, status: "blocked", reason: "missing-category-row" };
    }

    if (!isFirstLayerDirectoryPath(targetParentPath, resolvedRoot)) {
      vscodeApi.window.showInformationMessage(
        "New Folder is available on first-layer src/<category> rows only."
      );
      return { ok: false, status: "blocked", reason: "not-first-layer-directory" };
    }

    const folderName = await promptImmediateChildName(
      "Algorithms: New Folder",
      "Enter a new immediate child folder name.",
      "example: helpers"
    );

    if (!folderName) {
      return { ok: false, status: "cancelled", reason: "invalid-or-cancelled-name" };
    }

    const targetPath = path.join(targetParentPath, folderName);

    if (!isPathWithinRoot(srcRootPath, targetPath) || pathExists(targetPath)) {
      vscodeApi.window.showWarningMessage(
        pathExists(targetPath)
          ? "A file or folder with that name already exists."
          : "Target path must stay inside src/."
      );
      return { ok: false, status: "blocked", reason: "invalid-target-path" };
    }

    fs.mkdirSync(targetPath, { recursive: false });
    provider.refresh();
    vscodeApi.window.showInformationMessage(`Created folder: ${path.basename(targetPath)}`);
    return { ok: true, status: "created", reason: null };
  }

  /**
   * Creates a file directly under a selected algorithm directory.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @param {{filePath?: string, isDirectory?: boolean}|undefined} item Sidebar item payload.
   * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
   */
  async function createFile(vscodeApi, eligibilityState, item) {
    const resolvedRoot = eligibilityState?.selected?.resolvedRoot || null;
    const srcRootPath = getCommandSrcRootPath(eligibilityState);
    const algorithmPath = item?.filePath || null;

    if (!srcRootPath || !algorithmPath || !item?.isDirectory) {
      vscodeApi.window.showInformationMessage(
        "Select one src/<category>/<algorithm> directory row and try again."
      );
      return { ok: false, status: "blocked", reason: "missing-algorithm-directory" };
    }

    if (!isAlgorithmDirectoryPath(algorithmPath, resolvedRoot)) {
      vscodeApi.window.showInformationMessage(
        "New File is available on src/<category>/<algorithm> directory rows only."
      );
      return { ok: false, status: "blocked", reason: "not-algorithm-directory" };
    }

    const fileName = await promptImmediateChildName(
      "Algorithms: New File",
      "Enter a new file name for this algorithm folder.",
      "example: easter.py"
    );

    if (!fileName) {
      return { ok: false, status: "cancelled", reason: "invalid-or-cancelled-name" };
    }

    const targetPath = path.join(algorithmPath, fileName);

    if (!isPathWithinRoot(srcRootPath, targetPath) || pathExists(targetPath)) {
      vscodeApi.window.showWarningMessage(
        pathExists(targetPath)
          ? "A file or folder with that name already exists."
          : "Target path must stay inside src/."
      );
      return { ok: false, status: "blocked", reason: "invalid-target-path" };
    }

    const normalizedLanguage = normalizeExtensionToLanguageKey(targetPath);
    const isSupportedLanguage = Boolean(
      normalizedLanguage && provider._supportedLanguageKeys.has(normalizedLanguage)
    );

    if (!isSupportedLanguage) {
      const shouldCreate = await confirmUnsupportedFileCreation(targetPath);

      if (!shouldCreate) {
        return { ok: false, status: "cancelled", reason: "unsupported-extension-cancelled" };
      }
    }

    fs.writeFileSync(targetPath, "", { flag: "wx" });
    provider.refresh();
    await vscodeApi.commands.executeCommand("vscode.open", vscode.Uri.file(targetPath));

    if (!isSupportedLanguage) {
      vscodeApi.window.showInformationMessage(
        "File created. It may be hidden in the Algorithms tree because the extension is unsupported."
      );
    }

    return { ok: true, status: "created", reason: null };
  }

  /**
   * Adds a new include file under <language>_include for runnable file/language rows.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @param {{filePath?: string, algorithmPath?: string, languageKey?: string, isRunnableFile?: boolean, isLanguageSummary?: boolean, openTargetUri?: import("vscode").Uri, contextValue?: string}|undefined} item Sidebar item payload.
   * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
   */
  async function addIncludeFile(vscodeApi, eligibilityState, item) {
    const srcRootPath = getCommandSrcRootPath(eligibilityState);
    const algorithmPath = item?.algorithmPath || null;
    const languageKey = item?.languageKey || null;
    const isPresentLanguageRow = item?.isLanguageSummary
      && (item?.contextValue === "algos.languagePresentUnflagged"
        || item?.contextValue === "algos.languagePresentFlagged");
    const isRunnableFileRow = !item?.isDirectory && item?.isRunnableFile === true;

    if (!srcRootPath || !algorithmPath || !languageKey || (!isPresentLanguageRow && !isRunnableFileRow)) {
      vscodeApi.window.showInformationMessage(
        "Add Include File is available on runnable file rows and present language rows only."
      );
      return { ok: false, status: "blocked", reason: "unsupported-row-context" };
    }

    const referenceFilePath = isPresentLanguageRow
      ? item?.openTargetUri?.fsPath || null
      : item?.filePath || null;

    const includeDirectoryPath = path.join(algorithmPath, `${languageKey}_include`);
    const requiredExtension = (referenceFilePath
      ? path.extname(referenceFilePath)
      : `.${LANGUAGE_ICON_SAMPLE_EXTENSIONS[languageKey] || "txt"}`).toLowerCase();

    const fileName = await promptImmediateChildName(
      "Algorithms: Add Include File",
      `Enter a file name with extension ${requiredExtension}.`,
      `example${requiredExtension}`
    );

    if (!fileName) {
      return { ok: false, status: "cancelled", reason: "invalid-or-cancelled-name" };
    }

    const enteredExtension = path.extname(fileName).toLowerCase();

    if (!enteredExtension || enteredExtension !== requiredExtension) {
      vscodeApi.window.showWarningMessage(
        `Include file extension must be ${requiredExtension} for ${languageKey}.`
      );
      return { ok: false, status: "blocked", reason: "include-extension-mismatch" };
    }

    const targetPath = path.join(includeDirectoryPath, fileName);

    if (!isPathWithinRoot(srcRootPath, targetPath) || pathExists(targetPath)) {
      vscodeApi.window.showWarningMessage(
        pathExists(targetPath)
          ? "A file or folder with that name already exists."
          : "Target path must stay inside src/."
      );
      return { ok: false, status: "blocked", reason: "invalid-target-path" };
    }

    const normalizedLanguage = normalizeExtensionToLanguageKey(targetPath);

    if (normalizedLanguage !== languageKey) {
      vscodeApi.window.showWarningMessage(
        `Include file extension must map to language ${languageKey}.`
      );
      return { ok: false, status: "blocked", reason: "include-language-mismatch" };
    }

    fs.mkdirSync(includeDirectoryPath, { recursive: true });
    fs.writeFileSync(targetPath, "", { flag: "wx" });
    provider.refresh();
    await vscodeApi.commands.executeCommand("vscode.open", vscode.Uri.file(targetPath));
    return { ok: true, status: "created", reason: null };
  }

  /**
   * Deletes one Algorithms pane target according to row semantics.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @param {{selected?: {resolvedRoot?: string}|null|undefined}|undefined} eligibilityState Eligible workspace state.
   * @param {{filePath?: string, algorithmPath?: string, languageKey?: string, isDirectory?: boolean, isRunnableFile?: boolean, isLanguageSummary?: boolean, isIncludeFileChild?: boolean, contextValue?: string, openTargetUri?: import("vscode").Uri}|undefined} item Sidebar item payload.
   * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
   */
  async function deleteItem(vscodeApi, eligibilityState, item) {
    const resolvedRoot = eligibilityState?.selected?.resolvedRoot || null;
    const srcRootPath = getCommandSrcRootPath(eligibilityState);

    if (!srcRootPath || !item?.filePath) {
      vscodeApi.window.showInformationMessage("Select a deletable row and try again.");
      return { ok: false, status: "blocked", reason: "missing-delete-target" };
    }

    const isPresentLanguageRow = item?.isLanguageSummary
      && (item?.contextValue === "algos.languagePresentUnflagged"
        || item?.contextValue === "algos.languagePresentFlagged");
    const deleteTargets = [];

    if (item.isDirectory) {
      if (
        !isFirstLayerDirectoryPath(item.filePath, resolvedRoot)
        && !isAlgorithmDirectoryPath(item.filePath, resolvedRoot)
      ) {
        vscodeApi.window.showInformationMessage(
          "Delete is available on first-layer and algorithm directory rows only."
        );
        return { ok: false, status: "blocked", reason: "unsupported-directory-delete" };
      }

      deleteTargets.push({ filePath: item.filePath, recursive: true });
    } else if (item.isIncludeFileChild || isIncludeChildFilePath(item.filePath, resolvedRoot)) {
      deleteTargets.push({ filePath: item.filePath, recursive: false });
    } else if (item.isRunnableFile || isPresentLanguageRow) {
      const algorithmPath = item.algorithmPath || path.dirname(item.filePath);
      const languageKey = item.languageKey || normalizeExtensionToLanguageKey(item.filePath);
      const includeDirectoryPath =
        algorithmPath && languageKey
          ? path.join(algorithmPath, `${languageKey}_include`)
          : null;
      const mainFilePath = isPresentLanguageRow
        ? item?.openTargetUri?.fsPath || null
        : item.filePath;

      if (mainFilePath && pathExists(mainFilePath)) {
        deleteTargets.push({ filePath: mainFilePath, recursive: false });
      }

      if (includeDirectoryPath && isDirectoryPath(includeDirectoryPath)) {
        const mainWithinInclude = mainFilePath
          && isPathWithinRoot(includeDirectoryPath, mainFilePath);

        if (mainWithinInclude) {
          for (let index = deleteTargets.length - 1; index >= 0; index -= 1) {
            if (deleteTargets[index].filePath === mainFilePath) {
              deleteTargets.splice(index, 1);
            }
          }
        }

        deleteTargets.push({ filePath: includeDirectoryPath, recursive: true });
      }
    } else {
      vscodeApi.window.showInformationMessage(
        "Delete is not available for this row type."
      );
      return { ok: false, status: "blocked", reason: "unsupported-delete-context" };
    }

    const normalizedTargets = [];

    for (const target of deleteTargets) {
      if (!target.filePath || !pathExists(target.filePath)) {
        continue;
      }

      if (!isPathWithinRoot(srcRootPath, target.filePath)) {
        vscodeApi.window.showWarningMessage("Delete target must stay inside src/.");
        return { ok: false, status: "blocked", reason: "delete-outside-src" };
      }

      if (realpathSafe(target.filePath) === srcRootPath) {
        vscodeApi.window.showWarningMessage("Deleting src/ root is not allowed.");
        return { ok: false, status: "blocked", reason: "delete-src-root" };
      }

      if (!normalizedTargets.some((existing) => existing.filePath === target.filePath)) {
        normalizedTargets.push(target);
      }
    }

    if (normalizedTargets.length === 0) {
      vscodeApi.window.showInformationMessage("Nothing to delete for this row.");
      provider.refresh();
      return { ok: false, status: "noop", reason: "no-existing-delete-targets" };
    }

    const deleteLabel = normalizedTargets.length === 1
      ? path.basename(normalizedTargets[0].filePath)
      : `${normalizedTargets.length} targets`;
    const deleteMessage = normalizedTargets.some((target) => target.recursive)
      ? `Delete ${deleteLabel}? Folder deletes remove all nested contents.`
      : `Delete ${deleteLabel}?`;
    const isConfirmed = await confirmDeleteAction(deleteMessage);

    if (!isConfirmed) {
      return { ok: false, status: "cancelled", reason: "delete-cancelled" };
    }

    const usedTrashResults = [];

    for (const target of normalizedTargets) {
      const usedTrash = await deleteWithTrashFallback(
        vscode.Uri.file(target.filePath),
        target.recursive
      );
      usedTrashResults.push(usedTrash);
    }

    provider.refresh();
    const allUsedTrash = usedTrashResults.every((value) => value === true);
    vscodeApi.window.showInformationMessage(
      allUsedTrash
        ? `Moved to trash: ${deleteLabel}`
        : `Deleted permanently: ${deleteLabel}`
    );

    return { ok: true, status: "deleted", reason: null };
  }

  /**
   * Opens an untitled suggested file for a missing-language row.
   *
   * @param {{suggestedUntitledUri?: import("vscode").Uri}} element Missing-language tree element.
   * @returns {Promise<void>} Completion result.
   */
  async function openMissingLanguageFile(element) {
    if (!element?.suggestedUntitledUri) {
      return;
    }

    const document = await vscode.workspace.openTextDocument(
      element.suggestedUntitledUri
    );
    await vscode.window.showTextDocument(document, {
      preview: false,
    });
  }

  /**
   * Disposes smoke-test resources owned by the sidebar registration.
   *
   * @returns {void}
   */
  function disposeSmokeResources() {
    for (const algorithmPath of smokeProcessByAlgorithmPath.keys()) {
      stopActiveSmokeProcess(algorithmPath);
    }

    smokeOutputChannel.dispose();
  }

  return {
    refresh: () => {
      void refreshWorkspaceViewState();
    },
    setViewMode: async (viewMode) => {
      await applySidebarViewMode(viewMode);
    },
    setFilterMode: async (filterMode) => {
      await applySidebarFilterMode(filterMode);
    },
    runSmokeTest,
    stopSmokeTest,
    clearSmokeResults,
    createFolderAtSrcRoot,
    createFolder,
    createFile,
    addIncludeFile,
    deleteItem,
    openMissingLanguageFile,
    disposables: [
      view,
      refreshOnFolderChange,
      provider,
      decorationRegistration,
      { dispose: disposeSmokeResources },
    ],
  };
}

// Public API for the workspace algorithms run view.
module.exports = {
  _internal: {
    WorkspaceStatusTreeDataProvider,
  },
  registerWorkspaceAlgorithmsRunView,
};
