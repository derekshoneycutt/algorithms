/**
 * Validates whether command execution is allowed for the current eligibility state.
 *
 * @param {{status?: string, reason?: string, guidance?: string}|null|undefined} eligibilityState Aggregated eligibility state.
 * @returns {{allowed: boolean, reason: string, guidance: string}} Validation outcome.
 */
function validateEligibilityForExecution(eligibilityState) {
  if (!eligibilityState) {
    return {
      allowed: false,
      reason: "missing-eligibility-state",
      guidance: "Eligibility state is unavailable. Reopen the workspace and try again.",
    };
  }

  if (eligibilityState.status === "eligible") {
    return {
      allowed: true,
      reason: "eligible",
      guidance: "Workspace is eligible.",
    };
  }

  return {
    allowed: false,
    reason: eligibilityState.reason || "ineligible-workspace",
    guidance:
      eligibilityState.guidance ||
      "Workspace is not eligible for command execution.",
  };
}

/**
 * Builds a user-facing blocked-execution message from validation and eligibility context.
 *
 * @param {{reason: string, guidance?: string}} validation Validation outcome.
 * @param {{selected?: {resolvedRoot?: string, missingMarkers?: string[], canary?: {exitCode?: number|null}}}|null|undefined} eligibilityState Aggregated eligibility state.
 * @returns {string} Actionable warning text.
 */
function buildEligibilityBlockMessage(validation, eligibilityState) {
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

// Module exports.
module.exports = {
  validateEligibilityForExecution,
  buildEligibilityBlockMessage,
};
