import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { RunnerCheckOnlyRoute, RunnerRunActionKind, RunOptionsState } from ".";
import type { ITracker, TrackerRunStatus } from "../tracker";

const runScriptFileName = "run.sh";
const runnerTerminalName = "Algorithms Runner";

let runnerTerminal: vscode.Terminal | undefined;

/**
 * Input used to execute one run.sh file invocation.
 */
export interface RunHandlerExecuteRequest {
  algorithmDirectoryPath: string;
  actionKind?: RunnerRunActionKind;
  checkOnlyRouteOverride?: RunnerCheckOnlyRoute;
  targetToken?: string;
  targetFilePath?: string;
  runOptions: RunOptionsState;
  languageKey?: string;
  runId?: string;
}

/**
 * Result for one run.sh file invocation.
 */
export interface RunHandlerExecuteResult {
  ok: boolean;
  text: string;
  terminalName: string;
  commandPreview: string;
  exitCode: number | null;
}

/**
 * Parsed tokenization result for raw run-arguments text.
 */
interface ParsedRunArgumentsResult {
  ok: boolean;
  tokens: string[];
  reason: string | null;
}

/**
 * Tracker metadata attached to one active terminal run.
 */
interface TrackerExecutionContext {
  algorithmPath: string;
  languageKey: string;
  runId: string;
}

/**
 * Fully prepared execution payload derived from one run request.
 */
interface RunHandlerPreparedExecution {
  actionKind: RunnerRunActionKind;
  algorithmDirectoryPath: string;
  commandPreview: string;
  runScriptPath: string;
  preTargetOptionTokens: string[];
  postTargetOptionTokens: string[];
  passthroughTokens: string[];
  targetToken: string | undefined;
  trackerExecutionContext: TrackerExecutionContext | undefined;
}

/**
 * Returns true when an action requires one concrete target file.
 *
 * @param {RunnerRunActionKind} actionKind Requested run action.
 * @returns {boolean} True when target token and file path are required.
 */
function actionRequiresConcreteTargetFile(actionKind: RunnerRunActionKind): boolean {
  return actionKind !== "clean" && actionKind !== "localclean";
}

/**
 * Returns true when an action supports trailing passthrough args.
 *
 * @param {RunnerRunActionKind} actionKind Requested run action.
 * @returns {boolean} True when passthrough args should be forwarded.
 */
function actionSupportsPassthroughArguments(actionKind: RunnerRunActionKind): boolean {
  return actionKind === "run-file" || actionKind === "compile-only" || actionKind === "check-only";
}

/**
 * Standalone run.sh command builder/executor for one repository root.
 */
export class RunHandler {

  private readonly repositoryRoot: string;
  private readonly tracker: ITracker | undefined;
  private activeTrackerExecutionContext: TrackerExecutionContext | undefined;

  /**
   * Creates one run handler scoped to a repository root.
   *
   * @param {string} repositoryRoot Absolute repository root path containing run.sh.
   * @param {ITracker | undefined} tracker Optional tracker actor for run-status projection.
   */
  public constructor(repositoryRoot: string, tracker?: ITracker) {
    this.repositoryRoot = repositoryRoot;
    this.tracker = tracker;
    this.activeTrackerExecutionContext = undefined;
  }

  /**
   * Sends Ctrl+C to the visible runner terminal to interrupt the active run.
   *
   * @returns {boolean} True when Ctrl+C was sent; false when no live runner terminal exists.
   */
  public interruptActiveRun(): boolean {
    if (runnerTerminal === undefined || runnerTerminal.exitStatus) {
      return false;
    }

    runnerTerminal.show(false);
    runnerTerminal.sendText("\u0003", false);

    this.publishTrackerStatus(
      this.activeTrackerExecutionContext,
      "cancelled",
      "Run interrupted (Ctrl+C).",
    );

    return true;
  }

  /**
    * Executes one run.sh file operation with stable token ordering.
   *
   * Token order is: options -> target -> passthrough arguments.
   *
   * @param {RunHandlerExecuteRequest} request Run invocation request.
   * @returns {Promise<RunHandlerExecuteResult>} Process result and command metadata.
   */
  public async execute(request: RunHandlerExecuteRequest): Promise<RunHandlerExecuteResult> {
    const preparedExecution = await this.prepareExecutionRequest(request);
    const trackerExecutionContext = preparedExecution.trackerExecutionContext;
    this.activeTrackerExecutionContext = trackerExecutionContext;

    try {
      this.publishTrackerStatus(trackerExecutionContext, "running", "Run in progress.");

      const terminalResult = await this.runInVisibleTerminal(preparedExecution);

      if (terminalResult.exitCode === null) {
        this.publishTrackerStatus(
          trackerExecutionContext,
          "running",
          `Run started in ${terminalResult.terminalName}. Exit code tracking unavailable.`,
        );

        return {
          ok: true,
          text: `Run started in ${terminalResult.terminalName}.`,
          terminalName: terminalResult.terminalName,
          commandPreview: terminalResult.command,
          exitCode: null,
        };
      }

      const normalizedExitCode = terminalResult.exitCode ?? null;
      const succeeded = normalizedExitCode === 0;
      if (succeeded) {
        this.publishTrackerStatus(trackerExecutionContext, "completed", "Run completed successfully.");
      } else {
        this.publishTrackerStatus(
          trackerExecutionContext,
          "failed",
          `Run failed with exit code ${normalizedExitCode}.`,
        );
      }

      return {
        ok: succeeded,
        text: succeeded
          ? "Run completed successfully."
          : `Run failed with exit code ${normalizedExitCode}.`,
        terminalName: terminalResult.terminalName,
        commandPreview: terminalResult.command,
        exitCode: normalizedExitCode,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.publishTrackerStatus(trackerExecutionContext, "failed", errorMessage);
      throw error;
    } finally {
      if (this.activeTrackerExecutionContext?.runId === trackerExecutionContext?.runId) {
        this.activeTrackerExecutionContext = undefined;
      }
    }
  }

  /**
   * Validates one run request and resolves all command tokens and paths.
   *
   * @param {RunHandlerExecuteRequest} request Run invocation request.
   * @returns {Promise<RunHandlerPreparedExecution>} Prepared execution metadata.
   */
  private async prepareExecutionRequest(
    request: RunHandlerExecuteRequest): Promise<RunHandlerPreparedExecution> {

    const actionKind: RunnerRunActionKind = request.actionKind ?? "run-file";
    const algorithmDirectoryPath = path.resolve(request.algorithmDirectoryPath);
    const trackerExecutionContext = this.resolveTrackerExecutionContext(request, algorithmDirectoryPath);

    this.publishTrackerStatus(trackerExecutionContext, "queued", "Run queued.");
    await this.ensureDirectoryExists(algorithmDirectoryPath);

    const runScriptPath = path.join(this.repositoryRoot, runScriptFileName);
    await this.ensureRunScriptExists(runScriptPath);

    const {
      preTargetOptionTokens,
      postTargetOptionTokens,
    } = this.buildRunOptionTokens(
      request.runOptions,
      actionKind,
      request.checkOnlyRouteOverride,
    );
    const passthroughTokens = actionSupportsPassthroughArguments(actionKind)
      ? this.buildRunPassthroughTokens(request.runOptions)
      : [];

    let targetToken: string | undefined;
    if (actionKind === "clean") {
      targetToken = "clean";
    } else if (actionKind === "localclean") {
      targetToken = "localclean";
    } else {
      const candidateTargetToken = String(request.targetToken || "").trim();
      if (candidateTargetToken.length === 0) {
        throw new Error("A target token is required for this run action.");
      }

      targetToken = candidateTargetToken;
    }

    if (actionRequiresConcreteTargetFile(actionKind)) {
      const targetFilePath = String(request.targetFilePath || "").trim();
      if (targetFilePath.length === 0) {
        throw new Error("A target file path is required for this run action.");
      }

      await this.ensureFileExists(path.resolve(targetFilePath));
    }

    const allTokens = this.composeRunTokens(
      preTargetOptionTokens,
      targetToken,
      postTargetOptionTokens,
      passthroughTokens,
    );
    const commandPreview = this.buildCommandPreview(runScriptPath, allTokens);

    return {
      actionKind,
      algorithmDirectoryPath,
      commandPreview,
      runScriptPath,
      preTargetOptionTokens,
      postTargetOptionTokens,
      passthroughTokens,
      targetToken,
      trackerExecutionContext,
    };
  }

  /**
   * Resolves tracker execution context when enough metadata exists.
   *
   * @param {RunHandlerExecuteRequest} request Run invocation request.
   * @param {string} algorithmDirectoryPath Normalized algorithm directory path.
   * @returns {TrackerExecutionContext | undefined} Tracker context when resolvable.
   */
  private resolveTrackerExecutionContext(
    request: RunHandlerExecuteRequest,
    algorithmDirectoryPath: string,
  ): TrackerExecutionContext | undefined {
    if (!this.tracker) {
      return undefined;
    }

    const languageKey = this.resolveLanguageKey(request);
    if (!languageKey) {
      return undefined;
    }

    const runId = String(request.runId || "").trim() || this.createRunId();
    return {
      algorithmPath: algorithmDirectoryPath,
      languageKey,
      runId,
    };
  }

  /**
   * Returns one normalized language key for tracker projection.
   *
   * @param {RunHandlerExecuteRequest} request Run invocation request.
   * @returns {string | undefined} Language key when available.
   */
  private resolveLanguageKey(request: RunHandlerExecuteRequest): string | undefined {
    const explicitLanguageKey = String(request.languageKey || "").trim().toLowerCase();
    if (explicitLanguageKey.length > 0) {
      return explicitLanguageKey;
    }

    const targetToken = String(request.targetToken || "").trim().toLowerCase();
    if (/^[a-z0-9_+-]+$/.test(targetToken)) {
      return targetToken;
    }

    return undefined;
  }

  /**
   * Emits one tracker status update when tracker context is available.
   *
   * @param {TrackerExecutionContext | undefined} trackerExecutionContext Resolved tracker context.
   * @param {TrackerRunStatus} status Tracker run status.
   * @param {string} message Status message.
   * @returns {void} No return value.
   */
  private publishTrackerStatus(
    trackerExecutionContext: TrackerExecutionContext | undefined,
    status: TrackerRunStatus,
    message: string): void {

    if (!this.tracker || !trackerExecutionContext) {
      return;
    }

    this.tracker.setLanguageRunStatus({
      algorithmPath: trackerExecutionContext.algorithmPath,
      languageKey: trackerExecutionContext.languageKey,
      runId: trackerExecutionContext.runId,
      source: "runner",
      cancelability: "single-run",
      status,
      message,
      updatedAt: Date.now(),
    });
  }

  /**
   * Creates one run identifier for tracker lifecycle projection.
   *
   * @returns {string} Generated run identifier.
   */
  private createRunId(): string {
    return `runner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Executes one prepared run request in a user-visible VS Code terminal.
   *
   * @param {RunHandlerPreparedExecution} preparedExecution Prepared execution metadata.
   * @returns {Promise<{command: string; terminalName: string; exitCode: number | undefined | null}>} Terminal execution result.
   */
  private async runInVisibleTerminal(preparedExecution: RunHandlerPreparedExecution): Promise<{
    command: string;
    terminalName: string;
    exitCode: number | undefined | null;
  }> {
    const command = this.buildTerminalRunCommand(preparedExecution);
    const terminal = this.getOrCreateRunnerTerminal();

    terminal.show(false);
    const exitCode = await this.executeTrackedTerminalCommand(terminal, command);

    return {
      command,
      terminalName: runnerTerminalName,
      exitCode,
    };
  }

  /**
   * Builds one shell command string for run.sh terminal dispatch.
   *
   * Canonical order is: options first, target second, passthrough args last.
   *
   * @param {RunHandlerPreparedExecution} preparedExecution Prepared execution metadata.
   * @returns {string} Full shell command text.
   */
  private buildTerminalRunCommand(preparedExecution: RunHandlerPreparedExecution): string {
    const targetTokenSegment = preparedExecution.targetToken !== undefined
      ? [this.quoteTokenForShell(preparedExecution.targetToken)]
      : [];

    return [
      "cd",
      this.quoteTokenForShell(preparedExecution.algorithmDirectoryPath),
      "&&",
      this.quoteTokenForShell(preparedExecution.runScriptPath),
      ...preparedExecution.preTargetOptionTokens.map((optionToken) => {
        return this.quoteTokenForShell(optionToken);
      }),
      ...targetTokenSegment,
      ...preparedExecution.postTargetOptionTokens.map((optionToken) => {
        return this.quoteTokenForShell(optionToken);
      }),
      ...preparedExecution.passthroughTokens.map((token) => {
        return this.quoteTokenForShell(token);
      }),
    ].join(" ");
  }

  /**
   * Returns one cached extension-owned terminal for run commands.
   *
   * @returns {vscode.Terminal} Reused or newly-created terminal instance.
   */
  private getOrCreateRunnerTerminal(): vscode.Terminal {
    if (runnerTerminal !== undefined && !runnerTerminal.exitStatus) {
      return runnerTerminal;
    }

    runnerTerminal = vscode.window.createTerminal({
      name: runnerTerminalName,
    });

    return runnerTerminal;
  }

  /**
   * Waits for shell integration to become available on one terminal.
   *
   * @param {vscode.Terminal} terminal Terminal instance.
   * @param {number} timeoutMs Maximum wait time in milliseconds.
   * @returns {Promise<vscode.TerminalShellIntegration | undefined>} Shell integration when available.
   */
  private async waitForTerminalShellIntegration(
    terminal: vscode.Terminal,
    timeoutMs: number,
  ): Promise<vscode.TerminalShellIntegration | undefined> {
    if (terminal.shellIntegration !== undefined) {
      return terminal.shellIntegration;
    }

    return await new Promise((resolve) => {
      let settled = false;

      const subscription = vscode.window.onDidChangeTerminalShellIntegration((event) => {
        if (event.terminal !== terminal || settled) {
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
        resolve(undefined);
      }, timeoutMs);
    });
  }

  /**
   * Executes one terminal command and resolves with an exit code when shell integration can track it.
   *
   * @param {vscode.Terminal} terminal Terminal instance.
   * @param {string} command Terminal command text.
   * @returns {Promise<number | undefined | null>} Exit code, or null when tracking is unavailable.
   */
  private async executeTrackedTerminalCommand(
    terminal: vscode.Terminal,
    command: string,
  ): Promise<number | undefined | null> {
    const shellIntegration = await this.waitForTerminalShellIntegration(terminal, 1500);
    if (shellIntegration === undefined) {
      terminal.sendText(command);
      return null;
    }

    const execution = shellIntegration.executeCommand(command);
    return await new Promise((resolve) => {
      const subscription = vscode.window.onDidEndTerminalShellExecution((event) => {
        if (event.terminal !== terminal || event.execution !== execution) {
          return;
        }

        subscription.dispose();
        resolve(event.exitCode);
      });
    });
  }

  /**
    * Resolves run option tokens from run options.
   *
   * @param {RunOptionsState} runOptions Current run options snapshot.
   * @returns {string[]} Option tokens that must appear before the target token.
   */
  private buildRunOptionTokens(
    runOptions: RunOptionsState,
    actionKind: RunnerRunActionKind,
    checkOnlyRouteOverride?: RunnerCheckOnlyRoute): {
      preTargetOptionTokens: string[];
      postTargetOptionTokens: string[];
    } {

    const preTargetOptionTokens: string[] = [];
    const postTargetOptionTokens: string[] = [];

    if (runOptions.sourceProfileEnabled) {
      preTargetOptionTokens.push(`--source-profile=${runOptions.sourceProfileText}`);
    }

    if (actionKind === "compile-only") {
      preTargetOptionTokens.push("--compile-only");
      return {
        preTargetOptionTokens,
        postTargetOptionTokens,
      };
    }

    if (actionKind === "check-only") {
      preTargetOptionTokens.push(`--check-only=${checkOnlyRouteOverride ?? runOptions.runChecksRoute}`);
      return {
        preTargetOptionTokens,
        postTargetOptionTokens,
      };
    }

    if (actionKind === "clean") {
      postTargetOptionTokens.push(this.buildCleanDefaultsOptionToken(runOptions));
      return {
        preTargetOptionTokens,
        postTargetOptionTokens,
      };
    }

    if (actionKind === "localclean") {
      return {
        preTargetOptionTokens,
        postTargetOptionTokens,
      };
    }

    if (runOptions.runChecksMode === "compile-only") {
      preTargetOptionTokens.push("--compile-only");
    } else if (runOptions.runChecksMode === "check-only") {
      preTargetOptionTokens.push(`--check-only=${runOptions.runChecksRoute}`);
    }

    return {
      preTargetOptionTokens,
      postTargetOptionTokens,
    };
  }

  /**
   * Builds one clean defaults token from run options.
   *
   * @param {RunOptionsState} runOptions Current run options snapshot.
   * @returns {string} Clean defaults option token.
   */
  private buildCleanDefaultsOptionToken(runOptions: RunOptionsState): string {
    const stdlibDefault = runOptions.cleanStdlibEnabled ? "y" : "n";
    const archiveDefault = runOptions.cleanArchivesEnabled ? "y" : "n";
    return `--defaults=${stdlibDefault}|${archiveDefault}`;
  }

  /**
    * Resolves passthrough run-argument tokens from run options.
   *
    * @param {RunOptionsState} runOptions Current run options snapshot.
    * @returns {string[]} Passthrough tokens that appear after the target token.
   */
  private buildRunPassthroughTokens(runOptions: RunOptionsState): string[] {

    if (!runOptions.runArgsEnabled) {
      return [];
    }

    const parsedRunArguments = this.parseRunArgumentsText(runOptions.runArgsText);
    if (!parsedRunArguments.ok) {
      throw new Error(parsedRunArguments.reason ?? "Invalid run arguments.");
    }

    return parsedRunArguments.tokens;
  }

  /**
   * Composes run.sh invocation tokens in canonical order.
   *
   * @param {string[]} preTargetOptionTokens Option tokens.
   * @param {string} targetToken Positional target token.
   * @param {string[]} postTargetOptionTokens Option tokens.
   * @param {string[]} passthroughTokens Passthrough argument tokens.
   * @returns {string[]} Full token vector.
   */
  private composeRunTokens(
    preTargetOptionTokens: string[],
    targetToken: string | undefined,
    postTargetOptionTokens: string[],
    passthroughTokens: string[]): string[] {

    const runTokens: string[] = [...preTargetOptionTokens];
    if (targetToken !== undefined && targetToken.length > 0) {
      runTokens.push(targetToken);
    }
    runTokens.push(...postTargetOptionTokens);
    runTokens.push(...passthroughTokens);
    return runTokens;
  }

  /**
   * Parses run-arguments text into shell-style tokens.
   *
   * Supports whitespace splitting, quote grouping, and backslash escaping.
   *
   * @param {string} rawText Raw run-arguments text.
   * @returns {ParsedRunArgumentsResult} Parse result.
   */
  private parseRunArgumentsText(rawText: string): ParsedRunArgumentsResult {
    const text = String(rawText || "").trim();

    if (text.length === 0) {
      return {
        ok: true,
        tokens: [],
        reason: null,
      };
    }

    const tokens: string[] = [];
    let currentToken = "";
    let quote: '"' | "'" | null = null;
    let escaping = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];

      if (escaping) {
        currentToken += character;
        escaping = false;
        continue;
      }

      if (character === "\\") {
        escaping = true;
        continue;
      }

      if (quote !== null) {
        if (character === quote) {
          quote = null;
          continue;
        }

        currentToken += character;
        continue;
      }

      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }

      if (/\s/.test(character)) {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = "";
        }

        continue;
      }

      currentToken += character;
    }

    if (escaping) {
      return {
        ok: false,
        tokens: [],
        reason: "Run args end with an unfinished escape (\\).",
      };
    }

    if (quote !== null) {
      return {
        ok: false,
        tokens: [],
        reason: "Run args contain an unclosed quote.",
      };
    }

    if (currentToken.length > 0) {
      tokens.push(currentToken);
    }

    return {
      ok: true,
      tokens,
      reason: null,
    };
  }

  /**
   * Returns one shell-safe command preview string.
   *
   * @param {string} runScriptPath Absolute run.sh path.
   * @param {string[]} tokens Token vector.
   * @returns {string} Command preview suitable for logs.
   */
  private buildCommandPreview(runScriptPath: string, tokens: string[]): string {
    const quotedTokens = tokens.map((token) => this.quoteTokenForShell(token));
    return ["sh", this.quoteTokenForShell(runScriptPath), ...quotedTokens].join(" ");
  }

  /**
   * Quotes one token for shell-display safety.
   *
   * @param {string} token Input token.
   * @returns {string} Shell-quoted token.
   */
  private quoteTokenForShell(token: string): string {
    if (/^[A-Za-z0-9_./:@=-]+$/.test(token)) {
      return token;
    }

    return `'${token.replace(/'/g, `'\\''`)}'`;
  }

  /**
   * Throws when a required directory does not exist.
   *
   * @param {string} directoryPath Directory path.
   * @returns {Promise<void>} Resolves when the directory exists.
   */
  private async ensureDirectoryExists(directoryPath: string): Promise<void> {
    const stats = await fs.stat(directoryPath).catch(() => {
      throw new Error(`Directory does not exist: ${directoryPath}`);
    });

    if (!stats.isDirectory()) {
      throw new Error(`Expected a directory path: ${directoryPath}`);
    }
  }

  /**
   * Throws when run.sh is not present at the repository root.
   *
   * @param {string} runScriptPath Absolute run.sh path.
   * @returns {Promise<void>} Resolves when run.sh exists.
   */
  private async ensureRunScriptExists(runScriptPath: string): Promise<void> {
    await fs.access(runScriptPath).catch(() => {
      throw new Error(`Unable to find ${runScriptFileName} at ${runScriptPath}`);
    });
  }

  /**
   * Throws when one required file path does not exist.
   *
   * @param {string} filePath File path to validate.
   * @returns {Promise<void>} Resolves when the file exists.
   */
  private async ensureFileExists(filePath: string): Promise<void> {
    const stats = await fs.stat(filePath).catch(() => {
      throw new Error(`File does not exist: ${filePath}`);
    });

    if (!stats.isFile()) {
      throw new Error(`Expected a file path: ${filePath}`);
    }
  }

}
