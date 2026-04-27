import * as path from "node:path";

import { runTests } from "@vscode/test-electron";

/**
 * Runs the extension host test suite for the bootstrap package.
 *
 * @returns {Promise<void>} Resolves when the suite completes successfully.
 */
async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, "../..");
  const extensionTestsPath = path.resolve(__dirname, "./suite/index.js");

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
  });
}

main().catch((error: unknown) => {
  console.error("Failed to run extension tests.");
  console.error(error);
  process.exitCode = 1;
});