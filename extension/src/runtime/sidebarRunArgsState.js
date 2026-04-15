// Shared in-memory state for optional sidebar run arguments.

let sidebarRunArgsEnabled = false;
let sidebarRunArgsText = "";
let sidebarSourceProfileEnabled = false;
let sidebarSourceProfileText = "";
let sidebarRunChecksMode = "none";
let sidebarRunChecksRoute = "native";

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
  parseSidebarRunArgsText,
  getEffectiveSidebarRunArgs,
  getEffectiveSidebarSourceProfile,
  getEffectiveSidebarRunChecks,
};
