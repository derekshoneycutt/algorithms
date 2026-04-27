import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import "mocha";
import { createFilesystem } from "../../../src/filesystem";
import { createAlgorithmsIndex } from "../../../src/algorithms";
import type { ILanguages } from "../../../src/languages";

/**
 * Creates one temporary directory for testing.
 *
 * @returns {Promise<string>} Temporary directory path.
 */
async function createTempDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "vscext-algo-tests-"));
}

/**
 * Creates one language service stub for extension-based normalization.
 *
 * @returns {ILanguages} Language service stub.
 */
function createLanguageStub(): ILanguages {
  const extensionToLanguage = new Map<string, string>([
    [".py", "python"],
    [".go", "go"],
    [".ts", "typescript"],
    [".sh", "shell"],
  ]);

  return {
    getAll() {
      return [];
    },
    getByKey() {
      return undefined;
    },
    normalizeLanguageId(languageId: string) {
      return languageId.trim().toLowerCase();
    },
    normalizeFileExtension(filePath: string) {
      return extensionToLanguage.get(path.extname(filePath).toLowerCase());
    },
    getDisplayLabel() {
      return undefined;
    },
    getDefaultSmokeKeys() {
      return [];
    },
  };
}

describe("algorithms — domain index discovery", () => {
  it("getCategories returns immediate src subdirectories except output/hidden", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const srcPath = path.join(workspaceRootPath, "src");
      await fs.mkdir(path.join(srcPath, "numeric"), { recursive: true });
      await fs.mkdir(path.join(srcPath, "string"), { recursive: true });
      await fs.mkdir(path.join(srcPath, "empty"), { recursive: true });
      await fs.mkdir(path.join(srcPath, ".hidden"), { recursive: true });
      await fs.mkdir(path.join(srcPath, "output"), { recursive: true });

      const algorithmsIndex = createAlgorithmsIndex({
        filesystem,
        languages: createLanguageStub(),
        workspaceFolderPaths: [workspaceRootPath],
      });

      const categories = await algorithmsIndex.getCategories();
      assert.deepStrictEqual(
        categories.map((category) => category.name).sort(),
        ["empty", "numeric", "string"]
      );
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("getAlgorithms returns immediate category subdirectories without basename gating", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const categoryPath = path.join(workspaceRootPath, "src", "numeric");
      await fs.mkdir(path.join(categoryPath, "euclidgcd"), { recursive: true });
      await fs.mkdir(path.join(categoryPath, "max"), { recursive: true });
      await fs.mkdir(path.join(categoryPath, "output"), { recursive: true });
      await fs.mkdir(path.join(categoryPath, ".hidden"), { recursive: true });
      await fs.writeFile(path.join(categoryPath, "README.md"), "ignored");

      // Non-matching filename should not hide the algorithm directory.
      await fs.writeFile(path.join(categoryPath, "max", "different_name.py"), "");

      const algorithmsIndex = createAlgorithmsIndex({
        filesystem,
        languages: createLanguageStub(),
        workspaceFolderPaths: [workspaceRootPath],
      });

      const algorithms = await algorithmsIndex.getAlgorithms(categoryPath);
      assert.deepStrictEqual(
        algorithms.map((algorithm) => algorithm.name).sort(),
        ["euclidgcd", "max"]
      );
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("getImplementations keeps all language files and picks fuzzy representative", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const algorithmPath = path.join(workspaceRootPath, "src", "numeric", "euclidgcd");
      await fs.mkdir(algorithmPath, { recursive: true });
      await fs.mkdir(path.join(algorithmPath, "python_include"), { recursive: true });

      await fs.writeFile(path.join(algorithmPath, "euclid.py"), "");
      await fs.writeFile(path.join(algorithmPath, "euclidgcd.py"), "");
      await fs.writeFile(path.join(algorithmPath, "euclidgcd.go"), "");
      await fs.writeFile(path.join(algorithmPath, "README.md"), "ignored");
      await fs.writeFile(path.join(algorithmPath, "python_include", "helper.py"), "");
      await fs.writeFile(path.join(algorithmPath, ".flag-lang"), "python\n");

      const algorithmsIndex = createAlgorithmsIndex({
        filesystem,
        languages: createLanguageStub(),
        workspaceFolderPaths: [workspaceRootPath],
      });

      const implementations = await algorithmsIndex.getImplementations(algorithmPath);

      assert.deepStrictEqual(
        implementations.map((implementation) => implementation.languageKey),
        ["go", "python"]
      );

      const python = implementations.find((implementation) => implementation.languageKey === "python");
      assert.ok(python, "expected python implementation");
      assert.strictEqual(python.isFlagged, true);
      assert.strictEqual(python.filePath, path.join(algorithmPath, "euclidgcd.py"));
      assert.deepStrictEqual(python.filePaths, [
        path.join(algorithmPath, "euclid.py"),
        path.join(algorithmPath, "euclidgcd.py"),
      ]);
      assert.deepStrictEqual(python.includeFilePaths, [
        path.join(algorithmPath, "python_include", "helper.py"),
      ]);
      assert.strictEqual(python.hasIncludes, true);

      const go = implementations.find((implementation) => implementation.languageKey === "go");
      assert.ok(go, "expected go implementation");
      assert.strictEqual(go.isFlagged, false);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("getStandardLibraryEntries excludes output/, markdown, and shell scripts", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const stdlibPath = path.join(workspaceRootPath, "stdlib");
      await fs.mkdir(path.join(stdlibPath, "math"), { recursive: true });
      await fs.mkdir(path.join(stdlibPath, "output"), { recursive: true });
      await fs.writeFile(path.join(stdlibPath, "sum.py"), "");
      await fs.writeFile(path.join(stdlibPath, "README.md"), "");
      await fs.writeFile(path.join(stdlibPath, "build.sh"), "");
      await fs.writeFile(path.join(stdlibPath, ".hidden.py"), "");

      const algorithmsIndex = createAlgorithmsIndex({
        filesystem,
        languages: createLanguageStub(),
        workspaceFolderPaths: [workspaceRootPath],
      });

      const entries = await algorithmsIndex.getStandardLibraryEntries();
      assert.deepStrictEqual(
        entries.map((entry) => ({ kind: entry.kind, name: entry.name })),
        [
          { kind: "directory", name: "math" },
          { kind: "file", name: "sum.py" },
        ]
      );
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });
});
