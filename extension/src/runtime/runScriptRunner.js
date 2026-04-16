// Shared terminal label used for extension-owned execution sessions.
const TERMINAL_NAME = "Algorithms Runner";

// Cached terminal reference so repeated runs can reuse the same owned terminal.
let extensionOwnedTerminal = null;
// Subscription used to clear cached terminal when VS Code closes it.
let terminalCloseSubscription = null;

/**
 * Runner lifecycle result shape.
 *
 * @typedef {object} RunLifecycleResult
 * @property {boolean} ok Whether the action succeeded.
 * @property {string} status Lifecycle status (`started`, `completed`, `failed`, or `blocked`).
 * @property {string|null} reason Deterministic reason key when blocked or failed.
 * @property {string|null} commandFamily Command family identifier.
 * @property {string|null} scriptPath Canonical absolute script path.
 * @property {string|null} cwd Canonical absolute working directory.
 * @property {string|null} displayCommand User-facing command string.
 * @property {number} timestamp Epoch milliseconds at emission time.
 */

/**
 * Resolves VS Code API object, preferring injected dependency for tests.
 *
 * @param {object|undefined} injectedVscode Optional injected VS Code API.
 * @returns {object|null} VS Code API object or null when unavailable.
 */
function resolveVscodeApi(injectedVscode) {
  if (injectedVscode) {
    return injectedVscode;
  }

  try {
    // Lazy load so runtime harnesses can inject a mock without requiring vscode.
    return require("vscode");
  } catch (_) {
    return null;
  }
}

/**
 * Quotes one shell token for safe command display/execution text.
 *
 * @param {string} value Token value.
 * @returns {string} Single-quoted shell token.
 */
function quoteShellToken(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

/**
 * Renders internal absolute command parts into shell text.
 *
 * @param {string[]} commandParts Absolute command parts.
 * @returns {string} Shell-safe command text.
 */
function renderShellCommand(commandParts) {
  return commandParts.map((part) => quoteShellToken(part)).join(" ");
}

/**
 * Logs compact metadata according to extension-light policy.
 *
 * @param {(message: string) => void} logger Logger function.
 * @param {RunLifecycleResult} payload Lifecycle payload.
 * @returns {void}
 */
function logLifecycle(logger, payload) {
  const message = [
    "[algorithms-runner]",
    `lifecycle=${payload.status}`,
    `family=${payload.commandFamily || "unknown"}`,
    `script=${payload.scriptPath || "n/a"}`,
    `cwd=${payload.cwd || "n/a"}`,
    `reason=${payload.reason || "none"}`,
  ].join(" ");

  logger(message);
}

/**
 * Registers one terminal-close listener to clear stale cached terminal handles.
 *
 * @param {object} vscodeApi VS Code API object.
 * @returns {void}
 */
function ensureTerminalCloseListener(vscodeApi) {
  if (terminalCloseSubscription) {
    return;
  }

  if (
    !vscodeApi
    || !vscodeApi.window
    || typeof vscodeApi.window.onDidCloseTerminal !== "function"
  ) {
    return;
  }

  terminalCloseSubscription = vscodeApi.window.onDidCloseTerminal((closedTerminal) => {
    if (closedTerminal === extensionOwnedTerminal) {
      extensionOwnedTerminal = null;
    }
  });
}

/**
 * Returns an extension-owned terminal and never adopts external terminals.
 *
 * @param {{vscodeApi: object, reuseTerminal?: boolean}} options Terminal acquisition options.
 * @returns {{ok: boolean, terminal: object|null, reason: string|null}} Terminal acquisition result.
 */
function getOwnedTerminal(options) {
  const vscodeApi = options.vscodeApi;
  const reuseTerminal = options.reuseTerminal !== false;

  if (!vscodeApi || !vscodeApi.window || typeof vscodeApi.window.createTerminal !== "function") {
    return {
      ok: false,
      terminal: null,
      reason: "vscode-api-unavailable",
    };
  }

  ensureTerminalCloseListener(vscodeApi);

  if (reuseTerminal && extensionOwnedTerminal) {
    return {
      ok: true,
      terminal: extensionOwnedTerminal,
      reason: null,
    };
  }

  const terminal = vscodeApi.window.createTerminal({
    name: TERMINAL_NAME,
  });

  if (!terminal || typeof terminal.sendText !== "function" || typeof terminal.show !== "function") {
    return {
      ok: false,
      terminal: null,
      reason: "terminal-create-failed",
    };
  }

  if (reuseTerminal) {
    extensionOwnedTerminal = terminal;
  }

  return {
    ok: true,
    terminal,
    reason: null,
  };
}

/**
 * Starts a run invocation in the extension-owned terminal.
 *
 * Input `build` should come from argumentBuilder
 * and preserve canonical path artifacts.
 *
 * @param {{build: {ok: boolean, reason: string|null, commandParts: string[]|null, displayCommand: string|null, cwd: string|null, commandFamily: string|null}, reuseTerminal?: boolean, vscodeApi?: object, logger?: (message: string) => void, now?: () => number}} options Runner options.
 * @returns {RunLifecycleResult} Lifecycle result with `started` or `blocked` state.
 */
function runCommand(options) {
  const logger = options.logger || console.log;
  const now = options.now || Date.now;
  const build = options.build;

  if (!build || !build.ok) {
    const blocked = {
      ok: false,
      status: "blocked",
      reason: build?.reason || "invalid-build",
      commandFamily: build?.commandFamily || null,
      scriptPath: null,
      cwd: null,
      displayCommand: null,
      timestamp: now(),
    };
    logLifecycle(logger, blocked);
    return blocked;
  }

  if (!Array.isArray(build.commandParts) || build.commandParts.length === 0) {
    const blocked = {
      ok: false,
      status: "blocked",
      reason: "missing-command-parts",
      commandFamily: build.commandFamily,
      scriptPath: null,
      cwd: build.cwd,
      displayCommand: build.displayCommand,
      timestamp: now(),
    };
    logLifecycle(logger, blocked);
    return blocked;
  }

  if (typeof build.cwd !== "string" || build.cwd.length === 0) {
    const blocked = {
      ok: false,
      status: "blocked",
      reason: "missing-cwd",
      commandFamily: build.commandFamily,
      scriptPath: build.commandParts[0] || null,
      cwd: null,
      displayCommand: build.displayCommand,
      timestamp: now(),
    };
    logLifecycle(logger, blocked);
    return blocked;
  }

  if (typeof build.displayCommand !== "string" || build.displayCommand.length === 0) {
    const blocked = {
      ok: false,
      status: "blocked",
      reason: "missing-display-command",
      commandFamily: build.commandFamily,
      scriptPath: build.commandParts[0] || null,
      cwd: build.cwd,
      displayCommand: null,
      timestamp: now(),
    };
    logLifecycle(logger, blocked);
    return blocked;
  }

  const vscodeApi = resolveVscodeApi(options.vscodeApi);
  const terminalResult = getOwnedTerminal({
    vscodeApi,
    reuseTerminal: options.reuseTerminal,
  });

  if (!terminalResult.ok || !terminalResult.terminal) {
    const blocked = {
      ok: false,
      status: "blocked",
      reason: terminalResult.reason || "terminal-unavailable",
      commandFamily: build.commandFamily,
      scriptPath: build.commandParts[0] || null,
      cwd: build.cwd,
      displayCommand: build.displayCommand,
      timestamp: now(),
    };
    logLifecycle(logger, blocked);
    return blocked;
  }

  const terminal = terminalResult.terminal;
  const cdPrefix = `cd ${quoteShellToken(build.cwd)} && `;
  const commandText = renderShellCommand(build.commandParts);
  const shellText = `${cdPrefix}${commandText}`;

  try {
    terminal.show();
    terminal.sendText(shellText, true);
  } catch (_) {
    if (terminal === extensionOwnedTerminal) {
      extensionOwnedTerminal = null;
    }

    const retryTerminalResult = getOwnedTerminal({
      vscodeApi,
      reuseTerminal: options.reuseTerminal,
    });

    if (!retryTerminalResult.ok || !retryTerminalResult.terminal) {
      const blocked = {
        ok: false,
        status: "blocked",
        reason: retryTerminalResult.reason || "terminal-send-failed",
        commandFamily: build.commandFamily,
        scriptPath: build.commandParts[0] || null,
        cwd: build.cwd,
        displayCommand: build.displayCommand,
        timestamp: now(),
      };
      logLifecycle(logger, blocked);
      return blocked;
    }

    try {
      retryTerminalResult.terminal.show();
      retryTerminalResult.terminal.sendText(shellText, true);
    } catch (_) {
      const blocked = {
        ok: false,
        status: "blocked",
        reason: "terminal-send-failed",
        commandFamily: build.commandFamily,
        scriptPath: build.commandParts[0] || null,
        cwd: build.cwd,
        displayCommand: build.displayCommand,
        timestamp: now(),
      };
      logLifecycle(logger, blocked);
      return blocked;
    }
  }

  const started = {
    ok: true,
    status: "started",
    reason: null,
    commandFamily: build.commandFamily,
    scriptPath: build.commandParts[0] || null,
    cwd: build.cwd,
    displayCommand: build.displayCommand,
    timestamp: now(),
  };

  logLifecycle(logger, started);
  return started;
}

/**
 * Emits a completion lifecycle metadata event.
 *
 * @param {{commandFamily?: string|null, scriptPath?: string|null, cwd?: string|null, displayCommand?: string|null}} context Previous run context.
 * @param {{logger?: (message: string) => void, now?: () => number}} [options] Optional logger/time providers.
 * @returns {RunLifecycleResult} Completed lifecycle payload.
 */
function markRunCompleted(context, options = {}) {
  const logger = options.logger || console.log;
  const now = options.now || Date.now;

  const payload = {
    ok: true,
    status: "completed",
    reason: null,
    commandFamily: context?.commandFamily || null,
    scriptPath: context?.scriptPath || null,
    cwd: context?.cwd || null,
    displayCommand: context?.displayCommand || null,
    timestamp: now(),
  };

  logLifecycle(logger, payload);
  return payload;
}

/**
 * Emits a failure lifecycle metadata event.
 *
 * @param {{commandFamily?: string|null, scriptPath?: string|null, cwd?: string|null, displayCommand?: string|null}} context Previous run context.
 * @param {string} reason Failure reason key.
 * @param {{logger?: (message: string) => void, now?: () => number}} [options] Optional logger/time providers.
 * @returns {RunLifecycleResult} Failed lifecycle payload.
 */
function markRunFailed(context, reason, options = {}) {
  const logger = options.logger || console.log;
  const now = options.now || Date.now;

  const payload = {
    ok: false,
    status: "failed",
    reason: reason || "unknown-failure",
    commandFamily: context?.commandFamily || null,
    scriptPath: context?.scriptPath || null,
    cwd: context?.cwd || null,
    displayCommand: context?.displayCommand || null,
    timestamp: now(),
  };

  logLifecycle(logger, payload);
  return payload;
}

// Public runner API plus test-facing internals.
module.exports = {
  TERMINAL_NAME,
  runCommand,
  markRunCompleted,
  markRunFailed,
  renderShellCommand,
  _internal: {
    resolveVscodeApi,
    getOwnedTerminal,
    quoteShellToken,
    logLifecycle,
    ensureTerminalCloseListener,
  },
};
