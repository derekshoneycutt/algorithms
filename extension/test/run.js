const fs = require("fs");
const path = require("path");

/**
 * Recursively collects test file paths below one directory.
 *
 * @param {string} directoryPath Directory to scan.
 * @returns {string[]} Absolute test file paths.
 */
function collectTestFiles(directoryPath) {
  const directoryEntries = fs.readdirSync(directoryPath, {
    withFileTypes: true,
  });
  const collectedFilePaths = [];

  for (const directoryEntry of directoryEntries) {
    const entryPath = path.join(directoryPath, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      collectedFilePaths.push(...collectTestFiles(entryPath));
      continue;
    }

    if (!directoryEntry.isFile()) {
      continue;
    }

    if (!directoryEntry.name.endsWith(".test.js")) {
      continue;
    }

    if (directoryEntry.name === "run.js") {
      continue;
    }

    collectedFilePaths.push(entryPath);
  }

  return collectedFilePaths.sort((leftPath, rightPath) => {
    return leftPath.localeCompare(rightPath);
  });
}

/**
 * Executes one test module by calling its exported runTests function.
 *
 * @param {string} testFilePath Absolute test file path.
 * @returns {Promise<void>}
 */
async function runTestFile(testFilePath) {
  const testModule = require(testFilePath);

  if (typeof testModule?.runTests !== "function") {
    throw new Error(
      `Test module must export runTests(): ${path.relative(__dirname, testFilePath)}`
    );
  }

  await testModule.runTests();
}

/**
 * Runs all extension test modules and exits non-zero on failure.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const testFilePaths = collectTestFiles(__dirname).filter((testFilePath) => {
    return path.basename(testFilePath) !== "runScriptRunner.test.js";
  });

  for (const testFilePath of testFilePaths) {
    await runTestFile(testFilePath);
  }

  console.log("extension tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});