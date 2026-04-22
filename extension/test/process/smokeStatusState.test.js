const assert = require("assert");
const {
  applyRemainingSmokeStatus,
  buildSmokeStatusSummary,
} = require("../../src/runtime/state/smokeStatusState");
const {
  createSmokeStateFixture,
} = require("../__helpers/mockSmokeState");

/**
 * Verifies remaining queued/running statuses transition to failed.
 *
 * @returns {void}
 */
function testApplyRemainingSmokeStatusFailed() {
  const smokeState = createSmokeStateFixture({
    includeFailed: true,
    includeStopped: true,
  });
  const didChange = applyRemainingSmokeStatus(smokeState, "failed");

  assert.strictEqual(didChange, true);
  assert.strictEqual(smokeState.get("queuedLang").status, "failed");
  assert.strictEqual(smokeState.get("runningLang").status, "failed");
  assert.strictEqual(smokeState.get("passedLang").status, "passed");
  assert.strictEqual(smokeState.get("failedLang").status, "failed");
  assert.strictEqual(smokeState.get("failedLockedLang").status, "failed");
  assert.strictEqual(smokeState.get("stoppedLang").status, "stopped");
}

/**
 * Verifies remaining queued/running statuses transition to stopped.
 *
 * @returns {void}
 */
function testApplyRemainingSmokeStatusStopped() {
  const smokeState = createSmokeStateFixture({
    includeFailed: true,
    includeStopped: true,
  });
  const didChange = applyRemainingSmokeStatus(smokeState, "stopped");

  assert.strictEqual(didChange, true);
  assert.strictEqual(smokeState.get("queuedLang").status, "stopped");
  assert.strictEqual(smokeState.get("runningLang").status, "stopped");
  assert.strictEqual(smokeState.get("passedLang").status, "passed");
  assert.strictEqual(smokeState.get("failedLang").status, "failed");
  assert.strictEqual(smokeState.get("failedLockedLang").status, "failed");
  assert.strictEqual(smokeState.get("stoppedLang").status, "stopped");
}

/**
 * Verifies unsupported replacement values do not mutate smoke state.
 *
 * @returns {void}
 */
function testApplyRemainingSmokeStatusRejectsUnsupportedReplacement() {
  const smokeState = createSmokeStateFixture({
    includeFailed: true,
    includeStopped: true,
  });
  const didChange = applyRemainingSmokeStatus(smokeState, "passed");

  assert.strictEqual(didChange, false);
  assert.strictEqual(smokeState.get("queuedLang").status, "queued");
  assert.strictEqual(smokeState.get("runningLang").status, "running");
}

/**
 * Verifies smoke summary includes stopped counts.
 *
 * @returns {void}
 */
function testBuildSmokeStatusSummaryIncludesStopped() {
  const smokeState = createSmokeStateFixture({
    includeFailed: true,
    includeStopped: true,
  });
  const summary = buildSmokeStatusSummary(smokeState);

  assert.deepStrictEqual(summary, {
    queued: 1,
    running: 1,
    passed: 1,
    failed: 2,
    stopped: 1,
  });
}

/**
 * Runs all smoke status state tests.
 *
 * @returns {void}
 */
function runTests() {
  testApplyRemainingSmokeStatusFailed();
  testApplyRemainingSmokeStatusStopped();
  testApplyRemainingSmokeStatusRejectsUnsupportedReplacement();
  testBuildSmokeStatusSummaryIncludesStopped();
}

module.exports = {
  runTests,
};