import * as fs from "node:fs/promises";
import * as path from "node:path";

import Mocha from "mocha";

/**
 * Recursively collects test files under the provided directory.
 *
 * @param {string} directory Directory to scan.
 * @returns {Promise<string[]>} Matching test file paths.
 */
async function collectTestFiles(directory: string): Promise<string[]> {
  const directoryEntries = await fs.readdir(directory, { withFileTypes: true });
  const discoveredFiles: string[] = [];

  for (const directoryEntry of directoryEntries) {
    const fullPath = path.join(directory, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      const nestedFiles = await collectTestFiles(fullPath);
      discoveredFiles.push(...nestedFiles);
      continue;
    }

    if (directoryEntry.name.endsWith(".test.js")) {
      discoveredFiles.push(fullPath);
    }
  }

  return discoveredFiles;
}

/**
 * Executes the compiled Mocha test suite.
 *
 * @returns {Promise<void>} Resolves when the suite succeeds.
 */
export async function run(): Promise<void> {
  const mocha = new Mocha({
    color: true,
    ui: "bdd",
  });
  const suiteRoot = __dirname;
  const testFiles = await collectTestFiles(suiteRoot);

  for (const testFile of testFiles) {
    mocha.addFile(testFile);
  }

  await new Promise<void>((resolve, reject) => {
    mocha.run((failureCount) => {
      if (failureCount > 0) {
        reject(new Error(`${failureCount} test(s) failed.`));
        return;
      }

      resolve();
    });
  });
}