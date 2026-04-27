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
      assert.equal(snapshot.smokeControls.markdownPath, "");
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

  it("returns default run controls in the initial snapshot", () => {
    const service = createHostStateService();

    try {
      const snapshot = service.getSnapshot();

      assert.equal(snapshot.runControls.runArgsEnabled, false);
      assert.equal(snapshot.runControls.runArgsText, "");
      assert.equal(snapshot.runControls.runArgsStatusText, "Arguments Disabled");
      assert.equal(snapshot.runControls.sourceProfileEnabled, false);
      assert.equal(snapshot.runControls.runChecksMode, "none");
      assert.equal(snapshot.runControls.runChecksRoute, "native");
      assert.equal(snapshot.runControls.cleanStdlibEnabled, true);
      assert.equal(snapshot.runControls.cleanArchivesEnabled, true);
    } finally {
      service.dispose();
    }
  });

  it("persists run controls updates in ready state", () => {
    const service = createHostStateService();

    try {
      service.send({ type: "RUN_ARGS_ENABLED_SET", enabled: true });
      service.send({ type: "RUN_ARGS_TEXT_SET", text: "--foo \"two words\"" });
      service.send({ type: "RUN_ARGS_STATUS_SET", statusText: "2 Arguments", statusClassName: "status-ok" });
      service.send({ type: "RUN_SOURCE_PROFILE_ENABLED_SET", enabled: true });
      service.send({ type: "RUN_SOURCE_PROFILE_TEXT_SET", text: "/etc/profile.custom" });
      service.send({
        type: "RUN_SOURCE_PROFILE_STATUS_SET",
        statusText: "Source Profile Enabled",
        statusClassName: "status-ok",
      });
      service.send({ type: "RUN_CHECKS_MODE_SET", mode: "check-only" });
      service.send({ type: "RUN_CHECKS_ROUTE_SET", route: "docker" });
      service.send({
        type: "RUN_CHECKS_STATUS_SET",
        statusText: "Check Only (docker) Enabled",
        statusClassName: "status-ok",
      });
      service.send({ type: "RUN_CLEAN_STDLIB_ENABLED_SET", enabled: false });
      service.send({ type: "RUN_CLEAN_ARCHIVES_ENABLED_SET", enabled: true });
      service.send({
        type: "RUN_CLEAN_OPTIONS_STATUS_SET",
        statusText: "Defaults: n|y (stdlib|archive)",
        statusClassName: "status-muted",
      });

      const snapshot = service.getSnapshot();

      assert.equal(snapshot.runControls.runArgsEnabled, true);
      assert.equal(snapshot.runControls.runArgsText, "--foo \"two words\"");
      assert.equal(snapshot.runControls.runArgsStatusText, "2 Arguments");
      assert.equal(snapshot.runControls.runArgsStatusClassName, "status-ok");
      assert.equal(snapshot.runControls.sourceProfileEnabled, true);
      assert.equal(snapshot.runControls.sourceProfileText, "/etc/profile.custom");
      assert.equal(snapshot.runControls.sourceProfileStatusText, "Source Profile Enabled");
      assert.equal(snapshot.runControls.runChecksMode, "check-only");
      assert.equal(snapshot.runControls.runChecksRoute, "docker");
      assert.equal(snapshot.runControls.runChecksStatusText, "Check Only (docker) Enabled");
      assert.equal(snapshot.runControls.cleanStdlibEnabled, false);
      assert.equal(snapshot.runControls.cleanArchivesEnabled, true);
      assert.equal(
        snapshot.runControls.cleanOptionsStatusText,
        "Defaults: n|y (stdlib|archive)"
      );
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
    markdownPath: "",
    timeoutSeconds: "8m",
    slowTimeoutSeconds: "20m",
    reportStatusText: "No report generated.",
    reportStatusClassName: "status-muted" as const,
    smokeStatusText: "All languages selected (omit --langs)",
    smokeStatusClassName: "status-muted" as const,
    languages: [],
    statusLabel: "ready",
  };
  const runControls = {
    runArgsEnabled: false,
    runArgsText: "",
    runArgsStatusText: "Arguments Disabled",
    runArgsStatusClassName: "status-muted" as const,
    sourceProfileEnabled: false,
    sourceProfileText: "",
    sourceProfileStatusText: "Source Profile Unchecked",
    sourceProfileStatusClassName: "status-muted" as const,
    runChecksMode: "none" as const,
    runChecksRoute: "native" as const,
    runChecksStatusText: "No Run Check Override",
    runChecksStatusClassName: "status-muted" as const,
    cleanStdlibEnabled: true,
    cleanArchivesEnabled: true,
    cleanOptionsStatusText: "Defaults: y|y (stdlib|archive)",
    cleanOptionsStatusClassName: "status-muted" as const,
  };
  const environmentControls = {
    profilePath: "",
    profilePlaceholder: "",
    effectiveProfilePath: "",
    copyIconsPath: "",
    checkEnvStatusText: "",
    checkEnvStatusClassName: "status-muted" as const,
    checkEnvFilteredOutput: "",
    checkEnvRawOutput: "",
    copyIconsStatusText: "",
    copyIconsStatusClassName: "status-muted" as const,
    routingDockerMapText: "",
    routingSshMapText: "",
    routingStatusText: "",
    routingStatusClassName: "status-muted" as const,
    variables: [],
  };

  it("returns base message when no command has run yet", () => {
    const message = buildBootstrapStatusMessage(config, {
      stateValue: "ready",
      lastCommandId: null,
      lastResult: null,
      lastFailure: null,
      smokeControls,
      smokeRunStatusByAlgorithm: {},
      activeSmokeRunAlgorithmPath: null,
      runControls,
      environmentControls,
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
      smokeRunStatusByAlgorithm: {},
      activeSmokeRunAlgorithmPath: null,
      runControls,
      environmentControls,
    });

    assert.match(message, /algos\.showBootstrapStatus/);
  });
});
