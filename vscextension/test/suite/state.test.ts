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
      assert.equal(snapshot.smokeControls.reportEnabled, false);
      assert.equal(snapshot.smokeControls.markdownPath, "output/smoke-report.md");
      assert.equal(snapshot.smokeControls.languages.length > 0, true);
    } finally {
      service.dispose();
    }
  });

  it("supports injected initial smoke languages", () => {
    const service = createHostStateService({
      initialSmokeControls: {
        languages: [
          {
            languageKey: "ada",
            label: "Ada",
            selected: true,
            disabled: false,
            disabledReason: "",
          },
          {
            languageKey: "julia",
            label: "Julia",
            selected: false,
            disabled: true,
            disabledReason: "Not runnable on this platform/architecture.",
          },
        ],
      },
    });

    try {
      const snapshot = service.getSnapshot();

      assert.equal(snapshot.smokeControls.languages.length, 2);
      assert.equal(snapshot.smokeControls.languages[0].languageKey, "ada");
      assert.equal(snapshot.smokeControls.languages[0].selected, true);
      assert.equal(snapshot.smokeControls.languages[0].disabled, false);
      assert.equal(snapshot.smokeControls.languages[1].languageKey, "julia");
      assert.equal(snapshot.smokeControls.languages[1].selected, false);
      assert.equal(snapshot.smokeControls.languages[1].disabled, true);
    } finally {
      service.dispose();
    }
  });

  it("persists smoke settings updates in ready state", () => {
    const service = createHostStateService();

    try {
      service.send({ type: "SMOKE_REPORT_ENABLED_SET", enabled: true });
      service.send({ type: "SMOKE_MARKDOWN_PATH_SET", path: "output/custom.md" });
      service.send({ type: "SMOKE_TIMEOUT_SECONDS_SET", seconds: "45" });
      service.send({ type: "SMOKE_SLOW_TIMEOUT_SECONDS_SET", seconds: "8" });
      service.send({ type: "SMOKE_STATUS_LABEL_SET", statusLabel: "configured" });

      const snapshot = service.getSnapshot();

      assert.equal(snapshot.smokeControls.reportEnabled, true);
      assert.equal(snapshot.smokeControls.markdownPath, "output/custom.md");
      assert.equal(snapshot.smokeControls.timeoutSeconds, "45");
      assert.equal(snapshot.smokeControls.slowTimeoutSeconds, "8");
      assert.equal(snapshot.smokeControls.statusLabel, "configured");
      assert.equal(snapshot.smokeControls.reportStatusClassName, "status-muted");
    } finally {
      service.dispose();
    }
  });

  it("selects and deselects all languages", () => {
    const service = createHostStateService();

    try {
      service.send({ type: "SMOKE_ALL_LANGUAGES_DESELECTED" });
      let snapshot = service.getSnapshot();
      assert.equal(
        snapshot.smokeControls.languages.every((language) => !language.selected),
        true
      );

      service.send({ type: "SMOKE_ALL_LANGUAGES_SELECTED" });
      snapshot = service.getSnapshot();
      assert.equal(
        snapshot.smokeControls.languages.every((language) => language.selected),
        true
      );
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
  const smokeControls = {
    reportEnabled: false,
    markdownPath: "output/smoke-report.md",
    timeoutSeconds: "30",
    slowTimeoutSeconds: "5",
    reportStatusText: "No report generated.",
    reportStatusClassName: "status-muted" as const,
    smokeStatusText: "All languages selected (omit --langs)",
    smokeStatusClassName: "status-muted" as const,
    languages: [],
    statusLabel: "ready",
  };

  it("returns base message when no command has run yet", () => {
    const message = buildBootstrapStatusMessage(config, {
      stateValue: "ready",
      lastCommandId: null,
      lastResult: null,
      lastFailure: null,
      smokeControls,
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
      smokeControls,
    });

    assert.match(message, /algos\.showBootstrapStatus/);
  });
});
