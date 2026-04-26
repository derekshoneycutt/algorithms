import * as path from "node:path";

import type { ILanguages } from "./ILanguages";
import type { GeneratedLanguageData, LanguageRecord } from "./types";

/**
 * Extracts a lower-cased file extension from either a full path or extension-like input.
 *
 * @param {string} filePath Path or extension input.
 * @returns {string | undefined} Lower-cased extension including the leading dot.
 */
function extractFileExtension(filePath: string): string | undefined {
  const trimmedValue = filePath.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  if (trimmedValue.startsWith(".") && !trimmedValue.includes("/")) {
    return trimmedValue.toLowerCase();
  }

  const extension = path.extname(trimmedValue).toLowerCase();
  if (extension.length === 0) {
    return undefined;
  }

  return extension;
}

/**
 * Creates the concrete `ILanguages` implementation from generated language data.
 *
 * @param {GeneratedLanguageData} data Generated catalog data.
 * @returns {ILanguages} Language module implementation.
 */
export function createLanguages(data: GeneratedLanguageData): ILanguages {
  const recordsByKey = new Map<string, LanguageRecord>();
  const aliasesByLanguageId = new Map<string, string>();
  const aliasesByExtension = new Map<string, string>();
  const displayLabelsByKey = new Map<string, string>();
  const defaultSmokeKeys: string[] = [];

  for (const language of data.languages) {
    const canonicalKey = language.key.trim().toLowerCase();
    recordsByKey.set(canonicalKey, language);
    displayLabelsByKey.set(canonicalKey, language.displayLabel);

    if (language.smoke.defaultEnabled) {
      defaultSmokeKeys.push(canonicalKey);
    }

    for (const alias of language.aliases.languageIds) {
      aliasesByLanguageId.set(alias.trim().toLowerCase(), canonicalKey);
    }

    for (const extensionAlias of language.aliases.fileExtensions) {
      aliasesByExtension.set(extensionAlias.trim().toLowerCase(), canonicalKey);
    }
  }

  const allLanguages = data.languages.map((language) => {
    return language;
  });

  return {
    getAll() {
      return allLanguages;
    },

    getByKey(key: string) {
      return recordsByKey.get(key.trim().toLowerCase());
    },

    normalizeLanguageId(languageId: string) {
      const normalizedLanguageId = languageId.trim().toLowerCase();
      return aliasesByLanguageId.get(normalizedLanguageId) ?? normalizedLanguageId;
    },

    normalizeFileExtension(filePath: string) {
      const normalizedExtension = extractFileExtension(filePath);
      if (normalizedExtension === undefined) {
        return undefined;
      }

      return aliasesByExtension.get(normalizedExtension);
    },

    getDisplayLabel(key: string) {
      return displayLabelsByKey.get(key.trim().toLowerCase());
    },

    getDefaultSmokeKeys() {
      return defaultSmokeKeys;
    },
  };
}
