"use strict";

const { executeCommand } = require("../core/commandLineCore");
const {
  createRuntimeProcessLifecycle,
} = require("../../process/runtimeProcessLifecycle");

// ---------------------------------------------------------------------------
// SECTION 1: Operation constants
// ---------------------------------------------------------------------------

const INIT_OPERATION_CHECK_ENV = "check-env";
const INIT_OPERATION_COPY_ICONS = "copy-icons";
const INIT_OPERATION_SAVE_VARIABLE = "save-variable";
const INIT_OPERATION_SAVE_LANGUAGE_ROUTING = "save-language-routing";
const INIT_OPERATION_SAVE_BATCH_ROUTING = "save-batch-routing";
const runtimeProcessLifecycle = createRuntimeProcessLifecycle();

/**
 * Builds one owner key used for init operation lifecycle records.
 *
 * @param {string} operation Init operation key.
 * @returns {string} Stable owner key.
 */
function buildInitOwnerKey(operation) {
  return `init:${String(operation || "unknown").trim() || "unknown"}`;
}

/**
 * Begins lifecycle tracking for one init operation attempt.
 *
 * @param {{runtimeProcessLifecycle?: object, operation: string, resolvedRootPath?: string, initScriptPath?: string, initArgs?: string[]}} input Lifecycle context.
 * @returns {{ok: boolean, ownerKey: string, processId: string|null, runToken: number}} Begin-run result.
 */
function beginInitLifecycle(input) {
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
    ownerKey: buildInitOwnerKey(input?.operation),
    processType: "init",
    commandFamily: input?.operation || null,
    scriptPath: input?.initScriptPath || null,
    cwd: input?.resolvedRootPath || null,
    displayCommand: `sh ${[input?.initScriptPath, ...(input?.initArgs || [])].filter(Boolean).join(" ")}`,
    metadata: {
      operation: input?.operation || null,
    },
  });
}

/**
 * Marks one init lifecycle attempt as completed.
 *
 * @param {{runtimeProcessLifecycle?: object, lifecycleRun?: object, status?: object}} input Completion payload.
 * @returns {void}
 */
function markInitLifecycleCompleted(input) {
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
    exitCode: input?.status?.kind === "ok" ? 0 : 1,
    signal: null,
    reason: input?.status?.kind === "ok" ? "init-operation-ok" : "init-operation-error",
  });
}

/**
 * Marks one init lifecycle attempt as failed.
 *
 * @param {{runtimeProcessLifecycle?: object, lifecycleRun?: object, errorMessage?: string}} input Failure payload.
 * @returns {void}
 */
function markInitLifecycleFailed(input) {
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
    errorMessage: String(input?.errorMessage || "init-operation-failed"),
    reason: "init-operation-failed",
  });
}

// ---------------------------------------------------------------------------
// SECTION 2: Command execution helpers
// ---------------------------------------------------------------------------

/**
 * Builds init.sh profile arguments from a draft profile path.
 *
 * @param {string} profilePath Draft profile path.
 * @returns {string[]} Optional profile args.
 */
function buildProfileArgs(profilePath) {
  const trimmedPath = String(profilePath || "").trim();

  if (!trimmedPath) {
    return [];
  }

  return [`--update-profile=${trimmedPath}`];
}

/**
 * Filters check-env output down to error-like lines or useful trailing lines.
 *
 * @param {string} combinedOutput Combined stdout/stderr output.
 * @returns {string} Filtered output text.
 */
function filterCheckEnvOutput(combinedOutput) {
  const lines = String(combinedOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const errorLikeLines = lines.filter((line) => {
    return /(error|invalid|failed|missing|unsupported)/i.test(line);
  });

  if (errorLikeLines.length > 0) {
    return errorLikeLines.join("\n");
  }

  return lines.slice(-40).join("\n");
}

/**
 * Runs init.sh non-interactively and captures output.
 *
 * @param {string} resolvedRootPath Canonical repository root path.
 * @param {string} initScriptPath Canonical init.sh path.
 * @param {string[]} args init.sh arguments.
 * @param {Function} [spawnFn] Spawn function override for testing (defaults to child_process.spawn).
 * @returns {Promise<{exitCode: number|null, stdout: string, stderr: string, combinedOutput: string}>} Command result.
 */
function runInitScriptCommand(resolvedRootPath, initScriptPath, args, spawnFn) {
  const normalizedArgs = Array.isArray(args) ? args : [];

  return executeCommand({
    mode: "spawn-capture",
    command: "sh",
    cwd: resolvedRootPath,
    args: [initScriptPath, ...normalizedArgs],
    spawnFn,
    filterOutput: null,
  }).then((result) => {
    return {
      exitCode: result.exitCode,
      stdout: String(result.stdout || ""),
      stderr: String(result.stderr || ""),
      combinedOutput: String(result.combinedOutput || ""),
    };
  });
}

/**
 * Executes init.sh through spawn-capture mode and returns normalized outcome.
 *
 * @param {{resolvedRootPath: string, initScriptPath: string, spawnFn?: Function}} input Init execution context.
 * @param {string[]} initArgs init.sh operation args.
 * @param {Function} resolvedFilterFn Output filter callback.
 * @returns {Promise<object>} Normalized command outcome.
 */
function executeInitSpawnCapture(input, initArgs, resolvedFilterFn) {
  return executeCommand({
    mode: "spawn-capture",
    command: "sh",
    cwd: input.resolvedRootPath,
    args: [input.initScriptPath, ...initArgs],
    spawnFn: input.spawnFn,
    filterOutput: resolvedFilterFn,
  });
}

// ---------------------------------------------------------------------------
// SECTION 3: Argument builders
// ---------------------------------------------------------------------------

/**
 * Builds init.sh args for environment checks.
 *
 * @param {string} profilePath Draft profile path.
 * @returns {string[]} init.sh args.
 */
function buildCheckEnvInitArgs(profilePath) {
  return [
    "--no-prompt",
    "--no-icons",
    ...buildProfileArgs(profilePath),
    "--check-env",
  ];
}

/**
 * Builds init.sh args for icon copy operations.
 *
 * @param {string} profilePath Draft profile path.
 * @param {string} copyIconsPath Target icons directory.
 * @returns {string[]} init.sh args.
 */
function buildCopyIconsInitArgs(profilePath, copyIconsPath) {
  const args = [
    "--no-prompt",
    "--copy-icons",
    "--skip-environment",
    ...buildProfileArgs(profilePath),
  ];
  const trimmedCopyIconsPath = String(copyIconsPath || "").trim();

  if (trimmedCopyIconsPath) {
    args.push(`--icons-to=${trimmedCopyIconsPath}`);
  }

  return args;
}

/**
 * Builds init.sh args for one environment variable save operation.
 *
 * @param {string} profilePath Draft profile path.
 * @param {string} optionName init.sh variable option name.
 * @param {string} value Variable value.
 * @returns {string[]} init.sh args.
 */
function buildSaveVariableInitArgs(profilePath, optionName, value) {
  return [
    "--no-prompt",
    "--no-icons",
    ...buildProfileArgs(profilePath),
    "--set-use-only",
    `--${optionName}=${value}`,
  ];
}

/**
 * Builds init.sh args for one language routing save operation.
 *
 * @param {{profilePath: string, languageKey: string, dockerEnabled: boolean, dockerValue: string, sshEnabled: boolean, sshValue: string}} input Routing input.
 * @returns {string[]} init.sh args.
 */
function buildSaveLanguageRoutingInitArgs(input) {
  const languageKey = String(input?.languageKey || "").trim().toLowerCase();
  const dockerEnabled = Boolean(input?.dockerEnabled);
  const dockerValue = String(input?.dockerValue || "").trim();
  const sshEnabled = Boolean(input?.sshEnabled);
  const sshValue = String(input?.sshValue || "").trim();

  return [
    "--no-prompt",
    "--no-icons",
    ...buildProfileArgs(input?.profilePath),
    dockerEnabled
      ? `--runondocker-set=${languageKey}=${dockerValue}`
      : `--runondocker-remove=${languageKey}`,
    sshEnabled
      ? `--runonssh-set=${languageKey}=${sshValue}`
      : `--runonssh-remove=${languageKey}`,
  ];
}

/**
 * Builds init.sh args for a Batch All routing save operation.
 *
 * @param {{profilePath: string, supportedLanguageKeys: string[], batchDockerEnabled: boolean, batchDockerValue: string, batchSshEnabled: boolean, batchSshValue: string}} input Batch routing input.
 * @returns {string[]} init.sh args.
 */
function buildSaveBatchRoutingInitArgs(input) {
  const args = [
    "--no-prompt",
    "--no-icons",
    ...buildProfileArgs(input?.profilePath),
  ];
  const supportedLanguageKeys = Array.isArray(input?.supportedLanguageKeys)
    ? input.supportedLanguageKeys
    : [];
  const batchDockerEnabled = Boolean(input?.batchDockerEnabled);
  const batchDockerValue = String(input?.batchDockerValue || "").trim();
  const batchSshEnabled = Boolean(input?.batchSshEnabled);
  const batchSshValue = String(input?.batchSshValue || "").trim();

  for (const languageKey of supportedLanguageKeys) {
    args.push(
      batchDockerEnabled
        ? `--runondocker-set=${languageKey}=${batchDockerValue}`
        : `--runondocker-remove=${languageKey}`
    );
    args.push(
      batchSshEnabled
        ? `--runonssh-set=${languageKey}=${batchSshValue}`
        : `--runonssh-remove=${languageKey}`
    );
  }

  return args;
}

// ---------------------------------------------------------------------------
// SECTION 4: Status/result builders
// ---------------------------------------------------------------------------

/**
 * Builds check-env status when repository root/init path is unavailable.
 *
 * @returns {{kind: "error", text: string, filteredOutput: string, rawOutput: string}} Check-env status.
 */
function buildCheckEnvMissingContextResult() {
  return {
    kind: "error",
    text: "Unable to resolve repository root or init.sh.",
    filteredOutput: "",
    rawOutput: "",
  };
}

/**
 * Builds running check-env status.
 *
 * @returns {{kind: "running", text: string, filteredOutput: string, rawOutput: string}} Check-env status.
 */
function buildCheckEnvRunningResult() {
  return {
    kind: "running",
    text: "Running check-env...",
    filteredOutput: "",
    rawOutput: "",
  };
}

/**
 * Builds completed check-env status from command result payload.
 *
 * @param {{exitCode: number|null, filteredOutput: string, combinedOutput: string}} input Result payload.
 * @returns {{kind: "ok"|"error", text: string, filteredOutput: string, rawOutput: string}} Check-env status.
 */
function buildCheckEnvCompletedResult(input) {
  const isSuccess = input?.exitCode === 0;

  return {
    kind: isSuccess ? "ok" : "error",
    text: isSuccess
      ? "Environment check succeeded."
      : "Environment check found issues.",
    filteredOutput: String(input?.filteredOutput || ""),
    rawOutput: String(input?.combinedOutput || ""),
  };
}

/**
 * Builds failed check-env status from runtime error details.
 *
 * @param {string} errorMessage Runtime failure message.
 * @returns {{kind: "error", text: string, filteredOutput: string, rawOutput: string}} Check-env status.
 */
function buildCheckEnvFailureResult(errorMessage) {
  const safeMessage = String(errorMessage || "");

  return {
    kind: "error",
    text: `Environment check failed: ${safeMessage}`,
    filteredOutput: safeMessage,
    rawOutput: safeMessage,
  };
}

/**
 * Builds copy-icons status when repository root/init path is unavailable.
 *
 * @returns {{kind: "error", text: string}} Copy-icons status.
 */
function buildCopyIconsMissingContextResult() {
  return {
    kind: "error",
    text: "Unable to resolve repository root or init.sh.",
  };
}

/**
 * Builds running copy-icons status.
 *
 * @returns {{kind: "running", text: string}} Copy-icons status.
 */
function buildCopyIconsRunningResult() {
  return {
    kind: "running",
    text: "Copying icons...",
  };
}

/**
 * Builds completed copy-icons status from command result payload.
 *
 * @param {{exitCode: number|null, filteredOutput: string}} input Result payload.
 * @returns {{kind: "ok"|"error", text: string}} Copy-icons status.
 */
function buildCopyIconsCompletedResult(input) {
  const isSuccess = input?.exitCode === 0;

  return {
    kind: isSuccess ? "ok" : "error",
    text: isSuccess
      ? "Icons copied successfully."
      : String(input?.filteredOutput || "") || "Icon copy failed.",
  };
}

/**
 * Builds failed copy-icons status from runtime error details.
 *
 * @param {string} errorMessage Runtime failure message.
 * @returns {{kind: "error", text: string}} Copy-icons status.
 */
function buildCopyIconsFailureResult(errorMessage) {
  return {
    kind: "error",
    text: `Icon copy failed: ${String(errorMessage || "")}`,
  };
}

/**
 * Builds variable-save status when save context cannot be resolved.
 *
 * @returns {{kind: "error", text: string}} Variable status.
 */
function buildVariableMissingContextStatus() {
  return {
    kind: "error",
    text: "Unable to resolve init.sh variable save context.",
  };
}

/**
 * Builds running variable-save status.
 *
 * @param {string} label Variable display label.
 * @returns {{kind: "running", text: string}} Variable status.
 */
function buildVariableRunningStatus(label) {
  return {
    kind: "running",
    text: `Saving ${String(label || "")}...`,
  };
}

/**
 * Builds completed variable-save status from command result payload.
 *
 * @param {{label: string, exitCode: number|null, filteredOutput: string}} input Result payload.
 * @returns {{kind: "ok"|"error", text: string}} Variable status.
 */
function buildVariableCompletedStatus(input) {
  const label = String(input?.label || "");
  const isSuccess = input?.exitCode === 0;

  return {
    kind: isSuccess ? "ok" : "error",
    text: isSuccess
      ? `${label} saved.`
      : String(input?.filteredOutput || "") || `${label} save failed.`,
  };
}

/**
 * Builds failed variable-save status from runtime error details.
 *
 * @param {string} label Variable display label.
 * @param {string} errorMessage Runtime failure message.
 * @returns {{kind: "error", text: string}} Variable status.
 */
function buildVariableFailureStatus(label, errorMessage) {
  return {
    kind: "error",
    text: `${String(label || "")} save failed: ${String(errorMessage || "")}`,
  };
}

/**
 * Builds routing-save status when save context cannot be resolved.
 *
 * @returns {{kind: "error", text: string}} Routing status.
 */
function buildRoutingMissingContextStatus() {
  return {
    kind: "error",
    text: "Unable to resolve routing save context.",
  };
}

/**
 * Builds routing-save status for docker/ssh conflict validation failures.
 *
 * @returns {{kind: "error", text: string}} Routing status.
 */
function buildRoutingConflictStatus() {
  return {
    kind: "error",
    text: "Cannot save with both docker and ssh enabled.",
  };
}

/**
 * Builds running routing-save status.
 *
 * @param {string} languageLabel Language display label.
 * @returns {{kind: "running", text: string}} Routing status.
 */
function buildRoutingRunningStatus(languageLabel) {
  return {
    kind: "running",
    text: `Saving ${String(languageLabel || "")} routing...`,
  };
}

/**
 * Builds completed routing-save status from command result payload.
 *
 * @param {{languageLabel: string, exitCode: number|null, filteredOutput: string}} input Result payload.
 * @returns {{kind: "ok"|"error", text: string}} Routing status.
 */
function buildRoutingCompletedStatus(input) {
  const languageLabel = String(input?.languageLabel || "");
  const isSuccess = input?.exitCode === 0;

  return {
    kind: isSuccess ? "ok" : "error",
    text: isSuccess
      ? `${languageLabel} routing saved.`
      : String(input?.filteredOutput || "") || `${languageLabel} routing save failed.`,
  };
}

/**
 * Builds failed routing-save status from runtime error details.
 *
 * @param {string} languageLabel Language display label.
 * @param {string} errorMessage Runtime failure message.
 * @returns {{kind: "error", text: string}} Routing status.
 */
function buildRoutingFailureStatus(languageLabel, errorMessage) {
  return {
    kind: "error",
    text: `${String(languageLabel || "")} routing save failed: ${String(errorMessage || "")}`,
  };
}

/**
 * Builds batch-routing status when save context cannot be resolved.
 *
 * @returns {{kind: "error", text: string}} Batch status.
 */
function buildBatchMissingContextResult() {
  return {
    kind: "error",
    text: "Unable to resolve batch routing save context.",
  };
}

/**
 * Builds batch-routing status for docker/ssh conflict validation failures.
 *
 * @returns {{kind: "error", text: string}} Batch status.
 */
function buildBatchConflictResult() {
  return {
    kind: "error",
    text: "Cannot save Batch All with both docker and ssh enabled.",
  };
}

/**
 * Builds running batch-routing status.
 *
 * @returns {{kind: "running", text: string}} Batch status.
 */
function buildBatchRunningResult() {
  return {
    kind: "running",
    text: "Applying Batch All routing...",
  };
}

/**
 * Builds completed batch-routing status from command result payload.
 *
 * @param {{exitCode: number|null, filteredOutput: string}} input Result payload.
 * @returns {{kind: "ok"|"error", text: string}} Batch status.
 */
function buildBatchCompletedResult(input) {
  const isSuccess = input?.exitCode === 0;

  return {
    kind: isSuccess ? "ok" : "error",
    text: isSuccess
      ? "Batch All routing saved."
      : String(input?.filteredOutput || "") || "Batch All routing save failed.",
  };
}

/**
 * Builds failed batch-routing status from runtime error details.
 *
 * @param {string} errorMessage Runtime failure message.
 * @returns {{kind: "error", text: string}} Batch status.
 */
function buildBatchFailureResult(errorMessage) {
  return {
    kind: "error",
    text: `Batch All routing save failed: ${String(errorMessage || "")}`,
  };
}

// ---------------------------------------------------------------------------
// SECTION 5: Operation executors
// ---------------------------------------------------------------------------

/**
 * Executes check-env operation and returns final status payload.
 *
 * @param {object} input Operation input.
 * @param {Function} resolvedFilterFn Output filter.
 * @returns {Promise<object>} Final check-env status.
 */
async function executeCheckEnvOperation(input, resolvedFilterFn) {
  const outcome = await executeInitSpawnCapture(
    input,
    buildCheckEnvInitArgs(input.profilePath),
    resolvedFilterFn
  );

  if (outcome.ok) {
    return buildCheckEnvCompletedResult({
      exitCode: outcome.exitCode,
      filteredOutput: outcome.filteredOutput,
      combinedOutput: outcome.combinedOutput,
    });
  }

  return buildCheckEnvFailureResult(outcome.errorMessage);
}

/**
 * Executes copy-icons operation and returns final status payload.
 *
 * @param {object} input Operation input.
 * @param {Function} resolvedFilterFn Output filter.
 * @returns {Promise<object>} Final copy-icons status.
 */
async function executeCopyIconsOperation(input, resolvedFilterFn) {
  const outcome = await executeInitSpawnCapture(
    input,
    buildCopyIconsInitArgs(input.profilePath, input.copyIconsPath),
    resolvedFilterFn
  );

  if (outcome.ok) {
    return buildCopyIconsCompletedResult({
      exitCode: outcome.exitCode,
      filteredOutput: outcome.filteredOutput,
    });
  }

  return buildCopyIconsFailureResult(outcome.errorMessage);
}

/**
 * Executes save-variable operation and returns final status payload.
 *
 * @param {object} input Operation input.
 * @param {Function} resolvedFilterFn Output filter.
 * @returns {Promise<object>} Final variable status.
 */
async function executeSaveVariableOperation(input, resolvedFilterFn) {
  const outcome = await executeInitSpawnCapture(
    input,
    buildSaveVariableInitArgs(
      input.profilePath,
      input.variable.optionName,
      input.variable.value
    ),
    resolvedFilterFn
  );

  if (outcome.ok) {
    return buildVariableCompletedStatus({
      label: input.variable.label,
      exitCode: outcome.exitCode,
      filteredOutput: outcome.filteredOutput,
    });
  }

  return buildVariableFailureStatus(input.variable.label, outcome.errorMessage);
}

/**
 * Executes save-language-routing operation and returns final status payload.
 *
 * @param {object} input Operation input.
 * @param {Function} resolvedFilterFn Output filter.
 * @returns {Promise<object>} Final routing status.
 */
async function executeSaveLanguageRoutingOperation(input, resolvedFilterFn) {
  const outcome = await executeInitSpawnCapture(
    input,
    buildSaveLanguageRoutingInitArgs({
      profilePath: input.profilePath,
      languageKey: input.routing.languageKey,
      dockerEnabled: input.routing.dockerEnabled,
      dockerValue: input.routing.dockerValue,
      sshEnabled: input.routing.sshEnabled,
      sshValue: input.routing.sshValue,
    }),
    resolvedFilterFn
  );

  if (outcome.ok) {
    return buildRoutingCompletedStatus({
      languageLabel: input.routing.languageLabel,
      exitCode: outcome.exitCode,
      filteredOutput: outcome.filteredOutput,
    });
  }

  return buildRoutingFailureStatus(input.routing.languageLabel, outcome.errorMessage);
}

/**
 * Executes save-batch-routing operation and returns final status payload.
 *
 * @param {object} input Operation input.
 * @param {Function} resolvedFilterFn Output filter.
 * @returns {Promise<object>} Final batch status.
 */
async function executeSaveBatchRoutingOperation(input, resolvedFilterFn) {
  const outcome = await executeInitSpawnCapture(
    input,
    buildSaveBatchRoutingInitArgs({
      profilePath: input.profilePath,
      supportedLanguageKeys: input.batch.supportedLanguageKeys,
      batchDockerEnabled: input.batch.batchDockerEnabled,
      batchDockerValue: input.batch.batchDockerValue,
      batchSshEnabled: input.batch.batchSshEnabled,
      batchSshValue: input.batch.batchSshValue,
    }),
    resolvedFilterFn
  );

  if (outcome.ok) {
    return buildBatchCompletedResult({
      exitCode: outcome.exitCode,
      filteredOutput: outcome.filteredOutput,
    });
  }

  return buildBatchFailureResult(outcome.errorMessage);
}

/**
 * Executes one init operation and returns final status payload.
 *
 * @param {{operation: string, resolvedRootPath: string, initScriptPath: string, profilePath?: string, copyIconsPath?: string, variable?: {optionName: string, value: string, label: string}, routing?: {languageKey: string, dockerEnabled: boolean, dockerValue: string, sshEnabled: boolean, sshValue: string, languageLabel: string}, batch?: {supportedLanguageKeys: string[], batchDockerEnabled: boolean, batchDockerValue: string, batchSshEnabled: boolean, batchSshValue: string}, spawnFn?: Function, filterCheckEnvOutputFn?: Function}} input Orchestration input.
 * @returns {Promise<object>} Final status payload for the operation.
 */
async function executeInitOperation(input) {
  const resolvedFilterFn =
    typeof input?.filterCheckEnvOutputFn === "function"
      ? input.filterCheckEnvOutputFn
      : filterCheckEnvOutput;
  const lifecycle = input?.runtimeProcessLifecycle || runtimeProcessLifecycle;

  let operationResult;

  if (input?.operation === INIT_OPERATION_CHECK_ENV) {
    const initArgs = buildCheckEnvInitArgs(input.profilePath);
    const lifecycleRun = beginInitLifecycle({
      runtimeProcessLifecycle: lifecycle,
      operation: input.operation,
      resolvedRootPath: input.resolvedRootPath,
      initScriptPath: input.initScriptPath,
      initArgs,
    });
    operationResult = await executeCheckEnvOperation(input, resolvedFilterFn);
    markInitLifecycleCompleted({
      runtimeProcessLifecycle: lifecycle,
      lifecycleRun,
      status: operationResult,
    });
    return operationResult;
  }

  if (input?.operation === INIT_OPERATION_COPY_ICONS) {
    const initArgs = buildCopyIconsInitArgs(input.profilePath, input.copyIconsPath);
    const lifecycleRun = beginInitLifecycle({
      runtimeProcessLifecycle: lifecycle,
      operation: input.operation,
      resolvedRootPath: input.resolvedRootPath,
      initScriptPath: input.initScriptPath,
      initArgs,
    });
    operationResult = await executeCopyIconsOperation(input, resolvedFilterFn);
    markInitLifecycleCompleted({
      runtimeProcessLifecycle: lifecycle,
      lifecycleRun,
      status: operationResult,
    });
    return operationResult;
  }

  if (input?.operation === INIT_OPERATION_SAVE_VARIABLE) {
    const initArgs = buildSaveVariableInitArgs(
      input.profilePath,
      input.variable.optionName,
      input.variable.value
    );
    const lifecycleRun = beginInitLifecycle({
      runtimeProcessLifecycle: lifecycle,
      operation: input.operation,
      resolvedRootPath: input.resolvedRootPath,
      initScriptPath: input.initScriptPath,
      initArgs,
    });
    operationResult = await executeSaveVariableOperation(input, resolvedFilterFn);
    markInitLifecycleCompleted({
      runtimeProcessLifecycle: lifecycle,
      lifecycleRun,
      status: operationResult,
    });
    return operationResult;
  }

  if (input?.operation === INIT_OPERATION_SAVE_LANGUAGE_ROUTING) {
    const initArgs = buildSaveLanguageRoutingInitArgs({
      profilePath: input.profilePath,
      languageKey: input.routing.languageKey,
      dockerEnabled: input.routing.dockerEnabled,
      dockerValue: input.routing.dockerValue,
      sshEnabled: input.routing.sshEnabled,
      sshValue: input.routing.sshValue,
    });
    const lifecycleRun = beginInitLifecycle({
      runtimeProcessLifecycle: lifecycle,
      operation: input.operation,
      resolvedRootPath: input.resolvedRootPath,
      initScriptPath: input.initScriptPath,
      initArgs,
    });
    operationResult = await executeSaveLanguageRoutingOperation(input, resolvedFilterFn);
    markInitLifecycleCompleted({
      runtimeProcessLifecycle: lifecycle,
      lifecycleRun,
      status: operationResult,
    });
    return operationResult;
  }

  if (input?.operation === INIT_OPERATION_SAVE_BATCH_ROUTING) {
    const initArgs = buildSaveBatchRoutingInitArgs({
      profilePath: input.profilePath,
      supportedLanguageKeys: input.batch.supportedLanguageKeys,
      batchDockerEnabled: input.batch.batchDockerEnabled,
      batchDockerValue: input.batch.batchDockerValue,
      batchSshEnabled: input.batch.batchSshEnabled,
      batchSshValue: input.batch.batchSshValue,
    });
    const lifecycleRun = beginInitLifecycle({
      runtimeProcessLifecycle: lifecycle,
      operation: input.operation,
      resolvedRootPath: input.resolvedRootPath,
      initScriptPath: input.initScriptPath,
      initArgs,
    });
    operationResult = await executeSaveBatchRoutingOperation(input, resolvedFilterFn);
    markInitLifecycleCompleted({
      runtimeProcessLifecycle: lifecycle,
      lifecycleRun,
      status: operationResult,
    });
    return operationResult;
  }

  markInitLifecycleFailed({
    runtimeProcessLifecycle: lifecycle,
    lifecycleRun: beginInitLifecycle({
      runtimeProcessLifecycle: lifecycle,
      operation: input?.operation,
      resolvedRootPath: input?.resolvedRootPath,
      initScriptPath: input?.initScriptPath,
      initArgs: [],
    }),
    errorMessage: "Unsupported init operation.",
  });

  throw new Error("Unsupported init operation.");
}

// ---------------------------------------------------------------------------
// SECTION 6: Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  INIT_OPERATION_CHECK_ENV,
  INIT_OPERATION_COPY_ICONS,
  INIT_OPERATION_SAVE_VARIABLE,
  INIT_OPERATION_SAVE_LANGUAGE_ROUTING,
  INIT_OPERATION_SAVE_BATCH_ROUTING,
  // Command execution helpers
  buildProfileArgs,
  filterCheckEnvOutput,
  runInitScriptCommand,
  buildInitOwnerKey,
  beginInitLifecycle,
  markInitLifecycleCompleted,
  markInitLifecycleFailed,
  // Arg builders
  buildCheckEnvInitArgs,
  buildCopyIconsInitArgs,
  buildSaveVariableInitArgs,
  buildSaveLanguageRoutingInitArgs,
  buildSaveBatchRoutingInitArgs,
  // Status/result builders
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
  // Operation dispatcher
  executeInitOperation,
};
