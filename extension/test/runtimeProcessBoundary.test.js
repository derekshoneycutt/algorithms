const assert = require("assert");
const fs = require("fs");
const path = require("path");

/**
 * Recursively lists JavaScript files under one directory path.
 *
 * @param {string} directoryPath Root directory path.
 * @returns {string[]} JavaScript file paths.
 */
function listJavaScriptFilesRecursively(directoryPath) {
  const filePaths = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...listJavaScriptFilesRecursively(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

/**
 * Returns true when the file path is inside the commandline core directory.
 *
 * @param {string} filePath Candidate file path.
 * @returns {boolean} True when path is in runtime/commandline/core.
 */
function isCommandlineCoreFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return normalizedPath.includes("/src/runtime/commandline/core/");
}

/**
 * Verifies runtime files outside commandline core do not import child_process.
 *
 * @returns {void}
 */
function testRuntimeProcessBoundary() {
  const runtimeRootPath = path.resolve(__dirname, "../src/runtime");
  const runtimeFilePaths = listJavaScriptFilesRecursively(runtimeRootPath);
  const violations = [];

  for (const filePath of runtimeFilePaths) {
    if (isCommandlineCoreFile(filePath)) {
      continue;
    }

    const sourceText = fs.readFileSync(filePath, "utf8");
    const importsChildProcess =
      /require\(["']child_process["']\)/.test(sourceText)
      || /require\(["']node:child_process["']\)/.test(sourceText);

    if (importsChildProcess) {
      violations.push(path.relative(path.resolve(__dirname, ".."), filePath));
    }
  }

  assert.deepStrictEqual(
    violations,
    [],
    `Direct child_process imports are only allowed in runtime/commandline/core. Violations: ${violations.join(", ")}`
  );
}

/**
 * Runs runtime process-boundary tests.
 *
 * @returns {void}
 */
function runTests() {
  testRuntimeProcessBoundary();
}

module.exports = {
  runTests,
};
