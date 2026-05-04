import * as path from "node:path";
import type { Dirent } from "node:fs";

import type { IFilesystem } from "../filesystem";
import type { ILanguages } from "../languages";
import type { IAlgorithmsIndex, AlgorithmsIndexDependencies } from "./IAlgorithmsIndex";
import type {
  AlgorithmFileLookup,
  AlgorithmCategory,
  AlgorithmEntry,
  AlgorithmImplementation,
  StandardLibEntry,
} from "./types";
import { readFlaggedLanguageKeys } from "./flaggedLanguages";

// ---------------------------------------------------------------------------
// Private helpers – root resolution (repo layout domain knowledge)
// ---------------------------------------------------------------------------

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
  const canonicalPath = await filesystem.realpath(workspaceFolderPath);
  const srcPath = path.join(canonicalPath, "src");
  if (await filesystem.isDirectory(srcPath)) {
    return await filesystem.realpath(srcPath);
  }
  return null;
}

/**
 * Returns true when a path contains a `src` segment.
 *
 * @param {string} inputPath Candidate path.
 * @returns {boolean} True when src is one of the path segments.
 */
function hasSourceSegment(inputPath: string): boolean {
  const parsedPath = path.parse(inputPath);
  const relativePath = inputPath.slice(parsedPath.root.length);
  return relativePath.split(path.sep).filter(Boolean).includes("src");
}

/**
 * Resolves the repository root from a path that may be inside `src`.
 *
 * @param {string} sourcePath Path that may include a src segment.
 * @returns {string | null} Repository root when src is found, null otherwise.
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
 * Resolves the algorithms source root (the `src/` directory) for the workspace.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @param {readonly string[]} workspaceFolderPaths Workspace folder paths.
 * @returns {Promise<string | null>} Canonical root path or null.
 */
async function resolveAlgorithmsRootPath(
  filesystem: IFilesystem,
  workspaceFolderPaths: readonly string[]
): Promise<string | null> {
  for (const workspaceFolderPath of workspaceFolderPaths) {
    const srcRootPath = await resolveSourceRootForWorkspaceFolder(
      filesystem,
      workspaceFolderPath
    );
    if (srcRootPath !== null) {
      return srcRootPath;
    }

    const canonicalPath = await filesystem.realpath(workspaceFolderPath);
    if (hasSourceSegment(canonicalPath)) {
      return canonicalPath;
    }
  }
  return null;
}

/**
 * Resolves the standard library root (`stdlib/`) for the workspace.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @param {readonly string[]} workspaceFolderPaths Workspace folder paths.
 * @returns {Promise<string | null>} Canonical stdlib root path or null.
 */
async function resolveStdlibRootPath(
  filesystem: IFilesystem,
  workspaceFolderPaths: readonly string[]
): Promise<string | null> {
  for (const workspaceFolderPath of workspaceFolderPaths) {
    const canonicalPath = await filesystem.realpath(workspaceFolderPath);
    const workspaceStdlibPath = path.join(canonicalPath, "stdlib");

    if (await filesystem.isDirectory(workspaceStdlibPath)) {
      return await filesystem.realpath(workspaceStdlibPath);
    }

    if (!hasSourceSegment(canonicalPath)) {
      continue;
    }

    const repositoryRootPath = resolveRepositoryRootFromSourcePath(canonicalPath);
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

// ---------------------------------------------------------------------------
// Private helpers – filtering and listing
// ---------------------------------------------------------------------------

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
 * Returns true when a directory name is the reserved output directory.
 *
 * @param {string} name Directory base name.
 * @returns {boolean} True when the directory is output.
 */
function isOutputDirectoryName(name: string): boolean {
  return name.trim().toLowerCase() === "output";
}

/**
 * Returns true when a directory name matches the `{languageKey}_include` pattern.
 *
 * @param {string} directoryName Directory base name.
 * @returns {boolean} True when the name matches.
 */
function isLanguageIncludeDirectoryName(directoryName: string): boolean {
  const trimmed = directoryName.trim();
  return trimmed.length >= 9 && trimmed.endsWith("_include");
}

/**
 * Returns true when one directory-list entry is a Dirent object.
 *
 * @param {string | Dirent} entry Directory entry.
 * @returns {entry is Dirent} Type predicate.
 */
function isDirentEntry(entry: string | Dirent): entry is Dirent {
  return typeof entry !== "string";
}

/**
 * Returns true when a file extension resolves to a supported language key.
 *
 * @param {ILanguages} languages Languages dependency.
 * @param {string} filePath File path.
 * @returns {boolean} True when supported.
 */
function isSupportedLanguageFile(languages: ILanguages, filePath: string): boolean {
  return languages.normalizeFileExtension(filePath) !== undefined;
}

/**
 * Returns true when one file name should be treated as algorithm documentation.
 *
 * @param {string} fileName File base name.
 * @returns {boolean} True when the file extension is `.md` or `.txt`.
 */
function isDocumentationFileName(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();
  return extension === ".md" || extension === ".txt";
}

/**
 * Returns a normalized identifier used for fuzzy basename scoring.
 *
 * @param {string} value Candidate value.
 * @returns {string} Lower-cased alphanumeric-only value.
 */
function normalizeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Scores one file basename against one algorithm directory basename.
 *
 * Lower scores are better. Scoring mirrors the run.sh/legacy sidebar heuristics.
 *
 * @param {string} fileBaseName File base name without extension.
 * @param {string} algorithmBaseName Algorithm directory base name.
 * @returns {number} Match score.
 */
function scoreFileBasenameForAlgorithmName(
  fileBaseName: string,
  algorithmBaseName: string
): number {
  if (fileBaseName === algorithmBaseName) {
    return 0;
  }

  const normalizedFileLower = fileBaseName.toLowerCase();
  const normalizedAlgorithmLower = algorithmBaseName.toLowerCase();
  if (normalizedFileLower === normalizedAlgorithmLower) {
    return 1;
  }

  const normalizedFile = normalizeIdentifier(fileBaseName);
  const normalizedAlgorithm = normalizeIdentifier(algorithmBaseName);

  if (normalizedFile.length === 0 || normalizedAlgorithm.length === 0) {
    return 99;
  }

  if (normalizedFile === normalizedAlgorithm) {
    return 2;
  }

  if (normalizedAlgorithm.endsWith(normalizedFile)) {
    return 3;
  }

  if (normalizedAlgorithm.includes(normalizedFile)) {
    return 4;
  }

  if (normalizedFile.includes(normalizedAlgorithm)) {
    return 5;
  }

  return 99;
}

/**
 * Selects one representative implementation file for an algorithm and language.
 *
 * @param {readonly string[]} filePaths Candidate file paths.
 * @param {string} algorithmBaseName Algorithm directory base name.
 * @returns {string} Representative file path.
 */
function selectRepresentativeFilePath(
  filePaths: readonly string[],
  algorithmBaseName: string
): string {
  if (filePaths.length === 1) {
    return filePaths[0];
  }

  const scoredPaths = filePaths.map((filePath) => {
    const baseName = path.basename(filePath, path.extname(filePath));
    return {
      filePath,
      score: scoreFileBasenameForAlgorithmName(baseName, algorithmBaseName),
    };
  });

  scoredPaths.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }
    return left.filePath.localeCompare(right.filePath);
  });

  return scoredPaths[0].filePath;
}

/**
 * Returns true when one stdlib file should be excluded from display.
 *
 * @param {string} fileName File base name.
 * @returns {boolean} True when excluded.
 */
function isExcludedStandardLibraryFileName(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();
  return extension === ".md" || extension === ".sh";
}

/**
 * Reads and sorts Dirent entries from a directory. Returns an empty array when
 * the directory does not exist or cannot be listed.
 *
 * @param {string} dirPath Directory path.
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @returns {Promise<Dirent[]>} Sorted Dirent entries.
 */
async function listDirents(
  dirPath: string,
  filesystem: IFilesystem
): Promise<Dirent[]> {
  const entries = await filesystem.listDirectory(dirPath, { withFileTypes: true });
  if (entries === null) {
    return [];
  }
  const dirents = (entries as Array<string | Dirent>).filter(isDirentEntry);
  dirents.sort((left, right) => {
    if (left.isDirectory() && !right.isDirectory()) {
      return -1;
    }
    if (!left.isDirectory() && right.isDirectory()) {
      return 1;
    }
    return left.name.localeCompare(right.name);
  });
  return dirents;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates one algorithms domain index.
 *
 * Root paths are resolved lazily on first use and cached for the lifetime of
 * this instance.
 *
 * TODO: Add full workspace-change invalidation so stale cached roots are
 * re-resolved when the workspace folder set changes.
 *
 * @param {AlgorithmsIndexDependencies} dependencies Injected dependencies.
 * @returns {IAlgorithmsIndex} Algorithm index instance.
 */
export function createAlgorithmsIndex(
  dependencies: AlgorithmsIndexDependencies
): IAlgorithmsIndex {
  const { filesystem, languages, observability, workspaceFolderPaths } = dependencies;

  // Lazy-resolved roots. undefined = not yet resolved; null = not found.
  let cachedAlgorithmsRoot: string | null | undefined = undefined;
  let cachedStdlibRoot: string | null | undefined = undefined;
  const categoriesByRoot = new Map<string, AlgorithmCategory[]>();
  const algorithmsByCategoryPath = new Map<string, AlgorithmEntry[]>();
  const implementationsByAlgorithmPath = new Map<string, AlgorithmImplementation[]>();
  const fileLookupByPath = new Map<string, AlgorithmFileLookup>();
  const filePathsByAlgorithmPath = new Map<string, Set<string>>();
  const documentationFilesByAlgorithmPath = new Map<string, string[]>();
  const problemRowsByAlgorithmAndViewMode = new Map<string, boolean>();
  const pendingProblemRowsByAlgorithmAndViewMode = new Map<string, Promise<boolean>>();
  const standardLibraryEntriesByPath = new Map<string, StandardLibEntry[]>();

  /**
   * Clears cached root and discovery data.
   *
   * @returns {void}
   */
  function clearAllCaches(): void {
    cachedAlgorithmsRoot = undefined;
    cachedStdlibRoot = undefined;
    categoriesByRoot.clear();
    algorithmsByCategoryPath.clear();
    implementationsByAlgorithmPath.clear();
    fileLookupByPath.clear();
    filePathsByAlgorithmPath.clear();
    documentationFilesByAlgorithmPath.clear();
    problemRowsByAlgorithmAndViewMode.clear();
    pendingProblemRowsByAlgorithmAndViewMode.clear();
    standardLibraryEntriesByPath.clear();
  }

  /**
   * Returns the cache key for one algorithm/view-mode problem rows decision.
   *
   * @param {string} algorithmPath Canonical algorithm path.
   * @param {"files" | "language"} viewMode Algorithms tree view mode.
   * @returns {string} Cache key.
   */
  function buildProblemRowsCacheKey(
    algorithmPath: string,
    viewMode: "files" | "language"
  ): string {
    return `${algorithmPath}|${viewMode}`;
  }

  /**
   * Clears problem-row cache entries for one algorithm path.
   *
   * @param {string} algorithmPath Canonical algorithm path.
   * @returns {void}
   */
  function clearProblemRowsCacheForAlgorithm(algorithmPath: string): void {
    const filesKey = buildProblemRowsCacheKey(algorithmPath, "files");
    const languageKey = buildProblemRowsCacheKey(algorithmPath, "language");
    problemRowsByAlgorithmAndViewMode.delete(filesKey);
    problemRowsByAlgorithmAndViewMode.delete(languageKey);
    pendingProblemRowsByAlgorithmAndViewMode.delete(filesKey);
    pendingProblemRowsByAlgorithmAndViewMode.delete(languageKey);
  }

  /**
   * Clears problem-row cache entries whose algorithm path belongs to one category.
   *
   * @param {string} categoryPath Category directory path.
   * @returns {void}
   */
  function clearProblemRowsCacheForCategory(categoryPath: string): void {
    const categoryPrefix = `${categoryPath}${path.sep}`;
    for (const cacheKey of problemRowsByAlgorithmAndViewMode.keys()) {
      const separatorIndex = cacheKey.lastIndexOf("|");
      const algorithmPath = separatorIndex >= 0
        ? cacheKey.slice(0, separatorIndex)
        : cacheKey;
      if (algorithmPath === categoryPath || algorithmPath.startsWith(categoryPrefix)) {
        problemRowsByAlgorithmAndViewMode.delete(cacheKey);
        pendingProblemRowsByAlgorithmAndViewMode.delete(cacheKey);
      }
    }
  }

  /**
   * Caches reverse file-path lookups for one language implementation.
   *
   * @param {string} algorithmPath Parent algorithm directory.
   * @param {AlgorithmImplementation} implementation Language implementation.
   * @returns {void}
   */
  function cacheFileLookupEntries(
    algorithmPath: string,
    implementation: AlgorithmImplementation
  ): void {
    const sharedDescriptor = {
      algorithmPath,
      languageKey: implementation.languageKey,
      mainFilePath: implementation.filePath,
      hasIncludes: implementation.hasIncludes,
      isFlagged: implementation.isFlagged,
    };

    let trackedPaths = filePathsByAlgorithmPath.get(algorithmPath);
    if (trackedPaths === undefined) {
      trackedPaths = new Set<string>();
      filePathsByAlgorithmPath.set(algorithmPath, trackedPaths);
    }

    fileLookupByPath.set(implementation.filePath, {
      ...sharedDescriptor,
      filePath: implementation.filePath,
      fileKind: "main",
    });
    trackedPaths.add(implementation.filePath);

    for (const implementationFilePath of implementation.filePaths) {
      if (implementationFilePath === implementation.filePath) {
        continue;
      }

      fileLookupByPath.set(implementationFilePath, {
        ...sharedDescriptor,
        filePath: implementationFilePath,
        fileKind: "implementation",
      });
      trackedPaths.add(implementationFilePath);
    }

    for (const includeFilePath of implementation.includeFilePaths) {
      fileLookupByPath.set(includeFilePath, {
        ...sharedDescriptor,
        filePath: includeFilePath,
        fileKind: "include",
      });
      trackedPaths.add(includeFilePath);
    }
  }

  /**
   * Returns a stable copy of one file lookup descriptor.
   *
   * @param {AlgorithmFileLookup} descriptor Cached descriptor.
   * @returns {AlgorithmFileLookup} Descriptor copy.
   */
  function cloneFileLookupDescriptor(descriptor: AlgorithmFileLookup): AlgorithmFileLookup {
    return {
      ...descriptor,
    };
  }

  /**
   * Returns the algorithms source root, resolving it on first call.
   *
   * @returns {Promise<string | null>} Root path or null.
   */
  async function getAlgorithmsRoot(): Promise<string | null> {
    if (cachedAlgorithmsRoot === undefined) {
      cachedAlgorithmsRoot = await resolveAlgorithmsRootPath(filesystem, workspaceFolderPaths);
    }
    return cachedAlgorithmsRoot;
  }

  /**
   * Returns the stdlib root, resolving it on first call.
   *
   * @returns {Promise<string | null>} Root path or null.
   */
  async function getStdlibRoot(): Promise<string | null> {
    if (cachedStdlibRoot === undefined) {
      cachedStdlibRoot = await resolveStdlibRootPath(filesystem, workspaceFolderPaths);
    }
    return cachedStdlibRoot;
  }

  const algorithmsIndex: IAlgorithmsIndex = {
    clearCache(targetPath?: string): void {
      if (targetPath === undefined) {
        clearAllCaches();
        return;
      }

      // Determine the candidate algorithm directory: either the path itself (if it
      // is a known algorithm dir) or its parent (if it is a file inside one).
      const algorithmDirCandidate = implementationsByAlgorithmPath.has(targetPath)
        ? targetPath
        : path.dirname(targetPath);

      if (
        implementationsByAlgorithmPath.has(algorithmDirCandidate)
        || documentationFilesByAlgorithmPath.has(algorithmDirCandidate)
      ) {
        // Scoped invalidation: evict only this algorithm directory.
        implementationsByAlgorithmPath.delete(algorithmDirCandidate);
        documentationFilesByAlgorithmPath.delete(algorithmDirCandidate);
        clearProblemRowsCacheForAlgorithm(algorithmDirCandidate);
        const tracked = filePathsByAlgorithmPath.get(algorithmDirCandidate);
        if (tracked !== undefined) {
          for (const fp of tracked) {
            fileLookupByPath.delete(fp);
          }
          filePathsByAlgorithmPath.delete(algorithmDirCandidate);
        }
        return;
      }

      if (algorithmsByCategoryPath.has(targetPath)) {
        // Category-level invalidation: evict only this category's algorithm list.
        algorithmsByCategoryPath.delete(targetPath);
        const categoryPrefix = `${targetPath}${path.sep}`;
        for (const algorithmPath of documentationFilesByAlgorithmPath.keys()) {
          if (algorithmPath.startsWith(categoryPrefix)) {
            documentationFilesByAlgorithmPath.delete(algorithmPath);
          }
        }
        clearProblemRowsCacheForCategory(targetPath);
        return;
      }

      // Unknown depth — fall back to a full clear.
      clearAllCaches();
    },

    async getCategories(): Promise<AlgorithmCategory[]> {
      const root = await getAlgorithmsRoot();
      if (root === null) {
        return [];
      }

      const canonicalRoot = await filesystem.realpath(root);
      const cachedCategories = categoriesByRoot.get(canonicalRoot);

      if (cachedCategories !== undefined) {
        return cachedCategories.map((category) => ({
          ...category,
        }));
      }

      const dirents = await listDirents(canonicalRoot, filesystem);
      const categories: AlgorithmCategory[] = [];

      for (const dirent of dirents) {
        if (!dirent.isDirectory()) {
          continue;
        }
        if (isHiddenName(dirent.name)) {
          continue;
        }
        if (isOutputDirectoryName(dirent.name)) {
          continue;
        }

        categories.push({ name: dirent.name, path: path.join(canonicalRoot, dirent.name) });
      }

      categoriesByRoot.set(canonicalRoot, categories);

      return categories.map((category) => ({
        ...category,
      }));
    },

    async getAlgorithms(categoryPath: string): Promise<AlgorithmEntry[]> {
      const canonicalCategoryPath = await filesystem.realpath(categoryPath);
      const cachedAlgorithms = algorithmsByCategoryPath.get(canonicalCategoryPath);

      if (cachedAlgorithms !== undefined) {
        return cachedAlgorithms.map((algorithm) => ({
          ...algorithm,
        }));
      }

      const dirents = await listDirents(canonicalCategoryPath, filesystem);
      const algorithms: AlgorithmEntry[] = [];

      for (const dirent of dirents) {
        if (!dirent.isDirectory()) {
          continue;
        }
        if (isHiddenName(dirent.name)) {
          continue;
        }
        if (isOutputDirectoryName(dirent.name)) {
          continue;
        }
        if (isLanguageIncludeDirectoryName(dirent.name)) {
          continue;
        }

        algorithms.push({
          name: dirent.name,
          path: path.join(canonicalCategoryPath, dirent.name),
          categoryPath: canonicalCategoryPath,
        });
      }

      algorithmsByCategoryPath.set(canonicalCategoryPath, algorithms);

      return algorithms.map((algorithm) => ({
        ...algorithm,
      }));
    },

    async getImplementations(algorithmPath: string): Promise<AlgorithmImplementation[]> {
      const canonicalAlgorithmPath = await filesystem.realpath(algorithmPath);
      const cachedImplementations = implementationsByAlgorithmPath.get(canonicalAlgorithmPath);

      if (cachedImplementations !== undefined) {
        return cachedImplementations.map((implementation) => ({
          ...implementation,
          filePaths: [...implementation.filePaths],
          includeFilePaths: [...implementation.includeFilePaths],
        }));
      }

      const algorithmBaseName = path.basename(canonicalAlgorithmPath);
      const dirents = await listDirents(canonicalAlgorithmPath, filesystem);
      const implementations: AlgorithmImplementation[] = [];
      const filePathsByLanguage = new Map<string, string[]>();
      const flaggedLanguageKeys = await readFlaggedLanguageKeys(
        filesystem,
        canonicalAlgorithmPath
      );

      for (const dirent of dirents) {
        if (!dirent.isFile()) {
          continue;
        }
        if (isHiddenName(dirent.name)) {
          continue;
        }

        const filePath = path.join(canonicalAlgorithmPath, dirent.name);
        const languageKey = languages.normalizeFileExtension(filePath);
        if (languageKey === undefined) {
          continue;
        }

        const filePaths = filePathsByLanguage.get(languageKey) ?? [];
        filePaths.push(filePath);
        filePathsByLanguage.set(languageKey, filePaths);
      }

      const languageKeys = [...filePathsByLanguage.keys()].sort();
      for (const languageKey of languageKeys) {
        const filePaths = filePathsByLanguage.get(languageKey) ?? [];
        filePaths.sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));
        if (filePaths.length === 0) {
          continue;
        }

        const filePath = selectRepresentativeFilePath(filePaths, algorithmBaseName);

        const includeDirectoryPath = path.join(
          canonicalAlgorithmPath,
          `${languageKey}_include`
        );

        let includeFilePaths: string[] = [];
        if (await filesystem.isDirectory(includeDirectoryPath)) {
          const includeEntries = await listDirents(includeDirectoryPath, filesystem);
          includeFilePaths = includeEntries
            .filter((entry) => {
              if (!entry.isFile()) {
                return false;
              }
              if (isHiddenName(entry.name)) {
                return false;
              }
              const entryPath = path.join(includeDirectoryPath, entry.name);
              const entryLanguageKey = languages.normalizeFileExtension(entryPath);
              return entryLanguageKey === languageKey;
            })
            .map((entry) => path.join(includeDirectoryPath, entry.name));
          includeFilePaths.sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));
        }

        implementations.push({
          languageKey,
          isFlagged: flaggedLanguageKeys.has(languageKey),
          filePath,
          filePaths,
          hasIncludes: includeFilePaths.length > 0,
          includeFilePaths,
        });
      }

      implementations.sort((left, right) => left.languageKey.localeCompare(right.languageKey));

      for (const implementation of implementations) {
        cacheFileLookupEntries(canonicalAlgorithmPath, implementation);
      }

      implementationsByAlgorithmPath.set(canonicalAlgorithmPath, implementations);

      return implementations.map((implementation) => ({
        ...implementation,
        filePaths: [...implementation.filePaths],
        includeFilePaths: [...implementation.includeFilePaths],
      }));
    },

    async getDocumentationFiles(algorithmPath: string): Promise<string[]> {
      const canonicalAlgorithmPath = await filesystem.realpath(algorithmPath);
      const cachedDocumentationFiles = documentationFilesByAlgorithmPath.get(canonicalAlgorithmPath);

      if (cachedDocumentationFiles !== undefined) {
        return [...cachedDocumentationFiles];
      }

      const dirents = await listDirents(canonicalAlgorithmPath, filesystem);
      const documentationFiles = dirents
        .filter((dirent) => {
          if (!dirent.isFile()) {
            return false;
          }

          if (isHiddenName(dirent.name)) {
            return false;
          }

          return isDocumentationFileName(dirent.name);
        })
        .map((dirent) => path.join(canonicalAlgorithmPath, dirent.name));

      documentationFiles.sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));
      documentationFilesByAlgorithmPath.set(canonicalAlgorithmPath, documentationFiles);

      return [...documentationFiles];
    },

    async hasProblemRowsForAlgorithm(
      algorithmPath: string,
      viewMode: "files" | "language"
    ): Promise<boolean> {
      const canonicalAlgorithmPath = await filesystem.realpath(algorithmPath);
      const cacheKey = buildProblemRowsCacheKey(canonicalAlgorithmPath, viewMode);
      const observabilityCategory = "index.problems";

      const cachedValue = problemRowsByAlgorithmAndViewMode.get(cacheKey);
      if (cachedValue !== undefined) {
        observability?.increment("index.problems.cache.hit", 1, {
          viewMode,
        });
        return cachedValue;
      }

      const pending = pendingProblemRowsByAlgorithmAndViewMode.get(cacheKey);
      if (pending !== undefined) {
        observability?.increment("index.problems.cache.pending", 1, {
          viewMode,
        });
        return pending;
      }

      observability?.increment("index.problems.cache.miss", 1, {
        viewMode,
      });

      const evaluationPromise = (async () => {
        const startedAt = observability?.isEnabled(observabilityCategory) === true
          ? Date.now()
          : 0;
        const implementations = await algorithmsIndex.getImplementations(canonicalAlgorithmPath);

        if (implementations.some((implementation) => implementation.isFlagged)) {
          if (startedAt > 0) {
            observability?.log("debug", "index.problems.evaluation.completed", {
              durationMs: Date.now() - startedAt,
              result: true,
              viewMode,
            });
          }
          return true;
        }

        if (viewMode === "files") {
          if (startedAt > 0) {
            observability?.log("debug", "index.problems.evaluation.completed", {
              durationMs: Date.now() - startedAt,
              result: false,
              viewMode,
            });
          }
          return false;
        }

        const implementedLanguageKeys = new Set(
          implementations.map((implementation) => implementation.languageKey)
        );

        for (const languageRecord of languages.getAll()) {
          if (!implementedLanguageKeys.has(languageRecord.key)) {
            if (startedAt > 0) {
              observability?.log("debug", "index.problems.evaluation.completed", {
                durationMs: Date.now() - startedAt,
                result: true,
                viewMode,
              });
            }
            return true;
          }
        }

        if (startedAt > 0) {
          observability?.log("debug", "index.problems.evaluation.completed", {
            durationMs: Date.now() - startedAt,
            result: false,
            viewMode,
          });
        }

        return false;
      })();

      pendingProblemRowsByAlgorithmAndViewMode.set(cacheKey, evaluationPromise);

      try {
        const result = await evaluationPromise;
        problemRowsByAlgorithmAndViewMode.set(cacheKey, result);
        return result;
      } finally {
        pendingProblemRowsByAlgorithmAndViewMode.delete(cacheKey);
      }
    },

    async getImplementationByFilePath(filePath: string): Promise<AlgorithmFileLookup | null> {
      const canonicalFilePath = await filesystem.realpath(filePath);
      const cachedDescriptor = fileLookupByPath.get(canonicalFilePath);
      if (cachedDescriptor !== undefined) {
        return cloneFileLookupDescriptor(cachedDescriptor);
      }

      const categories = await algorithmsIndex.getCategories();
      for (const category of categories) {
        const algorithms = await algorithmsIndex.getAlgorithms(category.path);
        for (const algorithm of algorithms) {
          await algorithmsIndex.getImplementations(algorithm.path);
        }
      }

      const populatedDescriptor = fileLookupByPath.get(canonicalFilePath);
      if (populatedDescriptor === undefined) {
        return null;
      }

      return cloneFileLookupDescriptor(populatedDescriptor);
    },

    async getStandardLibraryEntries(dirPath?: string): Promise<StandardLibEntry[]> {
      let targetPath: string | null;

      if (dirPath !== undefined) {
        targetPath = dirPath;
      } else {
        targetPath = await getStdlibRoot();
      }

      if (targetPath === null) {
        return [];
      }

      const canonicalPath = await filesystem.realpath(targetPath);
      const cachedEntries = standardLibraryEntriesByPath.get(canonicalPath);

      if (cachedEntries !== undefined) {
        return cachedEntries.map((entry) => ({
          ...entry,
        }));
      }

      const dirents = await listDirents(canonicalPath, filesystem);
      const entries: StandardLibEntry[] = [];

      for (const dirent of dirents) {
        if (isHiddenName(dirent.name)) {
          continue;
        }

        const entryPath = path.join(canonicalPath, dirent.name);

        if (dirent.isDirectory()) {
          if (isOutputDirectoryName(dirent.name)) {
            continue;
          }
          entries.push({ kind: "directory", name: dirent.name, path: entryPath });
          continue;
        }

        if (!dirent.isFile()) {
          continue;
        }

        if (isExcludedStandardLibraryFileName(dirent.name)) {
          continue;
        }

        if (!isSupportedLanguageFile(languages, entryPath)) {
          continue;
        }

        entries.push({ kind: "file", name: dirent.name, path: entryPath });
      }

      standardLibraryEntriesByPath.set(canonicalPath, entries);

      return entries.map((entry) => ({
        ...entry,
      }));
    },
  };

  return algorithmsIndex;
}
