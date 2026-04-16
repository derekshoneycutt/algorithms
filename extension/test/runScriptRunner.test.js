const assert = require("assert");
const {
  runCommand,
  renderShellCommand,
  _internal,
} = require("../src/runtime/runScriptRunner");

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
 * @returns {{vscodeApi: {window: {createTerminal: () => {show: () => void, sendText: (text: string, addNewLine: boolean) => void}, onDidCloseTerminal: (callback: (terminal: object) => void) => {dispose: () => void}}}, createdCount: () => number, sentTexts: () => string[]}} Mock API and inspectors.
 */
function createMockVscodeApiWithTerminalSequence(terminals) {
  const sent = [];
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
            sendText: (text, addNewLine) => {
              if (next.sendText) {
                next.sendText(text, addNewLine);
                return;
              }

              sent.push(String(text));
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
    sentTexts() {
      return sent;
    },
  };
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
    logger: () => {
      // Suppress test logging.
    },
    now: () => 1,
  });

  const expectedCommandText = renderShellCommand(build.commandParts);
  const expectedShellText = `cd ${_internal.quoteShellToken(build.cwd)} && ${expectedCommandText}`;

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
    logger: () => {
      // Suppress test logging.
    },
    now: () => 2,
  });

  const expectedShellText = `cd ${_internal.quoteShellToken(build.cwd)} && ${renderShellCommand(build.commandParts)}`;

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
      sendText(text) {
        // Captured by the helper default path.
        return text;
      },
    },
  ]);

  const result = runCommand({
    build,
    vscodeApi: mock.vscodeApi,
    reuseTerminal: true,
    logger: () => {
      // Suppress test logging.
    },
    now: () => 3,
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.status, "started");
  assert.strictEqual(mock.createdCount(), 2);
}

/**
 * Runs all runScriptRunner tests and exits non-zero on failure.
 *
 * @returns {void}
 */
function main() {
  testRunCommandUsesQuotedCommandParts();
  testRunCommandWithNoArgs();
  testRunCommandRetriesAfterTerminalSendFailure();
  console.log("runScriptRunner tests passed");
}

main();
