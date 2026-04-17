#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const VALIDATE_SCRIPT = path.join(REPO_ROOT, "scripts", "langs", "validate-languages.js");
const GENERATE_SCRIPT = path.join(REPO_ROOT, "scripts", "langs", "generate-languages.js");
const GENERATED_SHELL_FILE = path.join(REPO_ROOT, "shlib", "generated", "languages.generated.sh");
const GENERATED_EXTENSION_FILE = path.join(
  REPO_ROOT,
  "extension",
  "src",
  "runtime",
  "generated",
  "languages.generated.js"
);

/**
 * Runs one Node script and returns its result.
 *
 * @param {string} scriptPath Script absolute path.
 * @returns {{status: number|null, stdout: string, stderr: string}} Spawn result.
 */
function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

/**
 * Reads file text.
 *
 * @param {string} filePath Absolute file path.
 * @returns {string} File contents.
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Verifies validation script succeeds.
 *
 * @returns {void}
 */
function testValidationScriptPasses() {
  const result = runNodeScript(VALIDATE_SCRIPT);

  assert.strictEqual(
    result.status,
    0,
    `expected validator to pass; stderr: ${result.stderr} stdout: ${result.stdout}`
  );
  assert.ok(result.stdout.includes("Language metadata validation passed."));
}

/**
 * Verifies generated artifact output is deterministic.
 *
 * @returns {void}
 */
function testGenerationDeterminism() {
  const firstRun = runNodeScript(GENERATE_SCRIPT);
  assert.strictEqual(firstRun.status, 0, `first generation failed: ${firstRun.stderr}`);

  const shellAfterFirstRun = readText(GENERATED_SHELL_FILE);
  const extensionAfterFirstRun = readText(GENERATED_EXTENSION_FILE);

  const secondRun = runNodeScript(GENERATE_SCRIPT);
  assert.strictEqual(secondRun.status, 0, `second generation failed: ${secondRun.stderr}`);

  const shellAfterSecondRun = readText(GENERATED_SHELL_FILE);
  const extensionAfterSecondRun = readText(GENERATED_EXTENSION_FILE);

  assert.strictEqual(shellAfterFirstRun, shellAfterSecondRun, "shell generated output should be deterministic");
  assert.strictEqual(
    extensionAfterFirstRun,
    extensionAfterSecondRun,
    "extension generated output should be deterministic"
  );
}

/**
 * Runs language tooling tests.
 *
 * @returns {void}
 */
function runTests() {
  testValidationScriptPasses();
  testGenerationDeterminism();
  console.log("language tooling tests passed");
}

runTests();
