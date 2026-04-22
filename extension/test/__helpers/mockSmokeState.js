/**
 * Creates a smoke-state fixture with the shared baseline entries used across tests.
 *
 * @param {{includeFailed?: boolean, includeStopped?: boolean}} [options] Optional extra entries to include.
 * @returns {Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}>} Smoke-state fixture.
 */
function createSmokeStateFixture(options) {
  const resolvedOptions = options || {};
  const smokeState = new Map([
    ["queuedLang", { status: "queued", locked: false }],
    ["runningLang", { status: "running", locked: false }],
    ["passedLang", { status: "passed", locked: false }],
    ["failedLockedLang", { status: "failed", locked: true }],
  ]);

  if (resolvedOptions.includeFailed) {
    smokeState.set("failedLang", { status: "failed", locked: false });
  }

  if (resolvedOptions.includeStopped) {
    smokeState.set("stoppedLang", { status: "stopped", locked: false });
  }

  return smokeState;
}

module.exports = {
  createSmokeStateFixture,
};