import * as assert from "assert";

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
});
