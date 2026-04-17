const path = require("path");
const { GENERATED_LANGUAGE_DATA } = require("./generated/languages.generated");

/**
 * Returns language records from generated metadata.
 *
 * @returns {Array<{key: string, extension: string, icon: {fileName: string}, aliases: {languageIds: string[], fileExtensions: string[]}}>} Language records.
 */
function getGeneratedLanguages() {
  return Array.isArray(GENERATED_LANGUAGE_DATA?.languages)
    ? GENERATED_LANGUAGE_DATA.languages
    : [];
}

/**
 * Builds language icon map keyed by canonical language key.
 *
 * @returns {Record<string, string>} Language icon filename map.
 */
function buildLanguageIconFileByKey() {
  const mapping = {};

  for (const language of getGeneratedLanguages()) {
    const key = String(language.key || "").trim().toLowerCase();
    const iconFileName = String(language.icon?.fileName || "").trim();

    if (!key || !iconFileName) {
      continue;
    }

    mapping[key] = iconFileName;
  }

  return mapping;
}

/**
 * Builds sample extension map keyed by canonical language key.
 *
 * @returns {Record<string, string>} Language-to-sample-extension map.
 */
function buildLanguageSampleExtensions() {
  const mapping = {};

  for (const language of getGeneratedLanguages()) {
    const key = String(language.key || "").trim().toLowerCase();
    const sampleExtension = String(language.extension || "").trim().toLowerCase();

    if (!key || !sampleExtension) {
      continue;
    }

    mapping[key] = sampleExtension;
  }

  return mapping;
}

/**
 * Builds language-id aliases map from generated language metadata.
 *
 * @returns {Record<string, string>} Alias languageId to canonical key map.
 */
function buildLanguageIdAliases() {
  const mapping = {};

  for (const language of getGeneratedLanguages()) {
    const key = String(language.key || "").trim().toLowerCase();
    const languageIds = Array.isArray(language.aliases?.languageIds)
      ? language.aliases.languageIds
      : [];

    for (const languageId of languageIds) {
      const normalizedLanguageId = String(languageId || "").trim().toLowerCase();

      if (!normalizedLanguageId || normalizedLanguageId === key) {
        continue;
      }

      mapping[normalizedLanguageId] = key;
    }
  }

  return mapping;
}

/**
 * Builds file-extension alias map from generated language metadata.
 *
 * @returns {Record<string, string>} Dot-extension to canonical key map.
 */
function buildFileExtensionAliases() {
  const mapping = {};

  for (const language of getGeneratedLanguages()) {
    const key = String(language.key || "").trim().toLowerCase();
    const fileExtensions = Array.isArray(language.aliases?.fileExtensions)
      ? language.aliases.fileExtensions
      : [];

    for (const fileExtension of fileExtensions) {
      const normalizedExtension = String(fileExtension || "").trim().toLowerCase();

      if (!normalizedExtension.startsWith(".")) {
        continue;
      }

      mapping[normalizedExtension] = key;
    }
  }

  return mapping;
}

/**
 * Builds display-label map keyed by canonical language key.
 *
 * @returns {Record<string, string>} Canonical language display labels.
 */
function buildLanguageDisplayLabels() {
  const mapping = {};

  for (const language of getGeneratedLanguages()) {
    const key = String(language.key || "").trim().toLowerCase();
    const displayLabel = String(language.displayLabel || language.key || "").trim();

    if (!key || !displayLabel) {
      continue;
    }

    mapping[key] = displayLabel;
  }

  return mapping;
}

/**
 * Builds default smoke language key list from generated metadata.
 *
 * @returns {string[]} Canonical smoke-default language keys.
 */
function buildDefaultSmokeLanguageKeys() {
  return getGeneratedLanguages()
    .filter((language) => language?.smoke?.defaultEnabled === true)
    .map((language) => String(language.key || "").trim().toLowerCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Language icon file names keyed by language identifier.
 * Used by the Smoke Controls and Environment Init panes to resolve
 * the icon image for each language entry.
 *
 * @type {Record<string, string>}
 */
const LANGUAGE_ICON_FILE_BY_KEY = buildLanguageIconFileByKey();

/**
 * Sample source file extensions keyed by language identifier.
 * Used by the Algorithms Run tree view to locate and display the
 * most representative source icon for each language.
 *
 * @type {Record<string, string>}
 */
const LANGUAGE_ICON_SAMPLE_EXTENSIONS = buildLanguageSampleExtensions();

/**
 * Known VS Code languageId aliases mapped to canonical run-language keys.
 *
 * @type {Record<string, string>}
 */
const LANGUAGE_ID_ALIASES = buildLanguageIdAliases();

/**
 * File-extension fallback map aligned to the run.sh language catalog.
 *
 * @type {Record<string, string>}
 */
const FILE_EXTENSION_LANGUAGE_ALIASES = buildFileExtensionAliases();

/**
 * Human-friendly display labels keyed by canonical language key.
 *
 * @type {Record<string, string>}
 */
const LANGUAGE_DISPLAY_LABELS = buildLanguageDisplayLabels();

/**
 * Smoke-default language keys from generated metadata.
 *
 * @type {string[]}
 */
const DEFAULT_SMOKE_LANGUAGE_KEYS = buildDefaultSmokeLanguageKeys();

/**
 * Reads canonical supported language keys from run-language modules.
 *
 * @param {string} resolvedRoot Resolved repository root path.
 * @returns {Set<string>} Supported language keys.
 */
function getSupportedLanguageKeys(resolvedRoot) {
  void resolvedRoot;
  const keys = getGeneratedLanguages().map((language) => String(language.key || "").trim().toLowerCase());
  return new Set(keys.filter(Boolean));
}

/**
 * Normalizes VS Code languageId into canonical run-language key space.
 *
 * @param {string} languageId VS Code document language id.
 * @returns {string} Canonical language key candidate.
 */
function normalizeLanguageId(languageId) {
  const normalized = String(languageId || "").toLowerCase();

  if (LANGUAGE_ID_ALIASES[normalized]) {
    return LANGUAGE_ID_ALIASES[normalized];
  }

  return normalized;
}

/**
 * Normalizes file extension into canonical run-language key space.
 *
 * @param {string} filePath Active file path.
 * @returns {string|null} Canonical language key candidate or null.
 */
function normalizeExtensionToLanguageKey(filePath) {
  const extension = path.extname(String(filePath || "")).toLowerCase();

  if (!extension) {
    return null;
  }

  if (FILE_EXTENSION_LANGUAGE_ALIASES[extension]) {
    return FILE_EXTENSION_LANGUAGE_ALIASES[extension];
  }

  return null;
}

/**
 * Returns one display label for one canonical language key.
 *
 * @param {string} languageKey Canonical language key.
 * @returns {string} Human-friendly display label.
 */
function getLanguageDisplayLabel(languageKey) {
  const normalizedLanguageKey = String(languageKey || "").trim().toLowerCase();

  if (!normalizedLanguageKey) {
    return "";
  }

  if (LANGUAGE_DISPLAY_LABELS[normalizedLanguageKey]) {
    return LANGUAGE_DISPLAY_LABELS[normalizedLanguageKey];
  }

  return normalizedLanguageKey;
}

/**
 * Returns smoke-default language keys.
 *
 * @returns {string[]} Canonical smoke-default language keys.
 */
function getDefaultSmokeLanguageKeys() {
  return [...DEFAULT_SMOKE_LANGUAGE_KEYS];
}

module.exports = {
  DEFAULT_SMOKE_LANGUAGE_KEYS,
  FILE_EXTENSION_LANGUAGE_ALIASES,
  LANGUAGE_DISPLAY_LABELS,
  LANGUAGE_ICON_FILE_BY_KEY,
  LANGUAGE_ICON_SAMPLE_EXTENSIONS,
  LANGUAGE_ID_ALIASES,
  getDefaultSmokeLanguageKeys,
  getLanguageDisplayLabel,
  getSupportedLanguageKeys,
  normalizeExtensionToLanguageKey,
  normalizeLanguageId,
};