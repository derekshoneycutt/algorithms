const {
  actionCreators,
  extensionStateStore,
  selectSmokeRunTokenForAlgorithm,
} = require("../state/extensionStateStore");
const {
  spawnProcessWithHandle,
} = require("../commandline/core/commandLineCore");
const {
  createRuntimeProcessLifecycle,
} = require("./runtimeProcessLifecycle");

const SMOKE_TEST_OUTPUT_CHANNEL_NAME = "Algorithms Smoke Test";

/**
 * Creates smoke process lifecycle orchestration for algorithms view actions.
 *
 * @param {{vscodeApi: import("vscode"), parseSmokeStatusLine: (line: string) => ({languageKey: string, smokeStatus: "queued"|"running"|"passed"|"failed"|"stopped"}|null), spawnProcess?: (command: string, args: string[], options: {cwd: string}) => import("child_process").ChildProcess, spawnProcessWithHandleFn?: (commandSpec: {command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv}) => {ok: boolean, reason: string|null, error: Error|null, childProcess: import("child_process").ChildProcess|null, handle: {pid: number|null, isRunning: () => boolean, kill: (signal?: NodeJS.Signals|number) => {ok: boolean, reason: string|null}}|null}, onRunStarted?: (algorithmPath: string, runToken: number) => void, onSmokeLanguageStatus?: (algorithmPath: string, languageKey: string, smokeStatus: "queued"|"running"|"passed"|"failed"|"stopped") => void, onRunStopped?: (algorithmPath: string, runToken: number) => void, onRunFailed?: (algorithmPath: string, errorMessage: string, runToken: number) => void, onRunCompleted?: (algorithmPath: string, details: {exitCode: number|null, signal: string|null, runToken: number}) => void}} options Lifecycle options.
 * @returns {{seedSmokeStateForRun: (options: {algorithmPath: string, smokeLanguageKeys: string[], hasFilesByLanguageKey: Map<string, boolean>}) => string[], startRun: (options: {algorithmPath: string, smokeScriptPath: string, smokeArgs: string[], cwd: string}) => {ok: boolean, reason: string|null}, stopRun: (algorithmPath: string, options?: {markStopped?: boolean, invalidateRunToken?: boolean}) => boolean, append: (text: string) => void, appendLine: (text: string) => void, showOutput: () => void, dispose: () => void}} Lifecycle manager API.
 */
function createSmokeProcessLifecycle(options) {
  const vscodeApi = options.vscodeApi;
  const parseSmokeStatusLine = options.parseSmokeStatusLine;
  const spawnProcessWithHandleFn =
    typeof options.spawnProcessWithHandleFn === "function"
      ? options.spawnProcessWithHandleFn
      : (commandSpec) => {
          const spawnFn =
            typeof options.spawnProcess === "function" ? options.spawnProcess : undefined;
          return spawnProcessWithHandle(commandSpec, spawnFn);
        };
  const onSmokeLanguageStatus =
    typeof options.onSmokeLanguageStatus === "function"
      ? options.onSmokeLanguageStatus
      : () => {};
  const onRunStarted =
    typeof options.onRunStarted === "function"
      ? options.onRunStarted
      : () => {};
  const onRunStopped =
    typeof options.onRunStopped === "function"
      ? options.onRunStopped
      : () => {};
  const onRunFailed =
    typeof options.onRunFailed === "function"
      ? options.onRunFailed
      : () => {};
  const onRunCompleted =
    typeof options.onRunCompleted === "function"
      ? options.onRunCompleted
      : () => {};

  const smokeBufferStateByAlgorithmPath = new Map();
  const runtimeLifecycle = createRuntimeProcessLifecycle();
  const smokeOutputChannel = vscodeApi.window.createOutputChannel(
    SMOKE_TEST_OUTPUT_CHANNEL_NAME
  );

  /**
   * Returns whether one callback belongs to the current smoke run token.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number} runToken Smoke run token.
   * @returns {boolean} True when run token is current.
   */
  function isCurrentSmokeRun(algorithmPath, runToken) {
    return runtimeLifecycle.isCurrentRun(algorithmPath, runToken);
  }

  /**
   * Returns whether one callback belongs to a run stopped by the user.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number} runToken Smoke run token.
   * @returns {boolean} True when callback belongs to a stopped run token.
   */
  function isStoppedSmokeRun(algorithmPath, runToken) {
    return runtimeLifecycle.isStoppedRun(algorithmPath, runToken);
  }

  /**
   * Removes in-memory process and buffer entries for one algorithm.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @returns {void}
   */
  function cleanupRuntimeEntries(algorithmPath) {
    smokeBufferStateByAlgorithmPath.delete(algorithmPath);
  }

  /**
   * Appends process output and emits parsed smoke status updates.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {number} runToken Smoke run token.
   * @param {string} chunk Output text chunk.
   * @param {"stdoutBuffer"|"stderrBuffer"} bufferKey Buffer property key.
   * @returns {void}
   */
  function processOutputChunk(algorithmPath, runToken, chunk, bufferKey) {
    const bufferState = smokeBufferStateByAlgorithmPath.get(algorithmPath);

    if (!bufferState) {
      return;
    }

    bufferState[bufferKey] += chunk;
    smokeOutputChannel.append(chunk);

    const lines = bufferState[bufferKey].split(/\r?\n/);
    bufferState[bufferKey] = lines.pop() || "";

    for (const line of lines) {
      const parsedLine = parseSmokeStatusLine(line);

      if (!parsedLine || !isCurrentSmokeRun(algorithmPath, runToken)) {
        continue;
      }

      onSmokeLanguageStatus(
        algorithmPath,
        parsedLine.languageKey,
        parsedLine.smokeStatus
      );
    }
  }

  /**
   * Seeds smoke runtime state for one algorithm before starting a run.
   *
   * @param {{algorithmPath: string, smokeLanguageKeys: string[], hasFilesByLanguageKey: Map<string, boolean>}} options Seed options.
   * @returns {string[]} Seeded smoke language keys.
   */
  function seedSmokeStateForRun(options) {
    const algorithmPath = String(options.algorithmPath || "");
    const smokeLanguageKeys = Array.isArray(options.smokeLanguageKeys)
      ? options.smokeLanguageKeys
      : [];
    const hasFilesByLanguageKey =
      options.hasFilesByLanguageKey instanceof Map
        ? options.hasFilesByLanguageKey
        : new Map();

    if (!algorithmPath) {
      return [];
    }

    const smokeState = new Map();

    for (const languageKey of smokeLanguageKeys) {
      const normalizedLanguageKey = String(languageKey || "");

      if (!normalizedLanguageKey) {
        continue;
      }

      const hasFiles = hasFilesByLanguageKey.get(normalizedLanguageKey) === true;

      smokeState.set(normalizedLanguageKey, {
        status: hasFiles ? "queued" : "failed",
        locked: !hasFiles,
      });
    }

    extensionStateStore.dispatch(
      actionCreators.replaceSmokeStateForAlgorithm(algorithmPath, smokeState)
    );

    return Array.from(smokeState.keys());
  }

  /**
   * Starts one smoke process run for an algorithm.
   *
   * @param {{algorithmPath: string, smokeScriptPath: string, smokeArgs: string[], cwd: string}} runOptions Run configuration.
   * @returns {{ok: boolean, reason: string|null}} Start result.
   */
  function startRun(runOptions) {
    const algorithmPath = String(runOptions.algorithmPath || "");
    const smokeScriptPath = String(runOptions.smokeScriptPath || "");
    const smokeArgs = Array.isArray(runOptions.smokeArgs) ? runOptions.smokeArgs : [];
    const cwd = String(runOptions.cwd || "");

    if (!algorithmPath || !smokeScriptPath || !cwd) {
      return {
        ok: false,
        reason: "invalid-start-arguments",
      };
    }

    stopRun(algorithmPath, {
      markStopped: false,
      invalidateRunToken: true,
    });

    const lifecycleRun = runtimeLifecycle.beginRun({
      ownerKey: algorithmPath,
      processType: "smoke",
      commandFamily: "smoke",
      scriptPath: smokeScriptPath,
      cwd,
      displayCommand: `sh ${[smokeScriptPath, `--dir=${algorithmPath}`, ...smokeArgs].join(" ")}`,
      metadata: {
        smokeArgs,
      },
    });

    if (!lifecycleRun.ok || !lifecycleRun.processId) {
      return {
        ok: false,
        reason: "invalid-start-arguments",
      };
    }

    const runToken = lifecycleRun.runToken;
    extensionStateStore.dispatch(actionCreators.setSmokeRunToken(algorithmPath, runToken));
    extensionStateStore.dispatch(
      actionCreators.setStoppedSmokeRunToken(algorithmPath, null)
    );
    extensionStateStore.dispatch(actionCreators.setSmokeProcessError(algorithmPath, ""));
    extensionStateStore.dispatch(
      actionCreators.setSmokeProcessExit(algorithmPath, null, null)
    );

    const smokeCommandArgs = [smokeScriptPath, `--dir=${algorithmPath}`, ...smokeArgs];

    let smokeProcess;
    let smokeHandle;

    try {
      const spawnResult = spawnProcessWithHandleFn({
        command: "sh",
        args: smokeCommandArgs,
        cwd,
        env: process.env,
      });

      if (!spawnResult.ok || !spawnResult.childProcess) {
        throw spawnResult.error || new Error(spawnResult.reason || "spawn-failed");
      }

      smokeProcess = spawnResult.childProcess;
      smokeHandle = spawnResult.handle || null;
    } catch (error) {
      extensionStateStore.dispatch(
        actionCreators.setSmokeProcessError(algorithmPath, String(error?.message || ""))
      );
      return {
        ok: false,
        reason: "spawn-failed",
      };
    }

    smokeBufferStateByAlgorithmPath.set(algorithmPath, {
      stdoutBuffer: "",
      stderrBuffer: "",
    });

    runtimeLifecycle.attachSpawnedProcess({
      ownerKey: algorithmPath,
      processId: lifecycleRun.processId,
      childProcess: smokeProcess,
      handle: smokeHandle,
    });

    extensionStateStore.dispatch(
      actionCreators.setSmokeProcessRunning(algorithmPath, true)
    );
    onRunStarted(algorithmPath, runToken);

    smokeOutputChannel.appendLine("");
    smokeOutputChannel.appendLine(`=== Smoke Test: ${algorithmPath} ===`);
    smokeOutputChannel.show(true);

    smokeProcess.stdout.setEncoding("utf8");
    smokeProcess.stderr.setEncoding("utf8");

    smokeProcess.stdout.on("data", (chunk) => {
      processOutputChunk(algorithmPath, runToken, String(chunk || ""), "stdoutBuffer");
    });

    smokeProcess.stderr.on("data", (chunk) => {
      processOutputChunk(algorithmPath, runToken, String(chunk || ""), "stderrBuffer");
    });

    smokeProcess.on("error", (error) => {
      if (isStoppedSmokeRun(algorithmPath, runToken)) {
        extensionStateStore.dispatch(
          actionCreators.setStoppedSmokeRunToken(algorithmPath, null)
        );
        return;
      }

      if (!isCurrentSmokeRun(algorithmPath, runToken)) {
        return;
      }

      cleanupRuntimeEntries(algorithmPath);
      runtimeLifecycle.markFailed({
        ownerKey: algorithmPath,
        processId: lifecycleRun.processId,
        runToken,
        errorMessage: String(error?.message || ""),
        reason: "process-error",
      });
      extensionStateStore.dispatch(
        actionCreators.setSmokeProcessRunning(algorithmPath, false)
      );

      const errorMessage = String(error?.message || "");
      extensionStateStore.dispatch(
        actionCreators.setSmokeProcessError(algorithmPath, errorMessage)
      );
      smokeOutputChannel.appendLine(`Process error: ${errorMessage}`);
      onRunFailed(algorithmPath, errorMessage, runToken);
    });

    smokeProcess.on("close", (code, signal) => {
      if (isStoppedSmokeRun(algorithmPath, runToken)) {
        extensionStateStore.dispatch(
          actionCreators.setStoppedSmokeRunToken(algorithmPath, null)
        );
        return;
      }

      if (!isCurrentSmokeRun(algorithmPath, runToken)) {
        return;
      }

      cleanupRuntimeEntries(algorithmPath);
      runtimeLifecycle.markCompleted({
        ownerKey: algorithmPath,
        processId: lifecycleRun.processId,
        runToken,
        exitCode: typeof code === "number" ? code : null,
        signal: signal ? String(signal) : null,
        reason: "process-exit",
      });
      extensionStateStore.dispatch(
        actionCreators.setSmokeProcessRunning(algorithmPath, false)
      );
      extensionStateStore.dispatch(
        actionCreators.setSmokeProcessExit(
          algorithmPath,
          typeof code === "number" ? code : null,
          signal ? String(signal) : null
        )
      );

      if (signal) {
        smokeOutputChannel.appendLine(`Smoke process terminated by signal: ${signal}`);
      } else {
        smokeOutputChannel.appendLine(`Smoke process exited with code: ${code}`);
      }

      onRunCompleted(algorithmPath, {
        exitCode: typeof code === "number" ? code : null,
        signal: signal ? String(signal) : null,
        runToken,
      });
    });

    return {
      ok: true,
      reason: null,
    };
  }

  /**
   * Stops one active smoke process for an algorithm.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @param {{markStopped?: boolean, invalidateRunToken?: boolean}} [stopOptions] Stop options.
   * @returns {boolean} True when one active process was stopped.
   */
  function stopRun(algorithmPath, stopOptions = {}) {
    const normalizedAlgorithmPath = String(algorithmPath || "");
    const activeRunToken = selectSmokeRunTokenForAlgorithm(normalizedAlgorithmPath);
    const stopResult = runtimeLifecycle.stopRun(normalizedAlgorithmPath, {
      markStopped: stopOptions.markStopped === true,
      invalidateRunToken: stopOptions.invalidateRunToken !== false,
      reason: stopOptions.markStopped === true ? "user-stopped" : "replaced",
    });

    if (!stopResult) {
      return false;
    }

    const markStopped = stopOptions.markStopped === true;
    const invalidateRunToken = stopOptions.invalidateRunToken !== false;

    if (markStopped) {
      extensionStateStore.dispatch(
        actionCreators.setStoppedSmokeRunToken(normalizedAlgorithmPath, activeRunToken)
      );
      onRunStopped(normalizedAlgorithmPath, activeRunToken);
    } else {
      extensionStateStore.dispatch(
        actionCreators.setStoppedSmokeRunToken(normalizedAlgorithmPath, null)
      );
    }

    if (invalidateRunToken) {
      extensionStateStore.dispatch(
        actionCreators.setSmokeRunToken(normalizedAlgorithmPath, activeRunToken + 1)
      );
    }

    cleanupRuntimeEntries(normalizedAlgorithmPath);
    extensionStateStore.dispatch(
      actionCreators.setSmokeProcessRunning(normalizedAlgorithmPath, false)
    );

    return true;
  }

  /**
   * Appends raw smoke output text to the lifecycle output channel.
   *
   * @param {string} text Output text to append.
   * @returns {void}
   */
  function append(text) {
    smokeOutputChannel.append(String(text || ""));
  }

  /**
   * Appends one output line to the lifecycle output channel.
   *
   * @param {string} text Output line text.
   * @returns {void}
   */
  function appendLine(text) {
    smokeOutputChannel.appendLine(String(text || ""));
  }

  /**
   * Shows the smoke output channel.
   *
   * @returns {void}
   */
  function showOutput() {
    smokeOutputChannel.show(true);
  }

  /**
   * Disposes all active smoke runs and output resources.
   *
   * @returns {void}
   */
  function dispose() {
    for (const algorithmPath of smokeBufferStateByAlgorithmPath.keys()) {
      stopRun(algorithmPath, {
        markStopped: false,
        invalidateRunToken: true,
      });
    }

    smokeOutputChannel.dispose();
  }

  return {
    seedSmokeStateForRun,
    startRun,
    stopRun,
    append,
    appendLine,
    showOutput,
    dispose,
  };
}

module.exports = {
  createSmokeProcessLifecycle,
};
