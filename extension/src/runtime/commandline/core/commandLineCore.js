"use strict";

const { spawn, spawnSync } = require("child_process");
const { isAbsoluteFilesystemPath } = require("../../workspaceFilesystem");

// ---------------------------------------------------------------------------
// SECTION 1: Process primitive
// ---------------------------------------------------------------------------

/**
 * Builds one deterministic spawn failure result.
 *
 * @param {string} reason Failure reason key.
 * @param {Error|null} [error] Underlying spawn error.
 * @returns {{ok: false, reason: string, error: Error|null, childProcess: null, handle: null}} Failure result.
 */
function createSpawnFailure(reason, error = null) {
  return {
    ok: false,
    reason,
    error: error || null,
    childProcess: null,
    handle: null,
  };
}

/**
 * Creates one process handle with normalized kill semantics.
 *
 * @param {import("child_process").ChildProcess} childProcess Spawned process.
 * @returns {{pid: number|null, isRunning: () => boolean, kill: (signal?: NodeJS.Signals|number) => {ok: boolean, reason: string|null}}} Process handle.
 */
function createProcessHandle(childProcess) {
  let running = true;

  childProcess.once("close", () => {
    running = false;
  });
  childProcess.once("exit", () => {
    running = false;
  });
  childProcess.once("error", () => {
    running = false;
  });

  return {
    pid: Number.isInteger(childProcess.pid) ? childProcess.pid : null,
    isRunning() {
      return running;
    },
    kill(signal) {
      if (!running) {
        return {
          ok: false,
          reason: "already-exited",
        };
      }

      try {
        const didSignal = childProcess.kill(signal);

        if (!didSignal) {
          return {
            ok: false,
            reason: "signal-not-delivered",
          };
        }

        return {
          ok: true,
          reason: null,
        };
      } catch (_) {
        return {
          ok: false,
          reason: "kill-failed",
        };
      }
    },
  };
}

/**
 * Spawns one process from normalized command spec.
 *
 * @param {{command?: string, args?: string[], cwd?: string, env?: NodeJS.ProcessEnv}} commandSpec Command specification.
 * @param {Function} [spawnFn] Spawn override for testing.
 * @returns {{ok: boolean, reason: string|null, error: Error|null, childProcess: import("child_process").ChildProcess|null, handle: {pid: number|null, isRunning: () => boolean, kill: (signal?: NodeJS.Signals|number) => {ok: boolean, reason: string|null}}|null}} Spawn result.
 */
function spawnProcessWithHandle(commandSpec, spawnFn) {
  const command = String(commandSpec?.command || "").trim();
  const args = Array.isArray(commandSpec?.args) ? commandSpec.args : null;
  const cwd = String(commandSpec?.cwd || "").trim();

  if (!command) {
    return createSpawnFailure("missing-command");
  }

  if (!args || args.some((arg) => typeof arg !== "string")) {
    return createSpawnFailure("invalid-args");
  }

  if (!cwd) {
    return createSpawnFailure("missing-cwd");
  }

  const resolvedSpawn = typeof spawnFn === "function" ? spawnFn : spawn;

  try {
    const childProcess = resolvedSpawn(command, args, {
      cwd,
      env: commandSpec?.env || process.env,
    });

    if (!childProcess || typeof childProcess.on !== "function") {
      return createSpawnFailure("spawn-return-invalid");
    }

    return {
      ok: true,
      reason: null,
      error: null,
      childProcess,
      handle: createProcessHandle(childProcess),
    };
  } catch (error) {
    return createSpawnFailure("spawn-failed", error);
  }
}

// ---------------------------------------------------------------------------
// SECTION 2: Command executor
// ---------------------------------------------------------------------------

/**
 * Executes a command through spawn and captures stdout/stderr.
 *
 * @param {{command?: string, args?: string[], cwd?: string, env?: object, spawnFn?: Function}} input Spawn command input.
 * @param {string[]} args Normalized command args.
 * @returns {Promise<{exitCode: number|null, stdout: string, stderr: string, combinedOutput: string}>} Captured process output.
 */
function executeSpawnCaptureFromCommand(input, args) {
  const command = String(input?.command || "").trim();
  const cwd = String(input?.cwd || "").trim();

  if (!command) {
    throw new Error("Spawn-capture execution requires command.");
  }

  if (!cwd) {
    throw new Error("Spawn-capture execution requires cwd.");
  }

  return new Promise((resolve, reject) => {
    const spawnResult = spawnProcessWithHandle(
      {
        command,
        args,
        cwd,
        env: input?.env || process.env,
      },
      input?.spawnFn
    );

    if (!spawnResult.ok || !spawnResult.childProcess) {
      reject(spawnResult.error || new Error(spawnResult.reason || "spawn-failed"));
      return;
    }

    const childProcess = spawnResult.childProcess;
    let stdout = "";
    let stderr = "";

    if (childProcess.stdout && typeof childProcess.stdout.setEncoding === "function") {
      childProcess.stdout.setEncoding("utf8");
    }

    if (childProcess.stderr && typeof childProcess.stderr.setEncoding === "function") {
      childProcess.stderr.setEncoding("utf8");
    }

    childProcess.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });

    childProcess.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    childProcess.on("error", (error) => {
      reject(error);
    });

    childProcess.on("close", (exitCode) => {
      resolve({
        exitCode: typeof exitCode === "number" ? exitCode : null,
        stdout,
        stderr,
        combinedOutput: [stdout, stderr].filter(Boolean).join("\n").trim(),
      });
    });
  });
}

/**
 * Executes one command through spawnSync with normalized result metadata.
 *
 * @param {{command?: string, args?: string[], cwd?: string, env?: object, timeout?: number, encoding?: BufferEncoding, spawnSyncFn?: Function, now?: Function}} input Spawn-sync execution input.
 * @returns {{ok: boolean, status: string, reason: string|null, exitCode: number|null, success: boolean, stdout: string, stderr: string, errorMessage: string|null, timestamp: number}} Spawn-sync result.
 */
function executeSpawnSyncCommand(input) {
  const command = String(input?.command || "").trim();

  if (!command) {
    throw new Error("Spawn-sync execution requires command.");
  }

  const args = Array.isArray(input?.args) ? input.args : [];
  const cwd = String(input?.cwd || "").trim() || process.cwd();
  const now = typeof input?.now === "function" ? input.now : Date.now;
  const resolvedSpawnSync =
    typeof input?.spawnSyncFn === "function" ? input.spawnSyncFn : spawnSync;

  try {
    const result = resolvedSpawnSync(command, args, {
      cwd,
      env: input?.env || process.env,
      encoding: input?.encoding || "utf8",
      timeout: Number.isFinite(input?.timeout) ? input.timeout : undefined,
    });
    const exitCode = typeof result?.status === "number" ? result.status : null;
    const errorMessage = result?.error ? String(result.error.message || "") : null;

    return {
      ok: errorMessage === null,
      status: errorMessage === null ? "completed" : "failed",
      reason: errorMessage === null ? null : "spawn-sync-failed",
      exitCode,
      success: errorMessage === null && exitCode === 0,
      stdout: String(result?.stdout || ""),
      stderr: String(result?.stderr || ""),
      errorMessage,
      timestamp: Number(now()),
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      reason: "spawn-sync-failed",
      exitCode: null,
      success: false,
      stdout: "",
      stderr: "",
      errorMessage: String(error?.message || ""),
      timestamp: Number(now()),
    };
  }
}

/**
 * Executes one command through the terminal runner.
 *
 * @param {{runCommand?: Function, build?: object, vscodeApi?: object, reuseTerminal?: boolean}} input Terminal execution input.
 * @returns {object} Terminal execution result.
 */
function executeTerminalCommand(input) {
  if (typeof input?.runCommand !== "function") {
    throw new Error("Terminal execution requires runCommand.");
  }

  return input.runCommand({
    build: input.build,
    vscodeApi: input.vscodeApi,
    reuseTerminal: input.reuseTerminal !== false,
  });
}

/**
 * Executes one command through spawn and captures normalized output metadata.
 *
 * @param {{command?: string, args?: string[], cwd?: string, env?: object, spawnFn?: Function, filterOutput?: Function, now?: Function}} input Spawn-capture execution input.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null, exitCode?: number|null, stdout?: string, stderr?: string, combinedOutput?: string, filteredOutput?: string, errorMessage?: string, timestamp: number}>} Spawn-capture result.
 */
async function executeSpawnCaptureCommand(input) {
  const now = typeof input?.now === "function" ? input.now : Date.now;
  const args = Array.isArray(input?.args) ? input.args : [];

  try {
    const result = await executeSpawnCaptureFromCommand(input, args);
    const combinedOutput = String(result?.combinedOutput || "");
    const filterOutput =
      typeof input?.filterOutput === "function" ? input.filterOutput : null;
    const filteredOutput = filterOutput
      ? String(filterOutput(combinedOutput) || "")
      : combinedOutput;

    return {
      ok: true,
      status: "completed",
      reason: null,
      exitCode: typeof result?.exitCode === "number" ? result.exitCode : null,
      stdout: String(result?.stdout || ""),
      stderr: String(result?.stderr || ""),
      combinedOutput,
      filteredOutput,
      timestamp: Number(now()),
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      reason: "spawn-capture-failed",
      errorMessage: String(error?.message || ""),
      timestamp: Number(now()),
    };
  }
}

/**
 * Executes a command using one supported execution mode.
 *
 * @param {{mode: "terminal-send"|"spawn-capture"|"spawn-sync", runCommand?: Function, build?: object, vscodeApi?: object, reuseTerminal?: boolean, command?: string, args?: string[], cwd?: string, env?: object, timeout?: number, encoding?: BufferEncoding, spawnSyncFn?: Function, spawnFn?: Function, filterOutput?: Function, now?: Function}} input Execution input.
 * @returns {object|Promise<object>} Normalized execution result.
 */
function executeCommand(input) {
  const mode = String(input?.mode || "");

  if (mode === "terminal-send") {
    return executeTerminalCommand(input);
  }

  if (mode === "spawn-capture") {
    return executeSpawnCaptureCommand(input);
  }

  if (mode === "spawn-sync") {
    return executeSpawnSyncCommand(input);
  }

  throw new Error("Unsupported command execution mode.");
}

// ---------------------------------------------------------------------------
// SECTION 3: Shell quoting
// ---------------------------------------------------------------------------

/**
 * Quotes one shell token for safe command display/execution text.
 *
 * @param {string} value Token value.
 * @returns {string} Single-quoted shell token.
 */
function quoteShellToken(value) {
  return `'${String(value).replace(/'/g, `"'"'`)}'`;
}

/**
 * Renders command parts into shell-safe text.
 *
 * @param {string[]} commandParts Ordered command parts.
 * @returns {string} Shell-safe command text.
 */
function renderShellCommand(commandParts) {
  if (!Array.isArray(commandParts)) {
    return "";
  }

  return commandParts.map((part) => quoteShellToken(part)).join(" ");
}

// ---------------------------------------------------------------------------
// SECTION 4: Command build helpers
// ---------------------------------------------------------------------------

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
 * @param {{scriptPath?: string, displayScriptPath?: string, cwd?: string, commandFamily?: string, args?: unknown}} input Command assembly input.
 * @returns {{ok: boolean, reason: string|null, commandParts: string[]|null, displayCommand: string|null, cwd: string|null, commandFamily: string|null}} Deterministic command assembly output.
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

  if (!isAbsoluteFilesystemPath(scriptPath)) {
    return {
      ok: false,
      reason: "invalid-script-path",
      commandParts: null,
      displayCommand: null,
      cwd: null,
      commandFamily,
    };
  }

  if (!isAbsoluteFilesystemPath(cwd)) {
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

// ---------------------------------------------------------------------------
// SECTION 5: Argument source combiner
// ---------------------------------------------------------------------------

/**
 * Combines ordered argument sources into one final args list.
 *
 * @param {{baseArgs?: string[], sources?: {name: string, result: {ok?: boolean, tokens?: string[], reason?: string|null}, reasonKey: string, fallbackGuidance: string, severity?: "info"|"warning"|"error", position?: "before-base"|"after-base"}[]}} input Combiner input.
 * @returns {{ok: boolean, args: string[], validation: {reason: string, guidance: string, severity: "info"|"warning"|"error"}|null}} Combined args output.
 */
function combineArgumentSources(input) {
  const baseArgs = Array.isArray(input?.baseArgs) ? input.baseArgs : [];
  const sources = Array.isArray(input?.sources) ? input.sources : [];

  const normalizedBaseArgs = [];

  for (const arg of baseArgs) {
    if (typeof arg !== "string") {
      return {
        ok: false,
        args: [],
        validation: {
          reason: "invalid-base-args",
          guidance: "Base command arguments are invalid.",
          severity: "error",
        },
      };
    }

    normalizedBaseArgs.push(arg);
  }

  const beforeBaseTokens = [];
  const afterBaseTokens = [];

  for (const source of sources) {
    const result = source?.result || {};

    if (!result.ok) {
      return {
        ok: false,
        args: [],
        validation: {
          reason: String(source?.reasonKey || "invalid-argument-source"),
          guidance:
            String(result.reason || "").trim()
            || String(source?.fallbackGuidance || "Argument source is invalid."),
          severity: source?.severity || "warning",
        },
      };
    }

    const tokens = Array.isArray(result.tokens) ? result.tokens : [];

    for (const token of tokens) {
      if (typeof token !== "string") {
        return {
          ok: false,
          args: [],
          validation: {
            reason: String(source?.reasonKey || "invalid-argument-source"),
            guidance: String(source?.fallbackGuidance || "Argument source is invalid."),
            severity: source?.severity || "warning",
          },
        };
      }
    }

    const destination = source?.position === "after-base" ? afterBaseTokens : beforeBaseTokens;
    destination.push(...tokens);
  }

  return {
    ok: true,
    args: [...beforeBaseTokens, ...normalizedBaseArgs, ...afterBaseTokens],
    validation: null,
  };
}

// ---------------------------------------------------------------------------
// SECTION 6: Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Process primitive
  spawnProcessWithHandle,
  // Command executor
  executeCommand,
  // Shell quoting
  quoteShellToken,
  renderShellCommand,
  // Command build helpers
  normalizeArgs,
  buildRunCommand,
  // Argument source combiner
  combineArgumentSources,
};
