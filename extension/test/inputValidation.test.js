const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  getSupportedLanguageKeys,
  normalizeExtensionToLanguageKey,
  normalizeLanguageId,
  validateCheckOnlyRoute,
  validateSupportedLanguage,
} = require("../src/validation/inputValidation");

/**
 * Creates a temporary repository root with a minimal run-language catalog.
 *
 * @returns {string} Temporary repository root path.
 */
function createTemporaryResolvedRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "algos-validation-"));
  const runLanguagesDirectory = path.join(tempRoot, "shlib", "run-languages");

  fs.mkdirSync(runLanguagesDirectory, { recursive: true });
  fs.writeFileSync(path.join(runLanguagesDirectory, "javascript.sh"), "#!/bin/sh\n", "utf8");
  fs.writeFileSync(path.join(runLanguagesDirectory, "python.sh"), "#!/bin/sh\n", "utf8");
  fs.writeFileSync(path.join(runLanguagesDirectory, "objectivec.sh"), "#!/bin/sh\n", "utf8");

  return tempRoot;
}

/**
 * Builds a minimal mock editor object.
 *
 * @param {string} languageId VS Code language id.
 * @param {string} filePath Editor file path.
 * @returns {{document: {languageId: string, uri: {fsPath: string}}}} Mock editor.
 */
function createMockEditor(languageId, filePath) {
  return {
    document: {
      languageId,
      uri: {
        fsPath: filePath,
      },
    },
  };
}

/**
 * Verifies the supported language catalog is loaded from run-language scripts.
 *
 * @returns {void}
 */
function testGetSupportedLanguageKeys() {
  const resolvedRoot = createTemporaryResolvedRoot();
  const languageKeys = getSupportedLanguageKeys(resolvedRoot);

  assert.strictEqual(languageKeys.has("javascript"), true);
  assert.strictEqual(languageKeys.has("python"), true);
  assert.strictEqual(languageKeys.has("objectivec"), true);
}

/**
 * Verifies alias normalization handles language ids and file extensions.
 *
 * @returns {void}
 */
function testNormalizationHelpers() {
  assert.strictEqual(normalizeLanguageId("objective-c"), "objectivec");
  assert.strictEqual(normalizeExtensionToLanguageKey("/tmp/example.js"), "javascript");
}

/**
 * Verifies supported-language validation accepts a mapped language id.
 *
 * @returns {void}
 */
function testValidateSupportedLanguageWithAlias() {
  const resolvedRoot = createTemporaryResolvedRoot();
  const result = validateSupportedLanguage(
    createMockEditor("objective-c", "/tmp/example.m"),
    {
      selected: {
        resolvedRoot,
      },
    }
  );

  assert.strictEqual(result.ok, true);
}

/**
 * Verifies supported-language validation falls back to the file extension.
 *
 * @returns {void}
 */
function testValidateSupportedLanguageWithExtensionFallback() {
  const resolvedRoot = createTemporaryResolvedRoot();
  const result = validateSupportedLanguage(
    createMockEditor("plaintext", "/tmp/example.py"),
    {
      selected: {
        resolvedRoot,
      },
    }
  );

  assert.strictEqual(result.ok, true);
}

/**
 * Verifies unsupported routes are rejected.
 *
 * @returns {void}
 */
function testValidateCheckOnlyRoute() {
  assert.strictEqual(validateCheckOnlyRoute("docker").ok, true);
  assert.strictEqual(validateCheckOnlyRoute("bogus").ok, false);
}

/**
 * Runs all inputValidation tests.
 *
 * @returns {void}
 */
function runTests() {
  testGetSupportedLanguageKeys();
  testNormalizationHelpers();
  testValidateSupportedLanguageWithAlias();
  testValidateSupportedLanguageWithExtensionFallback();
  testValidateCheckOnlyRoute();
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests,
};