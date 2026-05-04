import * as path from "path";

import type {
  RunControlsSettings,
  SmokeControlsSettings,
} from "../state";
import type { IPersistenceStore } from "./IPersistenceStore";
import {
  PERSISTED_WORKSPACE_SCHEMA_VERSION,
  type PersistedRunControls,
  type PersistedSmokeControls,
  type PersistedWorkspaceSettings,
  type PersistedWorkspaceSettingsByKey,
} from "./types";

/**
 * Input for one workspace settings persistence snapshot save.
 */
export interface WorkspaceSettingsSaveInput {
  persistSessionEnabled: boolean;
  runControls: RunControlsSettings;
  smokeControls: SmokeControlsSettings;
}

/**
 * DI contract for workspace settings persistence.
 */
export interface IWorkspaceSettingsPersistenceService {
  /**
   * Loads one persisted workspace payload.
   *
   * @param {string} workspaceKey Canonical workspace key.
   * @returns {PersistedWorkspaceSettings | null} Persisted payload when available.
   */
  loadWorkspaceSettings(workspaceKey: string): PersistedWorkspaceSettings | null;

  /**
   * Saves one workspace payload generated from host state values.
   *
   * @param {string} workspaceKey Canonical workspace key.
   * @param {WorkspaceSettingsSaveInput} input Save input.
   * @returns {Promise<void>} Resolves when save completes.
   */
  saveWorkspaceSettings(workspaceKey: string, input: WorkspaceSettingsSaveInput): Promise<void>;
}

/**
 * Creates a canonical workspace persistence key from one folder path.
 *
 * @param {string} workspaceFolderPath Workspace folder path.
 * @returns {string} Canonical workspace key.
 */
export function createWorkspacePersistenceKey(workspaceFolderPath: string): string {
  const resolvedWorkspacePath = path.resolve(workspaceFolderPath);
  return resolvedWorkspacePath;
}

/**
 * Extracts persisted run-controls values from host run controls.
 *
 * @param {RunControlsSettings} runControls Host run controls.
 * @returns {PersistedRunControls} Persisted run-controls payload.
 */
export function toPersistedRunControls(
  runControls: RunControlsSettings
): PersistedRunControls {
  return {
    runArgsEnabled: runControls.runArgsEnabled,
    runArgsText: runControls.runArgsText,
    sourceProfileEnabled: runControls.sourceProfileEnabled,
    sourceProfileText: runControls.sourceProfileText,
    runChecksMode: runControls.runChecksMode,
    runChecksRoute: runControls.runChecksRoute,
    cleanStdlibEnabled: runControls.cleanStdlibEnabled,
    cleanArchivesEnabled: runControls.cleanArchivesEnabled,
  };
}

/**
 * Extracts persisted smoke-controls values from host smoke controls.
 *
 * @param {SmokeControlsSettings} smokeControls Host smoke controls.
 * @returns {PersistedSmokeControls} Persisted smoke-controls payload.
 */
export function toPersistedSmokeControls(
  smokeControls: SmokeControlsSettings
): PersistedSmokeControls {
  return {
    reportEnabled: smokeControls.reportEnabled,
    markdownPath: smokeControls.markdownPath,
    timeoutSeconds: smokeControls.timeoutSeconds,
    slowTimeoutSeconds: smokeControls.slowTimeoutSeconds,
    languages: smokeControls.languages.map((language) => {
      return {
        languageKey: language.languageKey,
        selected: language.selected,
      };
    }),
  };
}

/**
 * Returns true when one candidate is an object record.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when value is object-like record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Returns true when one candidate is a valid persisted run-controls payload.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is PersistedRunControls} True when valid.
 */
function isPersistedRunControls(value: unknown): value is PersistedRunControls {
  if (!isRecord(value)) {
    return false;
  }

  const runChecksMode = value.runChecksMode;
  const runChecksRoute = value.runChecksRoute;

  return (
    typeof value.runArgsEnabled === "boolean"
    && typeof value.runArgsText === "string"
    && typeof value.sourceProfileEnabled === "boolean"
    && typeof value.sourceProfileText === "string"
    && (runChecksMode === "none" || runChecksMode === "check-only" || runChecksMode === "compile-only")
    && (runChecksRoute === "native" || runChecksRoute === "docker" || runChecksRoute === "ssh")
    && typeof value.cleanStdlibEnabled === "boolean"
    && typeof value.cleanArchivesEnabled === "boolean"
  );
}

/**
 * Returns true when one candidate is a valid persisted smoke-controls payload.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is PersistedSmokeControls} True when valid.
 */
function isPersistedSmokeControls(value: unknown): value is PersistedSmokeControls {
  if (!isRecord(value) || !Array.isArray(value.languages)) {
    return false;
  }

  return (
    typeof value.reportEnabled === "boolean"
    && typeof value.markdownPath === "string"
    && typeof value.timeoutSeconds === "string"
    && typeof value.slowTimeoutSeconds === "string"
    && value.languages.every((language) => {
      return isRecord(language)
        && typeof language.languageKey === "string"
        && typeof language.selected === "boolean";
    })
  );
}

/**
 * Returns true when one candidate is a valid persisted workspace payload.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is PersistedWorkspaceSettings} True when valid.
 */
function isPersistedWorkspaceSettings(value: unknown): value is PersistedWorkspaceSettings {
  if (!isRecord(value) || !isRecord(value.domains)) {
    return false;
  }

  if (
    value.schemaVersion !== PERSISTED_WORKSPACE_SCHEMA_VERSION
    || typeof value.updatedAt !== "number"
    || typeof value.persistSessionEnabled !== "boolean"
  ) {
    return false;
  }

  if (
    value.domains.runControls !== undefined
    && !isPersistedRunControls(value.domains.runControls)
  ) {
    return false;
  }

  if (
    value.domains.smokeControls !== undefined
    && !isPersistedSmokeControls(value.domains.smokeControls)
  ) {
    return false;
  }

  return true;
}

/**
 * Converts one raw store value into a validated workspace settings map.
 *
 * @param {unknown} rawValue Raw store value.
 * @returns {PersistedWorkspaceSettingsByKey} Validated settings map.
 */
function parseWorkspaceSettingsMap(rawValue: unknown): PersistedWorkspaceSettingsByKey {
  if (!isRecord(rawValue)) {
    return {};
  }

  const result: PersistedWorkspaceSettingsByKey = {};
  for (const [workspaceKey, candidateValue] of Object.entries(rawValue)) {
    if (isPersistedWorkspaceSettings(candidateValue)) {
      result[workspaceKey] = candidateValue;
    }
  }

  return result;
}

/**
 * Creates one workspace settings persistence service.
 *
 * @param {IPersistenceStore} store Persistence store adapter.
 * @returns {IWorkspaceSettingsPersistenceService} Workspace settings persistence service.
 */
export function createWorkspaceSettingsPersistenceService(
  store: IPersistenceStore
): IWorkspaceSettingsPersistenceService {
  return {
    loadWorkspaceSettings(workspaceKey: string): PersistedWorkspaceSettings | null {
      const normalizedWorkspaceKey = workspaceKey.trim();
      if (normalizedWorkspaceKey.length === 0) {
        return null;
      }

      const persistedByWorkspace = parseWorkspaceSettingsMap(store.read());
      return persistedByWorkspace[normalizedWorkspaceKey] ?? null;
    },

    async saveWorkspaceSettings(
      workspaceKey: string,
      input: WorkspaceSettingsSaveInput
    ): Promise<void> {
      const normalizedWorkspaceKey = workspaceKey.trim();
      if (normalizedWorkspaceKey.length === 0) {
        return;
      }

      const persistedByWorkspace = parseWorkspaceSettingsMap(store.read());
      persistedByWorkspace[normalizedWorkspaceKey] = {
        schemaVersion: PERSISTED_WORKSPACE_SCHEMA_VERSION,
        updatedAt: Date.now(),
        persistSessionEnabled: input.persistSessionEnabled,
        domains: {
          runControls: toPersistedRunControls(input.runControls),
          smokeControls: toPersistedSmokeControls(input.smokeControls),
        },
      };

      await store.write(persistedByWorkspace);
    },
  };
}
