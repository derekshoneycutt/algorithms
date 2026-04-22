"use strict";

const assert = require("assert");
const { EventEmitter } = require("events");
const {
  INIT_OPERATION_CHECK_ENV,
  INIT_OPERATION_SAVE_VARIABLE,
  buildCheckEnvInitArgs,
  buildCopyIconsInitArgs,
  buildSaveVariableInitArgs,
  buildSaveLanguageRoutingInitArgs,
  buildSaveBatchRoutingInitArgs,
  buildCheckEnvMissingContextResult,
  buildCheckEnvRunningResult,
  buildCheckEnvCompletedResult,
  buildCheckEnvFailureResult,
  buildCopyIconsMissingContextResult,
  buildCopyIconsRunningResult,
  buildCopyIconsCompletedResult,
  buildCopyIconsFailureResult,
  buildVariableMissingContextStatus,
  buildVariableRunningStatus,
  buildVariableCompletedStatus,
  buildVariableFailureStatus,
  buildRoutingMissingContextStatus,
  buildRoutingConflictStatus,
  buildRoutingRunningStatus,
  buildRoutingCompletedStatus,
  buildRoutingFailureStatus,
  buildBatchMissingContextResult,
  buildBatchConflictResult,
  buildBatchRunningResult,
  buildBatchCompletedResult,
  buildBatchFailureResult,
  executeInitOperation,
} = require("../../src/runtime/commandline/adapters/initCommandAdapter");
const {
  createMockRuntimeLifecycle,
} = require("../__helpers/mockRuntimeLifecycle");
const {
  createSpawnSuccessMock,
} = require("../__helpers/mockProcessSpawn");

// ---------------------------------------------------------------------------
// Arg builder tests
// ---------------------------------------------------------------------------

/**
 * Verifies check-env args include standard flags and profile updates.
 *
 * @returns {void}
 */
function testBuildCheckEnvInitArgs() {
  const args = buildCheckEnvInitArgs("/tmp/.profile");

  assert.deepStrictEqual(args, [
    "--no-prompt",
    "--no-icons",
    "--update-profile=/tmp/.profile",
    "--check-env",
  ]);
}

/**
 * Verifies copy-icons args include optional icons destination.
 *
 * @returns {void}
 */
function testBuildCopyIconsInitArgs() {
  const args = buildCopyIconsInitArgs("/tmp/.profile", " /tmp/icons ");

  assert.deepStrictEqual(args, [
    "--no-prompt",
    "--copy-icons",
    "--skip-environment",
    "--update-profile=/tmp/.profile",
    "--icons-to=/tmp/icons",
  ]);
}

/**
 * Verifies save-variable args include set-use-only flag and option assignment.
 *
 * @returns {void}
 */
function testBuildSaveVariableInitArgs() {
  const args = buildSaveVariableInitArgs("", "use-timeout", "-k 5s 1m");

  assert.deepStrictEqual(args, [
    "--no-prompt",
    "--no-icons",
    "--set-use-only",
    "--use-timeout=-k 5s 1m",
  ]);
}

/**
 * Verifies save-language-routing args follow docker/ssh set/remove semantics.
 *
 * @returns {void}
 */
function testBuildSaveLanguageRoutingInitArgs() {
  const args = buildSaveLanguageRoutingInitArgs({
    profilePath: "",
    languageKey: "python",
    dockerEnabled: true,
    dockerValue: "docker-host",
    sshEnabled: false,
    sshValue: "",
  });

  assert.deepStrictEqual(args, [
    "--no-prompt",
    "--no-icons",
    "--runondocker-set=python=docker-host",
    "--runonssh-remove=python",
  ]);
}

/**
 * Verifies save-batch-routing args append language operations in stable order.
 *
 * @returns {void}
 */
function testBuildSaveBatchRoutingInitArgs() {
  const args = buildSaveBatchRoutingInitArgs({
    profilePath: "/tmp/.profile",
    supportedLanguageKeys: ["python", "javascript"],
    batchDockerEnabled: false,
    batchDockerValue: "",
    batchSshEnabled: true,
    batchSshValue: "ssh-host",
  });

  assert.deepStrictEqual(args, [
    "--no-prompt",
    "--no-icons",
    "--update-profile=/tmp/.profile",
    "--runondocker-remove=python",
    "--runonssh-set=python=ssh-host",
    "--runondocker-remove=javascript",
    "--runonssh-set=javascript=ssh-host",
  ]);
}

// ---------------------------------------------------------------------------
// Status/result builder tests
// ---------------------------------------------------------------------------

/**
 * Verifies check-env status builder outputs for missing/running/success/failure cases.
 *
 * @returns {void}
 */
function testCheckEnvStatusBuilders() {
  assert.deepStrictEqual(buildCheckEnvMissingContextResult(), {
    kind: "error",
    text: "Unable to resolve repository root or init.sh.",
    filteredOutput: "",
    rawOutput: "",
  });
  assert.deepStrictEqual(buildCheckEnvRunningResult(), {
    kind: "running",
    text: "Running check-env...",
    filteredOutput: "",
    rawOutput: "",
  });
  assert.deepStrictEqual(
    buildCheckEnvCompletedResult({
      exitCode: 0,
      filteredOutput: "ok",
      combinedOutput: "raw",
    }),
    {
      kind: "ok",
      text: "Environment check succeeded.",
      filteredOutput: "ok",
      rawOutput: "raw",
    }
  );
  assert.deepStrictEqual(buildCheckEnvFailureResult("boom"), {
    kind: "error",
    text: "Environment check failed: boom",
    filteredOutput: "boom",
    rawOutput: "boom",
  });
}

/**
 * Verifies copy-icons status builder outputs for missing/running/success/failure cases.
 *
 * @returns {void}
 */
function testCopyIconsStatusBuilders() {
  assert.deepStrictEqual(buildCopyIconsMissingContextResult(), {
    kind: "error",
    text: "Unable to resolve repository root or init.sh.",
  });
  assert.deepStrictEqual(buildCopyIconsRunningResult(), {
    kind: "running",
    text: "Copying icons...",
  });
  assert.deepStrictEqual(
    buildCopyIconsCompletedResult({ exitCode: 2, filteredOutput: "bad" }),
    { kind: "error", text: "bad" }
  );
  assert.deepStrictEqual(buildCopyIconsFailureResult("boom"), {
    kind: "error",
    text: "Icon copy failed: boom",
  });
}

/**
 * Verifies variable status builder outputs for context/running/success/failure cases.
 *
 * @returns {void}
 */
function testVariableStatusBuilders() {
  assert.deepStrictEqual(buildVariableMissingContextStatus(), {
    kind: "error",
    text: "Unable to resolve init.sh variable save context.",
  });
  assert.deepStrictEqual(buildVariableRunningStatus("Timeout"), {
    kind: "running",
    text: "Saving Timeout...",
  });
  assert.deepStrictEqual(
    buildVariableCompletedStatus({ label: "Timeout", exitCode: 0, filteredOutput: "" }),
    { kind: "ok", text: "Timeout saved." }
  );
  assert.deepStrictEqual(buildVariableFailureStatus("Timeout", "boom"), {
    kind: "error",
    text: "Timeout save failed: boom",
  });
}

/**
 * Verifies routing status builder outputs for context/conflict/running/success/failure cases.
 *
 * @returns {void}
 */
function testRoutingStatusBuilders() {
  assert.deepStrictEqual(buildRoutingMissingContextStatus(), {
    kind: "error",
    text: "Unable to resolve routing save context.",
  });
  assert.deepStrictEqual(buildRoutingConflictStatus(), {
    kind: "error",
    text: "Cannot save with both docker and ssh enabled.",
  });
  assert.deepStrictEqual(buildRoutingRunningStatus("Python"), {
    kind: "running",
    text: "Saving Python routing...",
  });
  assert.deepStrictEqual(
    buildRoutingCompletedStatus({
      languageLabel: "Python",
      exitCode: 2,
      filteredOutput: "bad",
    }),
    { kind: "error", text: "bad" }
  );
  assert.deepStrictEqual(buildRoutingFailureStatus("Python", "boom"), {
    kind: "error",
    text: "Python routing save failed: boom",
  });
}

/**
 * Verifies batch status builder outputs for context/conflict/running/success/failure cases.
 *
 * @returns {void}
 */
function testBatchStatusBuilders() {
  assert.deepStrictEqual(buildBatchMissingContextResult(), {
    kind: "error",
    text: "Unable to resolve batch routing save context.",
  });
  assert.deepStrictEqual(buildBatchConflictResult(), {
    kind: "error",
    text: "Cannot save Batch All with both docker and ssh enabled.",
  });
  assert.deepStrictEqual(buildBatchRunningResult(), {
    kind: "running",
    text: "Applying Batch All routing...",
  });
  assert.deepStrictEqual(
    buildBatchCompletedResult({ exitCode: 2, filteredOutput: "bad" }),
    { kind: "error", text: "bad" }
  );
  assert.deepStrictEqual(buildBatchFailureResult("boom"), {
    kind: "error",
    text: "Batch All routing save failed: boom",
  });
}

// ---------------------------------------------------------------------------
// Operation executor tests
// ---------------------------------------------------------------------------

/**
 * Verifies check-env orchestrator operation maps success outcome to check-env status.
 *
 * @returns {Promise<void>} Completion result.
 */
async function testExecuteInitOperationCheckEnvSuccess() {
  const lifecycle = createMockRuntimeLifecycle();

  const status = await executeInitOperation({
    operation: INIT_OPERATION_CHECK_ENV,
    resolvedRootPath: "/repo",
    initScriptPath: "/repo/init.sh",
    profilePath: "",
    spawnFn: createSpawnSuccessMock({ stdout: "all good" }),
    runtimeProcessLifecycle: lifecycle.runtimeProcessLifecycle,
    filterCheckEnvOutputFn: (text) => {
      return `filtered:${text}`;
    },
  });

  assert.deepStrictEqual(status, {
    kind: "ok",
    text: "Environment check succeeded.",
    filteredOutput: "filtered:all good",
    rawOutput: "all good",
  });

  assert.strictEqual(lifecycle.beginCalls.length, 1);
  assert.strictEqual(lifecycle.beginCalls[0].ownerKey, "init:check-env");
  assert.strictEqual(lifecycle.completedCalls.length, 1);
  assert.deepStrictEqual(lifecycle.completedCalls[0], {
    ownerKey: "init:check-env",
    processId: "test-process-id",
    runToken: 1,
    exitCode: 0,
    signal: null,
    reason: "init-operation-ok",
  });
  assert.strictEqual(lifecycle.failedCalls.length, 0);
}

/**
 * Verifies variable-save orchestrator operation maps runtime failure to error status.
 *
 * @returns {Promise<void>} Completion result.
 */
async function testExecuteInitOperationSaveVariableFailure() {
  const lifecycle = createMockRuntimeLifecycle();

  const status = await executeInitOperation({
    operation: INIT_OPERATION_SAVE_VARIABLE,
    resolvedRootPath: "/repo",
    initScriptPath: "/repo/init.sh",
    profilePath: "",
    variable: {
      optionName: "use-timeout",
      value: "-k 5s 1m",
      label: "Timeout",
    },
    runtimeProcessLifecycle: lifecycle.runtimeProcessLifecycle,
    spawnFn: () => {
      throw new Error("boom");
    },
  });

  assert.deepStrictEqual(status, {
    kind: "error",
    text: "Timeout save failed: boom",
  });

  assert.strictEqual(lifecycle.beginCalls.length, 1);
  assert.strictEqual(lifecycle.beginCalls[0].ownerKey, "init:save-variable");
  assert.strictEqual(lifecycle.completedCalls.length, 1);
  assert.deepStrictEqual(lifecycle.completedCalls[0], {
    ownerKey: "init:save-variable",
    processId: "test-process-id",
    runToken: 1,
    exitCode: 1,
    signal: null,
    reason: "init-operation-error",
  });
  assert.strictEqual(lifecycle.failedCalls.length, 0);
}

/**
 * Verifies unsupported operation values fail deterministically.
 *
 * @returns {Promise<void>} Completion result.
 */
async function testExecuteInitOperationUnsupportedOperation() {
  const lifecycle = createMockRuntimeLifecycle();

  await assert.rejects(
    executeInitOperation({
      operation: "invalid-operation",
      resolvedRootPath: "/repo",
      initScriptPath: "/repo/init.sh",
      runtimeProcessLifecycle: lifecycle.runtimeProcessLifecycle,
    }),
    /Unsupported init operation\./
  );

  assert.strictEqual(lifecycle.beginCalls.length, 1);
  assert.strictEqual(lifecycle.beginCalls[0].ownerKey, "init:invalid-operation");
  assert.strictEqual(lifecycle.completedCalls.length, 0);
  assert.strictEqual(lifecycle.failedCalls.length, 1);
  assert.deepStrictEqual(lifecycle.failedCalls[0], {
    ownerKey: "init:invalid-operation",
    processId: "test-process-id",
    runToken: 1,
    errorMessage: "Unsupported init operation.",
    reason: "init-operation-failed",
  });
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

/**
 * Runs all initCommandAdapter tests.
 *
 * @returns {Promise<void>} Completion result.
 */
async function runTests() {
  testBuildCheckEnvInitArgs();
  testBuildCopyIconsInitArgs();
  testBuildSaveVariableInitArgs();
  testBuildSaveLanguageRoutingInitArgs();
  testBuildSaveBatchRoutingInitArgs();
  testCheckEnvStatusBuilders();
  testCopyIconsStatusBuilders();
  testVariableStatusBuilders();
  testRoutingStatusBuilders();
  testBatchStatusBuilders();
  await testExecuteInitOperationCheckEnvSuccess();
  await testExecuteInitOperationSaveVariableFailure();
  await testExecuteInitOperationUnsupportedOperation();
}

module.exports = { runTests };
