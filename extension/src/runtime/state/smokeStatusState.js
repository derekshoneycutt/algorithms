/**
 * Returns whether one smoke status can be replaced by an end-of-run transition.
 *
 * @param {string} smokeStatus Smoke status value.
 * @returns {boolean} True when status is queued or running.
 */
function isReplaceableSmokeStatus(smokeStatus) {
  return smokeStatus === "queued" || smokeStatus === "running";
}

/**
 * Applies one replacement smoke status to all queued/running unlocked entries.
 *
 * @param {Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}>|undefined|null} smokeState Smoke-state map.
 * @param {"failed"|"stopped"} replacementStatus Replacement status.
 * @returns {boolean} True when at least one entry changed.
 */
function applyRemainingSmokeStatus(smokeState, replacementStatus) {
  if (!(smokeState instanceof Map)) {
    return false;
  }

  if (replacementStatus !== "failed" && replacementStatus !== "stopped") {
    return false;
  }

  let didChange = false;

  for (const [languageKey, entry] of smokeState.entries()) {
    if (!entry || entry.locked) {
      continue;
    }

    if (!isReplaceableSmokeStatus(entry.status)) {
      continue;
    }

    smokeState.set(languageKey, {
      status: replacementStatus,
      locked: false,
    });
    didChange = true;
  }

  return didChange;
}

/**
 * Builds a smoke-status summary from one smoke-state map.
 *
 * @param {Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}>|undefined|null} smokeState Smoke-state map.
 * @returns {{queued: number, running: number, passed: number, failed: number, stopped: number}} Smoke-status counts.
 */
function buildSmokeStatusSummary(smokeState) {
  const summary = {
    queued: 0,
    running: 0,
    passed: 0,
    failed: 0,
    stopped: 0,
  };

  if (!(smokeState instanceof Map)) {
    return summary;
  }

  for (const entry of smokeState.values()) {
    if (!entry || !Object.prototype.hasOwnProperty.call(summary, entry.status)) {
      continue;
    }

    summary[entry.status] += 1;
  }

  return summary;
}

module.exports = {
  applyRemainingSmokeStatus,
  buildSmokeStatusSummary,
};