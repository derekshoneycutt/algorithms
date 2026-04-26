/**
 * Machine state values the extension host can occupy.
 */
export type ExtensionHostStateValue = "ready" | "running" | "stopped";

/**
 * Supported smoke status class names shared with webview styles.
 */
export type SmokeStatusClassName = "status-muted" | "status-ok" | "status-error";

/**
 * One smoke language option in host state.
 */
export interface SmokeLanguageSelection {
  languageKey: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  disabledReason: string;
}

/**
 * Canonical smoke controls settings stored in host state.
 */
export interface SmokeControlsSettings {
  reportEnabled: boolean;
  markdownPath: string;
  timeoutSeconds: string;
  slowTimeoutSeconds: string;
  languages: SmokeLanguageSelection[];
  reportStatusText: string;
  reportStatusClassName: SmokeStatusClassName;
  smokeStatusText: string;
  smokeStatusClassName: SmokeStatusClassName;
  statusLabel: string;
}

/**
 * Creates report status metadata from smoke controls settings.
 *
 * @param {boolean} reportEnabled Whether markdown report generation is enabled.
 * @param {string} markdownPath Current report path text.
 * @returns {{statusText: string, statusClassName: SmokeStatusClassName}} Report status metadata.
 */
function createInitialReportStatus(
  reportEnabled: boolean,
  markdownPath: string
): { statusText: string; statusClassName: SmokeStatusClassName } {
  if (!reportEnabled) {
    return {
      statusText: "No report generated.",
      statusClassName: "status-muted",
    };
  }

  if (markdownPath.trim().length === 0) {
    return {
      statusText: "Report generated at default smoke-test path.",
      statusClassName: "status-ok",
    };
  }

  return {
    statusText: `Report generated at: ${markdownPath.trim()}`,
    statusClassName: "status-ok",
  };
}

/**
 * Creates language-selection status metadata from smoke controls settings.
 *
 * @param {SmokeLanguageSelection[]} languages Current smoke language selections.
 * @returns {{statusText: string, statusClassName: SmokeStatusClassName}} Selection status metadata.
 */
function createInitialSelectionStatus(
  languages: SmokeLanguageSelection[]
): { statusText: string; statusClassName: SmokeStatusClassName } {
  const selectableCount = languages.filter((language) => !language.disabled).length;
  const selectedCount = languages.filter((language) => language.selected).length;

  if (selectedCount === 0) {
    return {
      statusText: "Select at least one language",
      statusClassName: "status-error",
    };
  }

  if (selectableCount > 0 && selectedCount === selectableCount) {
    return {
      statusText: "All languages selected (omit --langs)",
      statusClassName: "status-muted",
    };
  }

  return {
    statusText: `${selectedCount} smoke languages selected`,
    statusClassName: "status-ok",
  };
}

/**
 * Input overrides for initial smoke controls settings.
 */
export interface InitialSmokeControlsSettingsInput {
  reportEnabled?: boolean;
  markdownPath?: string;
  timeoutSeconds?: string;
  slowTimeoutSeconds?: string;
  languages?: SmokeLanguageSelection[];
  statusLabel?: string;
}

/**
 * Mutable context held across all machine states.
 */
export interface ExtensionHostContext {
  lastCommandId: string | null;
  lastResult: string | null;
  lastFailure: string | null;
  smokeControls: SmokeControlsSettings;
}

/**
 * Events the extension host machine accepts.
 */
export type ExtensionHostEvent =
  | { type: "COMMAND_REQUESTED"; commandId: string }
  | { type: "COMMAND_SUCCEEDED"; result: string }
  | { type: "COMMAND_FAILED"; error: string }
  | { type: "SMOKE_REPORT_ENABLED_SET"; enabled: boolean }
  | { type: "SMOKE_MARKDOWN_PATH_SET"; path: string }
  | { type: "SMOKE_TIMEOUT_SECONDS_SET"; seconds: string }
  | { type: "SMOKE_SLOW_TIMEOUT_SECONDS_SET"; seconds: string }
  | { type: "SMOKE_LANGUAGE_TOGGLED"; languageKey: string }
  | { type: "SMOKE_ALL_LANGUAGES_SELECTED" }
  | { type: "SMOKE_ALL_LANGUAGES_DESELECTED" }
  | {
      type: "SMOKE_REPORT_STATUS_SET";
      statusText: string;
      statusClassName: SmokeStatusClassName;
    }
  | {
      type: "SMOKE_SELECTION_STATUS_SET";
      statusText: string;
      statusClassName: SmokeStatusClassName;
    }
  | { type: "SMOKE_STATUS_LABEL_SET"; statusLabel: string }
  | { type: "SHUTDOWN" };

/**
 * Read-only snapshot exposed to consumers outside the state module.
 */
export interface ExtensionHostSnapshot {
  readonly stateValue: ExtensionHostStateValue;
  readonly lastCommandId: string | null;
  readonly lastResult: string | null;
  readonly lastFailure: string | null;
  readonly smokeControls: SmokeControlsSettings;
}

/**
 * Creates the default smoke controls settings.
 *
 * @param {InitialSmokeControlsSettingsInput} [input] Optional overrides.
 * @returns {SmokeControlsSettings} Initial smoke controls state.
 */
export function createInitialSmokeControlsSettings(
  input?: InitialSmokeControlsSettingsInput
): SmokeControlsSettings {
  const defaultLanguages: SmokeLanguageSelection[] = [
    {
      languageKey: "c",
      label: "C",
      selected: true,
      disabled: false,
      disabledReason: "",
    },
    {
      languageKey: "cpp",
      label: "C++",
      selected: true,
      disabled: false,
      disabledReason: "",
    },
    {
      languageKey: "javascript",
      label: "JavaScript",
      selected: true,
      disabled: false,
      disabledReason: "",
    },
    {
      languageKey: "python",
      label: "Python",
      selected: true,
      disabled: false,
      disabledReason: "",
    },
    {
      languageKey: "rust",
      label: "Rust",
      selected: true,
      disabled: false,
      disabledReason: "",
    },
  ];

  const reportEnabled = input?.reportEnabled ?? false;
  const markdownPath = input?.markdownPath ?? "output/smoke-report.md";
  const languages = input?.languages ?? defaultLanguages;
  const reportStatus = createInitialReportStatus(reportEnabled, markdownPath);
  const selectionStatus = createInitialSelectionStatus(languages);

  return {
    reportEnabled,
    markdownPath,
    timeoutSeconds: input?.timeoutSeconds ?? "30",
    slowTimeoutSeconds: input?.slowTimeoutSeconds ?? "5",
    languages,
    reportStatusText: reportStatus.statusText,
    reportStatusClassName: reportStatus.statusClassName,
    smokeStatusText: selectionStatus.statusText,
    smokeStatusClassName: selectionStatus.statusClassName,
    statusLabel: input?.statusLabel ?? selectionStatus.statusText,
  };
}
