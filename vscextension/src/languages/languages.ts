import * as path from "node:path";

import type { ILanguages } from "./ILanguages";
import type { GeneratedLanguageData, LanguageConstraintEntry, LanguageRecord } from "./types";
import type { SmokeLanguageSelection } from "../state";

/**
 * Returns the schema-aligned platform token for the current host.
 *
 * @returns {string} Platform token.
 */
function getCurrentPlatformToken(): string {
  if (process.platform === "darwin") {
    return "Darwin";
  }

  if (process.platform === "linux") {
    return "Linux";
  }

  if (process.platform === "freebsd") {
    return "FreeBSD";
  }

  if (process.platform === "win32") {
    return "MINGW64_NT";
  }

  return "*";
}

/**
 * Returns the schema-aligned architecture token for the current host.
 *
 * @returns {string} Architecture token.
 */
function getCurrentArchitectureToken(): string {
  if (process.arch === "arm64") {
    return "arm64";
  }

  if (process.arch === "x64") {
    return "x86_64";
  }

  return process.arch;
}

/**
 * Returns true when one constraint rule permits the current platform and architecture.
 *
 * @param {LanguageConstraintEntry} rule Constraint rule to evaluate.
 * @returns {boolean} True when the rule matches the current host.
 */
function constraintRuleMatchesHost(rule: LanguageConstraintEntry): boolean {
  const platformToken = getCurrentPlatformToken();
  const archToken = getCurrentArchitectureToken();
  const platforms = Array.isArray(rule.platform) ? rule.platform : ["*"];
  const archValues = Array.isArray(rule.arch) ? rule.arch : ["*"];
  const platformMatch = platforms.includes("*") || platforms.includes(platformToken);
  const archMatch = archValues.includes("*") || archValues.includes(archToken);
  return platformMatch && archMatch;
}

/**
 * Checks whether one language is runnable on the current host.
 *
 * @param {LanguageRecord} language Language record.
 * @returns {boolean} True when at least one constraint rule permits the current platform and arch.
 */
export function isLanguageRunnableOnCurrentHost(language: LanguageRecord): boolean {
  const canRunRules = Array.isArray(language.constraints?.canRun)
    ? language.constraints.canRun
    : [];

  if (canRunRules.length === 0) {
    return true;
  }

  return canRunRules.some(constraintRuleMatchesHost);
}

/**
 * Builds initial smoke language selections using current host runnability constraints.
 *
 * @param {ILanguages} languages Languages module instance.
 * @returns {SmokeLanguageSelection[]} Initial smoke language selections.
 */
export function buildSmokeLanguageSelections(
  languages: ILanguages
): SmokeLanguageSelection[] {
  const defaultSmokeKeys = new Set(languages.getDefaultSmokeKeys());

  return languages
    .getAll()
    .filter((language) => language.smoke.visible !== false)
    .map((language) => {
      const languageKey = language.key.trim().toLowerCase();
      const runnable = isLanguageRunnableOnCurrentHost(language);

      return {
        languageKey,
        label: language.displayLabel,
        selected: defaultSmokeKeys.has(languageKey) && runnable,
        disabled: !runnable,
        disabledReason: runnable ? "" : "Not runnable on this platform/architecture.",
      };
    });
}

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
