const { TERMINAL_NAME } = require("../runtime/runScriptRunner");

const BUILD_FAILURE_GUIDANCE = {
  "missing-input": "Retry the command. If this persists, reload the window.",
  "invalid-script-path": "Ensure workspace eligibility is valid and run.sh is resolvable.",
  "invalid-cwd": "Run the command from a valid source file under src/<category>/<algorithm>/.",
  "invalid-display-script-path": "Retry the command. If this persists, reload the window.",
  "invalid-args": "Retry from a supported source file and command surface.",
};

const RUNTIME_FAILURE_GUIDANCE = {
  "vscode-api-unavailable": "Reload VS Code and try again.",
  "terminal-create-failed": `Create or reset the ${TERMINAL_NAME} terminal, then retry.`,
  "terminal-unavailable": `Create or reset the ${TERMINAL_NAME} terminal, then retry.`,
  "invalid-build": "Retry the command. If this persists, reload the window.",
  "missing-command-parts": "Retry the command. If this persists, reload the window.",
  "missing-cwd": "Run the command from a valid source file under src/<category>/<algorithm>/.",
  "missing-display-command": "Retry the command. If this persists, reload the window.",
};

/**
 * Shows a message using severity-specific VS Code notification APIs.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {"info"|"warning"|"error"|undefined} severity Message severity.
 * @param {string} message User-facing message.
 * @returns {void}
 */
function showNotificationBySeverity(vscodeApi, severity, message) {
  if (severity === "error") {
    vscodeApi.window.showErrorMessage(message);
    return;
  }

  if (severity === "warning") {
    vscodeApi.window.showWarningMessage(message);
    return;
  }

  vscodeApi.window.showInformationMessage(message);
}

/**
 * Builds a preflight eligibility blocked message with contextual details.
 *
 * @param {{reason: string, guidance?: string}} validation Validation outcome.
 * @param {{selected?: {resolvedRoot?: string, missingMarkers?: string[], canary?: {exitCode?: number|null}}}|null|undefined} eligibilityState Eligibility state.
 * @returns {string} Actionable preflight blocked message.
 */
function buildEligibilityPreflightMessage(validation, eligibilityState) {
  const selected = eligibilityState?.selected;
  const rootPath = selected?.resolvedRoot;
  const missingMarkers = selected?.missingMarkers || [];
  const canaryExit = selected?.canary?.exitCode;

  const details = [];
  details.push(`Reason: ${validation.reason}.`);

  if (rootPath) {
    details.push(`Resolved root: ${rootPath}.`);
  }

  if (missingMarkers.length > 0) {
    details.push(`Missing markers: ${missingMarkers.join(", ")}.`);
  }

  if (canaryExit !== null && canaryExit !== undefined) {
    details.push(`Canary exit code: ${canaryExit}.`);
  }

  if (validation.guidance) {
    details.push(`Guidance: ${validation.guidance}`);
  }

  return `Run Active File blocked by workspace eligibility preflight. ${details.join(" ")}`;
}

/**
 * Builds a standardized blocked message for file-context validation failures.
 *
 * @param {{reason: string|null, guidance: string}} validation Validation payload.
 * @param {string} [commandLabel="Run Active File"] Command label prefix.
 * @returns {string} User-facing actionable message.
 */
function buildValidationBlockMessage(validation, commandLabel = "Run Active File") {
  return `${commandLabel} aborted. Reason: ${validation.reason}. Guidance: ${validation.guidance}`;
}

/**
 * Builds a standardized command-build failure message.
 *
 * @param {string} commandLabel User-facing command label.
 * @param {string|null} reason Deterministic build failure reason.
 * @returns {string} User-facing actionable message.
 */
function buildBuildFailureMessage(commandLabel, reason) {
  const resolvedReason = reason || "unknown-build-failure";
  const guidance =
    BUILD_FAILURE_GUIDANCE[resolvedReason] ||
    `Unable to assemble command for execution. Check ${TERMINAL_NAME} output for details.`;

  return `${commandLabel} aborted. Reason: ${resolvedReason}. Guidance: ${guidance}`;
}

/**
 * Builds a standardized runtime-start failure message.
 *
 * @param {string} commandLabel User-facing command label.
 * @param {string|null} reason Deterministic runtime failure reason.
 * @returns {string} User-facing actionable message.
 */
function buildRuntimeFailureMessage(commandLabel, reason) {
  const resolvedReason = reason || "unknown-runtime-failure";
  const guidance =
    RUNTIME_FAILURE_GUIDANCE[resolvedReason] ||
    `Check ${TERMINAL_NAME} output for details, then retry.`;

  return `${commandLabel} failed to start. Reason: ${resolvedReason}. Guidance: ${guidance}`;
}

/**
 * Builds a standardized started-success message.
 *
 * @param {string} commandLabel User-facing command label.
 * @returns {string} User-facing success message.
 */
function buildSuccessMessage(commandLabel) {
  return `${commandLabel} started in ${TERMINAL_NAME}.`;
}

module.exports = {
  showNotificationBySeverity,
  buildEligibilityPreflightMessage,
  buildValidationBlockMessage,
  buildBuildFailureMessage,
  buildRuntimeFailureMessage,
  buildSuccessMessage,
  BUILD_FAILURE_GUIDANCE,
  RUNTIME_FAILURE_GUIDANCE,
};
