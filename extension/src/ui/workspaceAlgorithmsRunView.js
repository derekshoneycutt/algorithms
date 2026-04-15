const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { resolveEligibilityState } = require("../runtime/pathResolver");
const {
  getSupportedLanguageKeys,
  normalizeExtensionToLanguageKey,
} = require("../validation/inputValidation");

const LANGUAGE_ICON_DIRECTORY_SEGMENT = ".algos-language-icons";
const LANGUAGE_PRESENT_URI_FRAGMENT = "algos-language-present";
const LANGUAGE_ABSENT_URI_FRAGMENT = "algos-language-absent";
const LANGUAGE_FLAGGED_URI_FRAGMENT = "algos-language-flagged";
const LANGUAGE_FLAGGED_ABSENT_URI_FRAGMENT = "algos-language-flagged-absent";

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
 * be reused. When none exist, the first sorted nested match is used.
 *
 * @param {string[]} matchingFiles Matching file paths for one language.
 * @param {string|null} resolvedRoot Canonical repository root path.
 * @returns {{filePath: string|null, isRunnable: boolean}} Representative file metadata.
 */
function selectRepresentativeLanguageFile(matchingFiles, resolvedRoot) {
  const sortedFiles = [...matchingFiles].sort((left, right) =>
    left.localeCompare(right)
  );
  const directAlgorithmFiles = sortedFiles.filter((filePath) =>
    isDirectAlgorithmRootFile(filePath, resolvedRoot)
  );

  if (directAlgorithmFiles.length > 0) {
    return {
      filePath: directAlgorithmFiles[0],
      isRunnable: true,
    };
  }

  return {
    filePath: sortedFiles.length > 0 ? sortedFiles[0] : null,
    isRunnable: false,
  };
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
    const isFlagged = flaggedLanguageKeys.has(languageKey);
    const matchingFiles = languageFilePathMap.get(languageKey);
    const representativeFile = selectRepresentativeLanguageFile(
      matchingFiles,
      resolvedRoot
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
      const treeItem = new vscode.TreeItem(
        element.resourceUri,
        element.hasIncludeChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );

      treeItem.label = element.label;
      treeItem.resourceUri = element.resourceUri;
      treeItem.description = String(element.fileCount);
      treeItem.contextValue = element.contextValue;
      treeItem.tooltip = element.tooltip;

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

    const treeItem = new vscode.TreeItem(
      element.resourceUri,
      element.isDirectory || element.hasIncludeChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.label = element.label;
    treeItem.resourceUri = element.resourceUri;
    treeItem.contextValue = element.isDirectory
      ? "algos.workspaceDirectory"
      : element.isRunnableFile
      ? element.isFlagged
        ? "algos.workspaceRunnableFileFlagged"
        : "algos.workspaceRunnableFileUnflagged"
      : element.isFlagged
      ? "algos.workspaceFileFlagged"
      : "algos.workspaceFileUnflagged";
    treeItem.tooltip = element.filePath;

    if (!element.isDirectory && element.hasIncludeChildren) {
      // Collapsible items default to folder-style icons; force file styling for composite main-file rows.
      treeItem.iconPath = vscode.ThemeIcon.File;
    }

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
  const languageStatusDecorationProvider = {
    provideFileDecoration(uri) {
      if (
        uri.fragment !== LANGUAGE_PRESENT_URI_FRAGMENT
        && uri.fragment !== LANGUAGE_ABSENT_URI_FRAGMENT
        && uri.fragment !== LANGUAGE_FLAGGED_URI_FRAGMENT
        && uri.fragment !== LANGUAGE_FLAGGED_ABSENT_URI_FRAGMENT
      ) {
        return undefined;
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
    openMissingLanguageFile,
    disposables: [view, refreshOnFolderChange, provider, decorationRegistration],
  };
}

// Public API for the workspace algorithms run view.
module.exports = {
  registerWorkspaceAlgorithmsRunView,
};
