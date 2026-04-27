import * as assert from "node:assert";

import { createAlgorithmsRunFileCommand } from "../../../src/commands/algorithmTreeActions";
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
    runControls,
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
});
