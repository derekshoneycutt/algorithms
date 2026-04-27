import * as vscode from "vscode";

const ALGORITHMS_RUNNER_TERMINAL_NAME = "Algorithms Runner";

let algorithmsRunnerTerminal: vscode.Terminal | null = null;

/**
 * Structured input for one run.sh terminal dispatch.
 */
export interface AlgorithmsTerminalRunInput {
  executablePath: string;
  optionTokens: readonly string[];
  passthroughTokens: readonly string[];
  targetToken: string;
  workingDirectoryPath: string;
}

/**
 * Adapter contract for launching one run.sh invocation in VS Code terminal.
 */
export interface IAlgorithmsTerminalRunAdapter {
  /**
   * Builds and dispatches one run.sh command to the extension-owned terminal.
   *
   * @param {AlgorithmsTerminalRunInput} input Run invocation input.
   * @returns {void}
   */
  run(input: AlgorithmsTerminalRunInput): void;

  /**
   * Returns the terminal name used for run dispatch.
   *
   * @returns {string} Terminal display name.
   */
  getTerminalName(): string;
}

/**
 * Quotes one shell token for safe command composition.
 *
 * @param {string} token Raw token.
 * @returns {string} Shell-safe token.
 */
function quoteShellToken(token: string): string {
  return `'${token.replace(/'/g, `"'"'`)}'`;
}

/**
 * Builds one shell command string for run.sh dispatch.
 *
 * Canonical order is: options first, target second, passthrough args last.
 *
 * @param {AlgorithmsTerminalRunInput} input Run invocation input.
 * @returns {string} Full shell command text.
 */
export function buildAlgorithmsTerminalRunCommand(input: AlgorithmsTerminalRunInput): string {
  return [
    "cd",
    quoteShellToken(input.workingDirectoryPath),
    "&&",
    quoteShellToken(input.executablePath),
    ...input.optionTokens.map((optionToken) => {
      return quoteShellToken(optionToken);
    }),
    quoteShellToken(input.targetToken),
    ...input.passthroughTokens.map((token) => {
      return quoteShellToken(token);
    }),
  ].join(" ");
}

/**
 * Returns one cached extension-owned terminal for run commands.
 *
 * @returns {vscode.Terminal} Reused or newly-created terminal instance.
 */
function getAlgorithmsRunnerTerminal(): vscode.Terminal {
  if (algorithmsRunnerTerminal !== null && !algorithmsRunnerTerminal.exitStatus) {
    return algorithmsRunnerTerminal;
  }

  const terminal = vscode.window.createTerminal({
    name: ALGORITHMS_RUNNER_TERMINAL_NAME,
  });
  algorithmsRunnerTerminal = terminal;

  return terminal;
}

/**
 * Creates one adapter that launches run.sh commands in the extension terminal.
 *
 * @returns {IAlgorithmsTerminalRunAdapter} Terminal run adapter.
 */
export function createAlgorithmsTerminalRunAdapter(): IAlgorithmsTerminalRunAdapter {
  return {
    run(input: AlgorithmsTerminalRunInput): void {
      const terminal = getAlgorithmsRunnerTerminal();
      const command = buildAlgorithmsTerminalRunCommand(input);

      terminal.show(false);
      terminal.sendText(command);
    },

    getTerminalName(): string {
      return ALGORITHMS_RUNNER_TERMINAL_NAME;
    },
  };
}
