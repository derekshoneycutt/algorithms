import * as assert from "node:assert/strict";

import { createHostStateService } from "../../src/state/service";
import { buildBootstrapStatusMessage } from "../../src/commands/showBootstrapStatus";

describe("state — createHostStateService", () => {
  it("returns a ready initial snapshot before any send call", () => {
    const service = createHostStateService();

    try {
      const snapshot = service.getSnapshot();

      assert.equal(snapshot.stateValue, "ready");
      assert.equal(snapshot.lastCommandId, null);
      assert.equal(snapshot.lastResult, null);
      assert.equal(snapshot.lastFailure, null);
    } finally {
      service.dispose();
    }
  });

  it("starts the machine lazily and transitions to running on COMMAND_REQUESTED", () => {
    const service = createHostStateService();

    try {
      service.send({ type: "COMMAND_REQUESTED", commandId: "test.command" });
      const snapshot = service.getSnapshot();

      assert.equal(snapshot.stateValue, "running");
      assert.equal(snapshot.lastCommandId, "test.command");
    } finally {
      service.dispose();
    }
  });

  it("transitions back to ready with result on COMMAND_SUCCEEDED", () => {
    const service = createHostStateService();

    try {
      service.send({ type: "COMMAND_REQUESTED", commandId: "test.command" });
      service.send({ type: "COMMAND_SUCCEEDED", result: "ok" });
      const snapshot = service.getSnapshot();

      assert.equal(snapshot.stateValue, "ready");
      assert.equal(snapshot.lastResult, "ok");
      assert.equal(snapshot.lastFailure, null);
    } finally {
      service.dispose();
    }
  });

  it("transitions back to ready with failure on COMMAND_FAILED", () => {
    const service = createHostStateService();

    try {
      service.send({ type: "COMMAND_REQUESTED", commandId: "test.command" });
      service.send({ type: "COMMAND_FAILED", error: "something went wrong" });
      const snapshot = service.getSnapshot();

      assert.equal(snapshot.stateValue, "ready");
      assert.equal(snapshot.lastFailure, "something went wrong");
    } finally {
      service.dispose();
    }
  });

  it("clears lastFailure on the next COMMAND_SUCCEEDED", () => {
    const service = createHostStateService();

    try {
      service.send({ type: "COMMAND_REQUESTED", commandId: "cmd.a" });
      service.send({ type: "COMMAND_FAILED", error: "first error" });
      service.send({ type: "COMMAND_REQUESTED", commandId: "cmd.b" });
      service.send({ type: "COMMAND_SUCCEEDED", result: "recovered" });
      const snapshot = service.getSnapshot();

      assert.equal(snapshot.lastFailure, null);
      assert.equal(snapshot.lastResult, "recovered");
    } finally {
      service.dispose();
    }
  });

  it("transitions to stopped on SHUTDOWN and preserves final snapshot", () => {
    const service = createHostStateService();

    try {
      service.send({ type: "SHUTDOWN" });
      const snapshot = service.getSnapshot();

      assert.equal(snapshot.stateValue, "stopped");
    } finally {
      service.dispose();
    }
  });

  it("dispose does not throw before the machine has been started", () => {
    const service = createHostStateService();

    assert.doesNotThrow(() => {
      service.dispose();
    });
  });
});

describe("state — buildBootstrapStatusMessage", () => {
  const config = {
    extensionDisplayName: "Test Extension",
    extensionVersion: "1.2.3",
  };

  it("returns base message when no command has run yet", () => {
    const message = buildBootstrapStatusMessage(config, {
      stateValue: "ready",
      lastCommandId: null,
      lastResult: null,
      lastFailure: null,
    });

    assert.match(message, /Test Extension/);
    assert.match(message, /v1\.2\.3/);
    assert.match(message, /bootstrap is active/i);
  });

  it("includes the last command ID when one is recorded", () => {
    const message = buildBootstrapStatusMessage(config, {
      stateValue: "running",
      lastCommandId: "algos.showBootstrapStatus",
      lastResult: null,
      lastFailure: null,
    });

    assert.match(message, /algos\.showBootstrapStatus/);
  });
});
