const assert = require("assert");
const {
  getEffectiveSidebarCleanDefaults,
  getEffectiveSidebarRunArgs,
  getEffectiveSidebarRunChecks,
  getEffectiveSidebarSmokeArgs,
  getEffectiveSidebarSourceProfile,
  parseSidebarRunArgsText,
  setSidebarCleanArchivesEnabled,
  setSidebarCleanStdlibEnabled,
  setSidebarRunArgsEnabled,
  setSidebarRunArgsText,
  setSidebarRunChecksMode,
  setSidebarRunChecksRoute,
  setSidebarSmokeAllLanguagesEnabled,
  setSidebarSmokeLanguageEnabled,
  setSidebarSmokeMarkdownEnabled,
  setSidebarSmokeMarkdownPath,
  setSidebarSmokeSlowTimeout,
  setSidebarSmokeTimeout,
  setSidebarSourceProfileEnabled,
  setSidebarSourceProfileText,
} = require("../src/runtime/sidebarRunArgsState");

/**
 * Restores sidebar state to the module defaults.
 *
 * @returns {void}
 */
function resetSidebarState() {
  setSidebarRunArgsEnabled(false);
  setSidebarRunArgsText("");
  setSidebarSourceProfileEnabled(false);
  setSidebarSourceProfileText("");
  setSidebarRunChecksMode("none");
  setSidebarRunChecksRoute("native");
  setSidebarCleanStdlibEnabled(true);
  setSidebarCleanArchivesEnabled(true);
  setSidebarSmokeMarkdownEnabled(false);
  setSidebarSmokeMarkdownPath("");
  setSidebarSmokeTimeout("8m");
  setSidebarSmokeSlowTimeout("20m");
  setSidebarSmokeAllLanguagesEnabled(true);
}

/**
 * Verifies the run-args parser handles quotes and escaped spaces.
 *
 * @returns {void}
 */
function testParseSidebarRunArgsText() {
  const parsed = parseSidebarRunArgsText(
    "alpha \"beta gamma\" delta\\ epsilon 'zeta eta'"
  );

  assert.deepStrictEqual(parsed, {
    ok: true,
    tokens: ["alpha", "beta gamma", "delta epsilon", "zeta eta"],
    reason: null,
  });
}

/**
 * Verifies parser errors are reported for unclosed quotes.
 *
 * @returns {void}
 */
function testParseSidebarRunArgsTextRejectsUnclosedQuotes() {
  const parsed = parseSidebarRunArgsText("alpha \"beta");

  assert.strictEqual(parsed.ok, false);
  assert.strictEqual(parsed.reason, "Run args contain an unclosed quote.");
}

/**
 * Verifies an enabled empty source-profile emits the explicit empty token.
 *
 * @returns {void}
 */
function testGetEffectiveSidebarSourceProfile() {
  resetSidebarState();
  setSidebarSourceProfileEnabled(true);
  setSidebarSourceProfileText("   ");

  assert.deepStrictEqual(getEffectiveSidebarSourceProfile(), {
    ok: true,
    enabled: true,
    tokens: ["--source-profile="],
    reason: null,
  });
}

/**
 * Verifies effective run args respect the enabled toggle.
 *
 * @returns {void}
 */
function testGetEffectiveSidebarRunArgs() {
  resetSidebarState();
  setSidebarRunArgsEnabled(true);
  setSidebarRunArgsText("--flag value");

  assert.deepStrictEqual(getEffectiveSidebarRunArgs(), {
    ok: true,
    enabled: true,
    tokens: ["--flag", "value"],
    reason: null,
  });
}

/**
 * Verifies invalid run-check values fall back to the supported defaults.
 *
 * @returns {void}
 */
function testGetEffectiveSidebarRunChecks() {
  resetSidebarState();
  setSidebarRunChecksMode("compile-only");
  setSidebarRunChecksRoute("bogus");

  assert.deepStrictEqual(getEffectiveSidebarRunChecks(), {
    ok: true,
    mode: "compile-only",
    route: "native",
    tokens: ["--compile-only"],
    reason: null,
  });
}

/**
 * Verifies clean defaults preserve strict stdlib|archive ordering.
 *
 * @returns {void}
 */
function testGetEffectiveSidebarCleanDefaults() {
  resetSidebarState();
  setSidebarCleanStdlibEnabled(false);
  setSidebarCleanArchivesEnabled(true);

  assert.deepStrictEqual(getEffectiveSidebarCleanDefaults(), {
    ok: true,
    cleanStdlib: false,
    cleanArchives: true,
    defaultsPair: "n|y",
    token: "--defaults=n|y",
    reason: null,
  });
}

/**
 * Verifies smoke args reject the empty-language case.
 *
 * @returns {void}
 */
function testGetEffectiveSidebarSmokeArgsRejectsNoLanguages() {
  resetSidebarState();
  setSidebarSmokeAllLanguagesEnabled(false);

  const result = getEffectiveSidebarSmokeArgs();

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "Select at least one smoke-test language.");
}

/**
 * Verifies smoke args include markdown, timeouts, and selected languages in order.
 *
 * @returns {void}
 */
function testGetEffectiveSidebarSmokeArgs() {
  resetSidebarState();
  setSidebarSmokeAllLanguagesEnabled(false);
  setSidebarSmokeLanguageEnabled("python", true);
  setSidebarSmokeLanguageEnabled("ruby", true);
  setSidebarSmokeMarkdownEnabled(true);
  setSidebarSmokeMarkdownPath("");

  assert.deepStrictEqual(getEffectiveSidebarSmokeArgs(), {
    ok: true,
    args: ["--markdown", "--timeout=8m", "--slow-timeout=20m", "--langs=python ruby"],
    selectedLanguages: ["python", "ruby"],
    allLanguagesSelected: false,
    reason: null,
  });
}

/**
 * Runs all sidebarRunArgsState tests.
 *
 * @returns {void}
 */
function runTests() {
  resetSidebarState();
  testParseSidebarRunArgsText();
  testParseSidebarRunArgsTextRejectsUnclosedQuotes();
  testGetEffectiveSidebarSourceProfile();
  testGetEffectiveSidebarRunArgs();
  testGetEffectiveSidebarRunChecks();
  testGetEffectiveSidebarCleanDefaults();
  testGetEffectiveSidebarSmokeArgsRejectsNoLanguages();
  testGetEffectiveSidebarSmokeArgs();
  resetSidebarState();
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests,
};