"use strict";

const assert = require("assert");
const { EventEmitter } = require("events");
const {
  executeCommand,
  combineArgumentSources,
} = require("../src/runtime/commandline/core/commandLineCore");

// ---------------------------------------------------------------------------
// executeCommand tests
// ---------------------------------------------------------------------------

/**
 * Creates one mock spawn function that emits deterministic output and exit code.
 *
 * @param {{stdout?: string, stderr?: string, exitCode?: number|null}} [options] Spawn output options.
 * @returns {(command: string, args: string[], spawnOptions: object) => EventEmitter} Mock spawn function.
 */
function createSpawnSuccessMock(options = {}) {
  return () => {
    const childProcess = new EventEmitter();
    const stdoutEmitter = new EventEmitter();
    const stderrEmitter = new EventEmitter();

    stdoutEmitter.setEncoding = () => {};
    stderrEmitter.setEncoding = () => {};

    childProcess.stdout = stdoutEmitter;
    childProcess.stderr = stderrEmitter;
    childProcess.kill = () => true;

    process.nextTick(() => {
      stdoutEmitter.emit("data", String(options.stdout || ""));
      stderrEmitter.emit("data", String(options.stderr || ""));
      childProcess.emit("close", options.exitCode ?? 0);
    });

    return childProcess;
  };
}

/**
 * Verifies terminal-send mode delegates to runCommand and returns its result.
 *
 * @returns {void}
 */
function testExecuteCommandTerminalMode() {
  const result = executeCommand({
    mode: "terminal-send",
    build: {
      commandFamily: "run-file",
    },
    vscodeApi: {},
    reuseTerminal: true,
    runCommand: () => {
      return {
        ok: true,
        status: "started",
        reason: null,
      };
    },
  });

  assert.deepStrictEqual(result, {
    ok: true,
    status: "started",
    reason: null,
  });
}

/**
 * Verifies spawn-capture mode returns normalized completed payload.
 *
 * @returns {Promise<void>} Completion result.
 */
async function testExecuteCommandSpawnModeSuccess() {
  const result = await executeCommand({
    mode: "spawn-capture",
    command: "sh",
    cwd: "/repo",
    args: ["/repo/init.sh", "--check-env"],
    now: () => 42,
    spawnFn: createSpawnSuccessMock({
      stdout: "line-a",
      stderr: "line-b",
      exitCode: 0,
    }),
    filterOutput: (text) => {
      return `filtered:${text}`;
    },
  });

  assert.deepStrictEqual(result, {
    ok: true,
    status: "completed",
    reason: null,
    exitCode: 0,
    stdout: "line-a",
    stderr: "line-b",
    combinedOutput: "line-a\nline-b",
    filteredOutput: "filtered:line-a\nline-b",
    timestamp: 42,
  });
}

/**
 * Verifies spawn-capture mode returns normalized failure payload.
 *
 * @returns {Promise<void>} Completion result.
 */
async function testExecuteCommandSpawnModeFailure() {
  const result = await executeCommand({
    mode: "spawn-capture",
    command: "sh",
    cwd: "/repo",
    args: ["/repo/init.sh"],
    now: () => 99,
    spawnFn: () => {
      throw new Error("boom");
    },
  });

  assert.deepStrictEqual(result, {
    ok: false,
    status: "failed",
    reason: "spawn-capture-failed",
    errorMessage: "boom",
    timestamp: 99,
  });
}

/**
 * Verifies spawn-sync mode returns normalized success payload.
 *
 * @returns {void}
 */
function testExecuteCommandSpawnSyncModeSuccess() {
  const result = executeCommand({
    mode: "spawn-sync",
    command: "/repo/run.sh",
    args: ["--help-all"],
    cwd: "/repo",
    timeout: 15000,
    encoding: "utf8",
    now: () => 7,
    spawnSyncFn: () => {
      return {
        status: 0,
        stdout: "ok",
        stderr: "",
      };
    },
  });

  assert.deepStrictEqual(result, {
    ok: true,
    status: "completed",
    reason: null,
    exitCode: 0,
    success: true,
    stdout: "ok",
    stderr: "",
    errorMessage: null,
    timestamp: 7,
  });
}

/**
 * Verifies spawn-sync mode returns normalized failure payload.
 *
 * @returns {void}
 */
function testExecuteCommandSpawnSyncModeFailure() {
  const result = executeCommand({
    mode: "spawn-sync",
    command: "/repo/run.sh",
    args: ["--help-all"],
    cwd: "/repo",
    now: () => 8,
    spawnSyncFn: () => {
      return {
        status: null,
        stdout: "",
        stderr: "",
        error: new Error("spawn failed"),
      };
    },
  });

  assert.deepStrictEqual(result, {
    ok: false,
    status: "failed",
    reason: "spawn-sync-failed",
    exitCode: null,
    success: false,
    stdout: "",
    stderr: "",
    errorMessage: "spawn failed",
    timestamp: 8,
  });
}

/**
 * Verifies source ordering supports both before-base and after-base placement.
 *
 * @returns {void}
 */
function testCombineArgumentSourcesOrdering() {
  const result = combineArgumentSources({
    baseArgs: ["file.bas"],
    sources: [
      {
        name: "source-profile",
        result: { ok: true, tokens: ["--source-profile=/tmp/.profile"] },
        reasonKey: "invalid-source-profile",
        fallbackGuidance: "Source profile is invalid.",
      },
      {
        name: "run-checks",
        result: { ok: true, tokens: ["--run-checks"] },
        reasonKey: "invalid-run-checks",
        fallbackGuidance: "Run checks are invalid.",
      },
      {
        name: "run-args",
        result: { ok: true, tokens: ["--count", "2"] },
        reasonKey: "invalid-run-args",
        fallbackGuidance: "Run args are invalid.",
        position: "after-base",
      },
    ],
  });

  assert.deepStrictEqual(result, {
    ok: true,
    args: [
      "--source-profile=/tmp/.profile",
      "--run-checks",
      "file.bas",
      "--count",
      "2",
    ],
    validation: null,
  });
}

/**
 * Verifies invalid source results return deterministic validation payload.
 *
 * @returns {void}
 */
function testCombineArgumentSourcesInvalidSource() {
  const result = combineArgumentSources({
    baseArgs: ["file.bas"],
    sources: [
      {
        name: "run-args",
        result: { ok: false, reason: "Bad arg token." },
        reasonKey: "invalid-sidebar-run-args",
        fallbackGuidance: "Custom run args are invalid.",
      },
    ],
  });

  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(result.validation, {
    reason: "invalid-sidebar-run-args",
    guidance: "Bad arg token.",
    severity: "warning",
  });
}

/**
 * Runs all commandLineCore tests.
 *
 * @returns {Promise<void>} Completion result.
 */
async function runTests() {
  testExecuteCommandTerminalMode();
  await testExecuteCommandSpawnModeSuccess();
  await testExecuteCommandSpawnModeFailure();
  testExecuteCommandSpawnSyncModeSuccess();
  testExecuteCommandSpawnSyncModeFailure();
  testCombineArgumentSourcesOrdering();
  testCombineArgumentSourcesInvalidSource();
}

module.exports = { runTests };
