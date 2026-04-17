// Node path helpers used to validate canonical absolute execution paths.
const path = require("path");

/**
 * Structured result from command assembly.
 *
 * @typedef {object} CommandBuildResult
 * @property {boolean} ok Whether command assembly succeeded.
 * @property {string|null} reason Deterministic reject reason, or null on success.
 * @property {string[]|null} commandParts Internal absolute command parts, or null on failure.
 * @property {string|null} displayCommand User-facing command string, or null on failure.
 * @property {string|null} cwd Canonical absolute CWD, or null on failure.
 * @property {string|null} commandFamily Command family identifier.
 */

/**
 * Input payload for command assembly.
 *
 * @typedef {object} BuildRunCommandInput
 * @property {string} scriptPath Canonical absolute run-script path.
 * @property {string} [displayScriptPath] User-facing script path (relative preferred, absolute fallback).
 * @property {string} cwd Canonical absolute algorithm-directory CWD.
 * @property {string} commandFamily Command family identifier (for logging and evidence).
 * @property {string[]} [args] Ordered positional arguments for run.sh invocation.
 */

/**
 * Validates that a path string is absolute.
 *
 * @param {string} value Path string to validate.
 * @returns {boolean} True when value is a non-empty absolute path.
 */
function isAbsolutePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  return path.isAbsolute(value);
}

/**
 * Returns args as a stable array of strings.
 *
 * @param {unknown} args Potential command argument list.
 * @returns {string[]|null} Normalized argument list or null when invalid.
 */
function normalizeArgs(args) {
  if (args === undefined) {
    return [];
  }

  if (!Array.isArray(args)) {
    return null;
  }

  const normalized = [];

  for (const arg of args) {
    if (typeof arg !== "string") {
      return null;
    }

    normalized.push(arg);
  }

  return normalized;
}

/**
 * Builds deterministic internal and display command forms for runner execution.
 *
 * Internal execution always uses absolute script path. Display form uses
 * Display script path when available, with absolute fallback.
 *
 * @param {BuildRunCommandInput} input Command assembly input.
 * @returns {CommandBuildResult} Deterministic command assembly output.
 */
function buildRunCommand(input) {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      reason: "missing-input",
      commandParts: null,
      displayCommand: null,
      cwd: null,
      commandFamily: null,
    };
  }

  const scriptPath = input.scriptPath;
  const displayScriptPath = input.displayScriptPath || input.scriptPath;
  const cwd = input.cwd;
  const commandFamily = input.commandFamily || "unknown";
  const args = normalizeArgs(input.args);

  if (!isAbsolutePath(scriptPath)) {
    return {
      ok: false,
      reason: "invalid-script-path",
      commandParts: null,
      displayCommand: null,
      cwd: null,
      commandFamily,
    };
  }

  if (!isAbsolutePath(cwd)) {
    return {
      ok: false,
      reason: "invalid-cwd",
      commandParts: null,
      displayCommand: null,
      cwd: null,
      commandFamily,
    };
  }

  if (typeof displayScriptPath !== "string" || displayScriptPath.length === 0) {
    return {
      ok: false,
      reason: "invalid-display-script-path",
      commandParts: null,
      displayCommand: null,
      cwd: null,
      commandFamily,
    };
  }

  if (args === null) {
    return {
      ok: false,
      reason: "invalid-args",
      commandParts: null,
      displayCommand: null,
      cwd: null,
      commandFamily,
    };
  }

  const commandParts = [scriptPath, ...args];
  const displayCommand = [displayScriptPath, ...args].join(" ");

  return {
    ok: true,
    reason: null,
    commandParts,
    displayCommand,
    cwd,
    commandFamily,
  };
}

// Public command assembly API used by command handlers.
module.exports = {
  buildRunCommand,
};
