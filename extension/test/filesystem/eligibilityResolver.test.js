const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  resolveEligibilityState,
} = require("../../src/runtime/filesystem/eligibilityResolver");
const {
  createTemporaryDirectory,
} = require("../__helpers/temporaryFixtures");

/**
 * Creates one temporary workspace folder with required repository markers.
 *
 * @returns {string} Temporary repository root path.
 */
function createTemporaryEligibilityRoot() {
  const tempRoot = createTemporaryDirectory("algos-pathresolver-");

  fs.writeFileSync(
    path.join(tempRoot, "run.sh"),
    "#!/bin/sh\nexit 0\n",
    "utf8"
  );
  fs.writeFileSync(path.join(tempRoot, "init.sh"), "#!/bin/sh\n", "utf8");
  fs.chmodSync(path.join(tempRoot, "run.sh"), 0o755);
  fs.mkdirSync(path.join(tempRoot, "src"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "shlib"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "stdlib"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "templates"), { recursive: true });

  return tempRoot;
}

/**
 * Returns one mock VS Code workspace folder array.
 *
 * @param {string} folderPath Workspace folder path.
 * @returns {{uri: {fsPath: string}}[]} Workspace folder list.
 */
function createWorkspaceFolders(folderPath) {
  return [
    {
      uri: {
        fsPath: folderPath,
      },
    },
  ];
}

/**
 * Verifies skipCanary preflight stays eligible without shell execution.
 *
 * @returns {void}
 */
function testResolveEligibilityStateSkipCanary() {
  const resolvedRoot = createTemporaryEligibilityRoot();
  const state = resolveEligibilityState(createWorkspaceFolders(resolvedRoot), {
    skipCanary: true,
  });

  assert.strictEqual(state.status, "eligible");
  assert.ok(state.selected);
  assert.strictEqual(state.selected.reason, "markers-passed-canary-skipped");
  assert.strictEqual(state.selected.canary.attempted, false);
  assert.strictEqual(state.selected.canary.success, true);
}

/**
 * Verifies canary-enabled resolution still attempts the shell command.
 *
 * @returns {void}
 */
function testResolveEligibilityStateCanaryAttempted() {
  const resolvedRoot = createTemporaryEligibilityRoot();
  const state = resolveEligibilityState(createWorkspaceFolders(resolvedRoot));

  assert.strictEqual(state.status, "eligible");
  assert.ok(state.selected);
  assert.strictEqual(state.selected.canary.attempted, true);
}

/**
 * Runs all eligibilityResolver tests.
 *
 * @returns {void}
 */
function runTests() {
  testResolveEligibilityStateSkipCanary();
  testResolveEligibilityStateCanaryAttempted();
}

module.exports = {
  runTests,
};