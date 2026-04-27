import type {
  DeletePathOptions,
  ListDirectoryOptions,
  ListDirectoryResult,
  ReadTextOptions,
} from "./types";

/**
 * DI contract for the `filesystem` module.
 */
export interface IFilesystem {
  /**
   * Resolves a canonical absolute path for the target.
   *
   * @param {string} targetPath Path to resolve.
   * @returns {Promise<string>} Canonical absolute path, or normalized absolute fallback.
   */
  realpath(targetPath: string): Promise<string>;

  /**
   * Checks whether a path exists and is a regular file.
   *
   * @param {string} filePath Path to check.
   * @returns {Promise<boolean>} True when the path is a file.
   */
  isFile(filePath: string): Promise<boolean>;

  /**
   * Checks whether a path exists and is a directory.
   *
   * @param {string} directoryPath Path to check.
   * @returns {Promise<boolean>} True when the path is a directory.
   */
  isDirectory(directoryPath: string): Promise<boolean>;

  /**
   * Reads a text file.
   *
   * @param {string} filePath Path to read.
   * @param {ReadTextOptions} [options] Read options.
   * @returns {Promise<string | null>} File content or null when unreadable.
   */
  readText(filePath: string, options?: ReadTextOptions): Promise<string | null>;

  /**
   * Writes text content to a file.
   *
   * @param {string} filePath Path to write.
   * @param {string} content Text content.
   * @param {ReadTextOptions} [options] Write options.
   * @returns {Promise<void>}
   */
  writeText(
    filePath: string,
    content: string,
    options?: ReadTextOptions
  ): Promise<void>;

  /**
   * Lists directory entries.
   *
   * @param {string} directoryPath Directory path to list.
   * @param {ListDirectoryOptions} [options] List options.
   * @returns {Promise<ListDirectoryResult | null>} Directory entries or null when unreadable.
   */
  listDirectory(
    directoryPath: string,
    options?: ListDirectoryOptions
  ): Promise<ListDirectoryResult | null>;

  /**
   * Ensures a directory exists.
   *
   * @param {string} directoryPath Directory path to create.
   * @returns {Promise<void>}
   */
  ensureDirectory(directoryPath: string): Promise<void>;

  /**
   * Deletes a path.
   *
   * @param {string} targetPath Path to delete.
   * @param {DeletePathOptions} [options] Delete options.
   * @returns {Promise<void>}
   */
  deletePath(targetPath: string, options?: DeletePathOptions): Promise<void>;

  /**
   * Checks whether a candidate path is within a root path.
   *
   * Both paths are canonicalized with `realpath` behavior before comparison.
   *
   * @param {string} rootPath Root path.
   * @param {string} candidatePath Candidate path.
   * @returns {Promise<boolean>} True when candidate is inside root (or equals root).
   */
  isPathWithinRoot(rootPath: string, candidatePath: string): Promise<boolean>;
}
