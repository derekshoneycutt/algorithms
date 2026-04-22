const assert = require("assert");
const {
  buildRunCommand,
  renderShellCommand,
  quoteShellToken,
} = require("../src/runtime/commandline/core/commandLineCore");
const {
  createRunCommandAdapter,
  runCommand,
} = require("../src/runtime/commandline/adapters/runCommandAdapter");

/**
 * Creates one base execution input payload used by adapter tests.
 *
 * @returns {{vscodeApi: object, contextResolution: {algorithmDir: string, scriptPath: string, displayScriptPath: string}, execution: {commandFamily: string, args: string[], commandLabel: string, successMessage: string, includeSidebarRunArgs: boolean, includeSidebarSourceProfile: boolean, includeSidebarRunChecks: boolean}}} Adapter execution input.
 */
function createExecutionInput() {
  return {
    vscodeApi: {},
    contextResolution: {
      algorithmDir: "/repo/src/numeric/euclidgcd",
      scriptPath: "/repo/run.sh",
      displayScriptPath: "../../../run.sh",
    },
    execution: {
      commandFamily: "run-file",
      args: ["euclidgcd.bas"],
      commandLabel: "Run File",
      successMessage: "Run File started in Algorithms Runner.",
      includeSidebarRunArgs: true,
      includeSidebarSourceProfile: true,
      includeSidebarRunChecks: true,
    },
  };
}

/**
 * Creates a mock runtime lifecycle object that records calls.
 *
 * @returns {{runtimeProcessLifecycle: {beginRun: Function, markCompleted: Function, markFailed: Function}, beginCalls: object[], completedCalls: object[], failedCalls: object[]}} Mock lifecycle and call records.
 */
function createMockRuntimeLifecycle() {
  const beginCalls = [];
  const completedCalls = [];
  const failedCalls = [];

  return {
    runtimeProcessLifecycle: {
      beginRun(input) {
        beginCalls.push(input);
        return {
          ok: true,
          ownerKey: String(input.ownerKey || ""),
          processId: "run-process-id",
          runToken: 1,
        };
      },
      markCompleted(input) {
        completedCalls.push(input);
        return true;
      },
      markFailed(input) {
        failedCalls.push(input);
        return true;
      },
    },
    beginCalls,
    completedCalls,
    failedCalls,
  };
}

/**
 * Verifies invalid source tokens are blocked through validation callback.
 *
 * @returns {void}
 */
function testExecuteContextCommandBlocksOnInvalidSource() {
  let blockCalled = false;
  const lifecycle = createMockRuntimeLifecycle();

  const adapter = createRunCommandAdapter({
    runtimeProcessLifecycle: lifecycle.runtimeProcessLifecycle,
    buildRunCommand() {
      throw new Error("buildRunCommand must not be called");
    },
    runCommand() {
      throw new Error("runCommand must not be called");
    },
    getEffectiveSidebarRunArgs() {
      return { ok: false, reason: "Run args parse failed." };
    },
    getEffectiveSidebarSourceProfile() {
      return { ok: true, tokens: ["--source-profile=/tmp/.profile"] };
    },
    getEffectiveSidebarRunChecks() {
      return { ok: true, tokens: ["--run-checks"] };
    },
    blockWithValidation(_vscodeApi, validation, commandLabel) {
      blockCalled = true;
      assert.strictEqual(commandLabel, "Run File");
      assert.strictEqual(validation.reason, "invalid-sidebar-run-args");
      return {
        ok: false,
        status: "blocked",
        reason: validation.reason,
      };
    },
    showNotificationBySeverity() {
      throw new Error("showNotificationBySeverity must not be called");
    },
    buildBuildFailureMessage() {
      return "";
    },
    buildRuntimeFailureMessage() {
      return "";
    },
    buildSuccessMessage() {
      return "";
    },
  });

  const result = adapter.executeContextCommand(createExecutionInput());

  assert.strictEqual(blockCalled, true);
  assert.deepStrictEqual(result, {
    ok: false,
    status: "blocked",
    reason: "invalid-sidebar-run-args",
  });
  assert.strictEqual(lifecycle.beginCalls.length, 1);
  assert.strictEqual(lifecycle.beginCalls[0].ownerKey, "run:run-file:/repo/src/numeric/euclidgcd");
  assert.strictEqual(lifecycle.completedCalls.length, 0);
  assert.strictEqual(lifecycle.failedCalls.length, 1);
  assert.strictEqual(lifecycle.failedCalls[0].reason, "invalid-sidebar-run-args");
}

/**
 * Verifies build failures emit error notification and blocked status.
 *
 * @returns {void}
 */
function testExecuteContextCommandBuildFailure() {
  const notifications = [];
  const lifecycle = createMockRuntimeLifecycle();

  const adapter = createRunCommandAdapter({
    runtimeProcessLifecycle: lifecycle.runtimeProcessLifecycle,
    buildRunCommand() {
      return {
        ok: false,
        reason: "invalid-script-path",
      };
    },
    runCommand() {
      throw new Error("runCommand must not be called");
    },
    getEffectiveSidebarRunArgs() {
      return { ok: true, tokens: [] };
    },
    getEffectiveSidebarSourceProfile() {
      return { ok: true, tokens: [] };
    },
    getEffectiveSidebarRunChecks() {
      return { ok: true, tokens: [] };
    },
    blockWithValidation() {
      throw new Error("blockWithValidation must not be called");
    },
    showNotificationBySeverity(_vscodeApi, severity, message) {
      notifications.push({ severity, message });
    },
    buildBuildFailureMessage(commandLabel, reason) {
      return `${commandLabel}: ${reason}`;
    },
    buildRuntimeFailureMessage() {
      return "";
    },
    buildSuccessMessage() {
      return "";
    },
  });

  const result = adapter.executeContextCommand(createExecutionInput());

  assert.deepStrictEqual(result, {
    ok: false,
    status: "blocked",
    reason: "invalid-script-path",
  });
  assert.deepStrictEqual(notifications, [
    {
      severity: "error",
      message: "Run File: invalid-script-path",
    },
  ]);
  assert.strictEqual(lifecycle.beginCalls.length, 1);
  assert.strictEqual(lifecycle.completedCalls.length, 0);
  assert.strictEqual(lifecycle.failedCalls.length, 1);
  assert.strictEqual(lifecycle.failedCalls[0].reason, "invalid-script-path");
}

/**
 * Verifies runtime failures emit error notification and return runner status.
 *
 * @returns {void}
 */
function testExecuteContextCommandRuntimeFailure() {
  const notifications = [];
  const lifecycle = createMockRuntimeLifecycle();

  const adapter = createRunCommandAdapter({
    runtimeProcessLifecycle: lifecycle.runtimeProcessLifecycle,
    buildRunCommand() {
      return {
        ok: true,
        reason: null,
        commandParts: ["/repo/run.sh", "euclidgcd.bas"],
        displayCommand: "../../../run.sh euclidgcd.bas",
        cwd: "/repo/src/numeric/euclidgcd",
        commandFamily: "run-file",
      };
    },
    runCommand() {
      return {
        ok: false,
        status: "failed",
        reason: "terminal-send-failed",
      };
    },
    getEffectiveSidebarRunArgs() {
      return { ok: true, tokens: [] };
    },
    getEffectiveSidebarSourceProfile() {
      return { ok: true, tokens: [] };
    },
    getEffectiveSidebarRunChecks() {
      return { ok: true, tokens: [] };
    },
    blockWithValidation() {
      throw new Error("blockWithValidation must not be called");
    },
    showNotificationBySeverity(_vscodeApi, severity, message) {
      notifications.push({ severity, message });
    },
    buildBuildFailureMessage() {
      return "";
    },
    buildRuntimeFailureMessage(commandLabel, reason) {
      return `${commandLabel}: ${reason}`;
    },
    buildSuccessMessage() {
      return "";
    },
  });

  const result = adapter.executeContextCommand(createExecutionInput());

  assert.deepStrictEqual(result, {
    ok: false,
    status: "failed",
    reason: "terminal-send-failed",
  });
  assert.deepStrictEqual(notifications, [
    {
      severity: "error",
      message: "Run File: terminal-send-failed",
    },
  ]);
  assert.strictEqual(lifecycle.beginCalls.length, 1);
  assert.strictEqual(lifecycle.completedCalls.length, 0);
  assert.strictEqual(lifecycle.failedCalls.length, 1);
  assert.strictEqual(lifecycle.failedCalls[0].reason, "terminal-send-failed");
}

/**
 * Verifies successful execution emits info notification and started result.
 *
 * @returns {void}
 */
function testExecuteContextCommandSuccess() {
  const notifications = [];
  const lifecycle = createMockRuntimeLifecycle();

  const adapter = createRunCommandAdapter({
    runtimeProcessLifecycle: lifecycle.runtimeProcessLifecycle,
    buildRunCommand(input) {
      assert.deepStrictEqual(input.args, [
        "--source-profile=/tmp/.profile",
        "--run-checks",
        "euclidgcd.bas",
        "--arg",
      ]);

      return {
        ok: true,
        reason: null,
        commandParts: ["/repo/run.sh", ...input.args],
        displayCommand: `../../../run.sh ${input.args.join(" ")}`,
        cwd: input.cwd,
        commandFamily: input.commandFamily,
      };
    },
    runCommand() {
      return {
        ok: true,
        status: "started",
        reason: null,
      };
    },
    getEffectiveSidebarRunArgs() {
      return { ok: true, tokens: ["--arg"] };
    },
    getEffectiveSidebarSourceProfile() {
      return { ok: true, tokens: ["--source-profile=/tmp/.profile"] };
    },
    getEffectiveSidebarRunChecks() {
      return { ok: true, tokens: ["--run-checks"] };
    },
    blockWithValidation() {
      throw new Error("blockWithValidation must not be called");
    },
    showNotificationBySeverity(_vscodeApi, severity, message) {
      notifications.push({ severity, message });
    },
    buildBuildFailureMessage() {
      return "";
    },
    buildRuntimeFailureMessage() {
      return "";
    },
    buildSuccessMessage() {
      return "unused";
    },
  });

  const result = adapter.executeContextCommand(createExecutionInput());

  assert.deepStrictEqual(result, {
    ok: true,
    status: "started",
    reason: null,
  });
  assert.deepStrictEqual(notifications, [
    {
      severity: "info",
      message: "Run File started in Algorithms Runner.",
    },
  ]);
  assert.strictEqual(lifecycle.beginCalls.length, 1);
  assert.strictEqual(lifecycle.failedCalls.length, 0);
  assert.strictEqual(lifecycle.completedCalls.length, 1);
  assert.deepStrictEqual(lifecycle.completedCalls[0], {
    ownerKey: "run:run-file:/repo/src/numeric/euclidgcd",
    processId: "run-process-id",
    runToken: 1,
    exitCode: null,
    signal: null,
    reason: "terminal-fire-and-forget",
  });
}

/**
 * Creates a mock VS Code API terminal surface for runner tests.
 *
 * @returns {{vscodeApi: {window: {createTerminal: (options: {name: string}) => {show: () => void, sendText: (text: string, addNewLine: boolean) => void}}}, recorded: {createdNames: string[], shown: number, sentText: string|null, sentNewLine: boolean|null}} Mock API and recorded calls.
 */
function createMockVscodeApi() {
  const recorded = {
    createdNames: [],
    shown: 0,
    sentText: null,
    sentNewLine: null,
  };

  const terminal = {
    show() {
      recorded.shown += 1;
    },
    sendText(text, addNewLine) {
      recorded.sentText = text;
      recorded.sentNewLine = addNewLine;
    },
  };

  return {
    vscodeApi: {
      window: {
        createTerminal(options) {
          recorded.createdNames.push(String(options?.name || ""));
          return terminal;
        },
      },
    },
    recorded,
  };
}

/**
 * Creates a mock VS Code API that can return different terminals per create call.
 *
 * @param {{show?: () => void, sendText?: (text: string, addNewLine: boolean) => void}[]} terminals Terminals returned in order.
 * @returns {{vscodeApi: {window: {createTerminal: () => {show: () => void, sendText: (text: string, addNewLine: boolean) => void}, onDidCloseTerminal: (callback: (terminal: object) => void) => {dispose: () => void}}}, createdCount: () => number}} Mock API and inspectors.
 */
function createMockVscodeApiWithTerminalSequence(terminals) {
  let created = 0;

  return {
    vscodeApi: {
      window: {
        createTerminal() {
          const terminalIndex = created;
          created += 1;
          const next = terminals[terminalIndex] || terminals[terminals.length - 1];

          return {
            show: next.show || (() => {}),
            sendText(text, addNewLine) {
              if (next.sendText) {
                next.sendText(text, addNewLine);
              }
            },
          };
        },
        onDidCloseTerminal() {
          return {
            dispose() {
              // No-op in tests.
            },
          };
        },
      },
    },
    createdCount() {
      return created;
    },
  };
}

/**
 * Verifies valid build input produces both internal and display command forms.
 *
 * @returns {void}
 */
function testBuildRunCommandSuccess() {
  const result = buildRunCommand({
    scriptPath: "/repo/run.sh",
    displayScriptPath: "../../../run.sh",
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
    args: ["euclidgcd.bas", "27", "36"],
  });

  assert.deepStrictEqual(result, {
    ok: true,
    reason: null,
    commandParts: ["/repo/run.sh", "euclidgcd.bas", "27", "36"],
    displayCommand: "../../../run.sh euclidgcd.bas 27 36",
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
  });
}

/**
 * Verifies non-absolute script paths are rejected.
 *
 * @returns {void}
 */
function testBuildRunCommandRejectsRelativeScriptPath() {
  const result = buildRunCommand({
    scriptPath: "./run.sh",
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "invalid-script-path");
}

/**
 * Verifies invalid argument arrays are rejected.
 *
 * @returns {void}
 */
function testBuildRunCommandRejectsInvalidArgs() {
  const result = buildRunCommand({
    scriptPath: "/repo/run.sh",
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
    args: ["ok", 42],
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "invalid-args");
}

/**
 * Verifies non-string display script paths are rejected.
 *
 * @returns {void}
 */
function testBuildRunCommandRejectsEmptyDisplayScriptPath() {
  const result = buildRunCommand({
    scriptPath: "/repo/run.sh",
    displayScriptPath: {},
    cwd: "/repo/src/numeric/euclidgcd",
    commandFamily: "run-file",
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, "invalid-display-script-path");
}

/**
 * Verifies runCommand executes using quoted command parts and not display text.
 *
 * @returns {void}
 */
function testRunCommandUsesQuotedCommandParts() {
  const mock = createMockVscodeApi();
  const build = {
    ok: true,
    reason: null,
    commandParts: [
      "/tmp/run.sh",
      "--name=hello world",
      "semi;colon",
      "single'quote",
      "dollar$(uname)",
    ],
    displayCommand: "/tmp/run.sh $(echo not-safe)",
    cwd: "/tmp/work space",
    commandFamily: "run-active-file",
  };

  const result = runCommand({
    build,
    vscodeApi: mock.vscodeApi,
    reuseTerminal: false,
    logger() {
      // Suppress test logging.
    },
    now() {
      return 1;
    },
  });

  const expectedCommandText = renderShellCommand(build.commandParts);
  const expectedShellText = `cd ${quoteShellToken(build.cwd)} && ${expectedCommandText}`;

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.status, "started");
  assert.strictEqual(mock.recorded.shown, 1);
  assert.strictEqual(mock.recorded.sentText, expectedShellText);
  assert.strictEqual(mock.recorded.sentNewLine, true);
  assert.ok(!String(mock.recorded.sentText).includes("$(echo not-safe)"));
}

/**
 * Verifies shell rendering preserves empty-args command execution shape.
 *
 * @returns {void}
 */
function testRunCommandWithNoArgs() {
  const mock = createMockVscodeApi();
  const build = {
    ok: true,
    reason: null,
    commandParts: ["/tmp/run.sh"],
    displayCommand: "/tmp/run.sh",
    cwd: "/tmp/work",
    commandFamily: "run-file",
  };

  const result = runCommand({
    build,
    vscodeApi: mock.vscodeApi,
    reuseTerminal: false,
    logger() {
      // Suppress test logging.
    },
    now() {
      return 2;
    },
  });

  const expectedShellText = `cd ${quoteShellToken(build.cwd)} && ${renderShellCommand(build.commandParts)}`;

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.status, "started");
  assert.strictEqual(mock.recorded.sentText, expectedShellText);
}

/**
 * Verifies stale terminal send failures are retried with a new owned terminal.
 *
 * @returns {void}
 */
function testRunCommandRetriesAfterTerminalSendFailure() {
  const build = {
    ok: true,
    reason: null,
    commandParts: ["/tmp/run.sh", "--ok"],
    displayCommand: "/tmp/run.sh --ok",
    cwd: "/tmp/work",
    commandFamily: "run-file",
  };
  const mock = createMockVscodeApiWithTerminalSequence([
    {
      sendText() {
        throw new Error("stale-terminal");
      },
    },
    {
      sendText() {
        return undefined;
      },
    },
  ]);

  const result = runCommand({
    build,
    vscodeApi: mock.vscodeApi,
    reuseTerminal: true,
    logger() {
      // Suppress test logging.
    },
    now() {
      return 3;
    },
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.status, "started");
  assert.strictEqual(mock.createdCount(), 2);
}

/**
 * Runs all run-command-adapter tests.
 *
 * @returns {void}
 */
function runTests() {
  testExecuteContextCommandBlocksOnInvalidSource();
  testExecuteContextCommandBuildFailure();
  testExecuteContextCommandRuntimeFailure();
  testExecuteContextCommandSuccess();
  testBuildRunCommandSuccess();
  testBuildRunCommandRejectsRelativeScriptPath();
  testBuildRunCommandRejectsInvalidArgs();
  testBuildRunCommandRejectsEmptyDisplayScriptPath();
  testRunCommandUsesQuotedCommandParts();
  testRunCommandWithNoArgs();
  testRunCommandRetriesAfterTerminalSendFailure();
}

module.exports = {
  runTests,
};
