import * as vscode from 'vscode';
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import {
  IAlgorithmCategory,
  IAlgorithmDirectory,
  IAlgorithmImplementation,
  IAlgorithmImplementationChild,
  IStdLibCategory,
  IStdLibCategoryFile,
  ILanguages,
} from '.';
import { FlagHandler } from './flagHandler';
import { SupportedWorkspaceChecker } from './supportedWorkspaceChecker';
import { GENERATED_LANGUAGE_DATA } from './generated/languages.generated';

const algorithmsSourceDir = "src";
const stdlibSourceDir = "stdlib";
const docsImplementationKey = "__docs";
const docsItemLabel = "docs";
const docsIconFileName = "readme.svg";

const excludedDirectories = new Set([
  "output",
]);

const supportedLanguageExtensions = new Set(
  GENERATED_LANGUAGE_DATA.languages.flatMap((language) => {
    const extensions = [
      language.extension,
      ...language.aliases.fileExtensions,
    ];

    return extensions
      .map((extension) => normalizeExtension(extension))
      .filter((extension) => extension.length > 1);
  })
);

/**
 * Normalizes a file extension to lowercase dot-prefixed form.
 *
 * @param {string} extension Raw extension value (with or without leading dot).
 * @returns {string} Normalized extension, or an empty string when input is blank.
 */
function normalizeExtension(extension: string): string {
  const trimmedExtension = extension.trim().toLowerCase();
  if (!trimmedExtension) {
    return "";
  }

  if (trimmedExtension.startsWith(".")) {
    return trimmedExtension;
  }

  return `.${trimmedExtension}`;
}

/**
 * Normalizes a filename stem for fuzzy matching.
 *
 * @param {string} value Raw filename stem or directory name.
 * @returns {string} Lowercased alphanumeric-only token.
 */
function normalizeNameToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Builds the supported extension set for one generated language record.
 *
 * @param {typeof GENERATED_LANGUAGE_DATA.languages[number]} language Generated language metadata.
 * @returns {Set<string>} Normalized extension set for the language.
 */
function getLanguageExtensions(language: typeof GENERATED_LANGUAGE_DATA.languages[number]): Set<string> {
  return new Set([
    normalizeExtension(language.extension),
    ...language.aliases.fileExtensions.map((extension) => normalizeExtension(extension)),
  ]);
}

/**
 * Finds the icon filename for a file extension using generated language metadata.
 *
 * @param {string} extension Normalized or raw file extension.
 * @returns {string | undefined} Matching icon filename when a language uses this extension.
 */
function getLanguageIconFileNameForExtension(extension: string): string | undefined {
  const normalizedExtension = normalizeExtension(extension);
  if (!normalizedExtension) {
    return undefined;
  }

  const matchingLanguage = GENERATED_LANGUAGE_DATA.languages.find((language) => {
    const languageExtensions = getLanguageExtensions(language);
    return languageExtensions.has(normalizedExtension);
  });

  return matchingLanguage?.icon.fileName;
}

/**
 * Returns true for algorithm documentation files tracked under the docs item.
 *
 * @param {fs.Dirent} entry Directory entry to evaluate.
 * @returns {boolean} True when the file is a non-hidden .md or .txt file.
 */
function isAlgorithmDocumentationFile(entry: fs.Dirent): boolean {
  if (!entry.isFile() || entry.name.startsWith(".")) {
    return false;
  }

  const extension = normalizeExtension(path.extname(entry.name));
  return extension === ".md" || extension === ".txt";
}

/**
 * Computes Levenshtein edit distance between two strings.
 *
 * @param {string} left First value.
 * @param {string} right Second value.
 * @returns {number} Edit distance where 0 is an exact match.
 */
function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }
  if (!right.length) {
    return left.length;
  }

  const previousRow = new Array(right.length + 1).fill(0);
  const currentRow = new Array(right.length + 1).fill(0);

  for (let j = 0; j <= right.length; ++j) {
    previousRow[j] = j;
  }

  for (let i = 1; i <= left.length; ++i) {
    currentRow[0] = i;
    for (let j = 1; j <= right.length; ++j) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j] + 1,
        currentRow[j - 1] + 1,
        previousRow[j - 1] + substitutionCost,
      );
    }

    for (let j = 0; j <= right.length; ++j) {
      previousRow[j] = currentRow[j];
    }
  }

  return previousRow[right.length];
}

/**
 * Finds the closest implementation filename match for an algorithm name.
 *
 * @param {string} algorithmName Directory name of the algorithm.
 * @param {fs.Dirent[]} candidateFiles Candidate files with matching language extension.
 * @returns {fs.Dirent | undefined} Best matching file, when candidates exist.
 */
function findClosestImplementationFile(
  algorithmName: string,
  candidateFiles: fs.Dirent[],
): fs.Dirent | undefined {
  if (candidateFiles.length === 0) {
    return undefined;
  }
  if (candidateFiles.length === 1) {
    return candidateFiles[0];
  }

  const normalizedAlgorithmName = normalizeNameToken(algorithmName);
  let bestCandidate = candidateFiles[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidateFiles) {
    const candidateStem = path.parse(candidate.name).name;
    const normalizedCandidateStem = normalizeNameToken(candidateStem);
    const distance = levenshteinDistance(normalizedAlgorithmName, normalizedCandidateStem);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCandidate = candidate;
      continue;
    }

    if (distance === bestDistance
        && candidate.name.localeCompare(bestCandidate.name) < 0) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

/**
 * Provides workspace language/category discovery and support state updates.
 */
export class Languages implements ILanguages {

  private workspaceFolderChangeSubscription : vscode.Disposable | undefined = undefined;
  private isDirectoryCache = new Map<string, boolean>();
  private directoryEntriesCache = new Map<string, fs.Dirent[] | undefined>();
  private flagHandler = new FlagHandler();

  /**
   * Clears all cached filesystem lookups.
   *
   * @returns {void} No return value.
   */
  private clearFileSystemCache() : void {
    this.isDirectoryCache.clear();
    this.directoryEntriesCache.clear();
    this.flagHandler.clearCache();
  }

  /**
   * Checks whether a path exists and is a directory, using a cache.
   *
   * @param {string} directoryPath Path to check.
   * @returns {boolean} True when the path exists and is a directory.
   */
  private async isDirectoryCached(directoryPath: string) : Promise<boolean> {
    const cached = this.isDirectoryCache.get(directoryPath);
    if (cached !== undefined) {
      return cached;
    }

    let isDirectory = false;
    try {
      isDirectory = (await fsp.stat(directoryPath)).isDirectory();
    }
    catch {
      isDirectory = false;
    }

    this.isDirectoryCache.set(directoryPath, isDirectory);
    return isDirectory;
  }

  /**
   * Reads a directory with dirent metadata, using a cache.
   *
   * @param {string} directoryPath Directory to read.
   * @returns {fs.Dirent[] | undefined} Directory entries, or undefined when unreadable.
   */
  private async readDirectoryEntriesCached(directoryPath: string) : Promise<fs.Dirent[] | undefined> {
    if (this.directoryEntriesCache.has(directoryPath)) {
      return this.directoryEntriesCache.get(directoryPath);
    }

    let entries : fs.Dirent[] | undefined;
    try {
      entries = await fsp.readdir(directoryPath, { withFileTypes: true });
    }
    catch {
      entries = undefined;
    }

    this.directoryEntriesCache.set(directoryPath, entries);
    return entries;
  }

  /**
   * Recomputes workspace support and updates command context state.
   *
   * @returns {void} No return value.
   */
  private async updateWorkspaceSupport() : Promise<void> {
    const isSupported = await SupportedWorkspaceChecker.isSupported();
    void vscode.commands.executeCommand("setContext", "algos.workspaceSupported", isSupported);
  }

  /**
   * Primes directory-stat and directory-entry caches for top-level tree roots.
   *
   * @returns {void} No return value.
   */
  private async prewarmTopLevelTreeCaches() : Promise<void> {
    const baseDirectory = await SupportedWorkspaceChecker.getCurrentBaseDirectory();
    if (!baseDirectory) {
      return;
    }

    const topLevelDirectories = [
      path.join(baseDirectory, algorithmsSourceDir),
      path.join(baseDirectory, stdlibSourceDir),
    ];

    for (const directoryPath of topLevelDirectories) {
      if (!await this.isDirectoryCached(directoryPath)) {
        continue;
      }

      await this.readDirectoryEntriesCached(directoryPath);
    }
  }

  /**
   * Registers workspace-folder change handling and initializes support context.
   *
   * @param {vscode.ExtensionContext} _context Extension lifecycle context.
   * @returns {void} No return value.
   */
  public activate(_context: vscode.ExtensionContext) : void {
    this.workspaceFolderChangeSubscription =
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.clearFileSystemCache();
        void this.updateWorkspaceSupport();
        void this.prewarmTopLevelTreeCaches();
      });

    void this.updateWorkspaceSupport();
    void this.prewarmTopLevelTreeCaches();
  }

  /**
   * Returns top-level algorithm categories under the workspace src directory.
   *
   * @returns {IAlgorithmCategory[]} Algorithm categories sorted by display name.
   */
  public async getAlgorithmCategories() : Promise<IAlgorithmCategory[]> {
    const baseDirectory = await SupportedWorkspaceChecker.getCurrentBaseDirectory();
    if (!baseDirectory) {
      return [];
    }

    const sourceDirectory = path.join(baseDirectory, algorithmsSourceDir);
    if (!await this.isDirectoryCached(sourceDirectory)) {
      return [];
    }

    const entries = await this.readDirectoryEntriesCached(sourceDirectory);
    if (!entries) {
      return [];
    }

    const categories = entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !entry.name.startsWith("."))
      .filter((entry) => !excludedDirectories.has(entry.name))
      .map((entry) => ({
        displayName: entry.name,
        directoryPath: path.join(sourceDirectory, entry.name),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const categoriesWithAlgorithms = await Promise.all(categories.map(async (category) => {
      const algorithms = await this.getAlgorithmsInCategory(category);
      return {
        category,
        algorithmCount: algorithms.length,
      };
    }));

    return categoriesWithAlgorithms
      .filter((entry) => entry.algorithmCount > 0)
      .map((entry) => entry.category);
  }

  /**
   * Returns true when one algorithm directory contains at least one supported implementation file.
   *
   * Documentation-only content does not count as implementation content.
   *
   * @param {string} algorithmDirectoryPath Algorithm directory path.
   * @returns {Promise<boolean>} True when the directory is non-empty for tree visibility.
   */
  private async hasImplementationContent(
    algorithmDirectoryPath: string,
  ): Promise<boolean> {
    const entries = await this.readDirectoryEntriesCached(algorithmDirectoryPath);
    if (!entries) {
      return false;
    }

    const hasTopLevelImplementationFile = entries.some((entry) => {
      if (!entry.isFile() || entry.name.startsWith(".")) {
        return false;
      }

      if (isAlgorithmDocumentationFile(entry)) {
        return false;
      }

      const entryExtension = normalizeExtension(path.extname(entry.name));
      return supportedLanguageExtensions.has(entryExtension);
    });

    if (hasTopLevelImplementationFile) {
      return true;
    }

    const includeDirectories = entries.filter((entry) => {
      return entry.isDirectory()
        && !entry.name.startsWith(".")
        && entry.name.endsWith("_include");
    });

    for (const includeDirectory of includeDirectories) {
      const includeDirectoryPath = path.join(algorithmDirectoryPath, includeDirectory.name);
      const includeEntries = await this.readDirectoryEntriesCached(includeDirectoryPath);
      if (!includeEntries) {
        continue;
      }

      const hasIncludeImplementationFile = includeEntries.some((entry) => {
        if (!entry.isFile() || entry.name.startsWith(".")) {
          return false;
        }

        const entryExtension = normalizeExtension(path.extname(entry.name));
        return supportedLanguageExtensions.has(entryExtension);
      });

      if (hasIncludeImplementationFile) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns algorithm directories directly under the provided category.
   *
   * @param {IAlgorithmCategory} category Algorithm category to inspect.
   * @returns {IAlgorithmDirectory[]} Algorithm directories sorted by display name.
   */
  public async getAlgorithmsInCategory(category: IAlgorithmCategory) : Promise<IAlgorithmDirectory[]> {
    if (!await this.isDirectoryCached(category.directoryPath)) {
      return [];
    }

    const entries = await this.readDirectoryEntriesCached(category.directoryPath);
    if (!entries) {
      return [];
    }

    const algorithms = entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !entry.name.startsWith("."))
      .filter((entry) => !excludedDirectories.has(entry.name))
      .map((entry) => ({
        displayName: entry.name,
        directoryPath: path.join(category.directoryPath, entry.name),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const nonEmptyAlgorithms = await Promise.all(algorithms.map(async (algorithm) => {
      const hasImplementationContent = await this.hasImplementationContent(algorithm.directoryPath);
      return {
        algorithm,
        hasImplementationContent,
      };
    }));

    return nonEmptyAlgorithms
      .filter((entry) => entry.hasImplementationContent)
      .map((entry) => entry.algorithm);
  }

  /**
   * Returns one implementation record for each supported language for the given algorithm directory.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Algorithm directory to inspect.
   * @returns {IAlgorithmImplementation[]} One record per language, with file metadata when present.
   */
  public async getAlgorithmImplementations(
    algorithmDirectory: IAlgorithmDirectory,
  ) : Promise<IAlgorithmImplementation[]> {
    let flaggedLanguageKeys = new Set<string>();
    try {
      flaggedLanguageKeys = await this.flagHandler.readFlaggedLanguageKeys(algorithmDirectory.directoryPath);
    }
    catch {
      flaggedLanguageKeys = new Set<string>();
    }

    if (!await this.isDirectoryCached(algorithmDirectory.directoryPath)) {
      const docsImplementation: IAlgorithmImplementation = {
        languageKey: docsImplementationKey,
        languageDisplayName: docsItemLabel,
        languageIconFileName: docsIconFileName,
        isFlagged: false,
        hasImplementation: true,
        hasChildren: false,
        fileName: docsItemLabel,
        filePath: algorithmDirectory.directoryPath,
      };

      return [
        docsImplementation,
        ...GENERATED_LANGUAGE_DATA.languages.map((language) => ({
        languageKey: language.key,
        languageDisplayName: language.displayLabel,
        languageIconFileName: language.icon.fileName,
        isFlagged: flaggedLanguageKeys.has(language.key),
        hasImplementation: false,
        hasChildren: false,
        fileName: undefined,
        filePath: undefined,
        })),
      ];
    }

    const entries = await this.readDirectoryEntriesCached(algorithmDirectory.directoryPath);
    const files = entries
      ? entries.filter((entry) => entry.isFile() && !entry.name.startsWith("."))
      : [];

    const docsImplementation: IAlgorithmImplementation = {
      languageKey: docsImplementationKey,
      languageDisplayName: docsItemLabel,
      languageIconFileName: docsIconFileName,
      isFlagged: false,
      hasImplementation: true,
      hasChildren: files.some((entry) => isAlgorithmDocumentationFile(entry)),
      fileName: docsItemLabel,
      filePath: algorithmDirectory.directoryPath,
    };

    const algorithmName = path.basename(algorithmDirectory.directoryPath);

    const languageImplementations = await Promise.all(GENERATED_LANGUAGE_DATA.languages.map(async (language) => {
      const languageExtensions = getLanguageExtensions(language);

      const candidates = files.filter((entry) => {
        const entryExtension = normalizeExtension(path.extname(entry.name));
        return languageExtensions.has(entryExtension);
      });

      const includeDirectoryPath = path.join(algorithmDirectory.directoryPath, `${language.key}_include`);
      const includeEntries = await this.readDirectoryEntriesCached(includeDirectoryPath);
      const includeCandidates = includeEntries
        ? includeEntries.filter((entry) => {
          if (!entry.isFile() || entry.name.startsWith(".")) {
            return false;
          }

          const entryExtension = normalizeExtension(path.extname(entry.name));
          return languageExtensions.has(entryExtension);
        })
        : [];

      const selectedFile = findClosestImplementationFile(algorithmName, candidates);
      if (!selectedFile) {
        return {
          languageKey: language.key,
          languageDisplayName: language.displayLabel,
          languageIconFileName: language.icon.fileName,
          isFlagged: flaggedLanguageKeys.has(language.key),
          hasImplementation: false,
          hasChildren: false,
          fileName: undefined,
          filePath: undefined,
        };
      }

      return {
        languageKey: language.key,
        languageDisplayName: language.displayLabel,
        languageIconFileName: language.icon.fileName,
        isFlagged: flaggedLanguageKeys.has(language.key),
        hasImplementation: true,
        hasChildren: candidates.length > 1 || includeCandidates.length > 0,
        fileName: selectedFile.name,
        filePath: path.join(algorithmDirectory.directoryPath, selectedFile.name),
      };
    }));

    return [docsImplementation, ...languageImplementations];
  }

  /**
   * Returns child files for one algorithm implementation.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Algorithm directory to inspect.
   * @param {IAlgorithmImplementation} implementation Implementation to enumerate children for.
   * @returns {IAlgorithmImplementationChild[]} Child files sorted by display name.
   */
  public async getAlgorithmImplementationChildren(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation) : Promise<IAlgorithmImplementationChild[]> {
    if (!implementation.hasImplementation) {
      return [];
    }

    if (implementation.languageKey === docsImplementationKey) {
      const entries = await this.readDirectoryEntriesCached(algorithmDirectory.directoryPath);
      if (!entries) {
        return [];
      }

      return entries
        .filter((entry) => isAlgorithmDocumentationFile(entry))
        .map((entry) => ({
          displayName: entry.name,
          filePath: path.join(algorithmDirectory.directoryPath, entry.name),
        }))
        .sort((left, right) => left.displayName.localeCompare(right.displayName));
    }

    const language = GENERATED_LANGUAGE_DATA.languages.find((entry) => entry.key === implementation.languageKey);
    if (!language) {
      return [];
    }

    const languageExtensions = getLanguageExtensions(language);
    const entries = await this.readDirectoryEntriesCached(algorithmDirectory.directoryPath);
    const primaryPath = implementation.filePath;

    const mainChildren = entries
      ? entries
        .filter((entry) => {
          if (!entry.isFile() || entry.name.startsWith(".")) {
            return false;
          }

          const entryExtension = normalizeExtension(path.extname(entry.name));
          return languageExtensions.has(entryExtension);
        })
        .map((entry) => ({
          displayName: entry.name,
          filePath: path.join(algorithmDirectory.directoryPath, entry.name),
        }))
      : [];

    const includeDirectoryName = `${implementation.languageKey}_include`;
    const includeDirectoryPath = path.join(algorithmDirectory.directoryPath, includeDirectoryName);
    const includeEntries = await this.readDirectoryEntriesCached(includeDirectoryPath);
    const includeChildren = includeEntries
      ? includeEntries
        .filter((entry) => {
          if (!entry.isFile() || entry.name.startsWith(".")) {
            return false;
          }

          const entryExtension = normalizeExtension(path.extname(entry.name));
          return languageExtensions.has(entryExtension);
        })
        .map((entry) => ({
          displayName: entry.name,
          filePath: path.join(includeDirectoryPath, entry.name),
        }))
      : [];

    return [...mainChildren, ...includeChildren]
      .filter((entry) => entry.filePath !== primaryPath)
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  /**
   * Sets flagged state for one algorithm implementation language.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Algorithm directory owning the implementation.
   * @param {IAlgorithmImplementation} implementation Implementation language to flag or unflag.
   * @param {boolean} isFlagged True to mark as flagged; false to clear the flag.
   * @returns {Promise<void>} Resolves when flag state is persisted.
   */
  public async setAlgorithmImplementationFlagged(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation,
    isFlagged: boolean,
  ) : Promise<void> {
    if (implementation.languageKey === docsImplementationKey) {
      return;
    }

    await this.flagHandler.updateFlaggedLanguageKey(
      algorithmDirectory.directoryPath,
      implementation.languageKey,
      isFlagged,
    );

    // Keep cache consistency with direct persistence updates for this algorithm.
    this.flagHandler.clearCache(algorithmDirectory.directoryPath);
  }

  /**
   * Returns top-level standard library categories under the workspace stdlib directory.
   *
   * @returns {IStdLibCategory[]} Standard library categories sorted by display name.
   */
  public async getStandardLibraryCategories() : Promise<IStdLibCategory[]> {
    const baseDirectory = await SupportedWorkspaceChecker.getCurrentBaseDirectory();
    if (!baseDirectory) {
      return [];
    }

    const sourceDirectory = path.join(baseDirectory, stdlibSourceDir);
    if (!await this.isDirectoryCached(sourceDirectory)) {
      return [];
    }

    const entries = await this.readDirectoryEntriesCached(sourceDirectory);
    if (!entries) {
      return [];
    }

    return entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !entry.name.startsWith("."))
      .filter((entry) => !excludedDirectories.has(entry.name))
      .map((entry) => ({
        displayName: entry.name,
        directoryPath: path.join(sourceDirectory, entry.name),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Returns supported-language files directly under the provided stdlib category.
   *
   * @param {IStdLibCategory} category Standard library category to inspect.
   * @returns {IStdLibCategoryFile[]} Matching files sorted by display name.
   */
  public async getStandardLibraryFiles(category: IStdLibCategory) : Promise<IStdLibCategoryFile[]> {
    if (!await this.isDirectoryCached(category.directoryPath)) {
      return [];
    }

    const entries = await this.readDirectoryEntriesCached(category.directoryPath);
    if (!entries) {
      return [];
    }

    return entries
      .filter((entry) => entry.isFile())
      .filter((entry) => !entry.name.startsWith("."))
      .filter((entry) => {
        const entryExtension = normalizeExtension(path.extname(entry.name));
        return supportedLanguageExtensions.has(entryExtension);
      })
      .map((entry) => {
        const entryExtension = normalizeExtension(path.extname(entry.name));
        return {
          displayName: entry.name,
          filePath: path.join(category.directoryPath, entry.name),
          languageIconFileName: getLanguageIconFileNameForExtension(entryExtension),
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Disposes resources created by this service.
   *
   * @returns {void} No return value.
   */
  public dispose() : void {
    this.clearFileSystemCache();
    this.workspaceFolderChangeSubscription?.dispose();
  }
}
