import type { RunChecksMode, RunChecksRoute } from "../state";

/**
 * Storage key used for workspace settings persistence in workspaceState.
 */
export const WORKSPACE_PERSISTENCE_STORAGE_KEY = "algos.persistence.workspace.v1";

/**
 * Schema version for persisted workspace settings.
 */
export const PERSISTED_WORKSPACE_SCHEMA_VERSION = 1;

/**
 * Persisted run-controls payload.
 */
export interface PersistedRunControls {
  runArgsEnabled: boolean;
  runArgsText: string;
  sourceProfileEnabled: boolean;
  sourceProfileText: string;
  runChecksMode: RunChecksMode;
  runChecksRoute: RunChecksRoute;
  cleanStdlibEnabled: boolean;
  cleanArchivesEnabled: boolean;
}

/**
 * Persisted smoke language selection payload.
 */
export interface PersistedSmokeLanguageSelection {
  languageKey: string;
  selected: boolean;
}

/**
 * Persisted smoke-controls payload.
 */
export interface PersistedSmokeControls {
  reportEnabled: boolean;
  markdownPath: string;
  timeoutSeconds: string;
  slowTimeoutSeconds: string;
  languages: PersistedSmokeLanguageSelection[];
}

/**
 * Persisted workspace settings payload.
 */
export interface PersistedWorkspaceSettings {
  schemaVersion: 1;
  updatedAt: number;
  persistSessionEnabled: boolean;
  domains: {
    runControls?: PersistedRunControls;
    smokeControls?: PersistedSmokeControls;
  };
}

/**
 * Workspace-keyed persistence container.
 */
export type PersistedWorkspaceSettingsByKey = Record<string, PersistedWorkspaceSettings>;
