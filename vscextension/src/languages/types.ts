/**
 * Platform/architecture rule entry for one runnable language constraint.
 */
export interface LanguageConstraintEntry {
  platform: string[];
  arch: string[];
  note?: string;
}

/**
 * Runtime constraints for a language entry.
 */
export interface LanguageConstraints {
  canRun: LanguageConstraintEntry[];
}

/**
 * Smoke-test defaults and visibility for a language entry.
 */
export interface LanguageSmoke {
  defaultEnabled: boolean;
  visible?: boolean;
  reasonIfDisabledByDefault?: string;
}

/**
 * Icon metadata for a language entry.
 */
export interface LanguageIcon {
  fileName: string;
}

/**
 * Alias metadata for a language entry.
 */
export interface LanguageAliases {
  languageIds: string[];
  fileExtensions: string[];
}

/**
 * Canonical language catalog record.
 */
export interface LanguageRecord {
  key: string;
  extension: string;
  displayLabel: string;
  icon: LanguageIcon;
  sampleOutputTemplate: string;
  smoke: LanguageSmoke;
  constraints: LanguageConstraints;
  aliases: LanguageAliases;
}

/**
 * Top-level generated language payload consumed by the TS extension.
 */
export interface GeneratedLanguageData {
  schemaVersion: number;
  catalogVersion: string;
  defaults: unknown;
  contracts: unknown;
  languages: LanguageRecord[];
}
