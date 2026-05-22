/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import { createRequire } from "node:module";

class MockEventEmitter<T> {
  private listeners: Array<(value: T) => void> = [];

  public event = (listener: (value: T) => void): { dispose: () => void } => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        this.listeners = this.listeners.filter((candidate) => candidate !== listener);
      },
    };
  };

  public fire(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  public dispose(): void {
    this.listeners = [];
  }
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

describe("Tracker edge/unit", () => {
  const vscodeMock = {
    EventEmitter: MockEventEmitter,
  };

  let trackerModule: {
    Tracker: new () => {
      patchTrackerState: (patch: { languageRunsByAlgorithmPath?: Record<string, unknown> }) => void;
      setLanguageRunStatus: (input: {
        algorithmPath: string;
        languageKey: string;
        status: "queued" | "running" | "completed" | "failed" | "cancelled" | "idle";
        source: "runner" | "smoker";
        runId: string;
      }) => void;
      clearLanguageRunStatus: (input: { algorithmPath: string; languageKey: string }) => void;
      clearAlgorithmRunStatuses: (algorithmPath: string) => void;
      getTrackerState: () => { languageRunsByAlgorithmPath: Record<string, unknown> };
      getLanguageRunStatus: (algorithmPath: string, languageKey: string) => { status: string; message: string } | undefined;
      dispose: () => void;
    };
  };

  before(async () => {
    trackerModule = await loadWithMockVscode<{
      Tracker: new () => {
        patchTrackerState: (patch: { languageRunsByAlgorithmPath?: Record<string, unknown> }) => void;
        setLanguageRunStatus: (input: {
          algorithmPath: string;
          languageKey: string;
          status: "queued" | "running" | "completed" | "failed" | "cancelled" | "idle";
          source: "runner" | "smoker";
          runId: string;
        }) => void;
        clearLanguageRunStatus: (input: { algorithmPath: string; languageKey: string }) => void;
        clearAlgorithmRunStatuses: (algorithmPath: string) => void;
        getTrackerState: () => { languageRunsByAlgorithmPath: Record<string, unknown> };
        getLanguageRunStatus: (algorithmPath: string, languageKey: string) => { status: string; message: string } | undefined;
        dispose: () => void;
      };
    }>("../../../src/tracker/tracker", vscodeMock);
  });

  it("ignores invalid status identifiers when upserting", () => {
    const tracker = new trackerModule.Tracker();

    tracker.setLanguageRunStatus({
      algorithmPath: "   ",
      languageKey: "python",
      status: "running",
      source: "runner",
      runId: "run-1",
    });
    tracker.setLanguageRunStatus({
      algorithmPath: "/algo",
      languageKey: "   ",
      status: "running",
      source: "runner",
      runId: "run-1",
    });
    tracker.setLanguageRunStatus({
      algorithmPath: "/algo",
      languageKey: "python",
      status: "running",
      source: "runner",
      runId: "   ",
    });

    assert.deepStrictEqual(tracker.getTrackerState().languageRunsByAlgorithmPath, {});
    tracker.dispose();
  });

  it("treats invalid clear requests as no-ops", () => {
    const tracker = new trackerModule.Tracker();

    tracker.setLanguageRunStatus({
      algorithmPath: "/algo",
      languageKey: "python",
      status: "running",
      source: "runner",
      runId: "run-1",
    });

    tracker.clearLanguageRunStatus({ algorithmPath: "   ", languageKey: "python" });
    tracker.clearLanguageRunStatus({ algorithmPath: "/algo", languageKey: "   " });
    tracker.clearAlgorithmRunStatuses("   ");

    assert.strictEqual(tracker.getLanguageRunStatus("/algo", "python") !== undefined, true);
    tracker.dispose();
  });

  it("patchTrackerState merges partial tracker state updates", () => {
    const tracker = new trackerModule.Tracker();

    tracker.patchTrackerState({
      languageRunsByAlgorithmPath: {
        "/algo": {
          python: {
            algorithmPath: "/algo",
            languageKey: "python",
            status: "completed",
            source: "runner",
            cancelability: "single-run",
            runId: "run-1",
            message: "done",
            updatedAt: 123,
          },
        },
      },
    });

    assert.strictEqual(tracker.getLanguageRunStatus("/algo", "python")?.status, "completed");
    assert.strictEqual(tracker.getLanguageRunStatus("/algo", "python")?.message, "done");
    tracker.dispose();
  });
});
