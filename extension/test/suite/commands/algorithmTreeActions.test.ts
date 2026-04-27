import * as assert from "node:assert";

import {
  createAlgorithmsRunFileCommand,
  createAlgorithmsCompileOnlyCommand,
  createAlgorithmsCheckOnlyNativeCommand,
  createAlgorithmsCleanCommand,
  createAlgorithmsLocalCleanCommand,
  createAlgorithmsSmokeTestCommand,
  createAlgorithmsStopSmokeTestCommand,
  createAlgorithmsClearSmokeResultsCommand,
  createAlgorithmsClearRunResultsCommand,
} from "../../../src/commands/algorithmTreeActions";
import type { IConductor, ConductorRunFileInput } from "../../../src/conductor";
import type { IFilesystem } from "../../../src/filesystem";
import type { ILanguages } from "../../../src/languages";
import type { INotificationRouter } from "../../../src/notifications";
import {
  createInitialRunControlsSettings,
  type ExtensionHostSnapshot,
  type IStateMachine,
  type RunControlsSettings,
} from "../../../src/state";
import type { WorkspaceTreeNode } from "../../../src/views";

/**
 * Creates a minimal filesystem stub for run-file command tests.
 *
 * @returns {IFilesystem} Stub filesystem.
 */
function createFilesystemStub(): IFilesystem {
  return {
    async realpath(targetPath: string): Promise<string> {
      return targetPath;
    },
    async isFile(_filePath: string): Promise<boolean> {
      return true;
    },
    async isDirectory(_directoryPath: string): Promise<boolean> {
      return true;
    },
    async readText(_filePath: string): Promise<string | null> {
      return null;
    },
    async writeText(_filePath: string, _content: string): Promise<void> {
      return;
    },
    async listDirectory(): Promise<null> {
      return null;
    },
    async ensureDirectory(): Promise<void> {
      return;
    },
    async deletePath(): Promise<void> {
      return;
    },
    async isPathWithinRoot(): Promise<boolean> {
      return true;
    },
  };
}

/**
 * Creates a minimal languages stub for run-file command tests.
 *
 * @returns {ILanguages} Stub languages service.
 */
function createLanguagesStub(): ILanguages {
  return {
    getAll() {
      return [];
    },
    getByKey(_key: string) {
      return undefined;
    },
    normalizeLanguageId(languageId: string) {
      return languageId;
    },
    normalizeFileExtension(filePath: string) {
      if (filePath.endsWith(".cpp")) {
        return "cpp";
      }
      if (filePath.endsWith(".py")) {
        return "python";
      }
      return undefined;
    },
    getDisplayLabel(_key: string) {
      return undefined;
    },
    getDefaultSmokeKeys() {
      return [];
    },
  };
}

/**
 * Creates a minimal host state stub with run controls.
 *
 * @param {RunControlsSettings} runControls Run controls snapshot.
 * @returns {IStateMachine} Stub host state.
 */
function createHostStateStub(runControls: RunControlsSettings): IStateMachine {
  const snapshot: ExtensionHostSnapshot = {
    stateValue: "ready",
    lastCommandId: null,
    lastResult: null,
    lastFailure: null,
    smokeControls: {
      reportEnabled: false,
      markdownPath: "",
      timeoutSeconds: "8m",
      slowTimeoutSeconds: "20m",
      languages: [],
      reportStatusText: "Report Disabled",
      reportStatusClassName: "status-muted",
      smokeStatusText: "0 selected",
      smokeStatusClassName: "status-muted",
      statusLabel: "0 selected",
    },
    smokeRunStatusByAlgorithm: {},
    activeSmokeRunAlgorithmPath: null,
    runControls,
    environmentControls: {
      profilePath: "",
      profilePlaceholder: "",
      effectiveProfilePath: "",
      copyIconsPath: "",
      checkEnvStatusText: "",
      checkEnvStatusClassName: "status-muted",
      checkEnvFilteredOutput: "",
      checkEnvRawOutput: "",
      copyIconsStatusText: "",
      copyIconsStatusClassName: "status-muted",
      routingDockerMapText: "",
      routingSshMapText: "",
      routingStatusText: "",
      routingStatusClassName: "status-muted",
      routingEntries: [],
      batchRoutingDockerEnabled: false,
      batchRoutingDockerValue: "",
      batchRoutingSshEnabled: false,
      batchRoutingSshValue: "",
      batchRoutingConflict: false,
      variables: [],
    },
    filesystemCacheTtlMs: 2000,
    filesystemStatCacheByPath: {},
    filesystemDirectoryCacheByPath: {},
    filesystemPendingOperationById: {},
    filesystemOperationErrorByPath: {},
  };

  return {
    getSnapshot(): ExtensionHostSnapshot {
      return snapshot;
    },
    send(): void {
      return;
    },
    dispose(): void {
      return;
    },
  };
}

describe("commands/algorithmTreeActions — run-file integration", () => {
  it("delegates run-file orchestration to conductor", async () => {
    const warnings: string[] = [];
    const runInputs: ConductorRunFileInput[] = [];

    const runControls = createInitialRunControlsSettings({
      runArgsEnabled: true,
      runArgsText: "--verbose sample",
      sourceProfileEnabled: true,
      sourceProfileText: "profiles/default.sh",
      runChecksMode: "check-only",
      runChecksRoute: "docker",
    });

    const notificationRouter: INotificationRouter = {
      info(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
      warn(message: string): Thenable<string | undefined> {
        warnings.push(message);
        return Promise.resolve(undefined);
      },
      error(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
    };

    const conductor: IConductor = {
      reactToSmokeIntent(): never {
        throw new Error("not used");
      },
      reactToRunControlsIntent(): never {
        throw new Error("not used");
      },
      async runFile(input: ConductorRunFileInput): Promise<void> {
        runInputs.push(input);
      },
      getRunForTarget() {
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
      readEnvironment(): never {
        throw new Error("not used");
      },
      writeEnvironment(): never {
        throw new Error("not used");
      },
      checkEnvironment(): never {
        throw new Error("not used");
      },
      copyIcons(): never {
        throw new Error("not used");
      },
      initWorkspaceSupportedContext(): Promise<void> {
        return Promise.resolve();
      },
      refreshWorkspaceSupportedContext(): Promise<void> {
        return Promise.resolve();
      },
    };

    const command = createAlgorithmsRunFileCommand({
      conductor,
      filesystem: createFilesystemStub(),
      hostState: createHostStateStub(runControls),
      languages: createLanguagesStub(),
      notificationRouter,
      refreshAlgorithmsTree: (): void => {
        return;
      },
    });

    const treeNode: WorkspaceTreeNode = {
      kind: "languageSummary",
      filePath: "/repo/src/numeric/max/max.cpp",
      languageKey: "cpp",
      parentAlgorithmPath: "/repo/src/numeric/max",
      hasOpenTarget: true,
    };

    await command(treeNode);

    assert.strictEqual(warnings.length, 0);
    assert.strictEqual(runInputs.length, 1);
    assert.strictEqual(runInputs[0].treeNode, treeNode);
    assert.strictEqual(runInputs[0].workspaceFolderPaths.length, 0);
  });

  it("reports when conductor dependencies are missing", async () => {
    const errors: string[] = [];

    const notificationRouter: INotificationRouter = {
      info(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
      warn(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
      error(message: string): Thenable<string | undefined> {
        errors.push(message);
        return Promise.resolve(undefined);
      },
    };

    const command = createAlgorithmsRunFileCommand({
      filesystem: createFilesystemStub(),
      languages: createLanguagesStub(),
      notificationRouter,
      refreshAlgorithmsTree: (): void => {
        return;
      },
    });

    await command({
      kind: "file",
      filePath: "/repo/src/numeric/max/max.py",
    });

    assert.deepStrictEqual(errors, ["Run File orchestration is not configured."]);
  });

  it("delegates compile/check/clean/localclean/smoke actions to conductor", async () => {
    const runInputs: ConductorRunFileInput[] = [];

    const notificationRouter: INotificationRouter = {
      info(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
      warn(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
      error(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
    };

    const conductor: IConductor = {
      reactToSmokeIntent(): never {
        throw new Error("not used");
      },
      reactToRunControlsIntent(): never {
        throw new Error("not used");
      },
      async runFile(input: ConductorRunFileInput): Promise<void> {
        runInputs.push(input);
      },
      getRunForTarget() {
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
      readEnvironment(): never {
        throw new Error("not used");
      },
      writeEnvironment(): never {
        throw new Error("not used");
      },
      checkEnvironment(): never {
        throw new Error("not used");
      },
      copyIcons(): never {
        throw new Error("not used");
      },
      initWorkspaceSupportedContext(): Promise<void> {
        return Promise.resolve();
      },
      refreshWorkspaceSupportedContext(): Promise<void> {
        return Promise.resolve();
      },
    };

    const dependencies = {
      conductor,
      filesystem: createFilesystemStub(),
      hostState: createHostStateStub(createInitialRunControlsSettings()),
      languages: createLanguagesStub(),
      notificationRouter,
      refreshAlgorithmsTree: (): void => {
        return;
      },
    };

    const treeNode: WorkspaceTreeNode = {
      kind: "file",
      filePath: "/repo/src/numeric/max/max.py",
    };

    await createAlgorithmsCompileOnlyCommand(dependencies)(treeNode);
    await createAlgorithmsCheckOnlyNativeCommand(dependencies)(treeNode);
    await createAlgorithmsCleanCommand(dependencies)(treeNode);
    await createAlgorithmsLocalCleanCommand(dependencies)(treeNode);
    await createAlgorithmsSmokeTestCommand(dependencies)({
      kind: "algorithmDir",
      filePath: "/repo/src/numeric/max",
    });

    assert.strictEqual(runInputs.length, 5);
    assert.strictEqual(runInputs[0].actionKind, "compile-only");
    assert.strictEqual(runInputs[1].actionKind, "check-only");
    assert.strictEqual(runInputs[2].actionKind, "clean");
    assert.strictEqual(runInputs[3].actionKind, "localclean");
    assert.strictEqual(runInputs[4].actionKind, "smoke-test");
  });

  it("delegates stop-smoke and clear-smoke commands to conductor", async () => {
    const stoppedAlgorithms: string[] = [];
    const clearedAlgorithms: string[] = [];
    const clearedRunTargets: Array<{ nodeKind: string; filePath: string }> = [];

    const conductor: IConductor = {
      reactToSmokeIntent(): never {
        throw new Error("not used");
      },
      reactToRunControlsIntent(): never {
        throw new Error("not used");
      },
      async runFile(): Promise<void> {
        throw new Error("not used");
      },
      async stopSmokeTest(input): Promise<boolean> {
        stoppedAlgorithms.push(input.algorithmPath);
        return true;
      },
      clearSmokeResults(input): boolean {
        clearedAlgorithms.push(input.algorithmPath);
        return true;
      },
      clearRunResults(input): boolean {
        clearedRunTargets.push({
          nodeKind: input.target.nodeKind,
          filePath: input.target.filePath,
        });
        return true;
      },
      getRunForTarget() {
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
      getRun(): never {
        throw new Error("not used");
      },
      readEnvironment(): never {
        throw new Error("not used");
      },
      writeEnvironment(): never {
        throw new Error("not used");
      },
      checkEnvironment(): never {
        throw new Error("not used");
      },
      copyIcons(): never {
        throw new Error("not used");
      },
      initWorkspaceSupportedContext(): Promise<void> {
        return Promise.resolve();
      },
      refreshWorkspaceSupportedContext(): Promise<void> {
        return Promise.resolve();
      },
    };

    const notificationRouter: INotificationRouter = {
      info(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
      warn(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
      error(): Thenable<string | undefined> {
        return Promise.resolve(undefined);
      },
    };

    const dependencies = {
      conductor,
      filesystem: createFilesystemStub(),
      hostState: createHostStateStub(createInitialRunControlsSettings()),
      languages: createLanguagesStub(),
      notificationRouter,
      refreshAlgorithmsTree(): void {
        return;
      },
    };

    const treeNode: WorkspaceTreeNode = {
      kind: "algorithmDir",
      filePath: "/repo/src/numeric/max",
    };

    await createAlgorithmsStopSmokeTestCommand(dependencies)(treeNode);
    await createAlgorithmsClearSmokeResultsCommand(dependencies)(treeNode);
    await createAlgorithmsClearRunResultsCommand(dependencies)({
      kind: "file",
      filePath: "/repo/src/numeric/max/max.py",
    });

    assert.deepStrictEqual(stoppedAlgorithms, ["/repo/src/numeric/max"]);
    assert.deepStrictEqual(clearedAlgorithms, ["/repo/src/numeric/max"]);
    assert.deepStrictEqual(clearedRunTargets, [
      {
        nodeKind: "file",
        filePath: "/repo/src/numeric/max/max.py",
      },
    ]);
  });
});
