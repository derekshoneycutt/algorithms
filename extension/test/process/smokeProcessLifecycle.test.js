const assert = require("assert");
const { EventEmitter } = require("events");
const {
  actionCreators,
  extensionStateStore,
  selectIsSmokeProcessRunningForAlgorithm,
  selectSmokeLanguageState,
} = require("../../src/runtime/state/extensionStateStore");
const {
  createSmokeProcessLifecycle,
} = require("../../src/runtime/process/smokeProcessLifecycle");

/**
 * Creates one mock smoke process with stdout/stderr emitters.
 *
 * @returns {{stdout: EventEmitter & {setEncoding: (encoding: string) => void}, stderr: EventEmitter & {setEncoding: (encoding: string) => void}, on: (eventName: string, listener: (...args: unknown[]) => void) => EventEmitter, emit: (eventName: string, ...args: unknown[]) => boolean, kill: () => void, killCount: () => number}} Mock process.
 */
function createMockSmokeProcess() {
  const processEmitter = new EventEmitter();
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();
  let killedCount = 0;

  stdoutEmitter.setEncoding = () => {
    // No-op for tests.
  };

  stderrEmitter.setEncoding = () => {
    // No-op for tests.
  };

  processEmitter.stdout = stdoutEmitter;
  processEmitter.stderr = stderrEmitter;
  processEmitter.kill = () => {
    killedCount += 1;
  };
  processEmitter.killCount = () => killedCount;

  return processEmitter;
}

/**
 * Creates one mock VS Code API with output channel recording.
 *
 * @returns {{vscodeApi: {window: {createOutputChannel: (name: string) => {append: (text: string) => void, appendLine: (text: string) => void, show: (preserveFocus: boolean) => void, dispose: () => void}}}, output: {name: string|null, appendCalls: string[], appendLineCalls: string[], showCalls: number, disposeCalls: number}}} Mock API and output recorder.
 */
function createMockVscodeApi() {
  const output = {
    name: null,
    appendCalls: [],
    appendLineCalls: [],
    showCalls: 0,
    disposeCalls: 0,
  };

  return {
    vscodeApi: {
      window: {
        createOutputChannel(name) {
          output.name = String(name || "");

          return {
            append(text) {
              output.appendCalls.push(String(text || ""));
            },
            appendLine(text) {
              output.appendLineCalls.push(String(text || ""));
            },
            show() {
              output.showCalls += 1;
            },
            dispose() {
              output.disposeCalls += 1;
            },
          };
        },
      },
    },
    output,
  };
}

/**
 * Resets smoke runtime metadata for one algorithm path.
 *
 * @param {string} algorithmPath Algorithm directory path.
 * @returns {void}
 */
function resetSmokeRuntimeState(algorithmPath) {
  extensionStateStore.dispatch(actionCreators.setSmokeProcessRunning(algorithmPath, false));
  extensionStateStore.dispatch(actionCreators.setSmokeRunToken(algorithmPath, 0));
  extensionStateStore.dispatch(actionCreators.setStoppedSmokeRunToken(algorithmPath, null));
  extensionStateStore.dispatch(actionCreators.setSmokeProcessError(algorithmPath, ""));
  extensionStateStore.dispatch(actionCreators.setSmokeProcessExit(algorithmPath, null, null));
}

/**
 * Parses one smoke output line for tests.
 *
 * @param {string} line Output line.
 * @returns {{languageKey: string, smokeStatus: "passed"|"failed"}|null} Parsed status result.
 */
function parseSmokeStatusLineForTest(line) {
  const text = String(line || "");

  if (text.includes("PASS")) {
    return {
      languageKey: "python",
      smokeStatus: "passed",
    };
  }

  if (text.includes("FAIL")) {
    return {
      languageKey: "python",
      smokeStatus: "failed",
    };
  }

  return null;
}

/**
 * Verifies stale callbacks from prior runs do not mutate current smoke state.
 *
 * @returns {void}
 */
function testStaleCallbacksAreIgnored() {
  const algorithmPath = "/tmp/lifecycle-stale";
  resetSmokeRuntimeState(algorithmPath);

  const mockVscode = createMockVscodeApi();
  const firstProcess = createMockSmokeProcess();
  const secondProcess = createMockSmokeProcess();
  const mockProcesses = [firstProcess, secondProcess];
  let spawnIndex = 0;
  const smokeStatusUpdates = [];

  const lifecycle = createSmokeProcessLifecycle({
    vscodeApi: mockVscode.vscodeApi,
    parseSmokeStatusLine: parseSmokeStatusLineForTest,
    spawnProcess: () => {
      const process = mockProcesses[spawnIndex];
      spawnIndex += 1;
      return process;
    },
    onSmokeLanguageStatus: (pathValue, languageKey, smokeStatus) => {
      smokeStatusUpdates.push({
        pathValue,
        languageKey,
        smokeStatus,
      });
    },
  });

  const firstStart = lifecycle.startRun({
    algorithmPath,
    smokeScriptPath: "/tmp/smoke.sh",
    smokeArgs: [],
    cwd: "/tmp",
  });
  const secondStart = lifecycle.startRun({
    algorithmPath,
    smokeScriptPath: "/tmp/smoke.sh",
    smokeArgs: [],
    cwd: "/tmp",
  });

  assert.strictEqual(firstStart.ok, true);
  assert.strictEqual(secondStart.ok, true);
  assert.strictEqual(firstProcess.killCount(), 1);

  firstProcess.stdout.emit("data", "SMOKE python PASS\n");
  secondProcess.stdout.emit("data", "SMOKE python PASS\n");

  assert.strictEqual(smokeStatusUpdates.length, 1);
  assert.deepStrictEqual(smokeStatusUpdates[0], {
    pathValue: algorithmPath,
    languageKey: "python",
    smokeStatus: "passed",
  });

  lifecycle.dispose();
}

/**
 * Verifies stopped runs clear stopped-token callbacks and do not emit completion.
 *
 * @returns {void}
 */
function testStoppedRunIgnoresCloseCompletion() {
  const algorithmPath = "/tmp/lifecycle-stop";
  resetSmokeRuntimeState(algorithmPath);

  const mockVscode = createMockVscodeApi();
  const process = createMockSmokeProcess();
  let stoppedCalls = 0;
  let completedCalls = 0;

  const lifecycle = createSmokeProcessLifecycle({
    vscodeApi: mockVscode.vscodeApi,
    parseSmokeStatusLine: parseSmokeStatusLineForTest,
    spawnProcess: () => process,
    onRunStopped: () => {
      stoppedCalls += 1;
    },
    onRunCompleted: () => {
      completedCalls += 1;
    },
  });

  const startResult = lifecycle.startRun({
    algorithmPath,
    smokeScriptPath: "/tmp/smoke.sh",
    smokeArgs: [],
    cwd: "/tmp",
  });

  assert.strictEqual(startResult.ok, true);
  assert.strictEqual(selectIsSmokeProcessRunningForAlgorithm(algorithmPath), true);

  const stopResult = lifecycle.stopRun(algorithmPath, {
    markStopped: true,
    invalidateRunToken: true,
  });

  assert.strictEqual(stopResult, true);
  assert.strictEqual(stoppedCalls, 1);
  assert.strictEqual(selectIsSmokeProcessRunningForAlgorithm(algorithmPath), false);

  process.emit("close", 0, null);

  assert.strictEqual(completedCalls, 0);

  lifecycle.dispose();
}

/**
 * Verifies smoke state seeding writes queued/failed entries into store.
 *
 * @returns {void}
 */
function testSeedSmokeStateForRun() {
  const algorithmPath = "/tmp/lifecycle-seed";
  resetSmokeRuntimeState(algorithmPath);

  const mockVscode = createMockVscodeApi();
  const lifecycle = createSmokeProcessLifecycle({
    vscodeApi: mockVscode.vscodeApi,
    parseSmokeStatusLine: parseSmokeStatusLineForTest,
    spawnProcess: () => createMockSmokeProcess(),
  });

  const seededLanguageKeys = lifecycle.seedSmokeStateForRun({
    algorithmPath,
    smokeLanguageKeys: ["python", "ruby"],
    hasFilesByLanguageKey: new Map([
      ["python", true],
      ["ruby", false],
    ]),
  });

  assert.deepStrictEqual(seededLanguageKeys, ["python", "ruby"]);
  assert.deepStrictEqual(selectSmokeLanguageState(algorithmPath, "python"), {
    status: "queued",
    locked: false,
  });
  assert.deepStrictEqual(selectSmokeLanguageState(algorithmPath, "ruby"), {
    status: "failed",
    locked: true,
  });

  lifecycle.dispose();
}

/**
 * Runs all smoke lifecycle tests.
 *
 * @returns {void}
 */
function runTests() {
  testSeedSmokeStateForRun();
  testStaleCallbacksAreIgnored();
  testStoppedRunIgnoresCloseCompletion();
}

module.exports = {
  runTests,
};
