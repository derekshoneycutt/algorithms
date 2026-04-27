import * as assert from "assert";

import type { IAlgorithmsTerminalRunAdapter } from "../../../src/commandline";
import { createConductorService } from "../../../src/conductor";
import { createHostStateService } from "../../../src/state";

describe("conductor — createConductorService", () => {
  it("creates a starting run snapshot", () => {
    const conductor = createConductorService();

    const snapshot = conductor.startRun({
      ownerKey: "bootstrap",
      reason: "initial run",
    });

    assert.ok(snapshot.runId.startsWith("conductor:bootstrap:"));
    assert.strictEqual(snapshot.ownerKey, "bootstrap");
    assert.strictEqual(snapshot.status, "starting");
    assert.strictEqual(snapshot.message, "initial run");
    assert.strictEqual(snapshot.errorMessage, null);
    assert.ok(typeof snapshot.startedAt === "number");
    assert.ok(typeof snapshot.updatedAt === "number");
  });

  it("returns null for deferred bootstrap lifecycle mutations", () => {
    const conductor = createConductorService();

    assert.strictEqual(
      conductor.markProgress({ runId: "x", message: "step" }),
      null
    );
    assert.strictEqual(
      conductor.markCompleted({ runId: "x", message: "done" }),
      null
    );
    assert.strictEqual(
      conductor.markFailed({ runId: "x", errorMessage: "boom" }),
      null
    );
    assert.strictEqual(conductor.cancelRun({ runId: "x" }), null);
    assert.strictEqual(conductor.getRun("x"), null);
  });

  it("maps smoke intents to state-machine reaction events", () => {
    const conductor = createConductorService();
    const stateMachine = createHostStateService();

    try {
      const reaction = conductor.reactToSmokeIntent({
        intent: {
          kind: "setMarkdownPath",
          markdownPath: "output/new-report.md",
        },
        snapshot: stateMachine.getSnapshot(),
      });

      assert.strictEqual(reaction.shouldPublishSnapshot, true);
      assert.strictEqual(reaction.notification, null);
      assert.deepStrictEqual(reaction.stateEvents[0], {
        type: "SMOKE_MARKDOWN_PATH_SET",
        path: "output/new-report.md",
      });
      assert.deepStrictEqual(reaction.stateEvents[1], {
        type: "SMOKE_REPORT_STATUS_SET",
        statusText: "No report generated.",
        statusClassName: "status-muted",
      });
    } finally {
      stateMachine.dispose();
    }
  });

  it("emits a warning notification for deselect-all intent", () => {
    const conductor = createConductorService();
    const stateMachine = createHostStateService();

    try {
      const reaction = conductor.reactToSmokeIntent({
        intent: { kind: "deselectAllLanguages" },
        snapshot: stateMachine.getSnapshot(),
      });

      assert.deepStrictEqual(reaction.stateEvents[0], {
        type: "SMOKE_ALL_LANGUAGES_DESELECTED",
      });
      assert.deepStrictEqual(reaction.notification, {
        level: "warn",
        message: "All smoke languages deselected",
      });
    } finally {
      stateMachine.dispose();
    }
  });

  it("does not emit toggle event for disabled languages", () => {
    const conductor = createConductorService();
    const stateMachine = createHostStateService({
      initialSmokeControls: {
        languages: [
          {
            languageKey: "arm64asm",
            label: "ARM64 ASM",
            selected: false,
            disabled: true,
            disabledReason: "Not runnable on this platform/architecture.",
          },
        ],
      },
    });

    try {
      const reaction = conductor.reactToSmokeIntent({
        intent: { kind: "toggleLanguage", languageKey: "arm64asm" },
        snapshot: stateMachine.getSnapshot(),
      });

      assert.equal(
        reaction.stateEvents.some((event) => event.type === "SMOKE_LANGUAGE_TOGGLED"),
        false
      );
    } finally {
      stateMachine.dispose();
    }
  });

  it("maps run-controls intents to state-machine reaction events", () => {
    const conductor = createConductorService();
    const stateMachine = createHostStateService();

    try {
      const reaction = conductor.reactToRunControlsIntent({
        intent: {
          kind: "setRunArgsText",
          text: "--flag \"two words\"",
        },
        snapshot: stateMachine.getSnapshot(),
      });

      assert.deepStrictEqual(reaction.stateEvents[0], {
        type: "RUN_ARGS_TEXT_SET",
        text: "--flag \"two words\"",
      });
      assert.deepStrictEqual(reaction.stateEvents[1], {
        type: "RUN_ARGS_STATUS_SET",
        statusText: "Arguments Disabled",
        statusClassName: "status-muted",
      });
      assert.deepStrictEqual(reaction.stateEvents[2], {
        type: "RUN_SOURCE_PROFILE_STATUS_SET",
        statusText: "Source Profile Unchecked",
        statusClassName: "status-muted",
      });
      assert.deepStrictEqual(reaction.stateEvents[3], {
        type: "RUN_CHECKS_STATUS_SET",
        statusText: "No Run Check Override",
        statusClassName: "status-muted",
      });
      assert.deepStrictEqual(reaction.stateEvents[4], {
        type: "RUN_CLEAN_OPTIONS_STATUS_SET",
        statusText: "Defaults: y|y (stdlib|archive)",
        statusClassName: "status-muted",
      });
      assert.strictEqual(reaction.notification, null);
      assert.strictEqual(reaction.shouldPublishSnapshot, true);
    } finally {
      stateMachine.dispose();
    }
  });

  it("emits a notification when enabling run arguments", () => {
    const conductor = createConductorService();
    const stateMachine = createHostStateService();

    try {
      const reaction = conductor.reactToRunControlsIntent({
        intent: { kind: "setRunArgsEnabled", enabled: true },
        snapshot: stateMachine.getSnapshot(),
      });

      assert.deepStrictEqual(reaction.stateEvents[0], {
        type: "RUN_ARGS_ENABLED_SET",
        enabled: true,
      });
      assert.deepStrictEqual(reaction.stateEvents[1], {
        type: "RUN_ARGS_STATUS_SET",
        statusText: "0 Arguments",
        statusClassName: "status-ok",
      });
      assert.deepStrictEqual(reaction.notification, {
        level: "info",
        message: "Run arguments enabled",
      });
    } finally {
      stateMachine.dispose();
    }
  });

  it("surfaces parse errors in run-arguments status", () => {
    const conductor = createConductorService();
    const stateMachine = createHostStateService({
      initialRunControls: {
        runArgsEnabled: true,
      },
    });

    try {
      const reaction = conductor.reactToRunControlsIntent({
        intent: { kind: "setRunArgsText", text: "--broken \"unterminated" },
        snapshot: stateMachine.getSnapshot(),
      });

      assert.deepStrictEqual(reaction.stateEvents[1], {
        type: "RUN_ARGS_STATUS_SET",
        statusText: "Run args contain an unclosed quote.",
        statusClassName: "status-error",
      });
    } finally {
      stateMachine.dispose();
    }
  });

  it("runs file targets through terminal adapter and records lifecycle success", async () => {
    const runCalls: Parameters<IAlgorithmsTerminalRunAdapter["run"]>[] = [];

    const adapter: IAlgorithmsTerminalRunAdapter = {
      run(input): void {
        runCalls.push([input]);
      },
      getTerminalName(): string {
        return "Algorithms Runner";
      },
    };

    const conductor = createConductorService({
      algorithmsTerminalRunAdapter: adapter,
    });
    const stateMachine = createHostStateService();
    const infos: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      await conductor.runFile({
        filesystem: {
          async realpath(targetPath: string): Promise<string> {
            return targetPath;
          },
          async isFile(_filePath: string): Promise<boolean> {
            return true;
          },
          async isDirectory(_directoryPath: string): Promise<boolean> {
            return true;
          },
          async readText(): Promise<string | null> {
            return null;
          },
          async writeText(): Promise<void> {
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
        },
        hostState: stateMachine,
        languages: {
          getAll() {
            return [];
          },
          getByKey() {
            return undefined;
          },
          normalizeLanguageId(languageId: string) {
            return languageId;
          },
          normalizeFileExtension(filePath: string) {
            if (filePath.endsWith(".cpp")) {
              return "cpp";
            }
            return undefined;
          },
          getDisplayLabel() {
            return undefined;
          },
          getDefaultSmokeKeys() {
            return [];
          },
        },
        notificationRouter: {
          info(message: string) {
            infos.push(message);
            return Promise.resolve(undefined);
          },
          warn(message: string) {
            warnings.push(message);
            return Promise.resolve(undefined);
          },
          error(message: string) {
            errors.push(message);
            return Promise.resolve(undefined);
          },
        },
        refreshAlgorithmsTree(): void {
          return;
        },
        treeNode: {
          kind: "languageSummary",
          filePath: "/repo/src/numeric/max/max.cpp",
          languageKey: "cpp",
          parentAlgorithmPath: "/repo/src/numeric/max",
          hasOpenTarget: true,
        },
        workspaceFolderPaths: ["/repo"],
      });

      assert.strictEqual(runCalls.length, 1);
      assert.deepStrictEqual(runCalls[0][0].optionTokens, []);
      assert.strictEqual(runCalls[0][0].targetToken, "cpp");
      assert.strictEqual(runCalls[0][0].workingDirectoryPath, "/repo/src/numeric/max");

      const snapshot = stateMachine.getSnapshot();
      assert.strictEqual(snapshot.lastCommandId, "algorithms.run-file");
      assert.ok(snapshot.lastResult?.includes("Run File started for cpp (cpp)"));
      assert.strictEqual(snapshot.lastFailure, null);
      assert.strictEqual(warnings.length, 0);
      assert.strictEqual(errors.length, 0);
      assert.strictEqual(infos.length, 1);
    } finally {
      stateMachine.dispose();
    }
  });

  it("blocks malformed run args and records lifecycle failure", async () => {
    const runCalls: Parameters<IAlgorithmsTerminalRunAdapter["run"]>[] = [];

    const adapter: IAlgorithmsTerminalRunAdapter = {
      run(input): void {
        runCalls.push([input]);
      },
      getTerminalName(): string {
        return "Algorithms Runner";
      },
    };

    const conductor = createConductorService({
      algorithmsTerminalRunAdapter: adapter,
    });
    const stateMachine = createHostStateService({
      initialRunControls: {
        runArgsEnabled: true,
        runArgsText: '"unterminated',
      },
    });
    const warnings: string[] = [];

    try {
      await conductor.runFile({
        filesystem: {
          async realpath(targetPath: string): Promise<string> {
            return targetPath;
          },
          async isFile(_filePath: string): Promise<boolean> {
            return true;
          },
          async isDirectory(_directoryPath: string): Promise<boolean> {
            return true;
          },
          async readText(): Promise<string | null> {
            return null;
          },
          async writeText(): Promise<void> {
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
        },
        hostState: stateMachine,
        languages: {
          getAll() {
            return [];
          },
          getByKey() {
            return undefined;
          },
          normalizeLanguageId(languageId: string) {
            return languageId;
          },
          normalizeFileExtension() {
            return "python";
          },
          getDisplayLabel() {
            return undefined;
          },
          getDefaultSmokeKeys() {
            return [];
          },
        },
        notificationRouter: {
          info() {
            return Promise.resolve(undefined);
          },
          warn(message: string) {
            warnings.push(message);
            return Promise.resolve(undefined);
          },
          error() {
            return Promise.resolve(undefined);
          },
        },
        refreshAlgorithmsTree(): void {
          return;
        },
        treeNode: {
          kind: "file",
          filePath: "/repo/src/numeric/max/max.py",
        },
        workspaceFolderPaths: ["/repo"],
      });

      assert.strictEqual(runCalls.length, 0);
      assert.ok(warnings[0].includes("unclosed quote"));

      const snapshot = stateMachine.getSnapshot();
      assert.strictEqual(snapshot.lastCommandId, "algorithms.run-file");
      assert.ok(snapshot.lastFailure?.includes("unclosed quote"));
    } finally {
      stateMachine.dispose();
    }
  });
});
