import * as path from "node:path";

import type { IFilesystem } from "../filesystem";

/**
 * DI contract for algorithm language-flag persistence.
 */
export interface IFlaggedLanguagesService {
  /**
   * Reads flagged language keys from one algorithm directory.
   *
   * @param {string} algorithmDirectoryPath Algorithm directory path.
   * @returns {Promise<Set<string>>} Flagged language key set.
   */
  readFlaggedLanguageKeys(algorithmDirectoryPath: string): Promise<Set<string>>;

  /**
   * Writes flagged language keys for one algorithm directory.
   *
   * @param {string} algorithmDirectoryPath Algorithm directory path.
   * @param {ReadonlySet<string>} flaggedLanguageKeys New flagged key set.
   * @returns {Promise<void>}
   */
  writeFlaggedLanguageKeys(
    algorithmDirectoryPath: string,
    flaggedLanguageKeys: ReadonlySet<string>
  ): Promise<void>;
}

/**
 * Canonical file name used to persist flagged language keys per algorithm.
 */
export const FLAGGED_LANGUAGES_FILE_NAME = ".flag-lang";

/**
 * Resolves the .flag-lang file path for one algorithm directory.
 *
 * @param {string} algorithmDirectoryPath Algorithm directory path.
 * @returns {string} Flag file path.
 */
export function resolveFlaggedLanguagesFilePath(algorithmDirectoryPath: string): string {
  return path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);
}

/**
 * Reads flagged language keys from one algorithm directory.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @param {string} algorithmDirectoryPath Algorithm directory path.
 * @returns {Promise<Set<string>>} Flagged language key set.
 */
export async function readFlaggedLanguageKeys(
  filesystem: IFilesystem,
  algorithmDirectoryPath: string
): Promise<Set<string>> {
  const filePath = resolveFlaggedLanguagesFilePath(algorithmDirectoryPath);
  const fileContent = await filesystem.readText(filePath);
  if (fileContent === null) {
    return new Set();
  }

  const languageKeys = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0);

  return new Set(languageKeys);
}

/**
 * Writes flagged language keys for one algorithm directory.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @param {string} algorithmDirectoryPath Algorithm directory path.
 * @param {ReadonlySet<string>} flaggedLanguageKeys New flagged key set.
 * @returns {Promise<void>}
 */
export async function writeFlaggedLanguageKeys(
  filesystem: IFilesystem,
  algorithmDirectoryPath: string,
  flaggedLanguageKeys: ReadonlySet<string>
): Promise<void> {
  const filePath = resolveFlaggedLanguagesFilePath(algorithmDirectoryPath);
  if (flaggedLanguageKeys.size === 0) {
    await filesystem.deletePath(filePath);
    return;
  }

  const sortedKeys = [...flaggedLanguageKeys].sort((leftKey, rightKey) => {
    return leftKey.localeCompare(rightKey);
  });
  await filesystem.writeText(filePath, `${sortedKeys.join("\n")}\n`);
}

/**
 * Creates one flagged-language persistence service bound to filesystem.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @returns {IFlaggedLanguagesService} Service instance.
 */
export function createFlaggedLanguagesService(
  filesystem: IFilesystem
): IFlaggedLanguagesService {
  return {
    async readFlaggedLanguageKeys(algorithmDirectoryPath: string): Promise<Set<string>> {
      return await readFlaggedLanguageKeys(filesystem, algorithmDirectoryPath);
    },

    async writeFlaggedLanguageKeys(
      algorithmDirectoryPath: string,
      flaggedLanguageKeys: ReadonlySet<string>
    ): Promise<void> {
      await writeFlaggedLanguageKeys(
        filesystem,
        algorithmDirectoryPath,
        flaggedLanguageKeys
      );
    },
  };
}