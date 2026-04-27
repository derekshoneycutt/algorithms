import * as assert from "assert";

import { createSmokeRegistry } from "../../../src/conductor/internal/smokeRegistry";
import type { ActiveSmokeExecution } from "../../../src/conductor/internal/smokeRegistry";
import type { CommandLineResult } from "../../../src/commandline";
import { createHostStateService } from "../../../src/state";

describe("conductor/internal — createSmokeRegistry smoke retention lifecycle", () => {
  it("clearNow returns false when no run is tracked", () => {
    const registry = createSmokeRegistry({ smokeStatusRetentionMs: 0 });
    const lifecycle = registry.getSmokeStatusRetentionLifecycle();
    const hostState = createHostStateService();

    try {
      const cleared = lifecycle.clearNow("/repo/src/algo", hostState, () => {});
      assert.strictEqual(cleared, false);
    } finally {
      hostState.dispose();
    }
  });

  it("clearNow removes tracked run and sends SMOKE_RUN_STATUS_CLEARED", () => {
    const registry = createSmokeRegistry({ smokeStatusRetentionMs: 60_000 });
    const lifecycle = registry.getSmokeStatusRetentionLifecycle();
    const hostState = createHostStateService();
    const sentEvents: string[] = [];

    const originalSend = hostState.send.bind(hostState);
    hostState.send = (event) => {
      sentEvents.push(event.type);
      return originalSend(event);
    };

    try {
      lifecycle.markStarted("/repo/src/algo", "run-1");
      const cleared = lifecycle.clearNow("/repo/src/algo", hostState, () => {});

      assert.strictEqual(cleared, true);
      assert.ok(sentEvents.includes("SMOKE_RUN_STATUS_CLEARED"));

      // Double-clear should return false
      const doubleClear = lifecycle.clearNow("/repo/src/algo", hostState, () => {});
      assert.strictEqual(doubleClear, false);
    } finally {
      hostState.dispose();
    }
  });

  it("clearSmokeResults returns false while active smoke execution is running", () => {
    const registry = createSmokeRegistry({ smokeStatusRetentionMs: 0 });
    const active = registry.getActiveSmokeExecutionByAlgorithm();
    const hostState = createHostStateService();

    try {
      // Simulate an active run by injecting a stub
      active.set("/repo/src/algo", {
        algorithmPath: "/repo/src/algo",
        handle: {
          kill: () => ({ ok: true }),
        } as unknown as never,
        result: new Promise(() => {}),
        runId: "run-1",
        stopRequested: false,
        target: { nodeKind: "algorithmDir", filePath: "/repo/src/algo" },
      });

      const cleared = registry.clearSmokeResults({
        algorithmPath: "/repo/src/algo",
        hostState,
        refreshAlgorithmsTree: () => {},
      });

      assert.strictEqual(cleared, false);
    } finally {
      active.clear();
      hostState.dispose();
    }
  });

  it("stopSmokeTest returns false when no active execution exists", async () => {
    const registry = createSmokeRegistry({ smokeStatusRetentionMs: 0 });

    const stopped = await registry.stopSmokeTest({ algorithmPath: "/repo/src/algo" });
    assert.strictEqual(stopped, false);
  });

  it("stopSmokeTest sets stopRequested flag and awaits result", async () => {
    const registry = createSmokeRegistry({ smokeStatusRetentionMs: 0 });
    const active = registry.getActiveSmokeExecutionByAlgorithm();

    let killCalled = false;
    let resolveResult!: (result: CommandLineResult) => void;
    const resultPromise = new Promise<CommandLineResult>((resolve) => {
      resolveResult = resolve;
    });

    const stub: ActiveSmokeExecution = {
      algorithmPath: "/repo/src/algo",
      handle: {
        isRunning: () => true,
        kill: (signal?: NodeJS.Signals | number) => {
          killCalled = true;
          assert.strictEqual(signal, "SIGTERM");
          return { ok: true, reason: null };
        },
        pid: 42,
      },
      result: resultPromise,
      runId: "run-1",
      stopRequested: false,
      target: { nodeKind: "algorithmDir", filePath: "/repo/src/algo" },
    };
    active.set("/repo/src/algo", stub);

    const stopPromise = registry.stopSmokeTest({ algorithmPath: "/repo/src/algo" });
    resolveResult({
      ok: true,
      exitCode: 0,
      stdout: "",
      stderr: "",
      combinedOutput: "",
      reason: null,
      errorMessage: null,
    });

    const stopped = await stopPromise;
    assert.strictEqual(stopped, true);
    assert.strictEqual(killCalled, true);
    assert.strictEqual(stub.stopRequested, true);
  });
});
