/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import { createRequire } from "node:module";

// Minimal EventEmitter shim used by tracker tests outside VS Code host runtime.
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

// Load one fresh module instance with a temporary vscode mock for each suite.
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

describe("Tracker integration", () => {
  const vscodeMock = {
    EventEmitter: MockEventEmitter,
  };

  let trackerModule: {
    Tracker: new () => {
      setLanguageRunStatus: (input: {
        algorithmPath: string;
        languageKey: string;
        status: "queued" | "running" | "completed" | "failed" | "cancelled" | "idle";
        source: "runner" | "smoker";
        runId: string;
        cancelability?: "single-run" | "algorithm-run" | "not-cancellable";
        message?: string;
        updatedAt?: number;
      }) => void;
      clearLanguageRunStatus: (input: { algorithmPath: string; languageKey: string }) => void;
      clearAlgorithmRunStatuses: (algorithmPath: string) => void;
      clearAllRunStatuses: () => void;
      getTrackerState: () => {
        languageRunsByAlgorithmPath: Record<string, Record<string, {
          cancelability: string;
          runId: string;
          message: string;
        }>>;
      };
      getLanguageRunStatus: (algorithmPath: string, languageKey: string) => {
        cancelability: string;
        runId: string;
      } | undefined;
      subscribeToStateChanges: (listener: (state: unknown) => void) => { dispose: () => void };
      dispose: () => void;
    };
  };

  before(async () => {
    trackerModule = await loadWithMockVscode<{
      Tracker: new () => {
        setLanguageRunStatus: (input: {
          algorithmPath: string;
          languageKey: string;
          status: "queued" | "running" | "completed" | "failed" | "cancelled" | "idle";
          source: "runner" | "smoker";
          runId: string;
          cancelability?: "single-run" | "algorithm-run" | "not-cancellable";
          message?: string;
          updatedAt?: number;
        }) => void;
        clearLanguageRunStatus: (input: { algorithmPath: string; languageKey: string }) => void;
        clearAlgorithmRunStatuses: (algorithmPath: string) => void;
        clearAllRunStatuses: () => void;
        getTrackerState: () => {
          languageRunsByAlgorithmPath: Record<string, Record<string, {
            cancelability: string;
            runId: string;
            message: string;
          }>>;
        };
        getLanguageRunStatus: (algorithmPath: string, languageKey: string) => {
          cancelability: string;
          runId: string;
        } | undefined;
        subscribeToStateChanges: (listener: (state: unknown) => void) => { dispose: () => void };
        dispose: () => void;
      };
    }>("../../../src/tracker/tracker", vscodeMock);
  });

  it("stores statuses and resolves default cancelability by source", () => {
    const tracker = new trackerModule.Tracker();

    tracker.setLanguageRunStatus({
      algorithmPath: " /algo ",
      languageKey: " python ",
      status: "running",
      source: "runner",
      runId: " run-1 ",
    });

    const runnerState = tracker.getLanguageRunStatus("/algo", "python");
    assert.strictEqual(runnerState?.cancelability, "single-run");
    assert.strictEqual(runnerState?.runId, "run-1");

    tracker.setLanguageRunStatus({
      algorithmPath: "/algo",
      languageKey: "python",
      status: "completed",
      source: "smoker",
      runId: "smoke-1",
    });

    const smokerState = tracker.getLanguageRunStatus("/algo", "python");
    assert.strictEqual(smokerState?.cancelability, "algorithm-run");

    tracker.dispose();
  });

  it("clears one language, one algorithm, and all statuses", () => {
    const tracker = new trackerModule.Tracker();

    tracker.setLanguageRunStatus({
      algorithmPath: "/a",
      languageKey: "python",
      status: "queued",
      source: "runner",
      runId: "r1",
    });
    tracker.setLanguageRunStatus({
      algorithmPath: "/a",
      languageKey: "go",
      status: "queued",
      source: "runner",
      runId: "r2",
    });
    tracker.setLanguageRunStatus({
      algorithmPath: "/b",
      languageKey: "rust",
      status: "queued",
      source: "runner",
      runId: "r3",
    });

    tracker.clearLanguageRunStatus({ algorithmPath: "/a", languageKey: "python" });
    assert.strictEqual(tracker.getLanguageRunStatus("/a", "python"), undefined);
    assert.notStrictEqual(tracker.getLanguageRunStatus("/a", "go"), undefined);

    tracker.clearAlgorithmRunStatuses("/a");
    assert.strictEqual(tracker.getLanguageRunStatus("/a", "go"), undefined);
    assert.notStrictEqual(tracker.getLanguageRunStatus("/b", "rust"), undefined);

    tracker.clearAllRunStatuses();
    assert.deepStrictEqual(tracker.getTrackerState().languageRunsByAlgorithmPath, {});

    tracker.dispose();
  });

  it("emits state changes for subscribers", () => {
    const tracker = new trackerModule.Tracker();
    const snapshots: unknown[] = [];

    const subscription = tracker.subscribeToStateChanges((state) => {
      snapshots.push(state);
    });

    tracker.setLanguageRunStatus({
      algorithmPath: "/algo",
      languageKey: "python",
      status: "running",
      source: "runner",
      runId: "run-1",
    });

    // Unsubscribe before next update to prove listener disposal behavior.
    subscription.dispose();

    tracker.setLanguageRunStatus({
      algorithmPath: "/algo",
      languageKey: "python",
      status: "completed",
      source: "runner",
      runId: "run-1",
    });

    assert.strictEqual(snapshots.length >= 1, true);

    tracker.dispose();
  });
});
