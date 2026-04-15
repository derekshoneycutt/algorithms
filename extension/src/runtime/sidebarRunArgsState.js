// Shared in-memory state for optional sidebar run arguments.

let sidebarRunArgsEnabled = false;
let sidebarRunArgsText = "";

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

module.exports = {
  getSidebarRunArgsState,
  setSidebarRunArgsEnabled,
  setSidebarRunArgsText,
  parseSidebarRunArgsText,
  getEffectiveSidebarRunArgs,
};
