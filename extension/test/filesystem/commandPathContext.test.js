const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  resolveActiveFileRunContext,
  resolveCleanContextFromExplorer,
  resolveLocalCleanContextFromExplorer,
} = require("../../src/runtime/filesystem/commandPathContext");
const {
  createTemporaryDirectory,
} = require("../__helpers/temporaryFixtures");

/**
 * Creates one temporary repository-like structure for command path tests.
 *
 * @returns {{rootPath: string, scriptPath: string, algorithmDir: string, algorithmFilePath: string}} Fixture paths.
 */
function createCommandPathFixture() {
  const rootPath = createTemporaryDirectory("algos-commandctx-");
  const srcPath = path.join(rootPath, "src");
  const algorithmDir = path.join(srcPath, "numeric", "euclidgcd");
  const algorithmFilePath = path.join(algorithmDir, "euclidgcd.py");
  const scriptPath = path.join(rootPath, "run.sh");

  fs.mkdirSync(algorithmDir, { recursive: true });
  fs.writeFileSync(algorithmFilePath, "print('ok')\n", "utf8");
  fs.writeFileSync(scriptPath, "#!/bin/sh\n", "utf8");

  return {
    rootPath,
    scriptPath,
    algorithmDir,
    algorithmFilePath,
  };
}

/**
 * Builds one minimal eligibility state shape for context resolution.
 *
 * @param {string} rootPath Resolved repository root path.
 * @param {string} scriptPath Absolute run.sh path.
 * @returns {{selected: {resolvedRoot: string, scriptPath: string}}} Eligibility state.
 */
function createEligibilityState(rootPath, scriptPath) {
  return {
    selected: {
      resolvedRoot: rootPath,
      scriptPath,
    },
  };
}

/**
 * Verifies active-file context resolves for immediate algorithm child files.
 *
 * @returns {void}
 */
function testResolveActiveFileRunContextSuccess() {
  const fixture = createCommandPathFixture();
  const state = createEligibilityState(fixture.rootPath, fixture.scriptPath);
  const result = resolveActiveFileRunContext(fixture.algorithmFilePath, state);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.algorithmDir, fixture.algorithmDir);
  assert.strictEqual(result.filename, "euclidgcd.py");
}

/**
 * Verifies active-file context blocks nested descendants under algorithm folders.
 *
 * @returns {void}
 */
function testResolveActiveFileRunContextRejectsNestedDescendant() {
  const fixture = createCommandPathFixture();
  const nestedFilePath = path.join(fixture.algorithmDir, "nested", "main.py");
  const state = createEligibilityState(fixture.rootPath, fixture.scriptPath);

  fs.mkdirSync(path.dirname(nestedFilePath), { recursive: true });
  fs.writeFileSync(nestedFilePath, "print('nested')\n", "utf8");

  const result = resolveActiveFileRunContext(nestedFilePath, state);

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "nested-descendant");
}

/**
 * Verifies localclean/clean explorer resolvers accept algorithm directory targets.
 *
 * @returns {void}
 */
function testResolveExplorerContextsForAlgorithmDirectory() {
  const fixture = createCommandPathFixture();
  const state = createEligibilityState(fixture.rootPath, fixture.scriptPath);

  const localCleanResult = resolveLocalCleanContextFromExplorer(
    fixture.algorithmDir,
    state
  );
  const cleanResult = resolveCleanContextFromExplorer(
    fixture.algorithmDir,
    state
  );

  assert.strictEqual(localCleanResult.ok, true);
  assert.strictEqual(cleanResult.ok, true);
  assert.strictEqual(localCleanResult.algorithmDir, fixture.algorithmDir);
  assert.strictEqual(cleanResult.algorithmDir, fixture.algorithmDir);
}

/**
 * Runs all command path-context tests.
 *
 * @returns {void}
 */
function runTests() {
  testResolveActiveFileRunContextSuccess();
  testResolveActiveFileRunContextRejectsNestedDescendant();
  testResolveExplorerContextsForAlgorithmDirectory();
}

module.exports = {
  runTests,
};