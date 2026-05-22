/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { createRequire } from "node:module";

import type { RunOptionsState } from "../../../src/runner";

interface TrackerEventInput {
  algorithmPath: string;
  languageKey: string;
  runId: string;
  source: "runner";
  cancelability: "single-run";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  message: string;
  updatedAt: number;
}

function createRunOptions(overrides?: Partial<RunOptionsState>): RunOptionsState {
  return {
    runArgsEnabled: false,
    runArgsText: "",
    sourceProfileEnabled: false,
    sourceProfileText: "",
    runChecksMode: "none",
    runChecksRoute: "native",
    cleanStdlibEnabled: false,
    cleanArchivesEnabled: false,
    ...overrides,
  };
}

async function loadWithMockVscode<TModule>(modulePath: string, vscodeMock: unknown): Promise<TModule> {
  const cjsRequire = createRequire(__filename);
  const moduleSystem = cjsRequire("node:module") as {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };

  const originalLoad = moduleSystem._load;
  moduleSystem._load = ((request: string, parent: unknown, isMain: boolean) => {
    if (request === "vscode") {
      return vscodeMock;
    }

    return originalLoad(request, parent, isMain);
  });

  try {
    const resolvedPath = cjsRequire.resolve(modulePath);
    delete cjsRequire.cache[resolvedPath];
    return cjsRequire(modulePath) as TModule;
  }
  finally {
    moduleSystem._load = originalLoad;
  }
}

describe("RunHandler integration", () => {
  let tempRootPath = "";
  let algorithmDirectoryPath = "";
  let targetFilePath = "";
  let terminalState: {
    showCalls: number;
    sentTexts: string[];
    shellExecutionListener: ((event: { terminal: unknown; execution: unknown; exitCode: number | null }) => void) | undefined;
  };

  beforeEach(async () => {
    tempRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "run-handler-test-"));
    algorithmDirectoryPath = path.join(tempRootPath, "src", "numeric", "max");
    targetFilePath = path.join(algorithmDirectoryPath, "main.rkt");
    terminalState = {
      showCalls: 0,
      sentTexts: [],
      shellExecutionListener: undefined,
    };

    await fs.mkdir(algorithmDirectoryPath, { recursive: true });
    await fs.writeFile(path.join(tempRootPath, "run.sh"), "#!/bin/sh\n", "utf8");
    await fs.writeFile(targetFilePath, "#lang racket\n", "utf8");
  });

  afterEach(async () => {
    if (tempRootPath.length > 0) {
      await fs.rm(tempRootPath, { recursive: true, force: true });
    }
  });

  it("executes a successful run-file command through terminal shell integration", async () => {
    let terminalObject: {
      exitStatus: undefined;
      shellIntegration: { executeCommand: (command: string) => object };
      show: () => void;
      sendText: (text: string) => void;
    };

    const vscodeMock = {
      window: {
        createTerminal: () => {
          terminalObject = {
            exitStatus: undefined,
            shellIntegration: {
              executeCommand: (command: string) => {
                const execution = { command };
                queueMicrotask(() => {
                  terminalState.shellExecutionListener?.({
                    terminal: terminalObject,
                    execution,
                    exitCode: 0,
                  });
                });
                return execution;
              },
            },
            show: () => {
              terminalState.showCalls += 1;
            },
            sendText: (text: string) => {
              terminalState.sentTexts.push(text);
            },
          };

          return terminalObject;
        },
        onDidChangeTerminalShellIntegration: () => ({ dispose: () => undefined }),
        onDidEndTerminalShellExecution: (listener: (event: { terminal: unknown; execution: unknown; exitCode: number | null }) => void) => {
          terminalState.shellExecutionListener = listener;
          return { dispose: () => undefined };
        },
      },
    };

    const module = await loadWithMockVscode<{
      RunHandler: new (repositoryRoot: string, tracker?: { setLanguageRunStatus: (input: TrackerEventInput) => void }) => {
        execute: (request: {
          algorithmDirectoryPath: string;
          actionKind?: "run-file" | "compile-only" | "check-only" | "clean" | "localclean";
          targetToken?: string;
          targetFilePath?: string;
          runOptions: RunOptionsState;
          languageKey?: string;
          runId?: string;
        }) => Promise<{ ok: boolean; text: string; terminalName: string; commandPreview: string; exitCode: number | null }>;
      };
    }>("../../../src/runner/runHandler", vscodeMock);

    const trackerEvents: TrackerEventInput[] = [];
    const handler = new module.RunHandler(tempRootPath, {
      setLanguageRunStatus: (input) => {
        trackerEvents.push(input);
      },
    });

    const result = await handler.execute({
      algorithmDirectoryPath,
      actionKind: "run-file",
      targetToken: "max",
      targetFilePath,
      runOptions: createRunOptions(),
      languageKey: "racket",
      runId: "run-123",
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.terminalName, "Algorithms Runner");
    assert.strictEqual(result.commandPreview.includes("run.sh"), true);
    assert.strictEqual(terminalState.showCalls > 0, true);
    assert.strictEqual(terminalState.sentTexts.length, 0);

    const statuses = trackerEvents.map((event) => event.status);
    assert.deepStrictEqual(statuses, ["queued", "running", "completed"]);
  });

  it("returns a failed result when shell integration reports a non-zero exit code", async () => {
    let terminalObject: {
      exitStatus: undefined;
      shellIntegration: { executeCommand: (command: string) => object };
      show: () => void;
      sendText: (text: string) => void;
    };

    const vscodeMock = {
      window: {
        createTerminal: () => {
          terminalObject = {
            exitStatus: undefined,
            shellIntegration: {
              executeCommand: (command: string) => {
                const execution = { command };
                queueMicrotask(() => {
                  terminalState.shellExecutionListener?.({
                    terminal: terminalObject,
                    execution,
                    exitCode: 7,
                  });
                });
                return execution;
              },
            },
            show: () => {
              terminalState.showCalls += 1;
            },
            sendText: (text: string) => {
              terminalState.sentTexts.push(text);
            },
          };

          return terminalObject;
        },
        onDidChangeTerminalShellIntegration: () => ({ dispose: () => undefined }),
        onDidEndTerminalShellExecution: (listener: (event: { terminal: unknown; execution: unknown; exitCode: number | null }) => void) => {
          terminalState.shellExecutionListener = listener;
          return { dispose: () => undefined };
        },
      },
    };

    const module = await loadWithMockVscode<{
      RunHandler: new (repositoryRoot: string, tracker?: { setLanguageRunStatus: (input: TrackerEventInput) => void }) => {
        execute: (request: {
          algorithmDirectoryPath: string;
          actionKind?: "run-file" | "compile-only" | "check-only" | "clean" | "localclean";
          targetToken?: string;
          targetFilePath?: string;
          runOptions: RunOptionsState;
          languageKey?: string;
          runId?: string;
        }) => Promise<{ ok: boolean; text: string; terminalName: string; commandPreview: string; exitCode: number | null }>;
      };
    }>("../../../src/runner/runHandler", vscodeMock);

    const trackerEvents: TrackerEventInput[] = [];
    const handler = new module.RunHandler(tempRootPath, {
      setLanguageRunStatus: (input) => {
        trackerEvents.push(input);
      },
    });

    const result = await handler.execute({
      algorithmDirectoryPath,
      actionKind: "run-file",
      targetToken: "max",
      targetFilePath,
      runOptions: createRunOptions(),
      languageKey: "racket",
      runId: "run-124",
    });

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.exitCode, 7);
    assert.strictEqual(result.text, "Run failed with exit code 7.");
    assert.strictEqual(trackerEvents.at(-1)?.status, "failed");
  });
});
