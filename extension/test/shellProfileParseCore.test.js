"use strict";

const assert = require("assert");
const {
  buildMergedEnvironmentConfig,
  extractManagedExportValue,
  extractShellAssignment,
  parseInitDefaults,
  parseRouteMap,
  PROFILE_BLOCK_END,
  PROFILE_BLOCK_START,
} = require("../src/runtime/commandline/core/shellProfileParseCore");

/**
 * Verifies core assignment extraction handles quoted and unquoted values.
 *
 * @returns {void}
 */
function testExtractShellAssignment() {
  assert.strictEqual(
    extractShellAssignment('useTimeout="-k 10s 2m"\nother=x', "useTimeout"),
    "-k 10s 2m"
  );
  assert.strictEqual(
    extractShellAssignment("useTimeout=plain\n", "useTimeout"),
    "plain"
  );
  assert.strictEqual(
    extractShellAssignment("other=x\n", "useTimeout"),
    null
  );
}

/**
 * Verifies managed export extraction scopes correctly to managed blocks.
 *
 * @returns {void}
 */
function testExtractManagedExportValue() {
  const scopedText = [
    PROFILE_BLOCK_START,
    'export DEREKALGOS_TIMEOUT="-k 30s 5m"',
    PROFILE_BLOCK_END,
    'export DEREKALGOS_TIMEOUT="-k 1s 1m"',
  ].join("\n");

  const scopedResult = extractManagedExportValue(scopedText, "DEREKALGOS_TIMEOUT");
  assert.strictEqual(scopedResult.present, true);
  assert.strictEqual(scopedResult.value, "-k 30s 5m");

  const missing = extractManagedExportValue("export OTHER=1", "DEREKALGOS_TIMEOUT");
  assert.strictEqual(missing.present, false);
  assert.strictEqual(missing.value, "");
}

/**
 * Verifies route-map parsing handles normalized language/value tokens.
 *
 * @returns {void}
 */
function testParseRouteMap() {
  const routeMap = parseRouteMap("Python=docker1 javascript=ssh2 broken");

  assert.strictEqual(routeMap.get("python"), "docker1");
  assert.strictEqual(routeMap.get("javascript"), "ssh2");
  assert.strictEqual(routeMap.size, 2);
}

/**
 * Verifies init defaults parsing and merged profile override behavior.
 *
 * @returns {void}
 */
function testParseAndMergeDefaults() {
  const initText = [
    'copyIconsTo="~/.icons/"',
    'useTimeout="-k 5s 1m"',
    'useEiffel="eiffelstudio"',
    'useGcc13="/usr/local/bin/"',
    'useGcc13Name="gcc-14"',
    'useGxx13Name="g++-14"',
    'useRunOnDocker="python=host1"',
    'useRunOnSsh="javascript=host2"',
    "supportedLanguageKeys=go python javascript",
  ].join("\n");
  const defaults = parseInitDefaults(initText, null);

  assert.strictEqual(defaults.copyIconsTo, "~/.icons/");
  assert.strictEqual(defaults.timeout, "-k 5s 1m");
  assert.deepStrictEqual(defaults.supportedLanguageKeys, ["go", "javascript", "python"]);

  const merged = buildMergedEnvironmentConfig(
    initText,
    [
      PROFILE_BLOCK_START,
      'export DEREKALGOS_TIMEOUT="-k 30s 5m"',
      'export DEREKALGOS_RUNONDOCKER="go=dockerhost"',
      PROFILE_BLOCK_END,
    ].join("\n"),
    null
  );

  assert.strictEqual(merged.values.timeout, "-k 30s 5m");
  assert.strictEqual(merged.routeMaps.docker.get("go"), "dockerhost");
}

/**
 * Runs shellProfileParseCore tests.
 *
 * @returns {void}
 */
function runTests() {
  testExtractShellAssignment();
  testExtractManagedExportValue();
  testParseRouteMap();
  testParseAndMergeDefaults();
}

module.exports = {
  runTests,
};
