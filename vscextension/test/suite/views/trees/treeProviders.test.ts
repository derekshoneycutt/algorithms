import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import "mocha";
import * as vscode from "vscode";

import { createFilesystem } from "../../../../src/filesystem";
import type { IAlgorithmsIndex } from "../../../../src/algorithms";
import type { AlgorithmCategory, AlgorithmEntry, AlgorithmImplementation, StandardLibEntry } from "../../../../src/algorithms";
import {
  createAlgorithmsIndex,
} from "../../../../src/algorithms";
import type { IConductor } from "../../../../src/conductor";
import type { ILanguages } from "../../../../src/languages";
import type { IFilterModeService } from "../../../../src/state";
import { createHostStateService } from "../../../../src/state";
import type { SidebarViewMode, IViewModeService } from "../../../../src/state/viewMode";
import {
  createWorkspaceStandardLibraryTreeDataProvider,
  createWorkspaceAlgorithmsTreeDataProvider,
  createLanguageStatusDecorationProvider,
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
 * Creates a minimal filter mode service stub.
 *
 * @param {"all" | "problems"} initialMode Initial filter mode.
 * @returns {IFilterModeService} Filter mode stub.
 */
function createFilterModeServiceStub(initialMode: "all" | "problems"): IFilterModeService {
  let currentMode = initialMode;
  const emitter = new vscode.EventEmitter<"all" | "problems">();

  return {
    getFilterMode() {
      return currentMode;
    },
    async setFilterMode(mode: "all" | "problems") {
      currentMode = mode;
      emitter.fire(mode);
    },
    onDidChangeFilterMode: emitter.event,
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
        isFlagged: false,
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
        isFlagged: false,
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.go",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.go"],
        hasIncludes: false,
        includeFilePaths: [],
      },
    ];

    const provider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      viewModeService: createViewModeServiceStub("files"),
      filterModeService: createFilterModeServiceStub("all"),
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
        isFlagged: false,
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
      filterModeService: createFilterModeServiceStub("all"),
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
        isFlagged: false,
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.py",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.py"],
        hasIncludes: true,
        includeFilePaths: ["/repo/src/numeric/euclidgcd/python_include/helper.py"],
      },
    ];

    const fileProvider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      viewModeService: createViewModeServiceStub("files"),
      filterModeService: createFilterModeServiceStub("all"),
      languages: createLanguageStub(),
    });

    const fileRoot = (await fileProvider.getChildren()) ?? [];
    const fileCategory = fileRoot[0];
    const fileAlgorithm = ((await fileProvider.getChildren(fileCategory)) ?? [])[0];
    const fileRows = (await fileProvider.getChildren(fileAlgorithm)) ?? [];
    const mainRow = fileRows.find((row) => row.kind === "mainFile") as WorkspaceTreeNode;
    const mainItem = await fileProvider.getTreeItem(mainRow);
    assert.strictEqual(mainItem.contextValue, "algos.algorithmsMainFileUnflagged");

    const includeRows = (await fileProvider.getChildren(mainRow)) ?? [];
    const includeItem = await fileProvider.getTreeItem(includeRows[0]);
    assert.strictEqual(includeItem.contextValue, "algos.algorithmsIncludeFile");

    const languageProvider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      viewModeService: createViewModeServiceStub("language"),
      filterModeService: createFilterModeServiceStub("all"),
      languages: createLanguageStub(),
    });

    const languageRoot = (await languageProvider.getChildren()) ?? [];
    const languageCategory = languageRoot[0];
    const languageAlgorithm = ((await languageProvider.getChildren(languageCategory)) ?? [])[0];
    const languageRows = (await languageProvider.getChildren(languageAlgorithm)) ?? [];

    const presentLanguageRow = languageRows.find((row) => row.languageKey === "python") as WorkspaceTreeNode;
    const presentLanguageItem = await languageProvider.getTreeItem(presentLanguageRow);
    assert.strictEqual(presentLanguageItem.contextValue, "algos.algorithmsLanguageSummaryUnflagged");

    const absentLanguageRow = languageRows.find((row) => row.languageKey === "go") as WorkspaceTreeNode;
    const absentLanguageItem = await languageProvider.getTreeItem(absentLanguageRow);
    assert.strictEqual(absentLanguageItem.contextValue, "algos.algorithmsLanguageSummaryAbsent");
  });
});

describe("views/trees — flag and problems behavior", () => {
  it("shows flagged contexts and filters FILE view to flagged rows in problems mode", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();
    const languages = createLanguageStub();

    try {
      const euclidPath = path.join(
        workspaceRootPath,
        "src",
        "numeric",
        "euclidgcd"
      );
      const maxPath = path.join(workspaceRootPath, "src", "numeric", "max");
      await fs.mkdir(euclidPath, { recursive: true });
      await fs.mkdir(maxPath, { recursive: true });

      await fs.writeFile(path.join(euclidPath, "euclidgcd.py"), "");
      await fs.writeFile(path.join(maxPath, "max.py"), "");
      await fs.writeFile(path.join(euclidPath, ".flag-lang"), "python\n");

      const algorithmsIndex = createAlgorithmsIndex({
        filesystem,
        languages,
        workspaceFolderPaths: [workspaceRootPath],
      });

      const fileProblemsProvider = createWorkspaceAlgorithmsTreeDataProvider({
        algorithmsIndex,
        viewModeService: createViewModeServiceStub("files"),
        filterModeService: createFilterModeServiceStub("problems"),
        languages,
      });

      const fileRoot = (await fileProblemsProvider.getChildren()) ?? [];
      assert.strictEqual(fileRoot.length, 1);
      const fileCategory = fileRoot[0];
      const fileAlgorithms = (await fileProblemsProvider.getChildren(fileCategory)) ?? [];
      assert.strictEqual(fileAlgorithms.length, 1);
      assert.strictEqual(path.basename(fileAlgorithms[0].filePath), "euclidgcd");

      const fileRows = (await fileProblemsProvider.getChildren(fileAlgorithms[0])) ?? [];
      assert.strictEqual(fileRows.length, 1);
      const mainItem = await fileProblemsProvider.getTreeItem(fileRows[0]);
      assert.strictEqual(mainItem.contextValue, "algos.algorithmsMainFileFlagged");

      const languageProvider = createWorkspaceAlgorithmsTreeDataProvider({
        algorithmsIndex,
        viewModeService: createViewModeServiceStub("language"),
        filterModeService: createFilterModeServiceStub("all"),
        languages,
      });

      const languageRoot = (await languageProvider.getChildren()) ?? [];
      const languageCategory = languageRoot[0];
      const languageAlgorithms = (await languageProvider.getChildren(languageCategory)) ?? [];
      const euclidNode = languageAlgorithms.find((node) => {
        return path.basename(node.filePath) === "euclidgcd";
      }) as WorkspaceTreeNode;
      const languageRows = (await languageProvider.getChildren(euclidNode)) ?? [];
      const pythonRow = languageRows.find((row) => row.languageKey === "python") as WorkspaceTreeNode;
      const pythonItem = await languageProvider.getTreeItem(pythonRow);
      assert.strictEqual(
        pythonItem.contextValue,
        "algos.algorithmsLanguageSummaryFlagged"
      );
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });
});

describe("views/trees — URI fragments and FileDecoration provider", () => {
  it("assigns correct URI fragments based on isFlagged and isMissing state", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();
    const languages = createLanguageStub();

    try {
      const euclidPath = path.join(
        workspaceRootPath,
        "src",
        "numeric",
        "euclidgcd"
      );
      await fs.mkdir(euclidPath, { recursive: true });
      await fs.writeFile(path.join(euclidPath, "euclidgcd.py"), "");
      await fs.writeFile(path.join(euclidPath, "euclidgcd.go"), "");
      await fs.writeFile(path.join(euclidPath, ".flag-lang"), "python\n");

      const algorithmsIndex = createAlgorithmsIndex({
        filesystem,
        languages,
        workspaceFolderPaths: [workspaceRootPath],
      });

      const languageProvider = createWorkspaceAlgorithmsTreeDataProvider({
        algorithmsIndex,
        viewModeService: createViewModeServiceStub("language"),
        filterModeService: createFilterModeServiceStub("all"),
        languages,
      });

      const languageRoot = (await languageProvider.getChildren()) ?? [];
      const languageCategory = languageRoot[0];
      const languageAlgorithms = (await languageProvider.getChildren(languageCategory)) ?? [];
      const euclidNode = languageAlgorithms.find((node) => {
        return path.basename(node.filePath) === "euclidgcd";
      }) as WorkspaceTreeNode;
      const languageRows = (await languageProvider.getChildren(euclidNode)) ?? [];

      // Language present + flagged → algos-language-flagged fragment
      const pythonRow = languageRows.find((row) => row.languageKey === "python") as WorkspaceTreeNode;
      const pythonItem = await languageProvider.getTreeItem(pythonRow);
      assert.strictEqual(pythonItem.resourceUri?.fragment, "algos-language-flagged");

      // Language present + not flagged → no fragment
      const goRow = languageRows.find((row) => row.languageKey === "go") as WorkspaceTreeNode;
      const goItem = await languageProvider.getTreeItem(goRow);
      assert.strictEqual(goItem.resourceUri?.fragment, "");

      // Language missing + flagged → algos-language-flagged-absent fragment
      const typescriptRow = languageRows.find((row) => row.languageKey === "typescript") as WorkspaceTreeNode;
      assert.strictEqual(typescriptRow.isMissing, true);
      assert.strictEqual(typescriptRow.isFlagged, false);
      const typescriptItem = await languageProvider.getTreeItem(typescriptRow);
      assert.strictEqual(typescriptItem.resourceUri?.fragment, "algos-language-absent");
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("FileDecoration provider returns correct badge and color for each fragment", () => {
    const provider = createLanguageStatusDecorationProvider();

    // algos-language-flagged → red badge
    const flaggedUri = vscode.Uri.file("/test/file.py").with({ fragment: "algos-language-flagged" });
    const flaggedDecoration = provider.provideFileDecoration(flaggedUri, {} as any) as vscode.FileDecoration | undefined;
    assert.ok(flaggedDecoration !== undefined && flaggedDecoration !== null);
    assert.strictEqual(flaggedDecoration.badge, "\u25cf");
    assert.deepStrictEqual(flaggedDecoration.color, new vscode.ThemeColor("testing.iconFailed"));
    assert.ok(flaggedDecoration.tooltip?.includes("flagged in .flag-lang"));

    // algos-language-flagged-absent → red badge
    const flaggedAbsentUri = vscode.Uri.file("/test/file.py").with({ fragment: "algos-language-flagged-absent" });
    const flaggedAbsentDecoration = provider.provideFileDecoration(flaggedAbsentUri, {} as any) as vscode.FileDecoration | undefined;
    assert.ok(flaggedAbsentDecoration !== undefined && flaggedAbsentDecoration !== null);
    assert.strictEqual(flaggedAbsentDecoration.badge, "\u25cf");
    assert.deepStrictEqual(flaggedAbsentDecoration.color, new vscode.ThemeColor("testing.iconFailed"));
    assert.ok(flaggedAbsentDecoration.tooltip?.includes("not present in algorithm"));

    // algos-language-absent → gray badge
    const absentUri = vscode.Uri.file("/test/file.py").with({ fragment: "algos-language-absent" });
    const absentDecoration = provider.provideFileDecoration(absentUri, {} as any) as vscode.FileDecoration | undefined;
    assert.ok(absentDecoration !== undefined && absentDecoration !== null);
    assert.strictEqual(absentDecoration.badge, "\u25cf");
    assert.deepStrictEqual(absentDecoration.color, new vscode.ThemeColor("testing.iconQueued"));
    assert.ok(absentDecoration.tooltip?.includes("not present in algorithm"));

    // run fragments
    const runRunningUri = vscode.Uri.file("/test/file.py").with({ fragment: "algos-runfile-running" });
    const runRunningDecoration = provider.provideFileDecoration(runRunningUri, {} as any) as vscode.FileDecoration | undefined;
    assert.ok(runRunningDecoration !== undefined && runRunningDecoration !== null);
    assert.strictEqual(runRunningDecoration.badge, "▶");
    assert.deepStrictEqual(runRunningDecoration.color, new vscode.ThemeColor("testing.iconQueued"));

    const runFailedUri = vscode.Uri.file("/test/file.py").with({ fragment: "algos-runfile-failed" });
    const runFailedDecoration = provider.provideFileDecoration(runFailedUri, {} as any) as vscode.FileDecoration | undefined;
    assert.ok(runFailedDecoration !== undefined && runFailedDecoration !== null);
    assert.strictEqual(runFailedDecoration.badge, "✕");
    assert.deepStrictEqual(runFailedDecoration.color, new vscode.ThemeColor("testing.iconFailed"));

    // No fragment → undefined
    const noUri = vscode.Uri.file("/test/file.py");
    const noDecoration = provider.provideFileDecoration(noUri, {} as any);
    assert.strictEqual(noDecoration, undefined);
  });
});

describe("views/trees — run file status projection", () => {
  it("decorates only the launched target row and sets tooltip", async () => {
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
        isFlagged: false,
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.py",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.py"],
        hasIncludes: false,
        includeFilePaths: [],
      },
      {
        languageKey: "go",
        isFlagged: false,
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.go",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.go"],
        hasIncludes: false,
        includeFilePaths: [],
      },
    ];

    const conductor: IConductor = {
      reactToSmokeIntent(): never {
        throw new Error("not used");
      },
      reactToRunControlsIntent(): never {
        throw new Error("not used");
      },
      async runFile(): Promise<void> {
        return;
      },
      getRunForTarget(target) {
        if (
          target.nodeKind === "mainFile"
          && target.filePath === "/repo/src/numeric/euclidgcd/euclidgcd.py"
        ) {
          return {
            runId: "run-1",
            ownerKey: "python:euclidgcd.py",
            status: "running",
            startedAt: 1,
            updatedAt: 2,
            message: "Run File dispatched to terminal",
            progressPercent: null,
            stepKey: null,
            errorMessage: null,
          };
        }

        return null;
      },
      subscribeRunTargetStatus() {
        return {
          dispose(): void {
            return;
          },
        };
      },
      startRun(): never {
        throw new Error("not used");
      },
      markProgress(): never {
        throw new Error("not used");
      },
      markCompleted(): never {
        throw new Error("not used");
      },
      markFailed(): never {
        throw new Error("not used");
      },
      cancelRun(): never {
        throw new Error("not used");
      },
      stopSmokeTest(): Promise<boolean> {
        throw new Error("not used");
      },
      clearSmokeResults(): boolean {
        throw new Error("not used");
      },
      clearRunResults(): boolean {
        throw new Error("not used");
      },
      getRun(): never {
        throw new Error("not used");
      },
    };

    const provider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      conductor,
      viewModeService: createViewModeServiceStub("files"),
      filterModeService: createFilterModeServiceStub("all"),
      languages: createLanguageStub(),
    });

    const rootChildren = (await provider.getChildren()) ?? [];
    const categoryNode = rootChildren[0];
    const algorithmNodes = (await provider.getChildren(categoryNode)) ?? [];
    const algorithmNode = algorithmNodes[0];
    const fileRows = (await provider.getChildren(algorithmNode)) ?? [];
    const pythonMain = fileRows.find((row) => {
      return row.filePath.endsWith("euclidgcd.py");
    }) as WorkspaceTreeNode;
    const goMain = fileRows.find((row) => {
      return row.filePath.endsWith("euclidgcd.go");
    }) as WorkspaceTreeNode;

    const pythonItem = await provider.getTreeItem(pythonMain);
    const goItem = await provider.getTreeItem(goMain);

    assert.strictEqual(pythonItem.resourceUri?.fragment, "algos-runfile-running");
    assert.ok(String(pythonItem.tooltip).includes("Run Action: Running"));
    assert.ok(String(pythonItem.tooltip).includes("dispatched to terminal"));
    assert.strictEqual(goItem.resourceUri?.fragment, "");
  });

  it("projects run-result contexts onto FILES rows", async () => {
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
        isFlagged: false,
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.py",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.py"],
        hasIncludes: false,
        includeFilePaths: [],
      },
    ];

    const conductor: IConductor = {
      reactToSmokeIntent(): never {
        throw new Error("not used");
      },
      reactToRunControlsIntent(): never {
        throw new Error("not used");
      },
      async runFile(): Promise<void> {
        return;
      },
      getRunForTarget(target) {
        if (
          target.nodeKind === "mainFile"
          && target.filePath === "/repo/src/numeric/euclidgcd/euclidgcd.py"
        ) {
          return {
            runId: "run-2",
            ownerKey: "python:euclidgcd.py",
            status: "completed",
            startedAt: 1,
            updatedAt: 2,
            message: "Run File completed successfully",
            progressPercent: null,
            stepKey: null,
            errorMessage: null,
          };
        }

        return null;
      },
      subscribeRunTargetStatus() {
        return {
          dispose(): void {
            return;
          },
        };
      },
      startRun(): never {
        throw new Error("not used");
      },
      markProgress(): never {
        throw new Error("not used");
      },
      markCompleted(): never {
        throw new Error("not used");
      },
      markFailed(): never {
        throw new Error("not used");
      },
      cancelRun(): never {
        throw new Error("not used");
      },
      stopSmokeTest(): Promise<boolean> {
        throw new Error("not used");
      },
      clearSmokeResults(): boolean {
        throw new Error("not used");
      },
      clearRunResults(): boolean {
        throw new Error("not used");
      },
      getRun(): never {
        throw new Error("not used");
      },
    };

    const provider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      conductor,
      viewModeService: createViewModeServiceStub("files"),
      filterModeService: createFilterModeServiceStub("all"),
      languages: createLanguageStub(),
    });

    const rootChildren = (await provider.getChildren()) ?? [];
    const categoryNode = rootChildren[0];
    const algorithmNodes = (await provider.getChildren(categoryNode)) ?? [];
    const algorithmNode = algorithmNodes[0];
    const fileRows = (await provider.getChildren(algorithmNode)) ?? [];
    const pythonMain = fileRows.find((row) => {
      return row.filePath.endsWith("euclidgcd.py");
    }) as WorkspaceTreeNode;

    const pythonItem = await provider.getTreeItem(pythonMain);

    assert.strictEqual(
      pythonItem.contextValue,
      "algos.algorithmsMainFileRunResultsUnflagged"
    );
  });

  it("projects run-result contexts onto LANGUAGE rows", async () => {
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
        isFlagged: false,
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.py",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.py"],
        hasIncludes: false,
        includeFilePaths: [],
      },
    ];

    const conductor: IConductor = {
      reactToSmokeIntent(): never {
        throw new Error("not used");
      },
      reactToRunControlsIntent(): never {
        throw new Error("not used");
      },
      async runFile(): Promise<void> {
        return;
      },
      getRunForTarget(target) {
        if (
          target.nodeKind === "languageSummary"
          && target.filePath === "/repo/src/numeric/euclidgcd/euclidgcd.py"
        ) {
          return {
            runId: "run-3",
            ownerKey: "python:euclidgcd",
            status: "completed",
            startedAt: 1,
            updatedAt: 2,
            message: "Run File completed successfully",
            progressPercent: null,
            stepKey: null,
            errorMessage: null,
          };
        }

        return null;
      },
      subscribeRunTargetStatus() {
        return {
          dispose(): void {
            return;
          },
        };
      },
      startRun(): never {
        throw new Error("not used");
      },
      markProgress(): never {
        throw new Error("not used");
      },
      markCompleted(): never {
        throw new Error("not used");
      },
      markFailed(): never {
        throw new Error("not used");
      },
      cancelRun(): never {
        throw new Error("not used");
      },
      stopSmokeTest(): Promise<boolean> {
        throw new Error("not used");
      },
      clearSmokeResults(): boolean {
        throw new Error("not used");
      },
      clearRunResults(): boolean {
        throw new Error("not used");
      },
      getRun(): never {
        throw new Error("not used");
      },
    };

    const provider = createWorkspaceAlgorithmsTreeDataProvider({
      algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
      conductor,
      viewModeService: createViewModeServiceStub("language"),
      filterModeService: createFilterModeServiceStub("all"),
      languages: createLanguageStub(),
    });

    const rootChildren = (await provider.getChildren()) ?? [];
    const categoryNode = rootChildren[0];
    const algorithmNodes = (await provider.getChildren(categoryNode)) ?? [];
    const algorithmNode = algorithmNodes[0];
    const languageRows = (await provider.getChildren(algorithmNode)) ?? [];
    const pythonRow = languageRows.find((row) => {
      return row.kind === "languageSummary" && row.languageKey === "python";
    }) as WorkspaceTreeNode;

    const pythonItem = await provider.getTreeItem(pythonRow);

    assert.strictEqual(
      pythonItem.contextValue,
      "algos.algorithmsLanguageSummaryRunResultsUnflagged"
    );
  });

  it("projects smoke status onto FILES main-file rows", async () => {
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
        isFlagged: false,
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.py",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.py"],
        hasIncludes: false,
        includeFilePaths: [],
      },
      {
        languageKey: "go",
        isFlagged: false,
        filePath: "/repo/src/numeric/euclidgcd/euclidgcd.go",
        filePaths: ["/repo/src/numeric/euclidgcd/euclidgcd.go"],
        hasIncludes: false,
        includeFilePaths: [],
      },
    ];

    const hostState = createHostStateService();

    try {
      hostState.send({
        type: "SMOKE_RUN_STARTED",
        algorithmPath,
        languageKeys: ["python", "go"],
        runId: "run-smoke-1",
      });
      hostState.send({
        type: "SMOKE_LANGUAGE_RUN_STATUS_SET",
        algorithmPath,
        languageKey: "python",
        status: "running",
      });

      const provider = createWorkspaceAlgorithmsTreeDataProvider({
        algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, implementations),
        viewModeService: createViewModeServiceStub("files"),
        filterModeService: createFilterModeServiceStub("all"),
        hostState,
        languages: createLanguageStub(),
      });

      const rootChildren = (await provider.getChildren()) ?? [];
      const categoryNode = rootChildren[0];
      const algorithmNodes = (await provider.getChildren(categoryNode)) ?? [];
      const algorithmNode = algorithmNodes[0];
      const fileRows = (await provider.getChildren(algorithmNode)) ?? [];
      const pythonMain = fileRows.find((row) => {
        return row.filePath.endsWith("euclidgcd.py");
      }) as WorkspaceTreeNode;
      const goMain = fileRows.find((row) => {
        return row.filePath.endsWith("euclidgcd.go");
      }) as WorkspaceTreeNode;

      const pythonItem = await provider.getTreeItem(pythonMain);
      const goItem = await provider.getTreeItem(goMain);

      assert.strictEqual(pythonItem.resourceUri?.fragment, "algos-smoke-running");
      assert.ok(String(pythonItem.tooltip).includes("Smoke Test: Running"));
      assert.strictEqual(goItem.resourceUri?.fragment, "algos-smoke-queued");
      assert.ok(String(goItem.tooltip).includes("Smoke Test: Queued"));
    } finally {
      hostState.dispose();
    }
  });

  it("projects folder smoke action contexts onto algorithm rows", async () => {
    const algorithmPath = "/repo/src/numeric/euclidgcd";
    const categories: AlgorithmCategory[] = [
      { name: "numeric", path: "/repo/src/numeric" },
    ];
    const algorithms: AlgorithmEntry[] = [
      { name: "euclidgcd", path: algorithmPath, categoryPath: "/repo/src/numeric" },
    ];
    const hostState = createHostStateService();

    try {
      const provider = createWorkspaceAlgorithmsTreeDataProvider({
        algorithmsIndex: createAlgorithmsIndexStub(categories, algorithms, []),
        viewModeService: createViewModeServiceStub("files"),
        filterModeService: createFilterModeServiceStub("all"),
        hostState,
        languages: createLanguageStub(),
      });

      const rootChildren = (await provider.getChildren()) ?? [];
      const categoryNode = rootChildren[0];
      const algorithmNodes = (await provider.getChildren(categoryNode)) ?? [];
      const algorithmNode = algorithmNodes[0];

      const idleItem = await provider.getTreeItem(algorithmNode);
      assert.strictEqual(idleItem.contextValue, "algos.algorithmsSecondLevelDirectory");

      hostState.send({
        type: "SMOKE_RUN_STARTED",
        algorithmPath,
        languageKeys: ["python"],
        runId: "smoke-1",
      });

      const runningItem = await provider.getTreeItem(algorithmNode);
      assert.strictEqual(runningItem.contextValue, "algos.algorithmsSecondLevelDirectorySmokeRunning");

      hostState.send({
        type: "SMOKE_RUN_FINISHED",
        algorithmPath,
      });

      const resultsItem = await provider.getTreeItem(algorithmNode);
      assert.strictEqual(resultsItem.contextValue, "algos.algorithmsSecondLevelDirectorySmokeResults");

      hostState.send({
        type: "SMOKE_RUN_STATUS_CLEARED",
        algorithmPath,
        runId: "smoke-1",
      });

      const clearedItem = await provider.getTreeItem(algorithmNode);
      assert.strictEqual(clearedItem.contextValue, "algos.algorithmsSecondLevelDirectory");
    } finally {
      hostState.dispose();
    }
  });
});
