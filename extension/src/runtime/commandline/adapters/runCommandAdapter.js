const {
  quoteShellToken,
  renderShellCommand,
  buildRunCommand,
  combineArgumentSources,
} = require("../core/commandLineCore");
const {
  createRuntimeProcessLifecycle,
} = require("../../process/runtimeProcessLifecycle");

// Shared terminal label used for extension-owned execution sessions.
const TERMINAL_NAME = "Algorithms Runner";

// Cached terminal reference so repeated runs can reuse the same owned terminal.
let extensionOwnedTerminal = null;
// Subscription used to clear cached terminal when VS Code closes it.
let terminalCloseSubscription = null;
const runtimeProcessLifecycle = createRuntimeProcessLifecycle();

/**
 * Builds one owner key used for runtime process metadata.
 *
 * @param {{algorithmDir?: string}|undefined} contextResolution Run context resolution.
 * @param {{commandFamily?: string}|undefined} execution Execution metadata.
 * @returns {string} Stable owner key.
 */
function buildRunOwnerKey(contextResolution, execution) {
  const commandFamily = String(execution?.commandFamily || "unknown").trim() || "unknown";
  const algorithmDir = String(contextResolution?.algorithmDir || "unknown").trim() || "unknown";
  return `run:${commandFamily}:${algorithmDir}`;
}

/**
 * Begins lifecycle metadata tracking for one run command attempt.
 *
 * @param {{runtimeProcessLifecycle?: object, contextResolution?: object, execution?: object, build?: object}} input Lifecycle context.
 * @returns {{ok: boolean, ownerKey: string, processId: string|null, runToken: number}} Begin-run result.
 */
function beginRunLifecycle(input) {
  const lifecycle = input?.runtimeProcessLifecycle;

  if (!lifecycle || typeof lifecycle.beginRun !== "function") {
    return {
      ok: false,
      ownerKey: "",
      processId: null,
      runToken: 0,
    };
  }

  return lifecycle.beginRun({
    ownerKey: buildRunOwnerKey(input?.contextResolution, input?.execution),
    processType: "run",
    commandFamily: input?.execution?.commandFamily || null,
    scriptPath: input?.build?.commandParts?.[0] || input?.contextResolution?.scriptPath || null,
    cwd: input?.build?.cwd || input?.contextResolution?.algorithmDir || null,
    displayCommand: input?.build?.displayCommand || null,
    metadata: {
      commandLabel: input?.execution?.commandLabel || null,
      mode: "terminal-send",
    },
  });
}

/**
 * Records one failed lifecycle attempt when beginRun succeeded.
 *
 * @param {{runtimeProcessLifecycle?: object, lifecycleRun?: object, reason?: string, message?: string}} input Lifecycle payload.
 * @returns {void}
 */
function markRunLifecycleFailure(input) {
  const lifecycle = input?.runtimeProcessLifecycle;
  const lifecycleRun = input?.lifecycleRun;

  if (
    !lifecycle
    || typeof lifecycle.markFailed !== "function"
    || !lifecycleRun
    || lifecycleRun.ok !== true
    || !lifecycleRun.processId
  ) {
    return;
  }

  lifecycle.markFailed({
    ownerKey: lifecycleRun.ownerKey,
    processId: lifecycleRun.processId,
    runToken: lifecycleRun.runToken,
    errorMessage: String(input?.message || input?.reason || "run-failed"),
    reason: String(input?.reason || "run-failed"),
  });
}

/**
 * Records one started terminal-send lifecycle record as immediately completed metadata.
 *
 * @param {{runtimeProcessLifecycle?: object, lifecycleRun?: object}} input Lifecycle payload.
 * @returns {void}
 */
function markRunLifecycleTerminalStarted(input) {
  const lifecycle = input?.runtimeProcessLifecycle;
  const lifecycleRun = input?.lifecycleRun;

  if (
    !lifecycle
    || typeof lifecycle.markCompleted !== "function"
    || !lifecycleRun
    || lifecycleRun.ok !== true
    || !lifecycleRun.processId
  ) {
    return;
  }

  lifecycle.markCompleted({
    ownerKey: lifecycleRun.ownerKey,
    processId: lifecycleRun.processId,
    runToken: lifecycleRun.runToken,
    exitCode: null,
    signal: null,
    reason: "terminal-fire-and-forget",
  });
}

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
    return require("vscode");
  } catch (_) {
    return null;
  }
}

/**
 * Logs compact metadata according to extension-light policy.
 *
 * @param {(message: string) => void} logger Logger function.
 * @param {{status: string, commandFamily?: string|null, scriptPath?: string|null, cwd?: string|null, reason?: string|null}} payload Lifecycle payload.
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
 * @param {{build: {ok: boolean, reason: string|null, commandParts: string[]|null, displayCommand: string|null, cwd: string|null, commandFamily: string|null}, reuseTerminal?: boolean, vscodeApi?: object, logger?: (message: string) => void, now?: () => number}} options Runner options.
 * @returns {{ok: boolean, status: string, reason: string|null, commandFamily: string|null, scriptPath: string|null, cwd: string|null, displayCommand: string|null, timestamp: number}} Lifecycle result.
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
 * @returns {{ok: true, status: string, reason: null, commandFamily: string|null, scriptPath: string|null, cwd: string|null, displayCommand: string|null, timestamp: number}} Completed lifecycle payload.
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
 * @returns {{ok: false, status: string, reason: string, commandFamily: string|null, scriptPath: string|null, cwd: string|null, displayCommand: string|null, timestamp: number}} Failed lifecycle payload.
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

/**
 * Creates a run command adapter that orchestrates token sources, build, and execution.
 *
 * @param {{
 *   buildRunCommand: Function,
 *   runCommand: Function,
 *   executeCommandFn?: Function,
 *   getEffectiveSidebarRunArgs: Function,
 *   getEffectiveSidebarSourceProfile: Function,
 *   getEffectiveSidebarRunChecks: Function,
 *   blockWithValidation: Function,
 *   showNotificationBySeverity: Function,
 *   buildBuildFailureMessage: Function,
 *   buildRuntimeFailureMessage: Function,
 *   buildSuccessMessage: Function
 * }} deps Adapter dependencies.
 * @returns {{executeContextCommand: Function}} Adapter API.
 */
function createRunCommandAdapter(deps) {
  const executeRunCommand = typeof deps?.runCommand === "function" ? deps.runCommand : runCommand;
  const buildRunCommandFn = typeof deps?.buildRunCommand === "function"
    ? deps.buildRunCommand
    : buildRunCommand;
  const lifecycle = deps?.runtimeProcessLifecycle || runtimeProcessLifecycle;

  /**
   * Executes a context command using normalized argument-source orchestration.
   *
   * @param {{vscodeApi: import("vscode"), contextResolution: {algorithmDir: string, scriptPath: string, displayScriptPath: string}, execution: {commandFamily: string, args: string[], commandLabel: string, successMessage?: string, includeSidebarRunArgs?: boolean, includeSidebarSourceProfile?: boolean, includeSidebarRunChecks?: boolean}}} input Execution input.
   * @returns {{ok: boolean, status: string, reason: string|null}} Handler execution summary.
   */
  function executeContextCommand(input) {
    const vscodeApi = input?.vscodeApi;
    const contextResolution = input?.contextResolution;
    const execution = input?.execution || {};
    const baseArgs = Array.isArray(execution.args) ? execution.args : [];

    const includeSidebarRunArgs = Boolean(execution.includeSidebarRunArgs);
    const includeSidebarSourceProfile = Boolean(execution.includeSidebarSourceProfile);
    const includeSidebarRunChecks = Boolean(execution.includeSidebarRunChecks);

    const sourceResults = [];

    if (includeSidebarRunArgs) {
      const runArgs = deps.getEffectiveSidebarRunArgs();
      sourceResults.push({
        name: "sidebar-run-args",
        result: runArgs,
        reasonKey: "invalid-sidebar-run-args",
        fallbackGuidance: "Custom run args are invalid.",
        position: "after-base",
      });
    }

    if (includeSidebarSourceProfile) {
      const sourceProfile = deps.getEffectiveSidebarSourceProfile();
      sourceResults.push({
        name: "sidebar-source-profile",
        result: sourceProfile,
        reasonKey: "invalid-sidebar-source-profile",
        fallbackGuidance: "Source profile input is invalid.",
      });
    }

    if (includeSidebarRunChecks) {
      const runChecks = deps.getEffectiveSidebarRunChecks();
      sourceResults.push({
        name: "sidebar-run-checks",
        result: runChecks,
        reasonKey: "invalid-sidebar-run-checks",
        fallbackGuidance: "Run Checks selection is invalid.",
      });
    }

    const combinedArgs = combineArgumentSources({
      baseArgs,
      sources: sourceResults,
    });

    if (!combinedArgs.ok) {
      const lifecycleRun = beginRunLifecycle({
        runtimeProcessLifecycle: lifecycle,
        contextResolution,
        execution,
      });
      markRunLifecycleFailure({
        runtimeProcessLifecycle: lifecycle,
        lifecycleRun,
        reason: combinedArgs.validation?.reason || "invalid-args",
        message: combinedArgs.validation?.guidance || "Command arguments are invalid.",
      });

      return deps.blockWithValidation(
        vscodeApi,
        combinedArgs.validation || {
          reason: "invalid-args",
          guidance: "Command arguments are invalid.",
          severity: "warning",
        },
        execution.commandLabel
      );
    }

    const build = buildRunCommandFn({
      scriptPath: contextResolution.scriptPath,
      displayScriptPath: contextResolution.displayScriptPath,
      cwd: contextResolution.algorithmDir,
      commandFamily: execution.commandFamily,
      args: combinedArgs.args,
    });

    if (!build.ok) {
      const lifecycleRun = beginRunLifecycle({
        runtimeProcessLifecycle: lifecycle,
        contextResolution,
        execution,
        build,
      });
      markRunLifecycleFailure({
        runtimeProcessLifecycle: lifecycle,
        lifecycleRun,
        reason: build.reason || "build-failed",
        message: deps.buildBuildFailureMessage(execution.commandLabel, build.reason),
      });

      deps.showNotificationBySeverity(
        vscodeApi,
        "error",
        deps.buildBuildFailureMessage(execution.commandLabel, build.reason)
      );

      return {
        ok: false,
        status: "blocked",
        reason: build.reason,
      };
    }

    const lifecycleRun = beginRunLifecycle({
      runtimeProcessLifecycle: lifecycle,
      contextResolution,
      execution,
      build,
    });

    const effectiveRunResult = deps.executeCommandFn
      ? deps.executeCommandFn({
        mode: "terminal-send",
        build,
        runCommand: executeRunCommand,
        vscodeApi,
        reuseTerminal: true,
      })
      : executeRunCommand({
        build,
        vscodeApi,
        reuseTerminal: true,
      });

    if (!effectiveRunResult.ok) {
      markRunLifecycleFailure({
        runtimeProcessLifecycle: lifecycle,
        lifecycleRun,
        reason: effectiveRunResult.reason || "runtime-failed",
        message: deps.buildRuntimeFailureMessage(
          execution.commandLabel,
          effectiveRunResult.reason
        ),
      });

      deps.showNotificationBySeverity(
        vscodeApi,
        "error",
        deps.buildRuntimeFailureMessage(
          execution.commandLabel,
          effectiveRunResult.reason
        )
      );

      return {
        ok: false,
        status: effectiveRunResult.status,
        reason: effectiveRunResult.reason,
      };
    }

    markRunLifecycleTerminalStarted({
      runtimeProcessLifecycle: lifecycle,
      lifecycleRun,
    });

    deps.showNotificationBySeverity(
      vscodeApi,
      "info",
      execution.successMessage || deps.buildSuccessMessage(execution.commandLabel)
    );

    return {
      ok: true,
      status: effectiveRunResult.status,
      reason: null,
    };
  }

  return {
    executeContextCommand,
  };
}

module.exports = {
  TERMINAL_NAME,
  runCommand,
  markRunCompleted,
  markRunFailed,
  createRunCommandAdapter,
  _internal: {
    resolveVscodeApi,
    getOwnedTerminal,
    logLifecycle,
    ensureTerminalCloseListener,
    buildRunOwnerKey,
    beginRunLifecycle,
    markRunLifecycleFailure,
    markRunLifecycleTerminalStarted,
  },
};
