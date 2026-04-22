const { GENERATED_LANGUAGE_DATA } = require("./generated/languages.generated");

/**
 * Supported run-checks mode values.
 *
 * @type {string[]}
 */
const RUN_CHECKS_MODES = ["none", "check-only", "compile-only"];

/**
 * Supported run-checks route values.
 *
 * @type {string[]}
 */
const RUN_CHECKS_ROUTES = ["native", "docker", "ssh"];

/**
 * Supported sidebar view mode values.
 *
 * @type {string[]}
 */
const SIDEBAR_VIEW_MODES = ["files", "language"];

/**
 * Supported sidebar filter mode values.
 *
 * @type {string[]}
 */
const SIDEBAR_FILTER_MODES = ["all", "problems"];

/**
 * Supported smoke-test language keys.
 *
 * @type {string[]}
 */
const SMOKE_LANGUAGE_KEYS = Array.isArray(GENERATED_LANGUAGE_DATA?.languages)
  ? GENERATED_LANGUAGE_DATA.languages
    .filter((language) => language?.smoke?.visible !== false)
    .map((language) => String(language.key || "").trim().toLowerCase())
    .filter(Boolean)
  : [];

/**
 * Smoke default-enabled state keyed by language id.
 *
 * @type {Map<string, boolean>}
 */
const SMOKE_LANGUAGE_DEFAULT_ENABLED_BY_KEY = new Map(
  (Array.isArray(GENERATED_LANGUAGE_DATA?.languages)
    ? GENERATED_LANGUAGE_DATA.languages
    : []
  )
    .map((language) => [
      String(language.key || "").trim().toLowerCase(),
      Boolean(language?.smoke?.defaultEnabled),
    ])
);

/**
 * Returns schema-style platform token for current Node platform.
 *
 * @returns {string} Platform token.
 */
function getCurrentPlatformToken() {
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
 * Returns schema-style architecture token for current Node architecture.
 *
 * @returns {string} Architecture token.
 */
function getCurrentArchToken() {
  if (process.arch === "arm64") {
    return "arm64";
  }

  if (process.arch === "x64") {
    return "x86_64";
  }

  return process.arch;
}

/**
 * Checks whether one language is runnable in the current platform/arch.
 *
 * @param {{constraints?: {canRun?: {platform?: string[], arch?: string[]}[]}}} language Language metadata record.
 * @returns {boolean} True when at least one canRun rule matches current platform and arch.
 */
function isLanguageRunnableOnCurrentHost(language) {
  const canRunRules = Array.isArray(language?.constraints?.canRun)
    ? language.constraints.canRun
    : [];

  if (canRunRules.length === 0) {
    return true;
  }

  const platformToken = getCurrentPlatformToken();
  const archToken = getCurrentArchToken();

  for (const rule of canRunRules) {
    const platforms = Array.isArray(rule?.platform) ? rule.platform : ["*"];
    const archValues = Array.isArray(rule?.arch) ? rule.arch : ["*"];

    const platformMatch = platforms.includes("*") || platforms.includes(platformToken);
    const archMatch = archValues.includes("*") || archValues.includes(archToken);

    if (platformMatch && archMatch) {
      return true;
    }
  }

  return false;
}

/**
 * Smoke capability on current host keyed by language id.
 *
 * @type {Map<string, boolean>}
 */
const SMOKE_LANGUAGE_RUNNABLE_BY_KEY = new Map(
  (Array.isArray(GENERATED_LANGUAGE_DATA?.languages)
    ? GENERATED_LANGUAGE_DATA.languages
    : []
  )
    .map((language) => [
      String(language.key || "").trim().toLowerCase(),
      isLanguageRunnableOnCurrentHost(language),
    ])
);

/**
 * Builds one initial language-enabled map for smoke controls.
 *
 * @returns {Map<string, boolean>} Initial language-enabled map.
 */
function buildInitialSmokeLanguageEnabledByKey() {
  return new Map(
    SMOKE_LANGUAGE_KEYS.map((languageKey) => {
      const defaultEnabled = SMOKE_LANGUAGE_DEFAULT_ENABLED_BY_KEY.get(languageKey) === true;
      const runnable = SMOKE_LANGUAGE_RUNNABLE_BY_KEY.get(languageKey) !== false;
      return [languageKey, defaultEnabled && runnable];
    })
  );
}

/**
 * Builds one initial environment draft state snapshot.
 *
 * @returns {{profilePath: string, copyIconsPath: string, batchDockerEnabled: boolean, batchDockerValue: string, batchSshEnabled: boolean, batchSshValue: string}} Draft snapshot.
 */
function buildInitialEnvironmentDraftValues() {
  return {
    profilePath: "",
    copyIconsPath: "",
    batchDockerEnabled: false,
    batchDockerValue: "",
    batchSshEnabled: false,
    batchSshValue: "",
  };
}

/**
 * Builds one initial parsed environment config snapshot.
 *
 * @returns {{profilePlaceholder: string, effectiveProfilePath: string, defaults: {copyIconsTo: string, timeout: string, eiffel: string, gcc13Directory: string, gcc13Name: string, gxx13Name: string, runOnDocker: string, runOnSsh: string, supportedLanguageKeys: string[]}, values: {timeout: string, eiffel: string, gcc13Directory: string, gcc13Name: string, gxx13Name: string, dockerMapText: string, sshMapText: string}, routeMaps: {docker: Map<string, string>, ssh: Map<string, string>}}} Parsed snapshot.
 */
function buildInitialEnvironmentParsedConfig() {
  return {
    profilePlaceholder: "~/.bash_profile",
    effectiveProfilePath: "",
    defaults: {
      copyIconsTo: "~/.vscode/extensions/icons/",
      timeout: "-k 10s 2m",
      eiffel: "eiffelstudio",
      gcc13Directory: "/usr/bin/",
      gcc13Name: "gcc-13",
      gxx13Name: "g++-13",
      runOnDocker: "",
      runOnSsh: "",
      supportedLanguageKeys: [],
    },
    values: {
      timeout: "-k 10s 2m",
      eiffel: "eiffelstudio",
      gcc13Directory: "/usr/bin/",
      gcc13Name: "gcc-13",
      gxx13Name: "g++-13",
      dockerMapText: "",
      sshMapText: "",
    },
    routeMaps: {
      docker: new Map(),
      ssh: new Map(),
    },
  };
}

/**
 * Builds the initial extension store state.
 *
 * @returns {{runControls: {runArgsEnabled: boolean, runArgsText: string, sourceProfileEnabled: boolean, sourceProfileText: string, runChecksMode: string, runChecksRoute: string, cleanStdlibEnabled: boolean, cleanArchivesEnabled: boolean}, smokeControls: {markdownEnabled: boolean, markdownPath: string, timeout: string, slowTimeout: string, languageEnabledByKey: Map<string, boolean>}}} Initial store state.
 */
function buildInitialState() {
  return {
    runControls: {
      runArgsEnabled: false,
      runArgsText: "",
      sourceProfileEnabled: false,
      sourceProfileText: "",
      runChecksMode: "none",
      runChecksRoute: "native",
      cleanStdlibEnabled: true,
      cleanArchivesEnabled: true,
    },
    smokeControls: {
      markdownEnabled: false,
      markdownPath: "",
      timeout: "8m",
      slowTimeout: "20m",
      languageEnabledByKey: buildInitialSmokeLanguageEnabledByKey(),
    },
    smokeRuntime: {
      smokeStateByAlgorithmPath: new Map(),
      runningSmokeAlgorithmPaths: new Set(),
      smokeRunTokenByAlgorithmPath: new Map(),
      stoppedSmokeRunTokenByAlgorithmPath: new Map(),
      smokeProcessErrorByAlgorithmPath: new Map(),
      smokeProcessExitByAlgorithmPath: new Map(),
    },
    runtimeProcesses: {
      processById: new Map(),
      activeProcessIdByOwnerKey: new Map(),
      runningOwnerKeys: new Set(),
      runTokenByOwnerKey: new Map(),
      stoppedRunTokenByOwnerKey: new Map(),
    },
    sidebarUi: {
      viewMode: "files",
      filterMode: "all",
    },
    filesystem: {
      cacheTtlMs: 2000,
      directoryCacheByPath: new Map(),
      statCacheByPath: new Map(),
      pendingOperationById: new Map(),
      operationErrorByPath: new Map(),
    },
    environment: {
      checkEnvResult: {
        kind: "idle",
        text: "",
        filteredOutput: "",
        rawOutput: "",
      },
      copyIconsResult: {
        kind: "idle",
        text: "",
      },
      batchRoutingResult: {
        kind: "idle",
        text: "",
      },
      draftValues: buildInitialEnvironmentDraftValues(),
      parsedConfig: buildInitialEnvironmentParsedConfig(),
      variableStatusByKey: new Map(),
      routingStatusByLanguageKey: new Map(),
    },
    preflightCache: {
      cachedPreflightState: null,
    },
  };
}

/**
 * Clones one smoke-state map payload into a stable map shape.
 *
 * @param {Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}>} smokeState Smoke-state payload.
 * @returns {Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}>} Cloned smoke-state map.
 */
function cloneSmokeStateMap(smokeState) {
  const nextSmokeState = new Map();

  if (!(smokeState instanceof Map)) {
    return nextSmokeState;
  }

  for (const [languageKey, entry] of smokeState.entries()) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    nextSmokeState.set(String(languageKey || ""), {
      status: String(entry.status || "queued"),
      locked: Boolean(entry.locked),
    });
  }

  return nextSmokeState;
}

/**
 * Builds one action object for the extension state store.
 *
 * @param {string} type Action type identifier.
 * @param {unknown} payload Action payload.
 * @returns {{type: string, payload: unknown}} Store action.
 */
function createAction(type, payload) {
  return {
    type,
    payload,
  };
}

/**
 * Builds one run-controls slice update.
 *
 * @param {{runControls: object}} state Current store state.
 * @param {object} partial Partial run-controls update.
 * @returns {{runControls: object}} Updated store state.
 */
function updateRunControls(state, partial) {
  return {
    ...state,
    runControls: {
      ...state.runControls,
      ...partial,
    },
  };
}

/**
 * Builds one smoke-controls slice update.
 *
 * @param {{smokeControls: object}} state Current store state.
 * @param {object} partial Partial smoke-controls update.
 * @returns {{smokeControls: object}} Updated store state.
 */
function updateSmokeControls(state, partial) {
  return {
    ...state,
    smokeControls: {
      ...state.smokeControls,
      ...partial,
    },
  };
}

/**
 * Builds one smoke-runtime slice update.
 *
 * @param {{smokeRuntime: object}} state Current store state.
 * @param {object} partial Partial smoke-runtime update.
 * @returns {{smokeRuntime: object}} Updated store state.
 */
function updateSmokeRuntime(state, partial) {
  return {
    ...state,
    smokeRuntime: {
      ...state.smokeRuntime,
      ...partial,
    },
  };
}

/**
 * Builds one runtime-processes slice update.
 *
 * @param {{runtimeProcesses: object}} state Current store state.
 * @param {object} partial Partial runtime-processes update.
 * @returns {{runtimeProcesses: object}} Updated store state.
 */
function updateRuntimeProcesses(state, partial) {
  return {
    ...state,
    runtimeProcesses: {
      ...state.runtimeProcesses,
      ...partial,
    },
  };
}

/**
 * Builds one sidebar-ui slice update.
 *
 * @param {{sidebarUi: object}} state Current store state.
 * @param {object} partial Partial sidebar-ui update.
 * @returns {{sidebarUi: object}} Updated store state.
 */
function updateSidebarUi(state, partial) {
  return {
    ...state,
    sidebarUi: {
      ...state.sidebarUi,
      ...partial,
    },
  };
}

/**
 * Builds one preflight-cache slice update.
 *
 * @param {{preflightCache: object}} state Current store state.
 * @param {object} partial Partial preflight-cache update.
 * @returns {{preflightCache: object}} Updated store state.
 */
function updatePreflightCache(state, partial) {
  return {
    ...state,
    preflightCache: {
      ...state.preflightCache,
      ...partial,
    },
  };
}

/**
 * Builds one filesystem slice update.
 *
 * @param {{filesystem: object}} state Current store state.
 * @param {object} partial Partial filesystem update.
 * @returns {{filesystem: object}} Updated store state.
 */
function updateFilesystem(state, partial) {
  return {
    ...state,
    filesystem: {
      ...state.filesystem,
      ...partial,
    },
  };
}

/**
 * Builds one environment slice update.
 *
 * @param {{environment: object}} state Current store state.
 * @param {object} partial Partial environment update.
 * @returns {{environment: object}} Updated store state.
 */
function updateEnvironment(state, partial) {
  return {
    ...state,
    environment: {
      ...state.environment,
      ...partial,
    },
  };
}

/**
 * Returns one normalized run-checks mode.
 *
 * @param {unknown} mode Candidate mode value.
 * @returns {string} Normalized mode.
 */
function normalizeRunChecksMode(mode) {
  const normalizedMode = String(mode || "none").trim().toLowerCase();

  if (!RUN_CHECKS_MODES.includes(normalizedMode)) {
    return "none";
  }

  return normalizedMode;
}

/**
 * Returns one normalized run-checks route.
 *
 * @param {unknown} route Candidate route value.
 * @returns {string} Normalized route.
 */
function normalizeRunChecksRoute(route) {
  const normalizedRoute = String(route || "native").trim().toLowerCase();

  if (!RUN_CHECKS_ROUTES.includes(normalizedRoute)) {
    return "native";
  }

  return normalizedRoute;
}

/**
 * Returns one normalized sidebar view mode.
 *
 * @param {unknown} viewMode Candidate view mode.
 * @returns {"files"|"language"} Normalized view mode.
 */
function normalizeSidebarViewMode(viewMode) {
  const normalizedViewMode = String(viewMode || "files").trim().toLowerCase();

  if (!SIDEBAR_VIEW_MODES.includes(normalizedViewMode)) {
    return "files";
  }

  return normalizedViewMode;
}

/**
 * Returns one normalized sidebar filter mode.
 *
 * @param {unknown} filterMode Candidate filter mode.
 * @returns {"all"|"problems"} Normalized filter mode.
 */
function normalizeSidebarFilterMode(filterMode) {
  const normalizedFilterMode = String(filterMode || "all").trim().toLowerCase();

  if (!SIDEBAR_FILTER_MODES.includes(normalizedFilterMode)) {
    return "all";
  }

  return normalizedFilterMode;
}

/**
 * Handles state transitions for the runControls slice.
 *
 * @param {{runControls: object}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{runControls: object}} Next store state.
 */
function reduceRunControls(state, actionType, payload) {
  if (actionType === "runControls/setRunArgsEnabled") {
    return updateRunControls(state, { runArgsEnabled: Boolean(payload) });
  }

  if (actionType === "runControls/setRunArgsText") {
    return updateRunControls(state, { runArgsText: String(payload || "").trim() });
  }

  if (actionType === "runControls/setSourceProfileEnabled") {
    return updateRunControls(state, { sourceProfileEnabled: Boolean(payload) });
  }

  if (actionType === "runControls/setSourceProfileText") {
    return updateRunControls(state, { sourceProfileText: String(payload || "") });
  }

  if (actionType === "runControls/setRunChecksMode") {
    return updateRunControls(state, { runChecksMode: normalizeRunChecksMode(payload) });
  }

  if (actionType === "runControls/setRunChecksRoute") {
    return updateRunControls(state, { runChecksRoute: normalizeRunChecksRoute(payload) });
  }

  if (actionType === "runControls/setCleanStdlibEnabled") {
    return updateRunControls(state, { cleanStdlibEnabled: Boolean(payload) });
  }

  if (actionType === "runControls/setCleanArchivesEnabled") {
    return updateRunControls(state, { cleanArchivesEnabled: Boolean(payload) });
  }

  return state;
}

/**
 * Handles state transitions for the smokeControls slice.
 *
 * @param {{smokeControls: {languageEnabledByKey: Map<string, boolean>}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{smokeControls: {languageEnabledByKey: Map<string, boolean>}}} Next store state.
 */
function reduceSmokeControls(state, actionType, payload) {
  if (actionType === "smokeControls/setMarkdownEnabled") {
    return updateSmokeControls(state, { markdownEnabled: Boolean(payload) });
  }

  if (actionType === "smokeControls/setMarkdownPath") {
    return updateSmokeControls(state, { markdownPath: String(payload || "") });
  }

  if (actionType === "smokeControls/setTimeout") {
    return updateSmokeControls(state, { timeout: String(payload || "").trim() });
  }

  if (actionType === "smokeControls/setSlowTimeout") {
    return updateSmokeControls(state, { slowTimeout: String(payload || "").trim() });
  }

  if (actionType === "smokeControls/setLanguageEnabled") {
    const safePayload = payload || {};
    const languageKey = String(safePayload.languageKey || "").trim().toLowerCase();

    if (!state.smokeControls.languageEnabledByKey.has(languageKey)) {
      return state;
    }

    const isRunnable = SMOKE_LANGUAGE_RUNNABLE_BY_KEY.get(languageKey) !== false;
    const nextLanguageEnabledByKey = new Map(state.smokeControls.languageEnabledByKey);
    nextLanguageEnabledByKey.set(languageKey, isRunnable ? Boolean(safePayload.enabled) : false);

    return updateSmokeControls(state, { languageEnabledByKey: nextLanguageEnabledByKey });
  }

  if (actionType === "smokeControls/setAllLanguagesEnabled") {
    const nextLanguageEnabledByKey = new Map();

    for (const languageKey of SMOKE_LANGUAGE_KEYS) {
      const isRunnable = SMOKE_LANGUAGE_RUNNABLE_BY_KEY.get(languageKey) !== false;
      nextLanguageEnabledByKey.set(languageKey, isRunnable ? Boolean(payload) : false);
    }

    return updateSmokeControls(state, { languageEnabledByKey: nextLanguageEnabledByKey });
  }

  return state;
}

/**
 * Handles smoke-result state transitions: the per-algorithm language-status maps
 * that drive the tree view display.
 *
 * @param {{smokeRuntime: {smokeStateByAlgorithmPath: Map}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{smokeRuntime: {smokeStateByAlgorithmPath: Map}}} Next store state.
 */
function reduceSmokeRuntimeResults(state, actionType, payload) {
  if (actionType === "smokeRuntime/replaceSmokeStateForAlgorithm") {
    const safePayload = payload || {};
    const algorithmPath = String(safePayload.algorithmPath || "");

    if (!algorithmPath) {
      return state;
    }

    const nextSmokeStateByAlgorithmPath = new Map(state.smokeRuntime.smokeStateByAlgorithmPath);
    nextSmokeStateByAlgorithmPath.set(algorithmPath, cloneSmokeStateMap(safePayload.smokeState));

    return updateSmokeRuntime(state, { smokeStateByAlgorithmPath: nextSmokeStateByAlgorithmPath });
  }

  if (actionType === "smokeRuntime/clearSmokeResultsForAlgorithm") {
    const algorithmPath = String(payload || "");

    if (!algorithmPath || !state.smokeRuntime.smokeStateByAlgorithmPath.has(algorithmPath)) {
      return state;
    }

    const nextSmokeStateByAlgorithmPath = new Map(state.smokeRuntime.smokeStateByAlgorithmPath);
    nextSmokeStateByAlgorithmPath.delete(algorithmPath);

    return updateSmokeRuntime(state, { smokeStateByAlgorithmPath: nextSmokeStateByAlgorithmPath });
  }

  if (actionType === "smokeRuntime/setSmokeLanguageStatus") {
    const safePayload = payload || {};
    const algorithmPath = String(safePayload.algorithmPath || "");
    const languageKey = String(safePayload.languageKey || "");

    if (!algorithmPath || !languageKey) {
      return state;
    }

    const smokeState = state.smokeRuntime.smokeStateByAlgorithmPath.get(algorithmPath);

    if (!(smokeState instanceof Map) || !smokeState.has(languageKey)) {
      return state;
    }

    const previousEntry = smokeState.get(languageKey);

    if (previousEntry?.locked && previousEntry.status === "failed") {
      return state;
    }

    const nextEntry = {
      status: String(safePayload.smokeStatus || "queued"),
      locked: false,
    };

    if (
      previousEntry
      && previousEntry.status === nextEntry.status
      && previousEntry.locked === nextEntry.locked
    ) {
      return state;
    }

    const nextSmokeState = new Map(smokeState);
    nextSmokeState.set(languageKey, nextEntry);

    const nextSmokeStateByAlgorithmPath = new Map(state.smokeRuntime.smokeStateByAlgorithmPath);
    nextSmokeStateByAlgorithmPath.set(algorithmPath, nextSmokeState);

    return updateSmokeRuntime(state, { smokeStateByAlgorithmPath: nextSmokeStateByAlgorithmPath });
  }

  if (actionType === "smokeRuntime/applyRemainingSmokeStatus") {
    const safePayload = payload || {};
    const algorithmPath = String(safePayload.algorithmPath || "");
    const replacementStatus = String(safePayload.replacementStatus || "");

    if (!algorithmPath || !replacementStatus) {
      return state;
    }

    const smokeState = state.smokeRuntime.smokeStateByAlgorithmPath.get(algorithmPath);

    if (!(smokeState instanceof Map)) {
      return state;
    }

    let didChange = false;
    const nextSmokeState = new Map(smokeState);

    for (const [languageKey, entry] of smokeState.entries()) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      if (entry.status !== "queued" && entry.status !== "running") {
        continue;
      }

      nextSmokeState.set(languageKey, {
        status: replacementStatus,
        locked: replacementStatus === "failed",
      });
      didChange = true;
    }

    if (!didChange) {
      return state;
    }

    const nextSmokeStateByAlgorithmPath = new Map(state.smokeRuntime.smokeStateByAlgorithmPath);
    nextSmokeStateByAlgorithmPath.set(algorithmPath, nextSmokeState);

    return updateSmokeRuntime(state, { smokeStateByAlgorithmPath: nextSmokeStateByAlgorithmPath });
  }

  return state;
}

/**
 * Handles smoke process lifecycle state transitions: run tokens, running flags,
 * and terminal process diagnostics owned by the lifecycle module.
 *
 * @param {{smokeRuntime: {runningSmokeAlgorithmPaths: Set, smokeRunTokenByAlgorithmPath: Map, stoppedSmokeRunTokenByAlgorithmPath: Map, smokeProcessErrorByAlgorithmPath: Map, smokeProcessExitByAlgorithmPath: Map}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{smokeRuntime: object}} Next store state.
 */
function reduceSmokeProcessLifecycle(state, actionType, payload) {
  if (actionType === "smokeRuntime/setSmokeRunToken") {
    const safePayload = payload || {};
    const algorithmPath = String(safePayload.algorithmPath || "");

    if (!algorithmPath) {
      return state;
    }

    const nextRunToken = Number(safePayload.runToken);

    if (!Number.isInteger(nextRunToken) || nextRunToken < 0) {
      return state;
    }

    const currentRunToken = state.smokeRuntime.smokeRunTokenByAlgorithmPath.get(algorithmPath);

    if (currentRunToken === nextRunToken) {
      return state;
    }

    const nextSmokeRunTokenByAlgorithmPath = new Map(
      state.smokeRuntime.smokeRunTokenByAlgorithmPath
    );
    nextSmokeRunTokenByAlgorithmPath.set(algorithmPath, nextRunToken);

    return updateSmokeRuntime(state, {
      smokeRunTokenByAlgorithmPath: nextSmokeRunTokenByAlgorithmPath,
    });
  }

  if (actionType === "smokeRuntime/setStoppedSmokeRunToken") {
    const safePayload = payload || {};
    const algorithmPath = String(safePayload.algorithmPath || "");

    if (!algorithmPath) {
      return state;
    }

    const rawRunToken = safePayload.runToken;
    const hasRunToken = Number.isInteger(rawRunToken) && rawRunToken >= 0;
    const currentRunToken = state.smokeRuntime.stoppedSmokeRunTokenByAlgorithmPath.get(
      algorithmPath
    );

    if (hasRunToken && currentRunToken === rawRunToken) {
      return state;
    }

    if (!hasRunToken && typeof currentRunToken === "undefined") {
      return state;
    }

    const nextStoppedSmokeRunTokenByAlgorithmPath = new Map(
      state.smokeRuntime.stoppedSmokeRunTokenByAlgorithmPath
    );

    if (hasRunToken) {
      nextStoppedSmokeRunTokenByAlgorithmPath.set(algorithmPath, rawRunToken);
    } else {
      nextStoppedSmokeRunTokenByAlgorithmPath.delete(algorithmPath);
    }

    return updateSmokeRuntime(state, {
      stoppedSmokeRunTokenByAlgorithmPath: nextStoppedSmokeRunTokenByAlgorithmPath,
    });
  }

  if (actionType === "smokeRuntime/setSmokeProcessRunning") {
    const safePayload = payload || {};
    const algorithmPath = String(safePayload.algorithmPath || "");

    if (!algorithmPath) {
      return state;
    }

    const isRunning = Boolean(safePayload.isRunning);
    const currentlyRunning = state.smokeRuntime.runningSmokeAlgorithmPaths.has(algorithmPath);

    if (isRunning === currentlyRunning) {
      return state;
    }

    const nextRunningSmokeAlgorithmPaths = new Set(state.smokeRuntime.runningSmokeAlgorithmPaths);

    if (isRunning) {
      nextRunningSmokeAlgorithmPaths.add(algorithmPath);
    } else {
      nextRunningSmokeAlgorithmPaths.delete(algorithmPath);
    }

    return updateSmokeRuntime(state, { runningSmokeAlgorithmPaths: nextRunningSmokeAlgorithmPaths });
  }

  if (actionType === "smokeRuntime/setSmokeProcessError") {
    const safePayload = payload || {};
    const algorithmPath = String(safePayload.algorithmPath || "");

    if (!algorithmPath) {
      return state;
    }

    const errorMessage = String(safePayload.errorMessage || "").trim();
    const nextSmokeProcessErrorByAlgorithmPath = new Map(
      state.smokeRuntime.smokeProcessErrorByAlgorithmPath
    );
    const currentErrorMessage = nextSmokeProcessErrorByAlgorithmPath.get(algorithmPath);

    if (errorMessage) {
      if (currentErrorMessage === errorMessage) {
        return state;
      }

      nextSmokeProcessErrorByAlgorithmPath.set(algorithmPath, errorMessage);
    } else {
      if (typeof currentErrorMessage === "undefined") {
        return state;
      }

      nextSmokeProcessErrorByAlgorithmPath.delete(algorithmPath);
    }

    return updateSmokeRuntime(state, {
      smokeProcessErrorByAlgorithmPath: nextSmokeProcessErrorByAlgorithmPath,
    });
  }

  if (actionType === "smokeRuntime/setSmokeProcessExit") {
    const safePayload = payload || {};
    const algorithmPath = String(safePayload.algorithmPath || "");

    if (!algorithmPath) {
      return state;
    }

    const exitCode =
      typeof safePayload.exitCode === "number" ? safePayload.exitCode : null;
    const signal = safePayload.signal ? String(safePayload.signal) : null;
    const currentExit = state.smokeRuntime.smokeProcessExitByAlgorithmPath.get(
      algorithmPath
    );

    if (
      currentExit
      && currentExit.exitCode === exitCode
      && currentExit.signal === signal
    ) {
      return state;
    }

    const nextSmokeProcessExitByAlgorithmPath = new Map(
      state.smokeRuntime.smokeProcessExitByAlgorithmPath
    );
    nextSmokeProcessExitByAlgorithmPath.set(algorithmPath, {
      exitCode,
      signal,
    });

    return updateSmokeRuntime(state, {
      smokeProcessExitByAlgorithmPath: nextSmokeProcessExitByAlgorithmPath,
    });
  }

  return state;
}

/**
 * Handles state transitions for the smokeRuntime slice by delegating to the
 * results and process-lifecycle sub-reducers.
 *
 * @param {{smokeRuntime: object}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{smokeRuntime: object}} Next store state.
 */
function reduceSmokeRuntime(state, actionType, payload) {
  const afterResults = reduceSmokeRuntimeResults(state, actionType, payload);

  if (afterResults !== state) {
    return afterResults;
  }

  return reduceSmokeProcessLifecycle(state, actionType, payload);
}

/**
 * Normalizes one runtime-process record into a stable serializable shape.
 *
 * @param {object|undefined|null} input Candidate runtime-process record.
 * @returns {{processId: string, ownerKey: string, processType: string, commandFamily: string|null, scriptPath: string|null, cwd: string|null, displayCommand: string|null, status: string, startedAt: number, endedAt: number|null, pid: number|null, exitCode: number|null, signal: string|null, errorMessage: string|null, reason: string|null, runToken: number, metadata: object|null}} Normalized process record.
 */
function normalizeRuntimeProcessRecord(input) {
  return {
    processId: String(input?.processId || "").trim(),
    ownerKey: String(input?.ownerKey || "").trim(),
    processType: String(input?.processType || "unknown").trim() || "unknown",
    commandFamily: input?.commandFamily ? String(input.commandFamily) : null,
    scriptPath: input?.scriptPath ? String(input.scriptPath) : null,
    cwd: input?.cwd ? String(input.cwd) : null,
    displayCommand: input?.displayCommand ? String(input.displayCommand) : null,
    status: String(input?.status || "pending").trim() || "pending",
    startedAt: Number.isFinite(input?.startedAt) ? Number(input.startedAt) : 0,
    endedAt: Number.isFinite(input?.endedAt) ? Number(input.endedAt) : null,
    pid: Number.isInteger(input?.pid) ? input.pid : null,
    exitCode: typeof input?.exitCode === "number" ? input.exitCode : null,
    signal: input?.signal ? String(input.signal) : null,
    errorMessage: input?.errorMessage ? String(input.errorMessage) : null,
    reason: input?.reason ? String(input.reason) : null,
    runToken: Number.isInteger(input?.runToken) && input.runToken >= 0 ? input.runToken : 0,
    metadata:
      input?.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? { ...input.metadata }
        : null,
  };
}

/**
 * Handles generic runtime-process lifecycle state transitions.
 *
 * @param {{runtimeProcesses: {processById: Map<string, object>, activeProcessIdByOwnerKey: Map<string, string>, runningOwnerKeys: Set<string>, runTokenByOwnerKey: Map<string, number>, stoppedRunTokenByOwnerKey: Map<string, number>}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{runtimeProcesses: object}} Next store state.
 */
function reduceRuntimeProcesses(state, actionType, payload) {
  if (actionType === "runtimeProcesses/reset") {
    return updateRuntimeProcesses(state, {
      processById: new Map(),
      activeProcessIdByOwnerKey: new Map(),
      runningOwnerKeys: new Set(),
      runTokenByOwnerKey: new Map(),
      stoppedRunTokenByOwnerKey: new Map(),
    });
  }

  if (actionType === "runtimeProcesses/upsertProcess") {
    const record = normalizeRuntimeProcessRecord(payload);

    if (!record.processId || !record.ownerKey) {
      return state;
    }

    const currentRecord = state.runtimeProcesses.processById.get(record.processId);

    if (currentRecord && JSON.stringify(currentRecord) === JSON.stringify(record)) {
      return state;
    }

    const nextProcessById = new Map(state.runtimeProcesses.processById);
    nextProcessById.set(record.processId, record);

    return updateRuntimeProcesses(state, {
      processById: nextProcessById,
    });
  }

  if (actionType === "runtimeProcesses/clearProcess") {
    const processId = String(payload || "").trim();

    if (!processId || !state.runtimeProcesses.processById.has(processId)) {
      return state;
    }

    const nextProcessById = new Map(state.runtimeProcesses.processById);
    nextProcessById.delete(processId);
    const nextActiveProcessIdByOwnerKey = new Map(state.runtimeProcesses.activeProcessIdByOwnerKey);

    for (const [ownerKey, activeProcessId] of nextActiveProcessIdByOwnerKey.entries()) {
      if (activeProcessId === processId) {
        nextActiveProcessIdByOwnerKey.delete(ownerKey);
      }
    }

    return updateRuntimeProcesses(state, {
      processById: nextProcessById,
      activeProcessIdByOwnerKey: nextActiveProcessIdByOwnerKey,
    });
  }

  if (actionType === "runtimeProcesses/setActiveProcessId") {
    const safePayload = payload || {};
    const ownerKey = String(safePayload.ownerKey || "").trim();

    if (!ownerKey) {
      return state;
    }

    const processId = String(safePayload.processId || "").trim();
    const nextActiveProcessIdByOwnerKey = new Map(state.runtimeProcesses.activeProcessIdByOwnerKey);
    const currentProcessId = nextActiveProcessIdByOwnerKey.get(ownerKey);

    if (processId) {
      if (currentProcessId === processId) {
        return state;
      }

      nextActiveProcessIdByOwnerKey.set(ownerKey, processId);
    } else {
      if (typeof currentProcessId === "undefined") {
        return state;
      }

      nextActiveProcessIdByOwnerKey.delete(ownerKey);
    }

    return updateRuntimeProcesses(state, {
      activeProcessIdByOwnerKey: nextActiveProcessIdByOwnerKey,
    });
  }

  if (actionType === "runtimeProcesses/setRunning") {
    const safePayload = payload || {};
    const ownerKey = String(safePayload.ownerKey || "").trim();

    if (!ownerKey) {
      return state;
    }

    const isRunning = Boolean(safePayload.isRunning);
    const nextRunningOwnerKeys = new Set(state.runtimeProcesses.runningOwnerKeys);
    const currentlyRunning = nextRunningOwnerKeys.has(ownerKey);

    if (currentlyRunning === isRunning) {
      return state;
    }

    if (isRunning) {
      nextRunningOwnerKeys.add(ownerKey);
    } else {
      nextRunningOwnerKeys.delete(ownerKey);
    }

    return updateRuntimeProcesses(state, {
      runningOwnerKeys: nextRunningOwnerKeys,
    });
  }

  if (actionType === "runtimeProcesses/setRunToken") {
    const safePayload = payload || {};
    const ownerKey = String(safePayload.ownerKey || "").trim();
    const runToken = Number(safePayload.runToken);

    if (!ownerKey || !Number.isInteger(runToken) || runToken < 0) {
      return state;
    }

    const nextRunTokenByOwnerKey = new Map(state.runtimeProcesses.runTokenByOwnerKey);

    if (nextRunTokenByOwnerKey.get(ownerKey) === runToken) {
      return state;
    }

    nextRunTokenByOwnerKey.set(ownerKey, runToken);
    return updateRuntimeProcesses(state, {
      runTokenByOwnerKey: nextRunTokenByOwnerKey,
    });
  }

  if (actionType === "runtimeProcesses/setStoppedRunToken") {
    const safePayload = payload || {};
    const ownerKey = String(safePayload.ownerKey || "").trim();

    if (!ownerKey) {
      return state;
    }

    const rawRunToken = safePayload.runToken;
    const hasRunToken = Number.isInteger(rawRunToken) && rawRunToken >= 0;
    const nextStoppedRunTokenByOwnerKey = new Map(
      state.runtimeProcesses.stoppedRunTokenByOwnerKey
    );
    const currentRunToken = nextStoppedRunTokenByOwnerKey.get(ownerKey);

    if (hasRunToken) {
      if (currentRunToken === rawRunToken) {
        return state;
      }

      nextStoppedRunTokenByOwnerKey.set(ownerKey, rawRunToken);
    } else {
      if (typeof currentRunToken === "undefined") {
        return state;
      }

      nextStoppedRunTokenByOwnerKey.delete(ownerKey);
    }

    return updateRuntimeProcesses(state, {
      stoppedRunTokenByOwnerKey: nextStoppedRunTokenByOwnerKey,
    });
  }

  return state;
}

/**
 * Handles state transitions for the sidebarUi slice.
 *
 * @param {{sidebarUi: {viewMode: string, filterMode: string}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{sidebarUi: {viewMode: string, filterMode: string}}} Next store state.
 */
function reduceSidebarUi(state, actionType, payload) {
  if (actionType === "sidebarUi/setViewMode") {
    const nextViewMode = normalizeSidebarViewMode(payload);

    if (state.sidebarUi.viewMode === nextViewMode) {
      return state;
    }

    return updateSidebarUi(state, { viewMode: nextViewMode });
  }

  if (actionType === "sidebarUi/setFilterMode") {
    const nextFilterMode = normalizeSidebarFilterMode(payload);

    if (state.sidebarUi.filterMode === nextFilterMode) {
      return state;
    }

    return updateSidebarUi(state, { filterMode: nextFilterMode });
  }

  return state;
}

/**
 * Handles filesystem cache state transitions.
 *
 * @param {{filesystem: {cacheTtlMs: number, directoryCacheByPath: Map<string, object>, statCacheByPath: Map<string, object>}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{filesystem: object}} Next store state.
 */
function reduceFilesystemCache(state, actionType, payload) {
  if (actionType === "filesystem/setCacheTtlMs") {
    const nextCacheTtlMs = Number(payload);

    if (!Number.isFinite(nextCacheTtlMs) || nextCacheTtlMs < 0) {
      return state;
    }

    const normalizedTtl = Math.floor(nextCacheTtlMs);

    if (state.filesystem.cacheTtlMs === normalizedTtl) {
      return state;
    }

    return updateFilesystem(state, { cacheTtlMs: normalizedTtl });
  }

  if (actionType === "filesystem/setDirectoryCacheEntry") {
    const safePayload = payload || {};
    const targetPath = String(safePayload.targetPath || "");

    if (!targetPath) {
      return state;
    }

    const currentEntry = state.filesystem.directoryCacheByPath.get(targetPath);
    const nextEntry = {
      entryCount: Number(safePayload.entryCount) || 0,
      updatedAt: Number(safePayload.updatedAt) || Date.now(),
    };

    if (
      currentEntry
      && currentEntry.entryCount === nextEntry.entryCount
      && currentEntry.updatedAt === nextEntry.updatedAt
    ) {
      return state;
    }

    const nextDirectoryCacheByPath = new Map(state.filesystem.directoryCacheByPath);
    nextDirectoryCacheByPath.set(targetPath, nextEntry);

    return updateFilesystem(state, {
      directoryCacheByPath: nextDirectoryCacheByPath,
    });
  }

  if (actionType === "filesystem/setStatCacheEntry") {
    const safePayload = payload || {};
    const targetPath = String(safePayload.targetPath || "");

    if (!targetPath) {
      return state;
    }

    const nextEntry = {
      exists: Boolean(safePayload.exists),
      kind: String(safePayload.kind || "unknown"),
      updatedAt: Number(safePayload.updatedAt) || Date.now(),
    };
    const currentEntry = state.filesystem.statCacheByPath.get(targetPath);

    if (
      currentEntry
      && currentEntry.exists === nextEntry.exists
      && currentEntry.kind === nextEntry.kind
      && currentEntry.updatedAt === nextEntry.updatedAt
    ) {
      return state;
    }

    const nextStatCacheByPath = new Map(state.filesystem.statCacheByPath);
    nextStatCacheByPath.set(targetPath, nextEntry);

    return updateFilesystem(state, {
      statCacheByPath: nextStatCacheByPath,
    });
  }

  if (actionType === "filesystem/clearCache") {
    const targetPath = String(payload || "");

    if (!targetPath) {
      if (
        state.filesystem.directoryCacheByPath.size === 0
        && state.filesystem.statCacheByPath.size === 0
      ) {
        return state;
      }

      return updateFilesystem(state, {
        directoryCacheByPath: new Map(),
        statCacheByPath: new Map(),
      });
    }

    const nextDirectoryCacheByPath = new Map(state.filesystem.directoryCacheByPath);
    const nextStatCacheByPath = new Map(state.filesystem.statCacheByPath);
    const deletedDirectory = nextDirectoryCacheByPath.delete(targetPath);
    const deletedStat = nextStatCacheByPath.delete(targetPath);

    if (!deletedDirectory && !deletedStat) {
      return state;
    }

    return updateFilesystem(state, {
      directoryCacheByPath: nextDirectoryCacheByPath,
      statCacheByPath: nextStatCacheByPath,
    });
  }

  return state;
}

/**
 * Handles filesystem pending-operation state transitions.
 *
 * @param {{filesystem: {pendingOperationById: Map<string, object>}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{filesystem: object}} Next store state.
 */
function reduceFilesystemOps(state, actionType, payload) {
  if (actionType === "filesystem/setPendingOperation") {
    const safePayload = payload || {};
    const operationId = String(safePayload.operationId || "");

    if (!operationId) {
      return state;
    }

    const nextOperation = {
      type: String(safePayload.type || ""),
      targetPath: String(safePayload.targetPath || ""),
      status: String(safePayload.status || "pending"),
      updatedAt: Number(safePayload.updatedAt) || Date.now(),
    };
    const currentOperation = state.filesystem.pendingOperationById.get(operationId);

    if (
      currentOperation
      && currentOperation.type === nextOperation.type
      && currentOperation.targetPath === nextOperation.targetPath
      && currentOperation.status === nextOperation.status
      && currentOperation.updatedAt === nextOperation.updatedAt
    ) {
      return state;
    }

    const nextPendingOperationById = new Map(state.filesystem.pendingOperationById);
    nextPendingOperationById.set(operationId, nextOperation);

    return updateFilesystem(state, {
      pendingOperationById: nextPendingOperationById,
    });
  }

  if (actionType === "filesystem/clearPendingOperation") {
    const operationId = String(payload || "");

    if (!operationId || !state.filesystem.pendingOperationById.has(operationId)) {
      return state;
    }

    const nextPendingOperationById = new Map(state.filesystem.pendingOperationById);
    nextPendingOperationById.delete(operationId);

    return updateFilesystem(state, {
      pendingOperationById: nextPendingOperationById,
    });
  }

  if (actionType === "filesystem/clearPendingOperations") {
    if (state.filesystem.pendingOperationById.size === 0) {
      return state;
    }

    return updateFilesystem(state, {
      pendingOperationById: new Map(),
    });
  }

  return state;
}

/**
 * Handles filesystem operation error transitions.
 *
 * @param {{filesystem: {operationErrorByPath: Map<string, string>}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{filesystem: object}} Next store state.
 */
function reduceFilesystemStatus(state, actionType, payload) {
  if (actionType === "filesystem/setOperationError") {
    const safePayload = payload || {};
    const targetPath = String(safePayload.targetPath || "");

    if (!targetPath) {
      return state;
    }

    const errorMessage = String(safePayload.errorMessage || "").trim();
    const currentError = state.filesystem.operationErrorByPath.get(targetPath);

    if (!errorMessage && typeof currentError === "undefined") {
      return state;
    }

    if (errorMessage && currentError === errorMessage) {
      return state;
    }

    const nextOperationErrorByPath = new Map(state.filesystem.operationErrorByPath);

    if (errorMessage) {
      nextOperationErrorByPath.set(targetPath, errorMessage);
    } else {
      nextOperationErrorByPath.delete(targetPath);
    }

    return updateFilesystem(state, {
      operationErrorByPath: nextOperationErrorByPath,
    });
  }

  if (actionType === "filesystem/clearOperationErrors") {
    if (state.filesystem.operationErrorByPath.size === 0) {
      return state;
    }

    return updateFilesystem(state, {
      operationErrorByPath: new Map(),
    });
  }

  return state;
}

/**
 * Handles state transitions for the filesystem slice.
 *
 * @param {{filesystem: object}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{filesystem: object}} Next store state.
 */
function reduceFilesystem(state, actionType, payload) {
  const afterCache = reduceFilesystemCache(state, actionType, payload);

  if (afterCache !== state) {
    return afterCache;
  }

  const afterOps = reduceFilesystemOps(state, actionType, payload);

  if (afterOps !== state) {
    return afterOps;
  }

  return reduceFilesystemStatus(state, actionType, payload);
}

/**
 * Handles state transitions for the environment slice.
 *
 * @param {{environment: object}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{environment: object}} Next store state.
 */
function reduceEnvironment(state, actionType, payload) {
  if (actionType === "environment/setDraftProfilePath") {
    return updateEnvironment(state, {
      draftValues: {
        ...state.environment.draftValues,
        profilePath: String(payload || ""),
      },
    });
  }

  if (actionType === "environment/setDraftCopyIconsPath") {
    return updateEnvironment(state, {
      draftValues: {
        ...state.environment.draftValues,
        copyIconsPath: String(payload || ""),
      },
    });
  }

  if (actionType === "environment/setDraftBatchRouting") {
    const nextDraft = payload && typeof payload === "object" ? payload : {};

    return updateEnvironment(state, {
      draftValues: {
        ...state.environment.draftValues,
        batchDockerEnabled:
          typeof nextDraft.dockerEnabled === "boolean"
            ? nextDraft.dockerEnabled
            : state.environment.draftValues.batchDockerEnabled,
        batchDockerValue:
          typeof nextDraft.dockerValue === "string"
            ? nextDraft.dockerValue
            : state.environment.draftValues.batchDockerValue,
        batchSshEnabled:
          typeof nextDraft.sshEnabled === "boolean"
            ? nextDraft.sshEnabled
            : state.environment.draftValues.batchSshEnabled,
        batchSshValue:
          typeof nextDraft.sshValue === "string"
            ? nextDraft.sshValue
            : state.environment.draftValues.batchSshValue,
      },
    });
  }

  if (actionType === "environment/resetDraftValues") {
    return updateEnvironment(state, {
      draftValues: buildInitialEnvironmentDraftValues(),
    });
  }

  if (actionType === "environment/setParsedConfig") {
    const parsedConfig = payload && typeof payload === "object"
      ? payload
      : buildInitialEnvironmentParsedConfig();

    return updateEnvironment(state, {
      parsedConfig: {
        profilePlaceholder: String(parsedConfig.profilePlaceholder || "~/.bash_profile"),
        effectiveProfilePath: String(parsedConfig.effectiveProfilePath || ""),
        defaults: {
          copyIconsTo: String(parsedConfig.defaults?.copyIconsTo || "~/.vscode/extensions/icons/"),
          timeout: String(parsedConfig.defaults?.timeout || "-k 10s 2m"),
          eiffel: String(parsedConfig.defaults?.eiffel || "eiffelstudio"),
          gcc13Directory: String(parsedConfig.defaults?.gcc13Directory || "/usr/bin/"),
          gcc13Name: String(parsedConfig.defaults?.gcc13Name || "gcc-13"),
          gxx13Name: String(parsedConfig.defaults?.gxx13Name || "g++-13"),
          runOnDocker: String(parsedConfig.defaults?.runOnDocker || ""),
          runOnSsh: String(parsedConfig.defaults?.runOnSsh || ""),
          supportedLanguageKeys: Array.isArray(parsedConfig.defaults?.supportedLanguageKeys)
            ? parsedConfig.defaults.supportedLanguageKeys
              .map((languageKey) => String(languageKey || "").trim().toLowerCase())
              .filter(Boolean)
            : [],
        },
        values: {
          timeout: String(parsedConfig.values?.timeout || "-k 10s 2m"),
          eiffel: String(parsedConfig.values?.eiffel || "eiffelstudio"),
          gcc13Directory: String(parsedConfig.values?.gcc13Directory || "/usr/bin/"),
          gcc13Name: String(parsedConfig.values?.gcc13Name || "gcc-13"),
          gxx13Name: String(parsedConfig.values?.gxx13Name || "g++-13"),
          dockerMapText: String(parsedConfig.values?.dockerMapText || ""),
          sshMapText: String(parsedConfig.values?.sshMapText || ""),
        },
        routeMaps: {
          docker: parsedConfig.routeMaps?.docker instanceof Map
            ? new Map(parsedConfig.routeMaps.docker)
            : new Map(),
          ssh: parsedConfig.routeMaps?.ssh instanceof Map
            ? new Map(parsedConfig.routeMaps.ssh)
            : new Map(),
        },
      },
    });
  }

  if (actionType === "environment/setCheckEnvResult") {
    const result = payload && typeof payload === "object"
      ? payload
      : {
        kind: "idle",
        text: "",
        filteredOutput: "",
        rawOutput: "",
      };

    return updateEnvironment(state, {
      checkEnvResult: {
        kind: String(result.kind || "idle"),
        text: String(result.text || ""),
        filteredOutput: String(result.filteredOutput || ""),
        rawOutput: String(result.rawOutput || ""),
      },
    });
  }

  if (actionType === "environment/setCopyIconsResult") {
    const result = payload && typeof payload === "object"
      ? payload
      : {
        kind: "idle",
        text: "",
      };

    return updateEnvironment(state, {
      copyIconsResult: {
        kind: String(result.kind || "idle"),
        text: String(result.text || ""),
      },
    });
  }

  if (actionType === "environment/setBatchRoutingResult") {
    const result = payload && typeof payload === "object"
      ? payload
      : {
        kind: "idle",
        text: "",
      };

    return updateEnvironment(state, {
      batchRoutingResult: {
        kind: String(result.kind || "idle"),
        text: String(result.text || ""),
      },
    });
  }

  if (actionType === "environment/setVariableStatus") {
    const variableKey = String(payload?.variableKey || "");

    if (!variableKey) {
      return state;
    }

    const statusEntry = payload?.statusEntry && typeof payload.statusEntry === "object"
      ? payload.statusEntry
      : null;
    const nextVariableStatusByKey = new Map(state.environment.variableStatusByKey);

    if (statusEntry) {
      nextVariableStatusByKey.set(variableKey, statusEntry);
    } else {
      nextVariableStatusByKey.delete(variableKey);
    }

    return updateEnvironment(state, {
      variableStatusByKey: nextVariableStatusByKey,
    });
  }

  if (actionType === "environment/setRoutingStatus") {
    const languageKey = String(payload?.languageKey || "");

    if (!languageKey) {
      return state;
    }

    const statusEntry = payload?.statusEntry && typeof payload.statusEntry === "object"
      ? payload.statusEntry
      : null;
    const nextRoutingStatusByLanguageKey = new Map(state.environment.routingStatusByLanguageKey);

    if (statusEntry) {
      nextRoutingStatusByLanguageKey.set(languageKey, statusEntry);
    } else {
      nextRoutingStatusByLanguageKey.delete(languageKey);
    }

    return updateEnvironment(state, {
      routingStatusByLanguageKey: nextRoutingStatusByLanguageKey,
    });
  }

  if (actionType === "environment/resetStatus") {
    return updateEnvironment(state, {
      checkEnvResult: {
        kind: "idle",
        text: "",
        filteredOutput: "",
        rawOutput: "",
      },
      copyIconsResult: {
        kind: "idle",
        text: "",
      },
      batchRoutingResult: {
        kind: "idle",
        text: "",
      },
      variableStatusByKey: new Map(),
      routingStatusByLanguageKey: new Map(),
    });
  }

  return state;
}

/**
 * Handles state transitions for the preflightCache slice.
 *
 * @param {{preflightCache: {cachedPreflightState: unknown}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{preflightCache: {cachedPreflightState: unknown}}} Next store state.
 */
function reducePreflightCache(state, actionType, payload) {
  if (actionType === "preflightCache/setCachedPreflightState") {
    if (state.preflightCache.cachedPreflightState === payload) {
      return state;
    }

    return updatePreflightCache(state, { cachedPreflightState: payload || null });
  }

  return state;
}

/**
 * Runs one state transition for the extension store by routing to the
 * appropriate slice reducer based on the action type prefix.
 *
 * @param {{runControls: object, smokeControls: {languageEnabledByKey: Map<string, boolean>}}} state Current store state.
 * @param {{type?: string, payload?: unknown}} action Action to apply.
 * @returns {{runControls: object, smokeControls: {languageEnabledByKey: Map<string, boolean>}}} Next store state.
 */
function reducer(state, action) {
  const actionType = String(action?.type || "");
  const payload = action?.payload;

  if (actionType.startsWith("runControls/")) {
    return reduceRunControls(state, actionType, payload);
  }

  if (actionType.startsWith("smokeControls/")) {
    return reduceSmokeControls(state, actionType, payload);
  }

  if (actionType.startsWith("smokeRuntime/")) {
    return reduceSmokeRuntime(state, actionType, payload);
  }

  if (actionType.startsWith("runtimeProcesses/")) {
    return reduceRuntimeProcesses(state, actionType, payload);
  }

  if (actionType.startsWith("sidebarUi/")) {
    return reduceSidebarUi(state, actionType, payload);
  }

  if (actionType.startsWith("filesystem/")) {
    return reduceFilesystem(state, actionType, payload);
  }

  if (actionType.startsWith("environment/")) {
    return reduceEnvironment(state, actionType, payload);
  }

  if (actionType.startsWith("preflightCache/")) {
    return reducePreflightCache(state, actionType, payload);
  }

  return state;
}

/**
 * Creates one minimal reducer-based store.
 *
 * @param {(state: object, action: object) => object} stateReducer Store reducer.
 * @param {object} initialState Initial store state.
 * @returns {{getState: () => object, dispatch: (action: object) => object, subscribe: (listener: () => void) => () => void}} Store API.
 */
function createStore(stateReducer, initialState) {
  let currentState = initialState;
  const listeners = new Set();

  return {
    getState() {
      return currentState;
    },
    dispatch(action) {
      const nextState = stateReducer(currentState, action || {});

      if (nextState === currentState) {
        return currentState;
      }

      currentState = nextState;

      for (const listener of listeners) {
        listener();
      }

      return currentState;
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Singleton extension state store.
 *
 * @type {{getState: () => object, dispatch: (action: object) => object, subscribe: (listener: () => void) => () => void}}
 */
const extensionStateStore = createStore(reducer, buildInitialState());

/**
 * Returns the run-args snapshot used by run controls and commands.
 *
 * @returns {{enabled: boolean, text: string}} Run-args snapshot.
 */
function selectSidebarRunArgsState() {
  const runControls = extensionStateStore.getState().runControls;

  return {
    enabled: runControls.runArgsEnabled,
    text: runControls.runArgsText,
  };
}

/**
 * Returns the source-profile snapshot used by run controls and commands.
 *
 * @returns {{enabled: boolean, text: string}} Source-profile snapshot.
 */
function selectSidebarSourceProfileState() {
  const runControls = extensionStateStore.getState().runControls;

  return {
    enabled: runControls.sourceProfileEnabled,
    text: runControls.sourceProfileText,
  };
}

/**
 * Returns the run-checks snapshot used by run controls and commands.
 *
 * @returns {{mode: "none"|"check-only"|"compile-only", route: "native"|"docker"|"ssh"}} Run-checks snapshot.
 */
function selectSidebarRunChecksState() {
  const runControls = extensionStateStore.getState().runControls;

  return {
    mode: normalizeRunChecksMode(runControls.runChecksMode),
    route: normalizeRunChecksRoute(runControls.runChecksRoute),
  };
}

/**
 * Returns the clean-options snapshot used by run controls and commands.
 *
 * @returns {{cleanStdlib: boolean, cleanArchives: boolean}} Clean-options snapshot.
 */
function selectSidebarCleanOptionsState() {
  const runControls = extensionStateStore.getState().runControls;

  return {
    cleanStdlib: runControls.cleanStdlibEnabled,
    cleanArchives: runControls.cleanArchivesEnabled,
  };
}

/**
 * Returns the smoke-controls snapshot used by smoke controls and commands.
 *
 * @returns {{markdownEnabled: boolean, markdownPath: string, timeout: string, slowTimeout: string, languageEnabledByKey: Map<string, boolean>}} Smoke-controls snapshot.
 */
function selectSidebarSmokeControlsState() {
  const smokeControls = extensionStateStore.getState().smokeControls;

  return {
    markdownEnabled: smokeControls.markdownEnabled,
    markdownPath: smokeControls.markdownPath,
    timeout: smokeControls.timeout,
    slowTimeout: smokeControls.slowTimeout,
    languageEnabledByKey: new Map(smokeControls.languageEnabledByKey),
  };
}

/**
 * Returns one smoke-state map for one algorithm.
 *
 * @param {string|null|undefined} algorithmPath Algorithm directory path.
 * @returns {Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean>}|null} Smoke-state map snapshot.
 */
function selectSmokeStateForAlgorithm(algorithmPath) {
  const normalizedAlgorithmPath = String(algorithmPath || "");

  if (!normalizedAlgorithmPath) {
    return null;
  }

  const smokeState = extensionStateStore
    .getState()
    .smokeRuntime
    .smokeStateByAlgorithmPath
    .get(normalizedAlgorithmPath);

  if (!(smokeState instanceof Map)) {
    return null;
  }

  return cloneSmokeStateMap(smokeState);
}

/**
 * Returns one smoke-state entry for one algorithm/language pair.
 *
 * @param {string|null|undefined} algorithmPath Algorithm directory path.
 * @param {string|null|undefined} languageKey Canonical language key.
 * @returns {{status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}|null} Smoke-state entry.
 */
function selectSmokeLanguageState(algorithmPath, languageKey) {
  const smokeState = selectSmokeStateForAlgorithm(algorithmPath);
  const normalizedLanguageKey = String(languageKey || "");

  if (!(smokeState instanceof Map) || !normalizedLanguageKey) {
    return null;
  }

  if (!smokeState.has(normalizedLanguageKey)) {
    return null;
  }

  const entry = smokeState.get(normalizedLanguageKey);

  return {
    status: String(entry?.status || "queued"),
    locked: Boolean(entry?.locked),
  };
}

/**
 * Returns whether smoke process is currently running for one algorithm.
 *
 * @param {string|null|undefined} algorithmPath Algorithm directory path.
 * @returns {boolean} True when running.
 */
function selectIsSmokeProcessRunningForAlgorithm(algorithmPath) {
  const normalizedAlgorithmPath = String(algorithmPath || "");

  if (!normalizedAlgorithmPath) {
    return false;
  }

  return extensionStateStore
    .getState()
    .smokeRuntime
    .runningSmokeAlgorithmPaths
    .has(normalizedAlgorithmPath);
}

/**
 * Returns whether smoke-state entries exist for one algorithm.
 *
 * @param {string|null|undefined} algorithmPath Algorithm directory path.
 * @returns {boolean} True when smoke-state entries exist.
 */
function selectHasSmokeResultsForAlgorithm(algorithmPath) {
  const smokeState = selectSmokeStateForAlgorithm(algorithmPath);

  return Boolean(smokeState && smokeState.size > 0);
}

/**
 * Returns the latest smoke run token for one algorithm.
 *
 * @param {string|null|undefined} algorithmPath Algorithm directory path.
 * @returns {number} Current smoke run token, or 0 when missing.
 */
function selectSmokeRunTokenForAlgorithm(algorithmPath) {
  const normalizedAlgorithmPath = String(algorithmPath || "");

  if (!normalizedAlgorithmPath) {
    return 0;
  }

  const runToken = extensionStateStore
    .getState()
    .smokeRuntime
    .smokeRunTokenByAlgorithmPath
    .get(normalizedAlgorithmPath);

  return Number.isInteger(runToken) && runToken >= 0 ? runToken : 0;
}

/**
 * Returns the stopped smoke run token for one algorithm.
 *
 * @param {string|null|undefined} algorithmPath Algorithm directory path.
 * @returns {number|null} Stopped smoke run token when present.
 */
function selectStoppedSmokeRunTokenForAlgorithm(algorithmPath) {
  const normalizedAlgorithmPath = String(algorithmPath || "");

  if (!normalizedAlgorithmPath) {
    return null;
  }

  const stoppedRunToken = extensionStateStore
    .getState()
    .smokeRuntime
    .stoppedSmokeRunTokenByAlgorithmPath
    .get(normalizedAlgorithmPath);

  return Number.isInteger(stoppedRunToken) && stoppedRunToken >= 0
    ? stoppedRunToken
    : null;
}

/**
 * Returns one runtime process record by id.
 *
 * @param {string|null|undefined} processId Runtime process identifier.
 * @returns {object|null} Runtime process record.
 */
function selectRuntimeProcessById(processId) {
  const normalizedProcessId = String(processId || "");

  if (!normalizedProcessId) {
    return null;
  }

  return extensionStateStore.getState().runtimeProcesses.processById.get(normalizedProcessId) || null;
}

/**
 * Returns the active runtime process id for one owner key.
 *
 * @param {string|null|undefined} ownerKey Runtime process owner key.
 * @returns {string|null} Active process id.
 */
function selectActiveRuntimeProcessIdForOwner(ownerKey) {
  const normalizedOwnerKey = String(ownerKey || "");

  if (!normalizedOwnerKey) {
    return null;
  }

  return extensionStateStore
    .getState()
    .runtimeProcesses
    .activeProcessIdByOwnerKey
    .get(normalizedOwnerKey) || null;
}

/**
 * Returns the active runtime process record for one owner key.
 *
 * @param {string|null|undefined} ownerKey Runtime process owner key.
 * @returns {object|null} Active runtime process record.
 */
function selectActiveRuntimeProcessForOwner(ownerKey) {
  const processId = selectActiveRuntimeProcessIdForOwner(ownerKey);
  return processId ? selectRuntimeProcessById(processId) : null;
}

/**
 * Returns whether one runtime process owner currently has a running process.
 *
 * @param {string|null|undefined} ownerKey Runtime process owner key.
 * @returns {boolean} True when running.
 */
function selectIsRuntimeProcessRunningForOwner(ownerKey) {
  const normalizedOwnerKey = String(ownerKey || "");

  if (!normalizedOwnerKey) {
    return false;
  }

  return extensionStateStore.getState().runtimeProcesses.runningOwnerKeys.has(normalizedOwnerKey);
}

/**
 * Returns the current runtime process run token for one owner key.
 *
 * @param {string|null|undefined} ownerKey Runtime process owner key.
 * @returns {number} Current run token.
 */
function selectRuntimeProcessRunTokenForOwner(ownerKey) {
  const normalizedOwnerKey = String(ownerKey || "");

  if (!normalizedOwnerKey) {
    return 0;
  }

  const runToken = extensionStateStore
    .getState()
    .runtimeProcesses
    .runTokenByOwnerKey
    .get(normalizedOwnerKey);

  return Number.isInteger(runToken) && runToken >= 0 ? runToken : 0;
}

/**
 * Returns the stopped runtime process run token for one owner key.
 *
 * @param {string|null|undefined} ownerKey Runtime process owner key.
 * @returns {number|null} Stopped run token when present.
 */
function selectStoppedRuntimeProcessRunTokenForOwner(ownerKey) {
  const normalizedOwnerKey = String(ownerKey || "");

  if (!normalizedOwnerKey) {
    return null;
  }

  const runToken = extensionStateStore
    .getState()
    .runtimeProcesses
    .stoppedRunTokenByOwnerKey
    .get(normalizedOwnerKey);

  return Number.isInteger(runToken) && runToken >= 0 ? runToken : null;
}

/**
 * Returns the current sidebar view mode.
 *
 * @returns {"files"|"language"} Sidebar view mode.
 */
function selectSidebarViewMode() {
  return normalizeSidebarViewMode(extensionStateStore.getState().sidebarUi.viewMode);
}

/**
 * Returns the current sidebar filter mode.
 *
 * @returns {"all"|"problems"} Sidebar filter mode.
 */
function selectSidebarFilterMode() {
  return normalizeSidebarFilterMode(extensionStateStore.getState().sidebarUi.filterMode);
}

/**
 * Returns the cached preflight state snapshot.
 *
 * @returns {object|null} Cached preflight state.
 */
function selectCachedPreflightState() {
  return extensionStateStore.getState().preflightCache.cachedPreflightState || null;
}

/**
 * Returns configured filesystem cache TTL.
 *
 * @returns {number} Filesystem cache TTL in milliseconds.
 */
function selectFilesystemCacheTtlMs() {
  return Number(extensionStateStore.getState().filesystem.cacheTtlMs) || 0;
}

/**
 * Returns one cached directory metadata entry by path.
 *
 * @param {string|null|undefined} targetPath Cached path key.
 * @returns {{entryCount: number, updatedAt: number}|null} Directory cache entry.
 */
function selectFilesystemDirectoryCacheEntry(targetPath) {
  const normalizedPath = String(targetPath || "");

  if (!normalizedPath) {
    return null;
  }

  const entry = extensionStateStore
    .getState()
    .filesystem
    .directoryCacheByPath
    .get(normalizedPath);

  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    entryCount: Number(entry.entryCount) || 0,
    updatedAt: Number(entry.updatedAt) || 0,
  };
}

/**
 * Returns one cached stat metadata entry by path.
 *
 * @param {string|null|undefined} targetPath Cached path key.
 * @returns {{exists: boolean, kind: string, updatedAt: number}|null} Stat cache entry.
 */
function selectFilesystemStatCacheEntry(targetPath) {
  const normalizedPath = String(targetPath || "");

  if (!normalizedPath) {
    return null;
  }

  const entry = extensionStateStore
    .getState()
    .filesystem
    .statCacheByPath
    .get(normalizedPath);

  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    exists: Boolean(entry.exists),
    kind: String(entry.kind || "unknown"),
    updatedAt: Number(entry.updatedAt) || 0,
  };
}

/**
 * Returns one pending filesystem operation by id.
 *
 * @param {string|null|undefined} operationId Pending operation identifier.
 * @returns {{type: string, targetPath: string, status: string, updatedAt: number}|null} Pending operation snapshot.
 */
function selectFilesystemPendingOperation(operationId) {
  const normalizedOperationId = String(operationId || "");

  if (!normalizedOperationId) {
    return null;
  }

  const operation = extensionStateStore
    .getState()
    .filesystem
    .pendingOperationById
    .get(normalizedOperationId);

  if (!operation || typeof operation !== "object") {
    return null;
  }

  return {
    type: String(operation.type || ""),
    targetPath: String(operation.targetPath || ""),
    status: String(operation.status || "pending"),
    updatedAt: Number(operation.updatedAt) || 0,
  };
}

/**
 * Returns one filesystem operation error by path.
 *
 * @param {string|null|undefined} targetPath Filesystem path key.
 * @returns {string|null} Operation error text.
 */
function selectFilesystemOperationError(targetPath) {
  const normalizedPath = String(targetPath || "");

  if (!normalizedPath) {
    return null;
  }

  const errorText = extensionStateStore
    .getState()
    .filesystem
    .operationErrorByPath
    .get(normalizedPath);

  return typeof errorText === "string" && errorText.trim()
    ? errorText
    : null;
}

/**
 * Returns the latest check-env command result state.
 *
 * @returns {{kind: string, text: string, filteredOutput: string, rawOutput: string}} Check-env result state.
 */
function selectEnvironmentCheckEnvResult() {
  const result = extensionStateStore.getState().environment.checkEnvResult;

  return {
    kind: String(result?.kind || "idle"),
    text: String(result?.text || ""),
    filteredOutput: String(result?.filteredOutput || ""),
    rawOutput: String(result?.rawOutput || ""),
  };
}

/**
 * Returns the latest copy-icons command result state.
 *
 * @returns {{kind: string, text: string}} Copy-icons result state.
 */
function selectEnvironmentCopyIconsResult() {
  const result = extensionStateStore.getState().environment.copyIconsResult;

  return {
    kind: String(result?.kind || "idle"),
    text: String(result?.text || ""),
  };
}

/**
 * Returns the latest batch-routing command result state.
 *
 * @returns {{kind: string, text: string}} Batch-routing result state.
 */
function selectEnvironmentBatchRoutingResult() {
  const result = extensionStateStore.getState().environment.batchRoutingResult;

  return {
    kind: String(result?.kind || "idle"),
    text: String(result?.text || ""),
  };
}

/**
 * Returns current environment draft values.
 *
 * @returns {{profilePath: string, copyIconsPath: string, batchDockerEnabled: boolean, batchDockerValue: string, batchSshEnabled: boolean, batchSshValue: string}} Draft values.
 */
function selectEnvironmentDraftValues() {
  const draftValues = extensionStateStore.getState().environment.draftValues;

  return {
    profilePath: String(draftValues?.profilePath || ""),
    copyIconsPath: String(draftValues?.copyIconsPath || ""),
    batchDockerEnabled: Boolean(draftValues?.batchDockerEnabled),
    batchDockerValue: String(draftValues?.batchDockerValue || ""),
    batchSshEnabled: Boolean(draftValues?.batchSshEnabled),
    batchSshValue: String(draftValues?.batchSshValue || ""),
  };
}

/**
 * Returns current parsed environment config values.
 *
 * @returns {{profilePlaceholder: string, effectiveProfilePath: string, defaults: object, values: object, routeMaps: {docker: Map<string, string>, ssh: Map<string, string>}}} Parsed environment config.
 */
function selectEnvironmentParsedConfig() {
  const parsedConfig = extensionStateStore.getState().environment.parsedConfig;

  return {
    profilePlaceholder: String(parsedConfig?.profilePlaceholder || "~/.bash_profile"),
    effectiveProfilePath: String(parsedConfig?.effectiveProfilePath || ""),
    defaults: {
      copyIconsTo: String(parsedConfig?.defaults?.copyIconsTo || "~/.vscode/extensions/icons/"),
      timeout: String(parsedConfig?.defaults?.timeout || "-k 10s 2m"),
      eiffel: String(parsedConfig?.defaults?.eiffel || "eiffelstudio"),
      gcc13Directory: String(parsedConfig?.defaults?.gcc13Directory || "/usr/bin/"),
      gcc13Name: String(parsedConfig?.defaults?.gcc13Name || "gcc-13"),
      gxx13Name: String(parsedConfig?.defaults?.gxx13Name || "g++-13"),
      runOnDocker: String(parsedConfig?.defaults?.runOnDocker || ""),
      runOnSsh: String(parsedConfig?.defaults?.runOnSsh || ""),
      supportedLanguageKeys: Array.isArray(parsedConfig?.defaults?.supportedLanguageKeys)
        ? parsedConfig.defaults.supportedLanguageKeys.map((languageKey) =>
          String(languageKey || "").trim().toLowerCase()
        ).filter(Boolean)
        : [],
    },
    values: {
      timeout: String(parsedConfig?.values?.timeout || "-k 10s 2m"),
      eiffel: String(parsedConfig?.values?.eiffel || "eiffelstudio"),
      gcc13Directory: String(parsedConfig?.values?.gcc13Directory || "/usr/bin/"),
      gcc13Name: String(parsedConfig?.values?.gcc13Name || "gcc-13"),
      gxx13Name: String(parsedConfig?.values?.gxx13Name || "g++-13"),
      dockerMapText: String(parsedConfig?.values?.dockerMapText || ""),
      sshMapText: String(parsedConfig?.values?.sshMapText || ""),
    },
    routeMaps: {
      docker: parsedConfig?.routeMaps?.docker instanceof Map
        ? new Map(parsedConfig.routeMaps.docker)
        : new Map(),
      ssh: parsedConfig?.routeMaps?.ssh instanceof Map
        ? new Map(parsedConfig.routeMaps.ssh)
        : new Map(),
    },
  };
}

/**
 * Returns one variable status entry by key.
 *
 * @param {string|null|undefined} variableKey Variable identifier.
 * @returns {object|null} Variable status entry.
 */
function selectEnvironmentVariableStatus(variableKey) {
  const normalizedKey = String(variableKey || "");

  if (!normalizedKey) {
    return null;
  }

  return extensionStateStore
    .getState()
    .environment
    .variableStatusByKey
    .get(normalizedKey) || null;
}

/**
 * Returns one language routing status entry by language key.
 *
 * @param {string|null|undefined} languageKey Language identifier.
 * @returns {object|null} Routing status entry.
 */
function selectEnvironmentRoutingStatus(languageKey) {
  const normalizedKey = String(languageKey || "");

  if (!normalizedKey) {
    return null;
  }

  return extensionStateStore
    .getState()
    .environment
    .routingStatusByLanguageKey
    .get(normalizedKey) || null;
}

/**
 * Returns all variable status entries.
 *
 * @returns {Map<string, object>} Variable status snapshot.
 */
function selectEnvironmentVariableStatusMap() {
  return new Map(extensionStateStore.getState().environment.variableStatusByKey);
}

/**
 * Returns all routing status entries.
 *
 * @returns {Map<string, object>} Routing status snapshot.
 */
function selectEnvironmentRoutingStatusMap() {
  return new Map(extensionStateStore.getState().environment.routingStatusByLanguageKey);
}

/**
 * Action creators for state transitions.
 */
const actionCreators = {
  /**
   * Builds one set-run-args-enabled action.
   *
   * @param {boolean} enabled Whether run args should be enabled.
   * @returns {{type: string, payload: boolean}} Action payload.
   */
  setSidebarRunArgsEnabled(enabled) {
    return createAction("runControls/setRunArgsEnabled", enabled);
  },
  /**
   * Builds one set-run-args-text action.
   *
   * @param {string} text Raw run args text.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setSidebarRunArgsText(text) {
    return createAction("runControls/setRunArgsText", text);
  },
  /**
   * Builds one set-source-profile-enabled action.
   *
   * @param {boolean} enabled Whether source profile should be enabled.
   * @returns {{type: string, payload: boolean}} Action payload.
   */
  setSidebarSourceProfileEnabled(enabled) {
    return createAction("runControls/setSourceProfileEnabled", enabled);
  },
  /**
   * Builds one set-source-profile-text action.
   *
   * @param {string} text Raw source-profile text.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setSidebarSourceProfileText(text) {
    return createAction("runControls/setSourceProfileText", text);
  },
  /**
   * Builds one set-run-checks-mode action.
   *
   * @param {string} mode Run-checks mode.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setSidebarRunChecksMode(mode) {
    return createAction("runControls/setRunChecksMode", mode);
  },
  /**
   * Builds one set-run-checks-route action.
   *
   * @param {string} route Run-checks route.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setSidebarRunChecksRoute(route) {
    return createAction("runControls/setRunChecksRoute", route);
  },
  /**
   * Builds one set-clean-stdlib-enabled action.
   *
   * @param {boolean} enabled Whether stdlib clean default should be enabled.
   * @returns {{type: string, payload: boolean}} Action payload.
   */
  setSidebarCleanStdlibEnabled(enabled) {
    return createAction("runControls/setCleanStdlibEnabled", enabled);
  },
  /**
   * Builds one set-clean-archives-enabled action.
   *
   * @param {boolean} enabled Whether archive clean default should be enabled.
   * @returns {{type: string, payload: boolean}} Action payload.
   */
  setSidebarCleanArchivesEnabled(enabled) {
    return createAction("runControls/setCleanArchivesEnabled", enabled);
  },
  /**
   * Builds one set-smoke-markdown-enabled action.
   *
   * @param {boolean} enabled Whether smoke markdown output should be enabled.
   * @returns {{type: string, payload: boolean}} Action payload.
   */
  setSidebarSmokeMarkdownEnabled(enabled) {
    return createAction("smokeControls/setMarkdownEnabled", enabled);
  },
  /**
   * Builds one set-smoke-markdown-path action.
   *
   * @param {string} pathValue Smoke markdown path.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setSidebarSmokeMarkdownPath(pathValue) {
    return createAction("smokeControls/setMarkdownPath", pathValue);
  },
  /**
   * Builds one set-smoke-timeout action.
   *
   * @param {string} timeoutValue Smoke timeout value.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setSidebarSmokeTimeout(timeoutValue) {
    return createAction("smokeControls/setTimeout", timeoutValue);
  },
  /**
   * Builds one set-smoke-slow-timeout action.
   *
   * @param {string} timeoutValue Smoke slow-timeout value.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setSidebarSmokeSlowTimeout(timeoutValue) {
    return createAction("smokeControls/setSlowTimeout", timeoutValue);
  },
  /**
   * Builds one set-smoke-language-enabled action.
   *
   * @param {string} languageKey Smoke language key.
   * @param {boolean} enabled Whether language should be selected.
   * @returns {{type: string, payload: {languageKey: string, enabled: boolean}}} Action payload.
   */
  setSidebarSmokeLanguageEnabled(languageKey, enabled) {
    return createAction("smokeControls/setLanguageEnabled", {
      languageKey,
      enabled,
    });
  },
  /**
   * Builds one set-all-smoke-languages-enabled action.
   *
   * @param {boolean} enabled Whether all smoke languages should be selected.
   * @returns {{type: string, payload: boolean}} Action payload.
   */
  setSidebarSmokeAllLanguagesEnabled(enabled) {
    return createAction("smokeControls/setAllLanguagesEnabled", enabled);
  },
  /**
   * Builds one replace-smoke-state action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}>} smokeState Smoke-state snapshot.
   * @returns {{type: string, payload: {algorithmPath: string, smokeState: Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}>}}} Action payload.
   */
  replaceSmokeStateForAlgorithm(algorithmPath, smokeState) {
    return createAction("smokeRuntime/replaceSmokeStateForAlgorithm", {
      algorithmPath,
      smokeState,
    });
  },
  /**
   * Builds one set-smoke-process-running action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {boolean} isRunning Whether smoke process is running.
   * @returns {{type: string, payload: {algorithmPath: string, isRunning: boolean}}} Action payload.
   */
  setSmokeProcessRunning(algorithmPath, isRunning) {
    return createAction("smokeRuntime/setSmokeProcessRunning", {
      algorithmPath,
      isRunning,
    });
  },
  /**
   * Builds one set-smoke-run-token action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number} runToken Smoke run token value.
   * @returns {{type: string, payload: {algorithmPath: string, runToken: number}}} Action payload.
   */
  setSmokeRunToken(algorithmPath, runToken) {
    return createAction("smokeRuntime/setSmokeRunToken", {
      algorithmPath,
      runToken,
    });
  },
  /**
   * Builds one set-stopped-smoke-run-token action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number|null|undefined} runToken Stopped smoke run token.
   * @returns {{type: string, payload: {algorithmPath: string, runToken: number|null|undefined}}} Action payload.
   */
  setStoppedSmokeRunToken(algorithmPath, runToken) {
    return createAction("smokeRuntime/setStoppedSmokeRunToken", {
      algorithmPath,
      runToken,
    });
  },
  /**
   * Builds one clear-smoke-results action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @returns {{type: string, payload: string}} Action payload.
   */
  clearSmokeResultsForAlgorithm(algorithmPath) {
    return createAction("smokeRuntime/clearSmokeResultsForAlgorithm", algorithmPath);
  },
  /**
   * Builds one set-smoke-language-status action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {string} languageKey Canonical language key.
   * @param {"queued"|"running"|"passed"|"failed"|"stopped"} smokeStatus Smoke status value.
   * @returns {{type: string, payload: {algorithmPath: string, languageKey: string, smokeStatus: "queued"|"running"|"passed"|"failed"|"stopped"}}} Action payload.
   */
  setSmokeLanguageStatus(algorithmPath, languageKey, smokeStatus) {
    return createAction("smokeRuntime/setSmokeLanguageStatus", {
      algorithmPath,
      languageKey,
      smokeStatus,
    });
  },
  /**
   * Builds one set-smoke-process-error action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {string} errorMessage Process error message.
   * @returns {{type: string, payload: {algorithmPath: string, errorMessage: string}}} Action payload.
   */
  setSmokeProcessError(algorithmPath, errorMessage) {
    return createAction("smokeRuntime/setSmokeProcessError", {
      algorithmPath,
      errorMessage,
    });
  },
  /**
   * Builds one set-smoke-process-exit action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number|null} exitCode Process exit code.
   * @param {string|null} signal Process termination signal.
   * @returns {{type: string, payload: {algorithmPath: string, exitCode: number|null, signal: string|null}}} Action payload.
   */
  setSmokeProcessExit(algorithmPath, exitCode, signal) {
    return createAction("smokeRuntime/setSmokeProcessExit", {
      algorithmPath,
      exitCode,
      signal,
    });
  },
  /**
   * Builds one apply-remaining-smoke-status action.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {"failed"|"stopped"} replacementStatus Replacement status.
   * @returns {{type: string, payload: {algorithmPath: string, replacementStatus: "failed"|"stopped"}}} Action payload.
   */
  applyRemainingSmokeStatus(algorithmPath, replacementStatus) {
    return createAction("smokeRuntime/applyRemainingSmokeStatus", {
      algorithmPath,
      replacementStatus,
    });
  },
  /**
   * Builds one reset-runtime-processes action.
   *
   * @returns {{type: string, payload: undefined}} Action payload.
   */
  resetRuntimeProcesses() {
    return createAction("runtimeProcesses/reset", undefined);
  },
  /**
   * Builds one upsert-runtime-process action.
   *
   * @param {object} processRecord Runtime process record.
   * @returns {{type: string, payload: object}} Action payload.
   */
  upsertRuntimeProcess(processRecord) {
    return createAction("runtimeProcesses/upsertProcess", processRecord);
  },
  /**
   * Builds one clear-runtime-process action.
   *
   * @param {string} processId Runtime process identifier.
   * @returns {{type: string, payload: string}} Action payload.
   */
  clearRuntimeProcess(processId) {
    return createAction("runtimeProcesses/clearProcess", processId);
  },
  /**
   * Builds one set-active-runtime-process-id action.
   *
   * @param {string} ownerKey Runtime process owner key.
   * @param {string|null|undefined} processId Runtime process id.
   * @returns {{type: string, payload: {ownerKey: string, processId: string|null|undefined}}} Action payload.
   */
  setActiveRuntimeProcessId(ownerKey, processId) {
    return createAction("runtimeProcesses/setActiveProcessId", {
      ownerKey,
      processId,
    });
  },
  /**
   * Builds one set-runtime-process-running action.
   *
   * @param {string} ownerKey Runtime process owner key.
   * @param {boolean} isRunning Whether the owner is currently running.
   * @returns {{type: string, payload: {ownerKey: string, isRunning: boolean}}} Action payload.
   */
  setRuntimeProcessRunning(ownerKey, isRunning) {
    return createAction("runtimeProcesses/setRunning", {
      ownerKey,
      isRunning,
    });
  },
  /**
   * Builds one set-runtime-process-run-token action.
   *
   * @param {string} ownerKey Runtime process owner key.
   * @param {number} runToken Runtime run token.
   * @returns {{type: string, payload: {ownerKey: string, runToken: number}}} Action payload.
   */
  setRuntimeProcessRunToken(ownerKey, runToken) {
    return createAction("runtimeProcesses/setRunToken", {
      ownerKey,
      runToken,
    });
  },
  /**
   * Builds one set-stopped-runtime-process-run-token action.
   *
   * @param {string} ownerKey Runtime process owner key.
   * @param {number|null|undefined} runToken Stopped run token.
   * @returns {{type: string, payload: {ownerKey: string, runToken: number|null|undefined}}} Action payload.
   */
  setStoppedRuntimeProcessRunToken(ownerKey, runToken) {
    return createAction("runtimeProcesses/setStoppedRunToken", {
      ownerKey,
      runToken,
    });
  },
  /**
   * Builds one set-sidebar-view-mode action.
   *
   * @param {"files"|"language"|string} viewMode Sidebar view mode.
   * @returns {{type: string, payload: "files"|"language"|string}} Action payload.
   */
  setSidebarViewMode(viewMode) {
    return createAction("sidebarUi/setViewMode", viewMode);
  },
  /**
   * Builds one set-sidebar-filter-mode action.
   *
   * @param {"all"|"problems"|string} filterMode Sidebar filter mode.
   * @returns {{type: string, payload: "all"|"problems"|string}} Action payload.
   */
  setSidebarFilterMode(filterMode) {
    return createAction("sidebarUi/setFilterMode", filterMode);
  },
  /**
   * Builds one set-cached-preflight-state action.
   *
   * @param {object|null} preflightState Cached preflight state.
   * @returns {{type: string, payload: object|null}} Action payload.
   */
  setCachedPreflightState(preflightState) {
    return createAction("preflightCache/setCachedPreflightState", preflightState);
  },
  /**
   * Builds one set-filesystem-cache-ttl action.
   *
   * @param {number} cacheTtlMs Filesystem cache TTL in milliseconds.
   * @returns {{type: string, payload: number}} Action payload.
   */
  setFilesystemCacheTtlMs(cacheTtlMs) {
    return createAction("filesystem/setCacheTtlMs", cacheTtlMs);
  },
  /**
   * Builds one set-filesystem-directory-cache-entry action.
   *
   * @param {string} targetPath Cached path key.
   * @param {number} entryCount Cached entry count.
   * @param {number} [updatedAt] Cache update timestamp.
   * @returns {{type: string, payload: {targetPath: string, entryCount: number, updatedAt: number|undefined}}} Action payload.
   */
  setFilesystemDirectoryCacheEntry(targetPath, entryCount, updatedAt) {
    return createAction("filesystem/setDirectoryCacheEntry", {
      targetPath,
      entryCount,
      updatedAt,
    });
  },
  /**
   * Builds one set-filesystem-stat-cache-entry action.
   *
   * @param {string} targetPath Cached path key.
   * @param {boolean} exists Whether the path exists.
   * @param {string} kind Path kind label.
   * @param {number} [updatedAt] Cache update timestamp.
   * @returns {{type: string, payload: {targetPath: string, exists: boolean, kind: string, updatedAt: number|undefined}}} Action payload.
   */
  setFilesystemStatCacheEntry(targetPath, exists, kind, updatedAt) {
    return createAction("filesystem/setStatCacheEntry", {
      targetPath,
      exists,
      kind,
      updatedAt,
    });
  },
  /**
   * Builds one clear-filesystem-cache action.
   *
   * @param {string} [targetPath] Optional cache key to clear.
   * @returns {{type: string, payload: string|undefined}} Action payload.
   */
  clearFilesystemCache(targetPath) {
    return createAction("filesystem/clearCache", targetPath);
  },
  /**
   * Builds one set-filesystem-pending-operation action.
   *
   * @param {string} operationId Pending operation identifier.
   * @param {string} type Operation type.
   * @param {string} targetPath Operation path key.
   * @param {string} status Operation status.
   * @param {number} [updatedAt] Operation timestamp.
   * @returns {{type: string, payload: {operationId: string, type: string, targetPath: string, status: string, updatedAt: number|undefined}}} Action payload.
   */
  setFilesystemPendingOperation(operationId, type, targetPath, status, updatedAt) {
    return createAction("filesystem/setPendingOperation", {
      operationId,
      type,
      targetPath,
      status,
      updatedAt,
    });
  },
  /**
   * Builds one clear-filesystem-pending-operation action.
   *
   * @param {string} operationId Pending operation identifier.
   * @returns {{type: string, payload: string}} Action payload.
   */
  clearFilesystemPendingOperation(operationId) {
    return createAction("filesystem/clearPendingOperation", operationId);
  },
  /**
   * Builds one clear-all-filesystem-pending-operations action.
   *
   * @returns {{type: string, payload: undefined}} Action payload.
   */
  clearFilesystemPendingOperations() {
    return createAction("filesystem/clearPendingOperations", undefined);
  },
  /**
   * Builds one set-filesystem-operation-error action.
   *
   * @param {string} targetPath Operation path key.
   * @param {string} errorMessage Operation error text.
   * @returns {{type: string, payload: {targetPath: string, errorMessage: string}}} Action payload.
   */
  setFilesystemOperationError(targetPath, errorMessage) {
    return createAction("filesystem/setOperationError", {
      targetPath,
      errorMessage,
    });
  },
  /**
   * Builds one clear-all-filesystem-operation-errors action.
   *
   * @returns {{type: string, payload: undefined}} Action payload.
   */
  clearFilesystemOperationErrors() {
    return createAction("filesystem/clearOperationErrors", undefined);
  },
  /**
   * Builds one set-environment-check-env-result action.
   *
   * @param {{kind: string, text: string, filteredOutput: string, rawOutput: string}} result Check-env result payload.
   * @returns {{type: string, payload: {kind: string, text: string, filteredOutput: string, rawOutput: string}}} Action payload.
   */
  setEnvironmentCheckEnvResult(result) {
    return createAction("environment/setCheckEnvResult", result);
  },
  /**
   * Builds one set-environment-copy-icons-result action.
   *
   * @param {{kind: string, text: string}} result Copy-icons result payload.
   * @returns {{type: string, payload: {kind: string, text: string}}} Action payload.
   */
  setEnvironmentCopyIconsResult(result) {
    return createAction("environment/setCopyIconsResult", result);
  },
  /**
   * Builds one set-environment-batch-routing-result action.
   *
   * @param {{kind: string, text: string}} result Batch-routing result payload.
   * @returns {{type: string, payload: {kind: string, text: string}}} Action payload.
   */
  setEnvironmentBatchRoutingResult(result) {
    return createAction("environment/setBatchRoutingResult", result);
  },
  /**
   * Builds one set-environment-draft-profile-path action.
   *
   * @param {string} profilePath Draft profile path.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setEnvironmentDraftProfilePath(profilePath) {
    return createAction("environment/setDraftProfilePath", profilePath);
  },
  /**
   * Builds one set-environment-draft-copy-icons-path action.
   *
   * @param {string} copyIconsPath Draft copy-icons path.
   * @returns {{type: string, payload: string}} Action payload.
   */
  setEnvironmentDraftCopyIconsPath(copyIconsPath) {
    return createAction("environment/setDraftCopyIconsPath", copyIconsPath);
  },
  /**
   * Builds one set-environment-draft-batch-routing action.
   *
   * @param {{dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}} batchRoutingDraft Draft batch routing values.
   * @returns {{type: string, payload: {dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}}} Action payload.
   */
  setEnvironmentDraftBatchRouting(batchRoutingDraft) {
    return createAction("environment/setDraftBatchRouting", batchRoutingDraft);
  },
  /**
   * Builds one reset-environment-draft-values action.
   *
   * @returns {{type: string, payload: undefined}} Action payload.
   */
  resetEnvironmentDraftValues() {
    return createAction("environment/resetDraftValues", undefined);
  },
  /**
   * Builds one set-environment-parsed-config action.
   *
   * @param {object} parsedConfig Parsed environment config.
   * @returns {{type: string, payload: object}} Action payload.
   */
  setEnvironmentParsedConfig(parsedConfig) {
    return createAction("environment/setParsedConfig", parsedConfig);
  },
  /**
   * Builds one set-environment-variable-status action.
   *
   * @param {string} variableKey Variable identifier.
   * @param {object|null} statusEntry Variable status entry.
   * @returns {{type: string, payload: {variableKey: string, statusEntry: object|null}}} Action payload.
   */
  setEnvironmentVariableStatus(variableKey, statusEntry) {
    return createAction("environment/setVariableStatus", {
      variableKey,
      statusEntry,
    });
  },
  /**
   * Builds one set-environment-routing-status action.
   *
   * @param {string} languageKey Language key.
   * @param {object|null} statusEntry Routing status entry.
   * @returns {{type: string, payload: {languageKey: string, statusEntry: object|null}}} Action payload.
   */
  setEnvironmentRoutingStatus(languageKey, statusEntry) {
    return createAction("environment/setRoutingStatus", {
      languageKey,
      statusEntry,
    });
  },
  /**
   * Builds one reset-environment-status action.
   *
   * @returns {{type: string, payload: undefined}} Action payload.
   */
  resetEnvironmentStatus() {
    return createAction("environment/resetStatus", undefined);
  },
};

// Public store and helpers for extension state transitions.
module.exports = {
  SMOKE_LANGUAGE_KEYS,
  SMOKE_LANGUAGE_RUNNABLE_BY_KEY,
  extensionStateStore,
  actionCreators,
  selectSidebarRunArgsState,
  selectSidebarSourceProfileState,
  selectSidebarRunChecksState,
  selectSidebarCleanOptionsState,
  selectSidebarSmokeControlsState,
  selectSmokeStateForAlgorithm,
  selectSmokeLanguageState,
  selectIsSmokeProcessRunningForAlgorithm,
  selectHasSmokeResultsForAlgorithm,
  selectSmokeRunTokenForAlgorithm,
  selectStoppedSmokeRunTokenForAlgorithm,
  selectRuntimeProcessById,
  selectActiveRuntimeProcessIdForOwner,
  selectActiveRuntimeProcessForOwner,
  selectIsRuntimeProcessRunningForOwner,
  selectRuntimeProcessRunTokenForOwner,
  selectStoppedRuntimeProcessRunTokenForOwner,
  selectSidebarViewMode,
  selectSidebarFilterMode,
  selectFilesystemCacheTtlMs,
  selectFilesystemDirectoryCacheEntry,
  selectFilesystemStatCacheEntry,
  selectFilesystemPendingOperation,
  selectFilesystemOperationError,
  selectEnvironmentCheckEnvResult,
  selectEnvironmentCopyIconsResult,
  selectEnvironmentBatchRoutingResult,
  selectEnvironmentDraftValues,
  selectEnvironmentParsedConfig,
  selectEnvironmentVariableStatus,
  selectEnvironmentRoutingStatus,
  selectEnvironmentVariableStatusMap,
  selectEnvironmentRoutingStatusMap,
  selectCachedPreflightState,
};
