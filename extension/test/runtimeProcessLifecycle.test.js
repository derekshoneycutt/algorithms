const assert = require("assert");
const { EventEmitter } = require("events");
const {
  actionCreators,
  extensionStateStore,
  selectActiveRuntimeProcessForOwner,
  selectIsRuntimeProcessRunningForOwner,
  selectRuntimeProcessRunTokenForOwner,
  selectStoppedRuntimeProcessRunTokenForOwner,
} = require("../src/runtime/extensionStateStore");
const {
  createRuntimeProcessLifecycle,
} = require("../src/runtime/runtimeProcessLifecycle");

/**
 * Resets generic runtime-process store state for isolated tests.
 *
 * @returns {void}
 */
function resetRuntimeProcessState() {
  extensionStateStore.dispatch(actionCreators.resetRuntimeProcesses());
}

/**
 * Creates one mock process handle and child process pair.
 *
 * @returns {{childProcess: EventEmitter & {kill: () => void}, handle: {pid: number, isRunning: () => boolean, kill: () => {ok: boolean, reason: null}}, killCount: () => number}} Mock process objects.
 */
function createMockRuntimeProcess() {
  const childProcess = new EventEmitter();
  let killed = 0;

  childProcess.kill = () => {
    killed += 1;
  };

  return {
    childProcess,
    handle: {
      pid: 123,
      isRunning() {
        return true;
      },
      kill() {
        killed += 1;
        return {
          ok: true,
          reason: null,
        };
      },
    },
    killCount() {
      return killed;
    },
  };
}

/**
 * Verifies beginning and attaching one process updates central state.
 *
 * @returns {void}
 */
function testBeginAndAttachProcess() {
  resetRuntimeProcessState();

  const lifecycle = createRuntimeProcessLifecycle({
    now() {
      return 100;
    },
  });
  const ownerKey = "/tmp/runtime-owner";
  const beginResult = lifecycle.beginRun({
    ownerKey,
    processType: "smoke",
    commandFamily: "run-smoke",
    scriptPath: "/tmp/smoke.sh",
    cwd: "/tmp",
    displayCommand: "./smoke.sh",
  });
  const runtimeProcess = createMockRuntimeProcess();

  assert.strictEqual(beginResult.ok, true);
  assert.strictEqual(selectRuntimeProcessRunTokenForOwner(ownerKey), 1);
  assert.strictEqual(selectIsRuntimeProcessRunningForOwner(ownerKey), false);

  const attachResult = lifecycle.attachSpawnedProcess({
    ownerKey,
    processId: beginResult.processId,
    childProcess: runtimeProcess.childProcess,
    handle: runtimeProcess.handle,
  });

  assert.strictEqual(attachResult, true);
  assert.strictEqual(selectIsRuntimeProcessRunningForOwner(ownerKey), true);
  assert.deepStrictEqual(selectActiveRuntimeProcessForOwner(ownerKey), {
    processId: beginResult.processId,
    ownerKey,
    processType: "smoke",
    commandFamily: "run-smoke",
    scriptPath: "/tmp/smoke.sh",
    cwd: "/tmp",
    displayCommand: "./smoke.sh",
    status: "running",
    startedAt: 100,
    endedAt: null,
    pid: 123,
    exitCode: null,
    signal: null,
    errorMessage: null,
    reason: null,
    runToken: 1,
    metadata: null,
  });
}

/**
 * Verifies stale run completions are ignored after a new run begins.
 *
 * @returns {void}
 */
function testStaleRunCompletionIgnored() {
  resetRuntimeProcessState();

  let timestamp = 200;
  const lifecycle = createRuntimeProcessLifecycle({
    now() {
      const current = timestamp;
      timestamp += 1;
      return current;
    },
  });
  const ownerKey = "/tmp/runtime-stale";
  const firstRun = lifecycle.beginRun({ ownerKey, processType: "smoke" });
  const secondRun = lifecycle.beginRun({ ownerKey, processType: "smoke" });

  const markCompletedResult = lifecycle.markCompleted({
    ownerKey,
    processId: firstRun.processId,
    runToken: firstRun.runToken,
    exitCode: 0,
  });

  assert.strictEqual(markCompletedResult, false);
  assert.strictEqual(selectRuntimeProcessRunTokenForOwner(ownerKey), 2);
  assert.strictEqual(selectActiveRuntimeProcessForOwner(ownerKey).processId, secondRun.processId);
}

/**
 * Verifies stopping one active process marks stopped token and kills the handle.
 *
 * @returns {void}
 */
function testStopRunMarksStoppedAndKillsHandle() {
  resetRuntimeProcessState();

  const lifecycle = createRuntimeProcessLifecycle({
    now() {
      return 300;
    },
  });
  const ownerKey = "/tmp/runtime-stop";
  const beginResult = lifecycle.beginRun({ ownerKey, processType: "smoke" });
  const runtimeProcess = createMockRuntimeProcess();

  lifecycle.attachSpawnedProcess({
    ownerKey,
    processId: beginResult.processId,
    childProcess: runtimeProcess.childProcess,
    handle: runtimeProcess.handle,
  });

  const stopResult = lifecycle.stopRun(ownerKey, {
    markStopped: true,
    invalidateRunToken: true,
    reason: "user-stopped",
  });

  assert.strictEqual(stopResult, true);
  assert.strictEqual(runtimeProcess.killCount(), 1);
  assert.strictEqual(selectIsRuntimeProcessRunningForOwner(ownerKey), false);
  assert.strictEqual(selectStoppedRuntimeProcessRunTokenForOwner(ownerKey), 1);
  assert.strictEqual(selectRuntimeProcessRunTokenForOwner(ownerKey), 2);
  assert.strictEqual(selectActiveRuntimeProcessForOwner(ownerKey).status, "stopped");
}

/**
 * Runs all runtimeProcessLifecycle tests.
 *
 * @returns {void}
 */
function runTests() {
  testBeginAndAttachProcess();
  testStaleRunCompletionIgnored();
  testStopRunMarksStoppedAndKillsHandle();
}

module.exports = {
  runTests,
};