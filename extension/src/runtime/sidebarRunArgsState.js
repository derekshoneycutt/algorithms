const {
  SMOKE_LANGUAGE_KEYS,
  SMOKE_LANGUAGE_RUNNABLE_BY_KEY,
  actionCreators,
  extensionStateStore,
  selectSidebarCleanOptionsState,
  selectSidebarRunArgsState,
  selectSidebarRunChecksState,
  selectSidebarSmokeControlsState,
  selectSidebarSourceProfileState,
} = require("./extensionStateStore");
const { getLanguageDisplayLabel } = require("./languageMetadata");

/**
 * Smoke display labels keyed by language id.
 *
 * @type {Map<string, string>}
 */
const SMOKE_LANGUAGE_LABEL_BY_KEY = new Map(
  SMOKE_LANGUAGE_KEYS.map((languageKey) => [
    languageKey,
    getLanguageDisplayLabel(languageKey),
  ])
);

/**
 * Dispatches one sidebar state action to the central store.
 *
 * @param {{type: string, payload: unknown}} action Store action.
 * @returns {void}
 */
function dispatchSidebarAction(action) {
  extensionStateStore.dispatch(action);
}

/**
 * Returns the current sidebar run-args state.
 *
 * @returns {{enabled: boolean, text: string}} Current state snapshot.
 */
function getSidebarRunArgsState() {
  return selectSidebarRunArgsState();
}

/**
 * Sets whether sidebar run args are enabled.
 *
 * @param {boolean} enabled True when extra args should be appended to run commands.
 * @returns {void}
 */
function setSidebarRunArgsEnabled(enabled) {
  dispatchSidebarAction(actionCreators.setSidebarRunArgsEnabled(enabled));
}

/**
 * Sets the raw sidebar run args text.
 *
 * @param {string} text Raw args text entered by the user.
 * @returns {void}
 */
function setSidebarRunArgsText(text) {
  dispatchSidebarAction(actionCreators.setSidebarRunArgsText(text));
}

/**
 * Returns the current sidebar source-profile state.
 *
 * @returns {{enabled: boolean, text: string}} Current state snapshot.
 */
function getSidebarSourceProfileState() {
  return selectSidebarSourceProfileState();
}

/**
 * Sets whether sidebar source profile override is enabled.
 *
 * @param {boolean} enabled True when source-profile flag should be emitted.
 * @returns {void}
 */
function setSidebarSourceProfileEnabled(enabled) {
  dispatchSidebarAction(actionCreators.setSidebarSourceProfileEnabled(enabled));
}

/**
 * Sets the raw sidebar source-profile text.
 *
 * @param {string} text Raw source-profile value entered by the user.
 * @returns {void}
 */
function setSidebarSourceProfileText(text) {
  dispatchSidebarAction(actionCreators.setSidebarSourceProfileText(text));
}

/**
 * Returns the current sidebar run-checks state.
 *
 * @returns {{mode: "none"|"check-only"|"compile-only", route: "native"|"docker"|"ssh"}} Current state snapshot.
 */
function getSidebarRunChecksState() {
  return selectSidebarRunChecksState();
}

/**
 * Sets the sidebar run-checks mode.
 *
 * @param {string} mode One of none, check-only, compile-only.
 * @returns {void}
 */
function setSidebarRunChecksMode(mode) {
  dispatchSidebarAction(actionCreators.setSidebarRunChecksMode(mode));
}

/**
 * Sets the sidebar check-only route.
 *
 * @param {string} route One of native, docker, ssh.
 * @returns {void}
 */
function setSidebarRunChecksRoute(route) {
  dispatchSidebarAction(actionCreators.setSidebarRunChecksRoute(route));
}

/**
 * Returns the current sidebar clean-options state.
 *
 * @returns {{cleanStdlib: boolean, cleanArchives: boolean}} Current state snapshot.
 */
function getSidebarCleanOptionsState() {
  return selectSidebarCleanOptionsState();
}

/**
 * Sets whether clean should include stdlib cleanup.
 *
 * @param {boolean} enabled True to set stdlib default to yes.
 * @returns {void}
 */
function setSidebarCleanStdlibEnabled(enabled) {
  dispatchSidebarAction(actionCreators.setSidebarCleanStdlibEnabled(enabled));
}

/**
 * Sets whether clean should include archive cleanup.
 *
 * @param {boolean} enabled True to set archive default to yes.
 * @returns {void}
 */
function setSidebarCleanArchivesEnabled(enabled) {
  dispatchSidebarAction(actionCreators.setSidebarCleanArchivesEnabled(enabled));
}

/**
 * Returns the current sidebar smoke-controls state.
 *
 * @returns {{markdownEnabled: boolean, markdownPath: string, timeout: string, slowTimeout: string, languages: {key: string, label: string, enabled: boolean, disabled: boolean, disabledReason: string}[]}} Current state snapshot.
 */
function getSidebarSmokeControlsState() {
  const smokeControlsState = selectSidebarSmokeControlsState();
  const languages = SMOKE_LANGUAGE_KEYS.map((languageKey) => ({
    key: languageKey,
    label:
      SMOKE_LANGUAGE_LABEL_BY_KEY.get(languageKey)
      || languageKey,
    enabled: smokeControlsState.languageEnabledByKey.get(languageKey) !== false,
    disabled: SMOKE_LANGUAGE_RUNNABLE_BY_KEY.get(languageKey) === false,
    disabledReason:
      SMOKE_LANGUAGE_RUNNABLE_BY_KEY.get(languageKey) === false
        ? "Not runnable on this platform/architecture."
        : "",
  }));

  return {
    markdownEnabled: smokeControlsState.markdownEnabled,
    markdownPath: smokeControlsState.markdownPath,
    timeout: smokeControlsState.timeout,
    slowTimeout: smokeControlsState.slowTimeout,
    languages,
  };
}

/**
 * Sets whether smoke markdown output is enabled.
 *
 * @param {boolean} enabled True when markdown should be emitted.
 * @returns {void}
 */
function setSidebarSmokeMarkdownEnabled(enabled) {
  dispatchSidebarAction(actionCreators.setSidebarSmokeMarkdownEnabled(enabled));
}

/**
 * Sets optional smoke markdown output path.
 *
 * @param {string} pathValue Markdown report path value.
 * @returns {void}
 */
function setSidebarSmokeMarkdownPath(pathValue) {
  dispatchSidebarAction(actionCreators.setSidebarSmokeMarkdownPath(pathValue));
}

/**
 * Sets smoke default timeout text.
 *
 * @param {string} timeoutValue Timeout value text.
 * @returns {void}
 */
function setSidebarSmokeTimeout(timeoutValue) {
  dispatchSidebarAction(actionCreators.setSidebarSmokeTimeout(timeoutValue));
}

/**
 * Sets smoke slow-timeout text.
 *
 * @param {string} timeoutValue Slow-timeout value text.
 * @returns {void}
 */
function setSidebarSmokeSlowTimeout(timeoutValue) {
  dispatchSidebarAction(actionCreators.setSidebarSmokeSlowTimeout(timeoutValue));
}

/**
 * Sets one smoke language selection state.
 *
 * @param {string} languageKey Smoke language key.
 * @param {boolean} enabled True when selected.
 * @returns {void}
 */
function setSidebarSmokeLanguageEnabled(languageKey, enabled) {
  dispatchSidebarAction(
    actionCreators.setSidebarSmokeLanguageEnabled(languageKey, enabled)
  );
}

/**
 * Sets all smoke language selections at once.
 *
 * @param {boolean} enabled True to select all, false to deselect all.
 * @returns {void}
 */
function setSidebarSmokeAllLanguagesEnabled(enabled) {
  dispatchSidebarAction(actionCreators.setSidebarSmokeAllLanguagesEnabled(enabled));
}

/**
 * Parses one shell-like args string into token arguments.
 *
 * Supported:
 * - whitespace token separators
 * - single and double quoted segments
 * - backslash escaping for next character
 *
 * @param {string} rawText Raw args text.
 * @returns {{ok: boolean, tokens: string[], reason: string|null}} Parse result.
 */
function parseSidebarRunArgsText(rawText) {
  const text = String(rawText || "").trim();

  if (!text) {
    return {
      ok: true,
      tokens: [],
      reason: null,
    };
  }

  const tokens = [];
  let current = "";
  let quote = null;
  let escaping = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }

      current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaping) {
    return {
      ok: false,
      tokens: [],
      reason: "Run args end with an unfinished escape (\\).",
    };
  }

  if (quote) {
    return {
      ok: false,
      tokens: [],
      reason: "Run args contain an unclosed quote.",
    };
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return {
    ok: true,
    tokens,
    reason: null,
  };
}

/**
 * Returns parsed sidebar run args if enabled.
 *
 * @returns {{ok: boolean, enabled: boolean, tokens: string[], reason: string|null}} Effective args result.
 */
function getEffectiveSidebarRunArgs() {
  const runArgsState = getSidebarRunArgsState();

  if (!runArgsState.enabled) {
    return {
      ok: true,
      enabled: false,
      tokens: [],
      reason: null,
    };
  }

  const parsed = parseSidebarRunArgsText(runArgsState.text);

  if (!parsed.ok) {
    return {
      ok: false,
      enabled: true,
      tokens: [],
      reason: parsed.reason,
    };
  }

  return {
    ok: true,
    enabled: true,
    tokens: parsed.tokens,
    reason: null,
  };
}

/**
 * Returns the effective sidebar source-profile argument token when enabled.
 *
 * Behavior:
 * - Disabled: emits no tokens.
 * - Enabled + empty text: emits exactly `--source-profile=`.
 * - Enabled + non-empty text: emits `--source-profile=<value>`.
 *
 * @returns {{ok: boolean, enabled: boolean, tokens: string[], reason: string|null}} Effective source-profile result.
 */
function getEffectiveSidebarSourceProfile() {
  const sourceProfileState = getSidebarSourceProfileState();

  if (!sourceProfileState.enabled) {
    return {
      ok: true,
      enabled: false,
      tokens: [],
      reason: null,
    };
  }

  const text = String(sourceProfileState.text || "");

  if (!text.trim()) {
    return {
      ok: true,
      enabled: true,
      tokens: ["--source-profile="],
      reason: null,
    };
  }

  return {
    ok: true,
    enabled: true,
    tokens: [`--source-profile=${text}`],
    reason: null,
  };
}

/**
 * Returns the effective run-checks option token when selected.
 *
 * @returns {{ok: boolean, mode: "none"|"check-only"|"compile-only", route: "native"|"docker"|"ssh", tokens: string[], reason: string|null}} Effective run-checks result.
 */
function getEffectiveSidebarRunChecks() {
  const runChecksState = getSidebarRunChecksState();
  const mode = runChecksState.mode;
  const route = runChecksState.route;

  if (mode === "none") {
    return {
      ok: true,
      mode,
      route,
      tokens: [],
      reason: null,
    };
  }

  if (mode === "compile-only") {
    return {
      ok: true,
      mode,
      route,
      tokens: ["--compile-only"],
      reason: null,
    };
  }

  return {
    ok: true,
    mode,
    route,
    tokens: [`--check-only=${route}`],
    reason: null,
  };
}

/**
 * Returns the effective clean defaults option token for run.sh clean mode.
 *
 * Order is strict: stdlib first, archive second.
 *
 * @returns {{ok: boolean, cleanStdlib: boolean, cleanArchives: boolean, defaultsPair: string, token: string, reason: string|null}} Effective clean-defaults result.
 */
function getEffectiveSidebarCleanDefaults() {
  const cleanOptionsState = getSidebarCleanOptionsState();
  const stdlibDefault = cleanOptionsState.cleanStdlib ? "y" : "n";
  const archiveDefault = cleanOptionsState.cleanArchives ? "y" : "n";
  const defaultsPair = `${stdlibDefault}|${archiveDefault}`;

  return {
    ok: true,
    cleanStdlib: cleanOptionsState.cleanStdlib,
    cleanArchives: cleanOptionsState.cleanArchives,
    defaultsPair,
    token: `--defaults=${defaultsPair}`,
    reason: null,
  };
}

/**
 * Returns effective smoke-test CLI arguments based on sidebar smoke controls.
 *
 * Order:
 * 1. markdown options
 * 2. timeout options
 * 3. language options
 *
 * @returns {{ok: boolean, args: string[], selectedLanguages: string[], allLanguagesSelected: boolean, reason: string|null}} Effective smoke args result.
 */
function getEffectiveSidebarSmokeArgs() {
  const smokeControlsState = selectSidebarSmokeControlsState();
  const args = [];
  const selectedLanguages = SMOKE_LANGUAGE_KEYS.filter(
    (languageKey) => smokeControlsState.languageEnabledByKey.get(languageKey) !== false
  );
  const allLanguagesSelected = selectedLanguages.length === SMOKE_LANGUAGE_KEYS.length;

  if (smokeControlsState.markdownEnabled) {
    const markdownPath = String(smokeControlsState.markdownPath || "").trim();

    if (markdownPath.length > 0) {
      args.push(`--markdown=${markdownPath}`);
    } else {
      args.push("--markdown");
    }
  }

  if (String(smokeControlsState.timeout || "").trim().length > 0) {
    args.push(`--timeout=${String(smokeControlsState.timeout).trim()}`);
  }

  if (String(smokeControlsState.slowTimeout || "").trim().length > 0) {
    args.push(`--slow-timeout=${String(smokeControlsState.slowTimeout).trim()}`);
  }

  if (selectedLanguages.length === 0) {
    return {
      ok: false,
      args: [],
      selectedLanguages: [],
      allLanguagesSelected: false,
      reason: "Select at least one smoke-test language.",
    };
  }

  if (!allLanguagesSelected) {
    args.push(`--langs=${selectedLanguages.join(" ")}`);
  }

  return {
    ok: true,
    args,
    selectedLanguages,
    allLanguagesSelected,
    reason: null,
  };
}

// Public sidebar run/smoke state API for UI and command handlers.
module.exports = {
  getSidebarRunArgsState,
  setSidebarRunArgsEnabled,
  setSidebarRunArgsText,
  getSidebarSourceProfileState,
  setSidebarSourceProfileEnabled,
  setSidebarSourceProfileText,
  getSidebarRunChecksState,
  setSidebarRunChecksMode,
  setSidebarRunChecksRoute,
  getSidebarCleanOptionsState,
  setSidebarCleanStdlibEnabled,
  setSidebarCleanArchivesEnabled,
  getSidebarSmokeControlsState,
  setSidebarSmokeMarkdownEnabled,
  setSidebarSmokeMarkdownPath,
  setSidebarSmokeTimeout,
  setSidebarSmokeSlowTimeout,
  setSidebarSmokeLanguageEnabled,
  setSidebarSmokeAllLanguagesEnabled,
  parseSidebarRunArgsText,
  getEffectiveSidebarRunArgs,
  getEffectiveSidebarSourceProfile,
  getEffectiveSidebarRunChecks,
  getEffectiveSidebarCleanDefaults,
  getEffectiveSidebarSmokeArgs,
};
