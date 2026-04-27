import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import "mocha";
import * as vscode from "vscode";

import { createFilesystem } from "../../../../src/filesystem";
import type { IAlgorithmsIndex } from "../../../../src/algorithms";
import type { AlgorithmCategory, AlgorithmEntry, AlgorithmImplementation, StandardLibEntry } from "../../../../src/algorithms";
import type { ILanguages } from "../../../../src/languages";
import type { SidebarViewMode, IViewModeService } from "../../../../src/state/viewMode";
import {
  createWorkspaceStandardLibraryTreeDataProvider,
  createWorkspaceAlgorithmsTreeDataProvider,
  readRestrictedDirectoryChildren,
  type WorkspaceTreeNode,
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

  const labelsByKey = new Map<string, string>([
    ["python", "Python"],
    ["go", "Go"],
    ["typescript", "TypeScript"],
  ]);

  const allLanguages = [
    { key: "python", displayLabel: "Python" },
    { key: "go", displayLabel: "Go" },
    { key: "typescript", displayLabel: "TypeScript" },
  ] as any[];

  return {
    getAll() {
      return allLanguages;
    },
    getByKey(key: string) {
      return allLanguages.find((language) => language.key === key);
    },
    normalizeLanguageId(languageId: string) {
      return languageId.trim().toLowerCase();
    },
    normalizeFileExtension(filePath: string) {
      return extensionToLanguage.get(path.extname(filePath).toLowerCase());
    },
    getDisplayLabel(key: string) {
      return labelsByKey.get(key);
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

/**
 * Creates a minimal view mode service stub.
 *
 * @param {SidebarViewMode} initialMode Initial mode.
 * @returns {IViewModeService} View mode stub.
 */
function createViewModeServiceStub(initialMode: SidebarViewMode): IViewModeService {
  let currentMode = initialMode;
  const emitter = new vscode.EventEmitter<SidebarViewMode>();

  return {
    getViewMode() {
      return currentMode;
    },
    async setViewMode(mode: SidebarViewMode) {
      currentMode = mode;
      emitter.fire(mode);
    },
    onDidChangeViewMode: emitter.event,
  };
}

/**
 * Creates a minimal algorithms index stub.
 *
 * @param {AlgorithmCategory[]} categories Categories.
 * @param {AlgorithmEntry[]} algorithms Algorithms.
 * @param {AlgorithmImplementation[]} implementations Implementations.
 * @param {StandardLibEntry[]} standardLibraryEntries Standard library entries.
 * @returns {IAlgorithmsIndex} Index stub.
 */
function createAlgorithmsIndexStub(
  categories: AlgorithmCategory[],
  algorithms: AlgorithmEntry[],
  implementations: AlgorithmImplementation[],
  standardLibraryEntries: StandardLibEntry[] = []
): IAlgorithmsIndex {
  return {
    async getCategories() {
      return categories;
    },
    async getAlgorithms() {
      return algorithms;
    },
    async getImplementations() {
      return implementations;
    },
    async getStandardLibraryEntries() {
      return standardLibraryEntries;
    },
  };
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

describe("views/trees — algorithms FILE view", () => {
  it("shows representative main files plus non-representative files", async () => {
    const algorithmPath = "/repo/src/numeric/euclidgcd";
    const categories: AlgorithmCategory[] = [
      { name: "numeric", path: "/repo/src/numeric" },
    ];
    const algorithms: AlgorithmEntry[] = [
      { name: "euclidgcd", path: algorithmPath, categoryPath: "/repo/src/numeric" },
    ];
    const implementations: AlgorithmImplementation[] = [
      {
        languageKey: "python",
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.py",
        filePaths: [
          "/repo/src/numeric/euclidgcd/euclidgcd.py",
          "/repo/src/numeric/euclidgcd/euclid.py",
        ],
        hasIncludes: true,
        includeFilePaths: [
          "/repo/src/numeric/euclidgcd/python_include/helper.py",
        ],
      },
      {
        languageKey: "go",
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.go",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.go"],
        hasIncludes: false,
        includeFilePaths: [],
      },
    ];

    const provider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      viewModeService: createViewModeServiceStub("files"),
      languages: createLanguageStub(),
    });

    const rootChildren = (await provider.getChildren()) ?? [];
    const categoryNode = rootChildren[0];
    const algorithmNodes = (await provider.getChildren(categoryNode)) ?? [];
    const algorithmNode = algorithmNodes[0];
    const fileRows = (await provider.getChildren(algorithmNode)) ?? [];

    assert.strictEqual(fileRows.length, 3);
    assert.deepStrictEqual(
      fileRows.map((row) => ({ kind: row.kind, path: row.filePath })),
      [
        { kind: "mainFile", path: "/repo/src/numeric/euclidgcd/euclidgcd.py" },
        { kind: "mainFile", path: "/repo/src/numeric/euclidgcd/euclidgcd.go" },
        { kind: "file", path: "/repo/src/numeric/euclidgcd/euclid.py" },
      ]
    );

    const pythonMain = fileRows.find((row) => row.languageKey === "python") as WorkspaceTreeNode;
    const includeRows = (await provider.getChildren(pythonMain)) ?? [];
    assert.deepStrictEqual(includeRows.map((row) => row.filePath), [
      "/repo/src/numeric/euclidgcd/python_include/helper.py",
    ]);
  });
});

describe("views/trees — algorithms LANGUAGE view", () => {
  it("always shows full language catalog with display labels and total counts", async () => {
    const algorithmPath = "/repo/src/numeric/euclidgcd";
    const categories: AlgorithmCategory[] = [
      { name: "numeric", path: "/repo/src/numeric" },
    ];
    const algorithms: AlgorithmEntry[] = [
      { name: "euclidgcd", path: algorithmPath, categoryPath: "/repo/src/numeric" },
    ];
    const implementations: AlgorithmImplementation[] = [
      {
        languageKey: "python",
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.py",
        filePaths: [
          "/repo/src/numeric/euclidgcd/euclidgcd.py",
          "/repo/src/numeric/euclidgcd/euclid.py",
        ],
        hasIncludes: true,
        includeFilePaths: [
          "/repo/src/numeric/euclidgcd/python_include/helper.py",
        ],
      },
    ];

    const provider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      viewModeService: createViewModeServiceStub("language"),
      languages: createLanguageStub(),
    });

    const rootChildren = (await provider.getChildren()) ?? [];
    const categoryNode = rootChildren[0];
    const algorithmNodes = (await provider.getChildren(categoryNode)) ?? [];
    const algorithmNode = algorithmNodes[0];
    const languageRows = (await provider.getChildren(algorithmNode)) ?? [];

    assert.deepStrictEqual(languageRows.map((row) => row.languageKey), [
      "python",
      "go",
      "typescript",
    ]);

    const pythonRow = languageRows.find((row) => row.languageKey === "python") as WorkspaceTreeNode;
    const pythonTreeItem = await provider.getTreeItem(pythonRow);
    assert.strictEqual(pythonTreeItem.label as string, "Python");
    assert.strictEqual(pythonTreeItem.description, "3");

    const goRow = languageRows.find((row) => row.languageKey === "go") as WorkspaceTreeNode;
    const goTreeItem = await provider.getTreeItem(goRow);
    assert.strictEqual(goTreeItem.label as string, "Go");
    assert.strictEqual(goTreeItem.description, "0");
    assert.strictEqual(goTreeItem.command, undefined);
  });
});

describe("views/trees — standard-library item context values", () => {
  it("sets directory and file context values for menu targeting", async () => {
    const provider = createWorkspaceStandardLibraryTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub([], [], [], [
        { kind: "directory", name: "io", path: "/repo/stdlib/io" },
        { kind: "file", name: "hello.py", path: "/repo/stdlib/hello.py" },
      ]),
    });

    const directoryTreeItem = await provider.getTreeItem({
      kind: "directory",
      filePath: "/repo/stdlib/io",
    });
    const fileTreeItem = await provider.getTreeItem({
      kind: "file",
      filePath: "/repo/stdlib/hello.py",
    });

    assert.strictEqual(directoryTreeItem.contextValue, "algos.standardLibraryDirectory");
    assert.strictEqual(fileTreeItem.contextValue, "algos.standardLibraryFile");
  });
});

describe("views/trees — algorithms item context values", () => {
  it("sets context values for main, language summary, and include rows", async () => {
    const algorithmPath = "/repo/src/numeric/euclidgcd";
    const categories: AlgorithmCategory[] = [
      { name: "numeric", path: "/repo/src/numeric" },
    ];
    const algorithms: AlgorithmEntry[] = [
      { name: "euclidgcd", path: algorithmPath, categoryPath: "/repo/src/numeric" },
    ];
    const implementations: AlgorithmImplementation[] = [
      {
        languageKey: "python",
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.py",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.py"],
        hasIncludes: true,
        includeFilePaths: ["/repo/src/numeric/euclidgcd/python_include/helper.py"],
      },
    ];

    const fileProvider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      viewModeService: createViewModeServiceStub("files"),
      languages: createLanguageStub(),
    });

    const fileRoot = (await fileProvider.getChildren()) ?? [];
    const fileCategory = fileRoot[0];
    const fileAlgorithm = ((await fileProvider.getChildren(fileCategory)) ?? [])[0];
    const fileRows = (await fileProvider.getChildren(fileAlgorithm)) ?? [];
    const mainRow = fileRows.find((row) => row.kind === "mainFile") as WorkspaceTreeNode;
    const mainItem = await fileProvider.getTreeItem(mainRow);
    assert.strictEqual(mainItem.contextValue, "algos.algorithmsMainFile");

    const includeRows = (await fileProvider.getChildren(mainRow)) ?? [];
    const includeItem = await fileProvider.getTreeItem(includeRows[0]);
    assert.strictEqual(includeItem.contextValue, "algos.algorithmsIncludeFile");

    const languageProvider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      viewModeService: createViewModeServiceStub("language"),
      languages: createLanguageStub(),
    });

    const languageRoot = (await languageProvider.getChildren()) ?? [];
    const languageCategory = languageRoot[0];
    const languageAlgorithm = ((await languageProvider.getChildren(languageCategory)) ?? [])[0];
    const languageRows = (await languageProvider.getChildren(languageAlgorithm)) ?? [];

    const presentLanguageRow = languageRows.find((row) => row.languageKey === "python") as WorkspaceTreeNode;
    const presentLanguageItem = await languageProvider.getTreeItem(presentLanguageRow);
    assert.strictEqual(presentLanguageItem.contextValue, "algos.algorithmsLanguageSummary");

    const absentLanguageRow = languageRows.find((row) => row.languageKey === "go") as WorkspaceTreeNode;
    const absentLanguageItem = await languageProvider.getTreeItem(absentLanguageRow);
    assert.strictEqual(absentLanguageItem.contextValue, "algos.algorithmsLanguageSummaryAbsent");
  });
});
