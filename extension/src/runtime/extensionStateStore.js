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
    },
    sidebarUi: {
      viewMode: "files",
      filterMode: "all",
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
 * Handles state transitions for the smokeRuntime slice.
 *
 * @param {{smokeRuntime: {smokeStateByAlgorithmPath: Map, runningSmokeAlgorithmPaths: Set}}} state Current store state.
 * @param {string} actionType Resolved action type string.
 * @param {unknown} payload Action payload.
 * @returns {{smokeRuntime: {smokeStateByAlgorithmPath: Map, runningSmokeAlgorithmPaths: Set}}} Next store state.
 */
function reduceSmokeRuntime(state, actionType, payload) {
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

  if (actionType.startsWith("sidebarUi/")) {
    return reduceSidebarUi(state, actionType, payload);
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
  selectSidebarViewMode,
  selectSidebarFilterMode,
  selectCachedPreflightState,
};
