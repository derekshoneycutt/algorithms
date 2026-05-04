/**
 * Machine state values the extension host can occupy.
 */
export type ExtensionHostStateValue = "ready" | "running" | "stopped";

/**
 * Supported section status class names shared with webview styles.
 */
export type ViewStatusClassName = "status-muted" | "status-ok" | "status-error";

/**
 * Supported smoke status class names shared with webview styles.
 */
export type SmokeStatusClassName = ViewStatusClassName;

/**
 * Supported run-checks mode values.
 */
export type RunChecksMode = "none" | "check-only" | "compile-only";

/**
 * Supported run-checks route values.
 */
export type RunChecksRoute = "native" | "docker" | "ssh";

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
 * Canonical run controls settings stored in host state.
 */
export interface RunControlsSettings {
  runArgsEnabled: boolean;
  runArgsText: string;
  runArgsStatusText: string;
  runArgsStatusClassName: ViewStatusClassName;
  sourceProfileEnabled: boolean;
  sourceProfileText: string;
  sourceProfileStatusText: string;
  sourceProfileStatusClassName: ViewStatusClassName;
  runChecksMode: RunChecksMode;
  runChecksRoute: RunChecksRoute;
  runChecksStatusText: string;
  runChecksStatusClassName: ViewStatusClassName;
  cleanStdlibEnabled: boolean;
  cleanArchivesEnabled: boolean;
  cleanOptionsStatusText: string;
  cleanOptionsStatusClassName: ViewStatusClassName;
}

/**
 * Supported environment variable keys managed by the environment view.
 */
export type EnvironmentVariableKey =
  | "timeout"
  | "eiffel"
  | "gcc13Directory"
  | "gcc13Name"
  | "gxx13Name";

/**
 * One environment variable entry displayed in the environment panel.
 */
export interface EnvironmentVariableSetting {
  key: EnvironmentVariableKey;
  label: string;
  value: string;
  statusText: string;
  statusClassName: ViewStatusClassName;
}

/**
 * One language routing row in environment controls state.
 */
export interface EnvironmentRoutingLanguageSetting {
  languageKey: string;
  label: string;
  iconUri?: string;
  dockerEnabled: boolean;
  dockerValue: string;
  sshEnabled: boolean;
  sshValue: string;
  isConflict: boolean;
  statusText: string;
  statusClassName: ViewStatusClassName;
}

/**
 * Canonical environment controls settings stored in host state.
 */
export interface EnvironmentControlsSettings {
  persistSessionEnabled: boolean;
  profilePath: string;
  profilePlaceholder: string;
  effectiveProfilePath: string;
  copyIconsPath: string;
  checkEnvStatusText: string;
  checkEnvStatusClassName: ViewStatusClassName;
  checkEnvFilteredOutput: string;
  checkEnvRawOutput: string;
  copyIconsStatusText: string;
  copyIconsStatusClassName: ViewStatusClassName;
  routingDockerMapText: string;
  routingSshMapText: string;
  routingStatusText: string;
  routingStatusClassName: ViewStatusClassName;
  routingEntries: EnvironmentRoutingLanguageSetting[];
  batchRoutingDockerEnabled: boolean;
  batchRoutingDockerValue: string;
  batchRoutingSshEnabled: boolean;
  batchRoutingSshValue: string;
  batchRoutingConflict: boolean;
  variables: EnvironmentVariableSetting[];
}

/**
 * Per-language runtime smoke-test status.
 */
export type SmokeLanguageRunStatus = "queued" | "running" | "passed" | "failed";

/**
 * Runtime smoke-test statuses keyed by language key for one algorithm path.
 */
export type SmokeRunStatusByLanguage = Record<string, SmokeLanguageRunStatus>;

/**
 * Runtime smoke-test statuses keyed by algorithm path.
 */
export type SmokeRunStatusByAlgorithm = Record<string, SmokeRunStatusByLanguage>;

/**
 * Known filesystem stat kinds tracked in state summaries.
 */
export type FilesystemStatKind = "file" | "directory" | "other" | "missing";

/**
 * One filesystem stat cache summary entry.
 */
export interface FilesystemStatCacheEntry {
  exists: boolean;
  kind: FilesystemStatKind;
  updatedAt: number;
}

/**
 * One filesystem directory cache summary entry.
 */
export interface FilesystemDirectoryCacheEntry {
  entryCount: number;
  updatedAt: number;
}

/**
 * One tracked pending filesystem operation.
 */
export interface FilesystemPendingOperation {
  operationType: string;
  targetPath: string;
  status: "pending";
  updatedAt: number;
}

/**
 * Parsed run-arguments result.
 */
export interface ParsedRunArgumentsResult {
  ok: boolean;
  tokens: string[];
  reason: string | null;
}

/**
 * Parses one run-arguments text input into tokens.
 *
 * @param {string} rawText Raw text value.
 * @returns {ParsedRunArgumentsResult} Parse result.
 */
export function parseRunArgumentsText(rawText: string): ParsedRunArgumentsResult {
  const text = String(rawText || "").trim();

  if (text.length === 0) {
    return {
      ok: true,
      tokens: [],
      reason: null,
    };
  }

  const tokens: string[] = [];
  let currentToken = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (escaping) {
      currentToken += character;
      escaping = false;
      continue;
    }

    if (character === "\\") {
      escaping = true;
      continue;
    }

    if (quote !== null) {
      if (character === quote) {
        quote = null;
        continue;
      }

      currentToken += character;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = "";
      }

      continue;
    }

    currentToken += character;
  }

  if (escaping) {
    return {
      ok: false,
      tokens: [],
      reason: "Run args end with an unfinished escape (\\).",
    };
  }

  if (quote !== null) {
    return {
      ok: false,
      tokens: [],
      reason: "Run args contain an unclosed quote.",
    };
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return {
    ok: true,
    tokens,
    reason: null,
  };
}

/**
 * Creates run-arguments status metadata.
 *
 * @param {boolean} runArgsEnabled Whether run arguments are enabled.
 * @param {string} runArgsText Current run arguments text.
 * @returns {{statusText: string, statusClassName: ViewStatusClassName}} Status metadata.
 */
export function createRunArgsStatus(
  runArgsEnabled: boolean,
  runArgsText: string
): { statusText: string; statusClassName: ViewStatusClassName } {
  if (!runArgsEnabled) {
    return {
      statusText: "Arguments Disabled",
      statusClassName: "status-muted",
    };
  }

  const parsedArguments = parseRunArgumentsText(runArgsText);
  if (!parsedArguments.ok) {
    return {
      statusText: parsedArguments.reason ?? "Invalid run args",
      statusClassName: "status-error",
    };
  }

  return {
    statusText: `${parsedArguments.tokens.length} Arguments`,
    statusClassName: "status-ok",
  };
}

/**
 * Creates source-profile status metadata.
 *
 * @param {boolean} sourceProfileEnabled Whether source profile override is enabled.
 * @param {string} sourceProfileText Current source profile text.
 * @returns {{statusText: string, statusClassName: ViewStatusClassName}} Status metadata.
 */
export function createSourceProfileStatus(
  sourceProfileEnabled: boolean,
  sourceProfileText: string
): { statusText: string; statusClassName: ViewStatusClassName } {
  if (!sourceProfileEnabled) {
    return {
      statusText: "Source Profile Unchecked",
      statusClassName: "status-muted",
    };
  }

  if (String(sourceProfileText || "").trim().length === 0) {
    return {
      statusText: "Checked and empty: emits --source-profile=",
      statusClassName: "status-ok",
    };
  }

  return {
    statusText: "Source Profile Enabled",
    statusClassName: "status-ok",
  };
}

/**
 * Creates run-checks status metadata.
 *
 * @param {RunChecksMode} runChecksMode Current run-checks mode.
 * @param {RunChecksRoute} runChecksRoute Current run-checks route.
 * @returns {{statusText: string, statusClassName: ViewStatusClassName}} Status metadata.
 */
export function createRunChecksStatus(
  runChecksMode: RunChecksMode,
  runChecksRoute: RunChecksRoute
): { statusText: string; statusClassName: ViewStatusClassName } {
  if (runChecksMode === "compile-only") {
    return {
      statusText: "Compile Only Enabled",
      statusClassName: "status-ok",
    };
  }

  if (runChecksMode === "check-only") {
    return {
      statusText: `Check Only (${runChecksRoute}) Enabled`,
      statusClassName: "status-ok",
    };
  }

  return {
    statusText: "No Run Check Override",
    statusClassName: "status-muted",
  };
}

/**
 * Creates clean-options status metadata.
 *
 * @param {boolean} cleanStdlibEnabled Whether stdlib cleaning is enabled.
 * @param {boolean} cleanArchivesEnabled Whether archive cleaning is enabled.
 * @returns {{statusText: string, statusClassName: ViewStatusClassName}} Status metadata.
 */
export function createCleanOptionsStatus(
  cleanStdlibEnabled: boolean,
  cleanArchivesEnabled: boolean
): { statusText: string; statusClassName: ViewStatusClassName } {
  const stdlibDefault = cleanStdlibEnabled ? "y" : "n";
  const archiveDefault = cleanArchivesEnabled ? "y" : "n";

  return {
    statusText: `Defaults: ${stdlibDefault}|${archiveDefault} (stdlib|archive)`,
    statusClassName: "status-muted",
  };
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
 * Input overrides for initial run controls settings.
 */
export interface InitialRunControlsSettingsInput {
  runArgsEnabled?: boolean;
  runArgsText?: string;
  sourceProfileEnabled?: boolean;
  sourceProfileText?: string;
  runChecksMode?: RunChecksMode;
  runChecksRoute?: RunChecksRoute;
  cleanStdlibEnabled?: boolean;
  cleanArchivesEnabled?: boolean;
}

/**
 * Input overrides for initial environment controls settings.
 */
export interface InitialEnvironmentControlsSettingsInput {
  persistSessionEnabled?: boolean;
  profilePath?: string;
  profilePlaceholder?: string;
  effectiveProfilePath?: string;
  copyIconsPath?: string;
  routingDockerMapText?: string;
  routingSshMapText?: string;
}

/**
 * Mutable context held across all machine states.
 */
export interface ExtensionHostContext {
  lastCommandId: string | null;
  lastResult: string | null;
  lastFailure: string | null;
  smokeControls: SmokeControlsSettings;
  smokeRunStatusByAlgorithm: SmokeRunStatusByAlgorithm;
  activeSmokeRunAlgorithmPath: string | null;
  activeSmokeRunIdByAlgorithm: Record<string, string>;
  runControls: RunControlsSettings;
  environmentControls: EnvironmentControlsSettings;
  filesystemCacheTtlMs: number;
  filesystemStatCacheByPath: Record<string, FilesystemStatCacheEntry>;
  filesystemDirectoryCacheByPath: Record<string, FilesystemDirectoryCacheEntry>;
  filesystemPendingOperationById: Record<string, FilesystemPendingOperation>;
  filesystemOperationErrorByPath: Record<string, string>;
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
      type: "SMOKE_RUN_STARTED";
      algorithmPath: string;
      languageKeys: string[];
      runId: string;
    }
  | {
      type: "SMOKE_LANGUAGE_RUN_STATUS_SET";
      algorithmPath: string;
      languageKey: string;
      status: SmokeLanguageRunStatus;
    }
  | { type: "SMOKE_RUN_FINISHED"; algorithmPath: string }
  | {
      type: "SMOKE_RUN_STATUS_CLEARED";
      algorithmPath: string;
      runId: string;
    }
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
  | { type: "RUN_ARGS_ENABLED_SET"; enabled: boolean }
  | { type: "RUN_ARGS_TEXT_SET"; text: string }
  | { type: "RUN_SOURCE_PROFILE_ENABLED_SET"; enabled: boolean }
  | { type: "RUN_SOURCE_PROFILE_TEXT_SET"; text: string }
  | { type: "RUN_CHECKS_MODE_SET"; mode: RunChecksMode }
  | { type: "RUN_CHECKS_ROUTE_SET"; route: RunChecksRoute }
  | { type: "RUN_CLEAN_STDLIB_ENABLED_SET"; enabled: boolean }
  | { type: "RUN_CLEAN_ARCHIVES_ENABLED_SET"; enabled: boolean }
  | {
      type: "RUN_ARGS_STATUS_SET";
      statusText: string;
      statusClassName: ViewStatusClassName;
    }
  | {
      type: "RUN_SOURCE_PROFILE_STATUS_SET";
      statusText: string;
      statusClassName: ViewStatusClassName;
    }
  | {
      type: "RUN_CHECKS_STATUS_SET";
      statusText: string;
      statusClassName: ViewStatusClassName;
    }
  | {
      type: "RUN_CLEAN_OPTIONS_STATUS_SET";
      statusText: string;
      statusClassName: ViewStatusClassName;
    }
  | { type: "ENV_PROFILE_PATH_SET"; profilePath: string }
  | { type: "ENV_PERSIST_SESSION_ENABLED_SET"; enabled: boolean }
  | { type: "ENV_PROFILE_PLACEHOLDER_SET"; profilePlaceholder: string }
  | { type: "ENV_EFFECTIVE_PROFILE_PATH_SET"; effectiveProfilePath: string }
  | { type: "ENV_COPY_ICONS_PATH_SET"; copyIconsPath: string }
  | {
      type: "ENV_CHECK_ENV_STATUS_SET";
      statusText: string;
      statusClassName: ViewStatusClassName;
      filteredOutput: string;
      rawOutput: string;
    }
  | {
      type: "ENV_COPY_ICONS_STATUS_SET";
      statusText: string;
      statusClassName: ViewStatusClassName;
    }
  | {
      type: "ENV_VARIABLE_VALUE_SET";
      key: EnvironmentVariableKey;
      value: string;
    }
  | {
      type: "ENV_VARIABLE_STATUS_SET";
      key: EnvironmentVariableKey;
      statusText: string;
      statusClassName: ViewStatusClassName;
    }
  | { type: "ENV_ROUTING_DOCKER_MAP_TEXT_SET"; text: string }
  | { type: "ENV_ROUTING_SSH_MAP_TEXT_SET"; text: string }
  | {
      type: "ENV_ROUTING_STATUS_SET";
      statusText: string;
      statusClassName: ViewStatusClassName;
    }
  | {
      type: "ENV_ROUTING_LANGUAGE_ENTRIES_SET";
      entries: EnvironmentRoutingLanguageSetting[];
    }
  | {
      type: "ENV_ROUTING_LANGUAGE_DRAFT_SET";
      languageKey: string;
      dockerEnabled: boolean;
      dockerValue: string;
      sshEnabled: boolean;
      sshValue: string;
    }
  | {
      type: "ENV_ROUTING_LANGUAGE_STATUS_SET";
      languageKey: string;
      statusText: string;
      statusClassName: ViewStatusClassName;
    }
  | {
      type: "ENV_BATCH_ROUTING_DRAFT_SET";
      dockerEnabled: boolean;
      dockerValue: string;
      sshEnabled: boolean;
      sshValue: string;
    }
  | { type: "FILESYSTEM_CACHE_TTL_SET"; ttlMs: number }
  | { type: "FILESYSTEM_CACHE_CLEARED"; targetPath?: string }
  | {
      type: "FILESYSTEM_STAT_CACHE_ENTRY_SET";
      targetPath: string;
      exists: boolean;
      kind: FilesystemStatKind;
      updatedAt: number;
    }
  | {
      type: "FILESYSTEM_DIRECTORY_CACHE_ENTRY_SET";
      targetPath: string;
      entryCount: number;
      updatedAt: number;
    }
  | {
      type: "FILESYSTEM_PENDING_OPERATION_SET";
      operationId: string;
      operationType: string;
      targetPath: string;
      status: "pending";
      updatedAt: number;
    }
  | { type: "FILESYSTEM_PENDING_OPERATION_CLEARED"; operationId: string }
  | {
      type: "FILESYSTEM_OPERATION_ERROR_SET";
      targetPath: string;
      message: string;
    }
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
  readonly smokeRunStatusByAlgorithm: SmokeRunStatusByAlgorithm;
  readonly activeSmokeRunAlgorithmPath: string | null;
  readonly runControls: RunControlsSettings;
  readonly environmentControls: EnvironmentControlsSettings;
  readonly filesystemCacheTtlMs: number;
  readonly filesystemStatCacheByPath: Record<string, FilesystemStatCacheEntry>;
  readonly filesystemDirectoryCacheByPath: Record<string, FilesystemDirectoryCacheEntry>;
  readonly filesystemPendingOperationById: Record<string, FilesystemPendingOperation>;
  readonly filesystemOperationErrorByPath: Record<string, string>;
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
  const markdownPath = input?.markdownPath ?? "";
  const languages = input?.languages ?? defaultLanguages;
  const reportStatus = createInitialReportStatus(reportEnabled, markdownPath);
  const selectionStatus = createInitialSelectionStatus(languages);

  return {
    reportEnabled,
    markdownPath,
    timeoutSeconds: input?.timeoutSeconds ?? "8m",
    slowTimeoutSeconds: input?.slowTimeoutSeconds ?? "20m",
    languages,
    reportStatusText: reportStatus.statusText,
    reportStatusClassName: reportStatus.statusClassName,
    smokeStatusText: selectionStatus.statusText,
    smokeStatusClassName: selectionStatus.statusClassName,
    statusLabel: input?.statusLabel ?? selectionStatus.statusText,
  };
}

/**
 * Creates the default run controls settings.
 *
 * @param {InitialRunControlsSettingsInput} [input] Optional overrides.
 * @returns {RunControlsSettings} Initial run controls state.
 */
export function createInitialRunControlsSettings(
  input?: InitialRunControlsSettingsInput
): RunControlsSettings {
  const runArgsEnabled = input?.runArgsEnabled ?? false;
  const runArgsText = input?.runArgsText ?? "";
  const sourceProfileEnabled = input?.sourceProfileEnabled ?? false;
  const sourceProfileText = input?.sourceProfileText ?? "";
  const runChecksMode = input?.runChecksMode ?? "none";
  const runChecksRoute = input?.runChecksRoute ?? "native";
  const cleanStdlibEnabled = input?.cleanStdlibEnabled ?? true;
  const cleanArchivesEnabled = input?.cleanArchivesEnabled ?? true;
  const runArgsStatus = createRunArgsStatus(runArgsEnabled, runArgsText);
  const sourceProfileStatus = createSourceProfileStatus(
    sourceProfileEnabled,
    sourceProfileText
  );
  const runChecksStatus = createRunChecksStatus(runChecksMode, runChecksRoute);
  const cleanOptionsStatus = createCleanOptionsStatus(
    cleanStdlibEnabled,
    cleanArchivesEnabled
  );

  return {
    runArgsEnabled,
    runArgsText,
    runArgsStatusText: runArgsStatus.statusText,
    runArgsStatusClassName: runArgsStatus.statusClassName,
    sourceProfileEnabled,
    sourceProfileText,
    sourceProfileStatusText: sourceProfileStatus.statusText,
    sourceProfileStatusClassName: sourceProfileStatus.statusClassName,
    runChecksMode,
    runChecksRoute,
    runChecksStatusText: runChecksStatus.statusText,
    runChecksStatusClassName: runChecksStatus.statusClassName,
    cleanStdlibEnabled,
    cleanArchivesEnabled,
    cleanOptionsStatusText: cleanOptionsStatus.statusText,
    cleanOptionsStatusClassName: cleanOptionsStatus.statusClassName,
  };
}

/**
 * Creates the default environment controls settings.
 *
 * @param {InitialEnvironmentControlsSettingsInput} [input] Optional overrides.
 * @returns {EnvironmentControlsSettings} Initial environment controls state.
 */
export function createInitialEnvironmentControlsSettings(
  input?: InitialEnvironmentControlsSettingsInput
): EnvironmentControlsSettings {
  return {
    persistSessionEnabled: input?.persistSessionEnabled ?? false,
    profilePath: input?.profilePath ?? "",
    profilePlaceholder: input?.profilePlaceholder ?? "",
    effectiveProfilePath: input?.effectiveProfilePath ?? "",
    copyIconsPath: input?.copyIconsPath ?? "",
    checkEnvStatusText: "Run Check Environment to validate init.sh dependencies.",
    checkEnvStatusClassName: "status-muted",
    checkEnvFilteredOutput: "",
    checkEnvRawOutput: "",
    copyIconsStatusText: "Copy icons has not run yet.",
    copyIconsStatusClassName: "status-muted",
    routingDockerMapText: input?.routingDockerMapText ?? "",
    routingSshMapText: input?.routingSshMapText ?? "",
    routingStatusText: "Routing values are ready to edit.",
    routingStatusClassName: "status-muted",
    routingEntries: [],
    batchRoutingDockerEnabled: false,
    batchRoutingDockerValue: "",
    batchRoutingSshEnabled: false,
    batchRoutingSshValue: "",
    batchRoutingConflict: false,
    variables: [
      {
        key: "timeout",
        label: "Timeout",
        value: "",
        statusText: "Not set",
        statusClassName: "status-muted",
      },
      {
        key: "eiffel",
        label: "Eiffel",
        value: "",
        statusText: "Not set",
        statusClassName: "status-muted",
      },
      {
        key: "gcc13Directory",
        label: "GCC13 Directory",
        value: "",
        statusText: "Not set",
        statusClassName: "status-muted",
      },
      {
        key: "gcc13Name",
        label: "GCC13 Name",
        value: "",
        statusText: "Not set",
        statusClassName: "status-muted",
      },
      {
        key: "gxx13Name",
        label: "GXX13 Name",
        value: "",
        statusText: "Not set",
        statusClassName: "status-muted",
      },
    ],
  };
}
