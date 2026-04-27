import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { createFilesystem } from "../../../../src/filesystem";
import type { ILanguages } from "../../../../src/languages";
import {
  createWorkspaceStandardLibraryTreeDataProvider,
  readRestrictedDirectoryChildren,
  resolveAlgorithmsTreeRootPath,
  resolveStandardLibraryTreeRootPath,
} from "../../../../src/views/trees";

/**
 * Creates one minimal language service stub for extension filtering tests.
 *
 * @returns {ILanguages} Language service stub.
 */
function createLanguageStub(): ILanguages {
  const extensionToLanguage = new Map<string, string>([
    [".py", "python"],
    [".go", "go"],
    [".ts", "typescript"],
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

/**
 * Creates one temporary directory and returns its path.
 *
 * @returns {Promise<string>} Temporary directory path.
 */
async function createTempDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "vscext-tree-tests-"));
}

describe("views/trees — restricted tree discovery", () => {
  it("filters hidden, output, and unsupported files while preserving stable order", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();
    const languages = createLanguageStub();

    try {
      await fs.mkdir(path.join(workspaceRootPath, ".hiddenDir"), { recursive: true });
      await fs.mkdir(path.join(workspaceRootPath, "output"), { recursive: true });
      await fs.mkdir(path.join(workspaceRootPath, "zetaDir"), { recursive: true });
      await fs.mkdir(path.join(workspaceRootPath, "alphaDir"), { recursive: true });
      await fs.mkdir(path.join(workspaceRootPath, "emptyDir"), { recursive: true });

      await fs.writeFile(path.join(workspaceRootPath, ".hidden.py"), "x");
      await fs.writeFile(path.join(workspaceRootPath, "output", "blocked.py"), "x");
      await fs.writeFile(path.join(workspaceRootPath, "visible.go"), "x");
      await fs.writeFile(path.join(workspaceRootPath, "ignored.txt"), "x");
      await fs.writeFile(path.join(workspaceRootPath, "alphaDir", "nested.py"), "x");
      await fs.writeFile(path.join(workspaceRootPath, "zetaDir", "nested.ts"), "x");

      const children = await readRestrictedDirectoryChildren(workspaceRootPath, {
        filesystem,
        languages,
      });

      assert.deepStrictEqual(
        children.map((child) => ({ kind: child.kind, label: path.basename(child.filePath) })),
        [
          { kind: "directory", label: "alphaDir" },
          { kind: "directory", label: "zetaDir" },
          { kind: "file", label: "visible.go" },
        ]
      );
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });
});

describe("views/trees — workspace root resolution", () => {
  it("resolves algorithms root to repo src when workspace opens repo root", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      await fs.mkdir(path.join(workspaceRootPath, "src", "numeric"), {
        recursive: true,
      });

      const resolvedPath = await resolveAlgorithmsTreeRootPath({
        filesystem,
        workspaceFolderPaths: [workspaceRootPath],
      });

      assert.strictEqual(resolvedPath, path.join(workspaceRootPath, "src"));
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("resolves algorithms root to the workspace folder when opened inside src", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();
    const workspaceFolderPath = path.join(workspaceRootPath, "src", "numeric");

    try {
      await fs.mkdir(workspaceFolderPath, { recursive: true });

      const resolvedPath = await resolveAlgorithmsTreeRootPath({
        filesystem,
        workspaceFolderPaths: [workspaceFolderPath],
      });

      assert.strictEqual(resolvedPath, workspaceFolderPath);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("resolves standard-library root from src-descendant workspace folders", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();
    const workspaceFolderPath = path.join(workspaceRootPath, "src", "numeric");

    try {
      await fs.mkdir(workspaceFolderPath, { recursive: true });
      await fs.mkdir(path.join(workspaceRootPath, "stdlib", "math"), {
        recursive: true,
      });

      const resolvedPath = await resolveStandardLibraryTreeRootPath({
        filesystem,
        workspaceFolderPaths: [workspaceFolderPath],
      });

      assert.strictEqual(resolvedPath, path.join(workspaceRootPath, "stdlib"));
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });
});

describe("views/trees — standard-library item context values", () => {
  it("sets directory and file context values for menu targeting", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();
    const languages = createLanguageStub();

    try {
      const stdlibRootPath = path.join(workspaceRootPath, "stdlib");
      const folderPath = path.join(stdlibRootPath, "io");
      const filePath = path.join(stdlibRootPath, "hello.py");
      const nestedFilePath = path.join(folderPath, "nested.py");
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(filePath, "print('hello')\n");
      await fs.writeFile(nestedFilePath, "print('nested')\n");

      const provider = createWorkspaceStandardLibraryTreeDataProvider({
        filesystem,
        languages,
        workspaceFolderPaths: [workspaceRootPath],
      });

      const rootChildren = (await provider.getChildren()) ?? [];
      const directoryNode = rootChildren.find((node) => {
        return node.kind === "directory";
      });
      const fileNode = rootChildren.find((node) => {
        return node.kind === "file";
      });

      assert.ok(directoryNode, "expected one directory node");
      assert.ok(fileNode, "expected one file node");

      const directoryTreeItem = await provider.getTreeItem(directoryNode);
      const fileTreeItem = await provider.getTreeItem(fileNode);

      assert.strictEqual(
        directoryTreeItem.contextValue,
        "algos.standardLibraryDirectory"
      );
      assert.strictEqual(fileTreeItem.contextValue, "algos.standardLibraryFile");
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });
});
