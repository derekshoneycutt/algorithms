"use strict";

const assert = require("assert");
const os = require("os");
const path = require("path");
const {
  expandHomePath,
  getProfilePlaceholderForPlatform,
  getDefaultProfilePathForPlatform,
  extractShellAssignment,
  extractManagedExportValue,
  parseInitDefaults,
  parseRouteMap,
  buildProfileArgs,
  filterCheckEnvOutput,
  runInitScriptCommand,
  buildMergedEnvironmentConfig,
} = require("../src/ui/shellProfileUtils");

/**
 * Runs all shellProfileUtils tests.
 *
 * @returns {void}
 */
function runTests() {
  // expandHomePath
  assert.strictEqual(expandHomePath(""), "", "expandHomePath: empty string");
  assert.strictEqual(expandHomePath(null), "", "expandHomePath: null");
  assert.strictEqual(expandHomePath("~"), os.homedir(), "expandHomePath: bare tilde");
  assert.strictEqual(
    expandHomePath("~/foo/bar"),
    path.join(os.homedir(), "foo/bar"),
    "expandHomePath: tilde prefix"
  );
  assert.strictEqual(expandHomePath("/absolute/path"), "/absolute/path", "expandHomePath: absolute path unchanged");

  // getProfilePlaceholderForPlatform
  assert.strictEqual(getProfilePlaceholderForPlatform("darwin"), "~/.zprofile", "placeholder: darwin");
  assert.strictEqual(getProfilePlaceholderForPlatform("freebsd"), "~/.profile", "placeholder: freebsd");
  assert.strictEqual(getProfilePlaceholderForPlatform("linux"), "~/.bash_profile", "placeholder: linux");
  assert.strictEqual(getProfilePlaceholderForPlatform("win32"), "~/.bash_profile", "placeholder: win32 fallback");

  // getDefaultProfilePathForPlatform
  assert.strictEqual(
    getDefaultProfilePathForPlatform("darwin"),
    path.join(os.homedir(), ".zprofile"),
    "defaultProfile: darwin expanded"
  );
  assert.strictEqual(
    getDefaultProfilePathForPlatform("freebsd"),
    path.join(os.homedir(), ".profile"),
    "defaultProfile: freebsd expanded"
  );

  // extractShellAssignment
  assert.strictEqual(
    extractShellAssignment('useTimeout="-k 10s 2m"\nother=x', "useTimeout"),
    "-k 10s 2m",
    "extractShellAssignment: quoted value stripped"
  );
  assert.strictEqual(
    extractShellAssignment("useTimeout=plain\n", "useTimeout"),
    "plain",
    "extractShellAssignment: unquoted value"
  );
  assert.strictEqual(
    extractShellAssignment("other=x\n", "useTimeout"),
    null,
    "extractShellAssignment: missing key returns null"
  );
  assert.strictEqual(
    extractShellAssignment("", "useTimeout"),
    null,
    "extractShellAssignment: empty text returns null"
  );

  // extractManagedExportValue — key not present
  const noExport = extractManagedExportValue("no exports here", "DEREKALGOS_TIMEOUT");
  assert.strictEqual(noExport.present, false, "extractManagedExport: not present");
  assert.strictEqual(noExport.value, "", "extractManagedExport: value empty when not present");

  // extractManagedExportValue — key present outside block
  const bareExport = extractManagedExportValue(
    'export DEREKALGOS_TIMEOUT="-k 5s 1m"',
    "DEREKALGOS_TIMEOUT"
  );
  assert.strictEqual(bareExport.present, true, "extractManagedExport bare: present");
  assert.strictEqual(bareExport.value, "-k 5s 1m", "extractManagedExport bare: value stripped");

  // extractManagedExportValue — key inside managed block
  const blockText = [
    "# >>> DEREKALGOS INIT >>>",
    'export DEREKALGOS_TIMEOUT="-k 15s 3m"',
    "# <<< DEREKALGOS INIT <<<",
  ].join("\n");
  const blockExport = extractManagedExportValue(blockText, "DEREKALGOS_TIMEOUT");
  assert.strictEqual(blockExport.present, true, "extractManagedExport block: present");
  assert.strictEqual(blockExport.value, "-k 15s 3m", "extractManagedExport block: value");

  // extractManagedExportValue — escape sequences
  const escapeText = 'export DEREKALGOS_EIFFEL="path\\"with\\"quotes"';
  const escapeExport = extractManagedExportValue(escapeText, "DEREKALGOS_EIFFEL");
  assert.ok(escapeExport.present, "extractManagedExport escape: present");
  assert.ok(escapeExport.value.includes('"'), "extractManagedExport escape: \\\" unescaped");

  // parseRouteMap
  const emptyMap = parseRouteMap("");
  assert.strictEqual(emptyMap.size, 0, "parseRouteMap: empty string gives empty map");

  const routeMap = parseRouteMap("python=docker1 javascript=ssh2");
  assert.strictEqual(routeMap.size, 2, "parseRouteMap: two entries");
  assert.strictEqual(routeMap.get("python"), "docker1", "parseRouteMap: python key");
  assert.strictEqual(routeMap.get("javascript"), "ssh2", "parseRouteMap: javascript key");

  const singleRoute = parseRouteMap("go=myhost");
  assert.strictEqual(singleRoute.get("go"), "myhost", "parseRouteMap: single entry");

  // parseRouteMap — skips tokens without separator
  const brokenMap = parseRouteMap("good=val missingval");
  assert.strictEqual(brokenMap.size, 1, "parseRouteMap: skips token without =");

  // buildProfileArgs
  assert.deepStrictEqual(buildProfileArgs(""), [], "buildProfileArgs: empty path gives []");
  assert.deepStrictEqual(buildProfileArgs(null), [], "buildProfileArgs: null gives []");
  assert.deepStrictEqual(
    buildProfileArgs("/home/user/.bash_profile"),
    ["--update-profile=/home/user/.bash_profile"],
    "buildProfileArgs: non-empty gives flag"
  );

  // filterCheckEnvOutput — error lines returned
  const withErrors = ["line one", "ERROR: something failed", "line three"].join("\n");
  const errorResult = filterCheckEnvOutput(withErrors);
  assert.ok(errorResult.includes("failed"), "filterCheckEnvOutput: returns error lines");
  assert.ok(!errorResult.includes("line one"), "filterCheckEnvOutput: filters non-error lines");

  // filterCheckEnvOutput — no errors returns trailing lines
  const noErrors = Array.from({ length: 50 }, (_, i) => `line${i}`).join("\n");
  const tailResult = filterCheckEnvOutput(noErrors);
  const tailLines = tailResult.split("\n");
  assert.ok(tailLines.length <= 40, "filterCheckEnvOutput: no errors gives at most 40 lines");
  assert.ok(tailResult.includes("line49"), "filterCheckEnvOutput: includes last line");

  // filterCheckEnvOutput — blank input
  assert.strictEqual(filterCheckEnvOutput(""), "", "filterCheckEnvOutput: empty input gives empty");

  // parseInitDefaults — uses explicit literal key list
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
  const initDefaults = parseInitDefaults(initText, null);
  assert.strictEqual(initDefaults.copyIconsTo, "~/.icons/", "parseInitDefaults: copyIconsTo");
  assert.strictEqual(initDefaults.timeout, "-k 5s 1m", "parseInitDefaults: timeout");
  assert.strictEqual(initDefaults.gcc13Name, "gcc-14", "parseInitDefaults: gcc13Name");
  assert.deepStrictEqual(
    initDefaults.supportedLanguageKeys,
    ["go", "javascript", "python"],
    "parseInitDefaults: literal language keys sorted"
  );

  // parseInitDefaults — skips expression-like supportedLanguageKeys
  const exprText = 'supportedLanguageKeys=$(cat somefile)';
  const exprDefaults = parseInitDefaults(exprText, null);
  assert.deepStrictEqual(
    exprDefaults.supportedLanguageKeys,
    [],
    "parseInitDefaults: expression-like keys skipped, fallback to []"
  );

  // parseInitDefaults — falls back to defaults when keys missing
  const emptyScript = "";
  const emptyDefaults = parseInitDefaults(emptyScript, null);
  assert.strictEqual(emptyDefaults.timeout, "-k 10s 2m", "parseInitDefaults: timeout default");
  assert.strictEqual(emptyDefaults.eiffel, "eiffelstudio", "parseInitDefaults: eiffel default");
  assert.strictEqual(emptyDefaults.gcc13Directory, "/usr/bin/", "parseInitDefaults: gcc13 dir default");

  // runInitScriptCommand — spawnFn injection
  const fakeSpawnResult = runInitScriptCommand(
    "/fake/root",
    "/fake/root/init.sh",
    ["--check-env"],
    (cmd, args, opts) => {
      const { EventEmitter } = require("events");
      const stdoutEmitter = Object.assign(new EventEmitter(), { setEncoding() {} });
      const stderrEmitter = Object.assign(new EventEmitter(), { setEncoding() {} });
      const proc = new EventEmitter();
      proc.stdout = stdoutEmitter;
      proc.stderr = stderrEmitter;
      process.nextTick(() => {
        stdoutEmitter.emit("data", "hello stdout");
        stderrEmitter.emit("data", "hello stderr");
        proc.emit("close", 0);
      });
      return proc;
    }
  );
  return fakeSpawnResult.then((result) => {
    assert.strictEqual(result.exitCode, 0, "runInitScriptCommand: exit code 0");
    assert.strictEqual(result.stdout, "hello stdout", "runInitScriptCommand: stdout captured");
    assert.strictEqual(result.stderr, "hello stderr", "runInitScriptCommand: stderr captured");
    assert.ok(result.combinedOutput.includes("hello"), "runInitScriptCommand: combined includes output");

    // buildMergedEnvironmentConfig — profile exports override init defaults
    const mergeInitText = [
      'useTimeout="-k 10s 2m"',
      'useEiffel="eiffelstudio"',
      'useGcc13="/usr/bin/"',
      'useGcc13Name="gcc-13"',
      'useGxx13Name="g++-13"',
      'useRunOnDocker=""',
      'useRunOnSsh=""',
    ].join("\n");
    const mergeProfileText = [
      "# >>> DEREKALGOS INIT >>>",
      'export DEREKALGOS_TIMEOUT="-k 30s 5m"',
      'export DEREKALGOS_RUNONDOCKER="go=dockerhost"',
      "# <<< DEREKALGOS INIT <<<",
    ].join("\n");
    const merged = buildMergedEnvironmentConfig(mergeInitText, mergeProfileText, null);
    assert.strictEqual(merged.values.timeout, "-k 30s 5m", "buildMergedEnvironmentConfig: profile timeout overrides");
    assert.strictEqual(merged.values.eiffel, "eiffelstudio", "buildMergedEnvironmentConfig: eiffel from default");
    assert.strictEqual(merged.routeMaps.docker.get("go"), "dockerhost", "buildMergedEnvironmentConfig: docker route map parsed");
    assert.strictEqual(merged.routeMaps.ssh.size, 0, "buildMergedEnvironmentConfig: empty ssh route map");
  });
}

module.exports = { runTests };
