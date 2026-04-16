const assert = require("assert");
const { buildRunCommand } = require("../src/runtime/argumentBuilder");

/**
 * Verifies valid build input produces both internal and display command forms.
 *
 * @returns {void}
 */
function testBuildRunCommandSuccess() {
  const result = buildRunCommand({
    scriptPath: "/repo/run.sh",
    displayScriptPath: "../../../run.sh",
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
    args: ["euclidgcd.bas", "27", "36"],
  });

  assert.deepStrictEqual(result, {
    ok: true,
    reason: null,
    commandParts: ["/repo/run.sh", "euclidgcd.bas", "27", "36"],
    displayCommand: "../../../run.sh euclidgcd.bas 27 36",
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
  });
}

/**
 * Verifies non-absolute script paths are rejected.
 *
 * @returns {void}
 */
function testBuildRunCommandRejectsRelativeScriptPath() {
  const result = buildRunCommand({
    scriptPath: "./run.sh",
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "invalid-script-path");
}

/**
 * Verifies invalid argument arrays are rejected.
 *
 * @returns {void}
 */
function testBuildRunCommandRejectsInvalidArgs() {
  const result = buildRunCommand({
    scriptPath: "/repo/run.sh",
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
    args: ["ok", 42],
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "invalid-args");
}

/**
 * Verifies non-string display script paths are rejected.
 *
 * @returns {void}
 */
function testBuildRunCommandRejectsEmptyDisplayScriptPath() {
  const result = buildRunCommand({
    scriptPath: "/repo/run.sh",
    displayScriptPath: {},
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "invalid-display-script-path");
}

/**
 * Runs all argumentBuilder tests.
 *
 * @returns {void}
 */
function runTests() {
  testBuildRunCommandSuccess();
  testBuildRunCommandRejectsRelativeScriptPath();
  testBuildRunCommandRejectsInvalidArgs();
  testBuildRunCommandRejectsEmptyDisplayScriptPath();
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests,
};