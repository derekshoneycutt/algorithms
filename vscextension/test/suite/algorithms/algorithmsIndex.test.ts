import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { createFilesystem } from "../../../src/filesystem";
import { createAlgorithmsIndex } from "../../../src/algorithms";

/**
 * Creates a temporary directory for testing.
 */
async function createTempDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "vscext-algo-tests-"));
}

describe("algorithms — domain index discovery", () => {
  it("getCategories distinguishes first-level algorithm categories", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const srcPath = path.join(workspaceRootPath, "src");
      await fs.mkdir(path.join(srcPath, "numeric", "euclidgcd"), {
        recursive: true,
      });
      await fs.mkdir(path.join(srcPath, "string"), { recursive: true });
      await fs.mkdir(path.join(srcPath, ".hidden"), { recursive: true });
      await fs.mkdir(path.join(srcPath, "output"), { recursive: true });
      // Empty dir should be excluded
      await fs.mkdir(path.join(srcPath, "empty"), { recursive: true });

      await fs.writeFile(path.join(srcPath, "numeric", "euclidgcd", "euclidgcd.py"), "");

      const algorithmsIndex = createAlgorithmsIndex({
        filesystem,
        languages: { normalizeFileExtension: () => undefined } as any,
        workspaceFolderPaths: [workspaceRootPath],
      });

      const categories = await algorithmsIndex.getCategories();

      const categoryNames = categories.map((c: any) => c.name).sort();
      assert.deepStrictEqual(categoryNames, ["numeric", "string"]);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });
});
