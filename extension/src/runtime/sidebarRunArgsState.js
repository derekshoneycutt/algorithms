// Shared in-memory state for optional sidebar run arguments.

let sidebarRunArgsEnabled = false;
let sidebarRunArgsText = "";
let sidebarSourceProfileEnabled = false;
let sidebarSourceProfileText = "";
let sidebarRunChecksMode = "none";
let sidebarRunChecksRoute = "native";
let sidebarCleanStdlibEnabled = true;
let sidebarCleanArchivesEnabled = true;
let sidebarSmokeMarkdownEnabled = false;
let sidebarSmokeMarkdownPath = "";
let sidebarSmokeTimeout = "8m";
let sidebarSmokeSlowTimeout = "20m";

/**
 * Supported smoke-test languages (arm64asm excluded to mirror smoke script behavior).
 *
 * @type {string[]}
 */
const SMOKE_LANGUAGE_KEYS = [
  "ada",
  "asm",
  "ballerina",
  "c",
  "clojure",
  "cobol",
  "cpp",
  "csharp",
  "d",
  "dart",
  "eiffel",
  "elixir",
  "erlang",
  "factor",
  "forth",
  "fortran",
  "freebasic",
  "fsharp",
  "gleam",
  "go",
  "haskell",
  "haxe",
  "icon",
  "idris",
  "java",
  "javascript",
  "julia",
  "kit",
  "kotlin",
  "llvmir",
  "lua",
  "mercury",
  "mmixal",
  "modula3",
  "mojo",
  "nasm",
  "nim",
  "oberon",
  "objectivec",
  "ocaml",
  "octave",
  "pascal",
  "perl",
  "php",
  "prolog",
  "python",
  "r",
  "racket",
  "ruby",
  "rust",
  "scala",
  "scheme",
  "simula",
  "smalltalk",
  "swift",
  "tcl",
  "typescript",
  "v",
  "visualbasic",
  "wat",
  "zig",
];

/**
 * Selected smoke-test languages keyed by language id.
 *
 * @type {Map<string, boolean>}
 */
const sidebarSmokeLanguageEnabledByKey = new Map(
  SMOKE_LANGUAGE_KEYS.map((languageKey) => [languageKey, true])
);

/**
 * Valid run-checks mode values.
 *
 * @type {string[]}
 */
const RUN_CHECKS_MODES = ["none", "check-only", "compile-only"];

/**
 * Valid check-only route values.
 *
 * @type {string[]}
 */
const RUN_CHECKS_ROUTES = ["native", "docker", "ssh"];

/**
 * Returns the current sidebar run-args state.
 *
 * @returns {{enabled: boolean, text: string}} Current state snapshot.
 */
function getSidebarRunArgsState() {
  return {
    enabled: sidebarRunArgsEnabled,
    text: sidebarRunArgsText,
  };
}

/**
 * Sets whether sidebar run args are enabled.
 *
 * @param {boolean} enabled True when extra args should be appended to run commands.
 * @returns {void}
 */
function setSidebarRunArgsEnabled(enabled) {
  sidebarRunArgsEnabled = Boolean(enabled);
}

/**
 * Sets the raw sidebar run args text.
 *
 * @param {string} text Raw args text entered by the user.
 * @returns {void}
 */
function setSidebarRunArgsText(text) {
  sidebarRunArgsText = String(text || "").trim();
}

/**
 * Returns the current sidebar source-profile state.
 *
 * @returns {{enabled: boolean, text: string}} Current state snapshot.
 */
function getSidebarSourceProfileState() {
  return {
    enabled: sidebarSourceProfileEnabled,
    text: sidebarSourceProfileText,
  };
}

/**
 * Sets whether sidebar source profile override is enabled.
 *
 * @param {boolean} enabled True when source-profile flag should be emitted.
 * @returns {void}
 */
function setSidebarSourceProfileEnabled(enabled) {
  sidebarSourceProfileEnabled = Boolean(enabled);
}

/**
 * Sets the raw sidebar source-profile text.
 *
 * @param {string} text Raw source-profile value entered by the user.
 * @returns {void}
 */
function setSidebarSourceProfileText(text) {
  sidebarSourceProfileText = String(text || "");
}

/**
 * Returns the current sidebar run-checks state.
 *
 * @returns {{mode: "none"|"check-only"|"compile-only", route: "native"|"docker"|"ssh"}} Current state snapshot.
 */
function getSidebarRunChecksState() {
  return {
    mode: sidebarRunChecksMode,
    route: sidebarRunChecksRoute,
  };
}

/**
 * Sets the sidebar run-checks mode.
 *
 * @param {string} mode One of none, check-only, compile-only.
 * @returns {void}
 */
function setSidebarRunChecksMode(mode) {
  const nextMode = String(mode || "none").trim().toLowerCase();

  if (!RUN_CHECKS_MODES.includes(nextMode)) {
    sidebarRunChecksMode = "none";
    return;
  }

  sidebarRunChecksMode = nextMode;
}

/**
 * Sets the sidebar check-only route.
 *
 * @param {string} route One of native, docker, ssh.
 * @returns {void}
 */
function setSidebarRunChecksRoute(route) {
  const nextRoute = String(route || "native").trim().toLowerCase();

  if (!RUN_CHECKS_ROUTES.includes(nextRoute)) {
    sidebarRunChecksRoute = "native";
    return;
  }

  sidebarRunChecksRoute = nextRoute;
}

/**
 * Returns the current sidebar clean-options state.
 *
 * @returns {{cleanStdlib: boolean, cleanArchives: boolean}} Current state snapshot.
 */
function getSidebarCleanOptionsState() {
  return {
    cleanStdlib: sidebarCleanStdlibEnabled,
    cleanArchives: sidebarCleanArchivesEnabled,
  };
}

/**
 * Sets whether clean should include stdlib cleanup.
 *
 * @param {boolean} enabled True to set stdlib default to yes.
 * @returns {void}
 */
function setSidebarCleanStdlibEnabled(enabled) {
  sidebarCleanStdlibEnabled = Boolean(enabled);
}

/**
 * Sets whether clean should include archive cleanup.
 *
 * @param {boolean} enabled True to set archive default to yes.
 * @returns {void}
 */
function setSidebarCleanArchivesEnabled(enabled) {
  sidebarCleanArchivesEnabled = Boolean(enabled);
}

/**
 * Returns the current sidebar smoke-controls state.
 *
 * @returns {{markdownEnabled: boolean, markdownPath: string, timeout: string, slowTimeout: string, languages: {key: string, enabled: boolean}[]}} Current state snapshot.
 */
function getSidebarSmokeControlsState() {
  const languages = SMOKE_LANGUAGE_KEYS.map((languageKey) => ({
    key: languageKey,
    enabled: sidebarSmokeLanguageEnabledByKey.get(languageKey) !== false,
  }));

  return {
    markdownEnabled: sidebarSmokeMarkdownEnabled,
    markdownPath: sidebarSmokeMarkdownPath,
    timeout: sidebarSmokeTimeout,
    slowTimeout: sidebarSmokeSlowTimeout,
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
  sidebarSmokeMarkdownEnabled = Boolean(enabled);
}

/**
 * Sets optional smoke markdown output path.
 *
 * @param {string} pathValue Markdown report path value.
 * @returns {void}
 */
function setSidebarSmokeMarkdownPath(pathValue) {
  sidebarSmokeMarkdownPath = String(pathValue || "");
}

/**
 * Sets smoke default timeout text.
 *
 * @param {string} timeoutValue Timeout value text.
 * @returns {void}
 */
function setSidebarSmokeTimeout(timeoutValue) {
  sidebarSmokeTimeout = String(timeoutValue || "").trim();
}

/**
 * Sets smoke slow-timeout text.
 *
 * @param {string} timeoutValue Slow-timeout value text.
 * @returns {void}
 */
function setSidebarSmokeSlowTimeout(timeoutValue) {
  sidebarSmokeSlowTimeout = String(timeoutValue || "").trim();
}

/**
 * Sets one smoke language selection state.
 *
 * @param {string} languageKey Smoke language key.
 * @param {boolean} enabled True when selected.
 * @returns {void}
 */
function setSidebarSmokeLanguageEnabled(languageKey, enabled) {
  const normalizedLanguageKey = String(languageKey || "").trim().toLowerCase();

  if (!sidebarSmokeLanguageEnabledByKey.has(normalizedLanguageKey)) {
    return;
  }

  sidebarSmokeLanguageEnabledByKey.set(normalizedLanguageKey, Boolean(enabled));
}

/**
 * Sets all smoke language selections at once.
 *
 * @param {boolean} enabled True to select all, false to deselect all.
 * @returns {void}
 */
function setSidebarSmokeAllLanguagesEnabled(enabled) {
  for (const languageKey of SMOKE_LANGUAGE_KEYS) {
    sidebarSmokeLanguageEnabledByKey.set(languageKey, Boolean(enabled));
  }
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
  if (!sidebarRunArgsEnabled) {
    return {
      ok: true,
      enabled: false,
      tokens: [],
      reason: null,
    };
  }

  const parsed = parseSidebarRunArgsText(sidebarRunArgsText);

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
  if (!sidebarSourceProfileEnabled) {
    return {
      ok: true,
      enabled: false,
      tokens: [],
      reason: null,
    };
  }

  const text = String(sidebarSourceProfileText || "");

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
  const mode = RUN_CHECKS_MODES.includes(sidebarRunChecksMode)
    ? sidebarRunChecksMode
    : "none";
  const route = RUN_CHECKS_ROUTES.includes(sidebarRunChecksRoute)
    ? sidebarRunChecksRoute
    : "native";

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
  const stdlibDefault = sidebarCleanStdlibEnabled ? "y" : "n";
  const archiveDefault = sidebarCleanArchivesEnabled ? "y" : "n";
  const defaultsPair = `${stdlibDefault}|${archiveDefault}`;

  return {
    ok: true,
    cleanStdlib: sidebarCleanStdlibEnabled,
    cleanArchives: sidebarCleanArchivesEnabled,
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
  const args = [];
  const selectedLanguages = SMOKE_LANGUAGE_KEYS.filter(
    (languageKey) => sidebarSmokeLanguageEnabledByKey.get(languageKey) !== false
  );
  const allLanguagesSelected = selectedLanguages.length === SMOKE_LANGUAGE_KEYS.length;

  if (sidebarSmokeMarkdownEnabled) {
    const markdownPath = String(sidebarSmokeMarkdownPath || "").trim();

    if (markdownPath.length > 0) {
      args.push(`--markdown=${markdownPath}`);
    } else {
      args.push("--markdown");
    }
  }

  if (String(sidebarSmokeTimeout || "").trim().length > 0) {
    args.push(`--timeout=${String(sidebarSmokeTimeout).trim()}`);
  }

  if (String(sidebarSmokeSlowTimeout || "").trim().length > 0) {
    args.push(`--slow-timeout=${String(sidebarSmokeSlowTimeout).trim()}`);
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
