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
  onExit?: (exitCode: number | undefined) => void;
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
 * Waits for shell integration to become available on one terminal.
 *
 * @param {vscode.Terminal} terminal Terminal instance.
 * @param {number} timeoutMs Maximum wait time in milliseconds.
 * @returns {Promise<vscode.TerminalShellIntegration | null>} Shell integration or null.
 */
async function waitForTerminalShellIntegration(
  terminal: vscode.Terminal,
  timeoutMs: number
): Promise<vscode.TerminalShellIntegration | null> {
  if (terminal.shellIntegration !== undefined) {
    return terminal.shellIntegration;
  }

  return new Promise((resolve) => {
    let settled = false;

    const subscription = vscode.window.onDidChangeTerminalShellIntegration((event) => {
      if (event.terminal !== terminal) {
        return;
      }

      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      subscription.dispose();
      resolve(event.shellIntegration);
    });

    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      subscription.dispose();
      resolve(null);
    }, timeoutMs);
  });
}

/**
 * Dispatches one command and returns terminal-reported exit code when available.
 *
 * @param {vscode.Terminal} terminal Terminal instance.
 * @param {string} command Command line text.
 * @returns {Promise<number | undefined | null>} Exit code when tracked, null when unavailable.
 */
async function executeTrackedTerminalCommand(
  terminal: vscode.Terminal,
  command: string
): Promise<number | undefined | null> {
  const shellIntegration = await waitForTerminalShellIntegration(terminal, 1500);
  if (shellIntegration === null) {
    terminal.sendText(command);
    return null;
  }

  const execution = shellIntegration.executeCommand(command);
  return new Promise((resolve) => {
    const subscription = vscode.window.onDidEndTerminalShellExecution((event) => {
      if (event.terminal !== terminal) {
        return;
      }

      if (event.execution !== execution) {
        return;
      }

      subscription.dispose();
      resolve(event.exitCode);
    });
  });
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
      void executeTrackedTerminalCommand(terminal, command).then((exitCode) => {
        if (exitCode === null) {
          return;
        }

        if (input.onExit !== undefined) {
          input.onExit(exitCode);
        }
      });
    },

    getTerminalName(): string {
      return ALGORITHMS_RUNNER_TERMINAL_NAME;
    },
  };
}
