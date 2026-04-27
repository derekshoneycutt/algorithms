import type { IFilesystem } from "../filesystem";
import type { ILanguages } from "../languages";
import type {
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
