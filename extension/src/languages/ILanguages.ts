import type { LanguageRecord } from "./types";

/**
 * DI contract for the `languages` module.
 */
export interface ILanguages {
  /**
   * Returns the full canonical language catalog.
   *
   * @returns {readonly LanguageRecord[]} Language records.
   */
  getAll(): readonly LanguageRecord[];

  /**
   * Returns one canonical language by key.
   *
   * @param {string} key Canonical language key.
   * @returns {LanguageRecord | undefined} Matching record or undefined.
   */
  getByKey(key: string): LanguageRecord | undefined;

  /**
   * Normalizes a VS Code language ID into a canonical language key.
   *
   * Falls back to lower-cased `languageId` when there is no explicit alias.
   *
   * @param {string} languageId VS Code language ID.
   * @returns {string} Canonical language key.
   */
  normalizeLanguageId(languageId: string): string;

  /**
   * Normalizes a file path or extension into a canonical language key.
   *
   * @param {string} filePath File path or extension.
   * @returns {string | undefined} Canonical language key or undefined.
   */
  normalizeFileExtension(filePath: string): string | undefined;

  /**
   * Returns the display label for a canonical language key.
   *
   * @param {string} key Canonical language key.
   * @returns {string | undefined} Display label or undefined.
   */
  getDisplayLabel(key: string): string | undefined;

  /**
   * Returns canonical keys enabled by default for smoke tests.
   *
   * @returns {readonly string[]} Default smoke language keys.
   */
  getDefaultSmokeKeys(): readonly string[];
}
