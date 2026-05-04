import type { IFilesystem } from "../filesystem";
import type { ILanguages } from "../languages";
import type { IObservability } from "../observability";
import type {
  AlgorithmFileLookup,
  AlgorithmCategory,
  AlgorithmEntry,
  AlgorithmImplementation,
  StandardLibEntry,
} from "./types";

/**
 * Dependency bundle required to construct one algorithms index.
 */
export interface AlgorithmsIndexDependencies {
  filesystem: IFilesystem;
  languages: ILanguages;
  observability?: IObservability;
  /**
   * Workspace folder paths used for lazy root resolution.
   * The module resolves the algorithms and stdlib roots internally on first use.
   */
  workspaceFolderPaths: readonly string[];
}

/**
 * Domain index for discovering algorithm categories, entries, per-language
 * implementations, and standard library entries.
 *
 * Both tree providers consume a single shared instance of this interface,
 * constructed once by the coordinator.
 */
export interface IAlgorithmsIndex {
  /**
   * Clears cached index results.
   *
   * When targetPath is provided, implementations may clear only affected
   * subsets; full clear is always allowed.
   *
   * @param {string} [targetPath] Optional changed path used for scoped invalidation.
   * @returns {void}
   */
  clearCache(targetPath?: string): void;

  /**
   * Returns the top-level category directories under the algorithms source root.
   *
   * @returns {Promise<AlgorithmCategory[]>} Category list sorted by name.
   */
  getCategories(): Promise<AlgorithmCategory[]>;

  /**
   * Returns algorithm directories inside one category.
   *
   * @param {string} categoryPath Absolute path to the category directory.
   * @returns {Promise<AlgorithmEntry[]>} Algorithm entry list sorted by name.
   */
  getAlgorithms(categoryPath: string): Promise<AlgorithmEntry[]>;

  /**
   * Returns the per-language implementations inside one algorithm directory.
    *
    * Each language entry includes:
    * - `isFlagged`: whether that language is flagged in `.flag-lang`
    * - one representative `filePath`
    * - all root implementation paths for that language in `filePaths`
   *
   * @param {string} algorithmPath Absolute path to the algorithm directory.
   * @returns {Promise<AlgorithmImplementation[]>} Implementation list sorted by language key.
   */
  getImplementations(algorithmPath: string): Promise<AlgorithmImplementation[]>;

  /**
   * Returns top-level documentation files for one algorithm directory.
   *
   * Documentation files are restricted to direct children with `.md` or `.txt`
   * extensions and do not include nested directories.
   *
   * @param {string} algorithmPath Absolute path to the algorithm directory.
   * @returns {Promise<string[]>} Sorted absolute documentation file paths.
   */
  getDocumentationFiles(algorithmPath: string): Promise<string[]>;

  /**
   * Returns whether one algorithm has problem rows for the requested tree view mode.
   *
   * In `files` view mode, a problem row means any flagged implementation file.
   * In `language` view mode, a problem row means a flagged implementation or
   * at least one missing language implementation.
   *
   * @param {string} algorithmPath Absolute path to the algorithm directory.
   * @param {"files" | "language"} viewMode Active algorithms tree view mode.
   * @returns {Promise<boolean>} True when at least one problem row exists.
   */
  hasProblemRowsForAlgorithm(
    algorithmPath: string,
    viewMode: "files" | "language"
  ): Promise<boolean>;

  /**
   * Returns one resolved algorithm-file descriptor for an absolute file path.
   *
   * @param {string} filePath Absolute file path.
   * @returns {Promise<AlgorithmFileLookup | null>} Lookup descriptor when found.
   */
  getImplementationByFilePath(filePath: string): Promise<AlgorithmFileLookup | null>;

  /**
   * Returns the visible entries (directories and supported files) under a
   * standard library directory.
   *
   * When `dirPath` is omitted the stdlib root is used.
   *
   * @param {string} [dirPath] Absolute path to inspect. Defaults to stdlib root.
   * @returns {Promise<StandardLibEntry[]>} Standard library entries sorted by name.
   */
  getStandardLibraryEntries(dirPath?: string): Promise<StandardLibEntry[]>;
}
