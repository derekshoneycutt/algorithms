import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import "mocha";
import { createFilesystem } from "../../../src/filesystem";
import {
  FLAGGED_LANGUAGES_FILE_NAME,
  readFlaggedLanguageKeys,
  resolveFlaggedLanguagesFilePath,
  writeFlaggedLanguageKeys,
} from "../../../src/algorithms";

/**
 * Creates one temporary directory for testing.
 *
 * @returns {Promise<string>} Temporary directory path.
 */
async function createTempDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "vscext-flag-tests-"));
}

describe("algorithms — flagged language persistence", () => {
  it("readFlaggedLanguageKeys returns an empty set when file is missing", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const algorithmPath = path.join(workspaceRootPath, "src", "numeric", "euclidgcd");
      await fs.mkdir(algorithmPath, { recursive: true });

      const keys = await readFlaggedLanguageKeys(filesystem, algorithmPath);
      assert.deepStrictEqual([...keys], []);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("writeFlaggedLanguageKeys persists sorted values and deletes the file when empty", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const algorithmPath = path.join(workspaceRootPath, "src", "numeric", "euclidgcd");
      await fs.mkdir(algorithmPath, { recursive: true });

      await writeFlaggedLanguageKeys(
        filesystem,
        algorithmPath,
        new Set(["python", "go"])
      );

      const flagFilePath = resolveFlaggedLanguagesFilePath(algorithmPath);
      assert.strictEqual(path.basename(flagFilePath), FLAGGED_LANGUAGES_FILE_NAME);

      const fileContent = await fs.readFile(flagFilePath, "utf8");
      assert.strictEqual(fileContent, "go\npython\n");

      const keysAfterWrite = await readFlaggedLanguageKeys(filesystem, algorithmPath);
      assert.deepStrictEqual([...keysAfterWrite].sort(), ["go", "python"]);

      await writeFlaggedLanguageKeys(filesystem, algorithmPath, new Set());

      const existsAfterDelete = await filesystem.isFile(flagFilePath);
      assert.strictEqual(existsAfterDelete, false);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });
});
