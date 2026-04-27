import * as assert from "assert";

import {
  createRunRegistry,
} from "../../../src/conductor/internal/runRegistry";
import type { ConductorRunTargetRef } from "../../../src/conductor/IConductor";

describe("conductor/internal — createRunRegistry", () => {
  const fileTarget: ConductorRunTargetRef = {
    nodeKind: "file",
    filePath: "/repo/src/algo/solution.py",
  };

  it("buildRunLifecycle — start + markCompleted round-trip", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const lifecycle = registry.buildRunLifecycle();

    const snapshot = lifecycle.start(fileTarget, "test:owner", "launch");
    assert.strictEqual(snapshot.status, "starting");
    assert.ok(snapshot.runId.startsWith("conductor:test:owner:"));

    lifecycle.markRunning(fileTarget, "running now", snapshot.runId);
    const running = registry.getRunForTarget(fileTarget);
    assert.ok(running !== null);
    assert.strictEqual(running.status, "running");

    lifecycle.markCompleted(fileTarget, "done", snapshot.runId);
    const completed = registry.getRunForTarget(fileTarget);
    assert.ok(completed !== null);
    assert.strictEqual(completed.status, "completed");
    assert.strictEqual(completed.errorMessage, null);
  });

  it("buildRunLifecycle — markFailed records errorMessage", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const lifecycle = registry.buildRunLifecycle();

    lifecycle.start(fileTarget, "test:owner", null);
    lifecycle.markFailed(fileTarget, "something went wrong");

    const failed = registry.getRunForTarget(fileTarget);
    assert.ok(failed !== null);
    assert.strictEqual(failed.status, "failed");
    assert.strictEqual(failed.errorMessage, "something went wrong");
  });

  it("buildRunLifecycle — stale run id guard prevents overwriting newer run", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const lifecycle = registry.buildRunLifecycle();

    const first = lifecycle.start(fileTarget, "first", "first launch");
    const second = lifecycle.start(fileTarget, "second", "second launch");

    // Try to complete first run while second is active — should be a no-op
    lifecycle.markCompleted(fileTarget, "first done", first.runId);

    const current = registry.getRunForTarget(fileTarget);
    assert.ok(current !== null);
    assert.strictEqual(current.runId, second.runId);
    assert.strictEqual(current.status, "starting");
  });

  it("buildRunLifecycle — markCancelled sets status to cancelled", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const lifecycle = registry.buildRunLifecycle();

    const snapshot = lifecycle.start(fileTarget, "smoke:algo", "starting");
    lifecycle.markCancelled(fileTarget, "stopped by user", snapshot.runId);

    const current = registry.getRunForTarget(fileTarget);
    assert.ok(current !== null);
    assert.strictEqual(current.status, "cancelled");
    assert.strictEqual(current.message, "stopped by user");
  });

  it("clearRunResults — clears completed run and notifies subscribers", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const lifecycle = registry.buildRunLifecycle();
    const changes: Array<typeof fileTarget> = [];

    registry.subscribeRunTargetStatus((change) => {
      changes.push(change.target);
    });

    lifecycle.start(fileTarget, "owner", null);
    lifecycle.markCompleted(fileTarget, "done", undefined);
    changes.length = 0;

    const cleared = registry.clearRunResults(fileTarget);
    assert.strictEqual(cleared, true);
    assert.strictEqual(registry.getRunForTarget(fileTarget), null);
    assert.strictEqual(changes.length, 1);
  });

  it("clearRunResults — does not clear an active run", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const lifecycle = registry.buildRunLifecycle();

    lifecycle.start(fileTarget, "owner", null);
    lifecycle.markRunning(fileTarget, "in progress", undefined);

    const cleared = registry.clearRunResults(fileTarget);
    assert.strictEqual(cleared, false);
    assert.ok(registry.getRunForTarget(fileTarget) !== null);
  });

  it("subscribeRunTargetStatus — fires on every lifecycle transition", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const lifecycle = registry.buildRunLifecycle();
    const statuses: string[] = [];

    const sub = registry.subscribeRunTargetStatus((change) => {
      statuses.push(change.snapshot.status);
    });

    const snap = lifecycle.start(fileTarget, "owner", null);
    lifecycle.markRunning(fileTarget, null, snap.runId);
    lifecycle.markCompleted(fileTarget, null, snap.runId);

    sub.dispose();

    lifecycle.start(fileTarget, "owner2", null);
    // After disposing, no further events should appear
    assert.deepStrictEqual(statuses, ["starting", "running", "completed"]);
  });

  it("startRun / markProgress / markCompleted via run id path", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });

    const snap = registry.startRun({ ownerKey: "ext", reason: "external" });
    assert.strictEqual(snap.status, "starting");

    const progressed = registry.markProgress({
      runId: snap.runId,
      message: "step 1",
      progressPercent: 50,
      stepKey: "step-1",
    });
    assert.ok(progressed !== null);
    assert.strictEqual(progressed.status, "running");
    assert.strictEqual(progressed.progressPercent, 50);

    const completed = registry.markCompleted({ runId: snap.runId, message: "ext done" });
    assert.ok(completed !== null);
    assert.strictEqual(completed.status, "completed");

    assert.ok(registry.getRun(snap.runId) !== null);
  });

  it("markFailed via run id sets errorMessage", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const snap = registry.startRun({ ownerKey: "ext2", reason: null });

    const failed = registry.markFailed({ runId: snap.runId, errorMessage: "crash", message: "crash msg" });
    assert.ok(failed !== null);
    assert.strictEqual(failed.status, "failed");
    assert.strictEqual(failed.errorMessage, "crash");
  });

  it("cancelRun via run id sets status to cancelled", () => {
    const registry = createRunRegistry({ runStatusRetentionMs: 0 });
    const snap = registry.startRun({ ownerKey: "ext3", reason: null });

    const cancelled = registry.cancelRun({ runId: snap.runId, message: "user cancelled" });
    assert.ok(cancelled !== null);
    assert.strictEqual(cancelled.status, "cancelled");
  });
});
