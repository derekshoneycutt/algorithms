import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { SmokeControlsState } from ".";
import type { ITracker, TrackerRunStatus } from "../tracker";

const runScriptFileName = "run.sh";
const smokeStatusLineRegex =
  /SMOKE\s+\[\d+\/\d+\].*?lang=([a-zA-Z0-9_+\-]+).*?(?:\[(RUNNING|PASS|FAIL|TIMEOUT)\]|\b(RUNNING|PASS|FAIL|TIMEOUT)\b)/;

/**
 * Input used to execute one smoke-test invocation.
 */
export interface SmokeHandlerExecuteRequest {
  algorithmDirectoryPath: string;
  smokeControls: SmokeControlsState;
  runId?: string;
}

/**
 * Result for one smoke-test invocation.
 */
export interface SmokeHandlerExecuteResult {
  ok: boolean;
  text: string;
  commandPreview: string;
  exitCode: number | null;
  selectedLanguageKeys: string[];
}

/**
 * Prepared smoke execution metadata derived from one request.
 */
interface SmokeHandlerPreparedExecution {
  algorithmDirectoryPath: string;
  commandPreview: string;
  runScriptPath: string;
  processArgs: string[];
  selectedLanguageKeys: string[];
  runId: string;
}

/**
 * Runtime state tracked while one smoke process is active.
 */
interface ActiveSmokeExecutionContext {
  algorithmPath: string;
  runId: string;
  selectedLanguageKeys: string[];
  statusByLanguageKey: Map<string, TrackerRunStatus>;
  stopRequested: boolean;
  childProcess: ChildProcess | undefined;
}

/**
 * Parsed smoke line status payload.
 */
interface ParsedSmokeLineStatus {
  languageKey: string;
  status: TrackerRunStatus;
}

/**
 * Standalone smoke-test command builder/executor for one repository root.
 */
export class SmokeHandler {

  private readonly repositoryRoot: string;
  private readonly tracker: ITracker | undefined;
  private activeExecution: ActiveSmokeExecutionContext | undefined;

  /**
   * Creates one smoke handler scoped to a repository root.
   *
   * @param {string} repositoryRoot Absolute repository root path containing run.sh.
   * @param {ITracker | undefined} tracker Optional tracker actor for smoke status projection.
   */
  public constructor(repositoryRoot: string, tracker?: ITracker) {
    this.repositoryRoot = repositoryRoot;
    this.tracker = tracker;
    this.activeExecution = undefined;
  }

  /**
   * Requests cancellation of the active smoke process.
   *
   * @returns {boolean} True when a stop signal was sent; false when no active smoke process exists.
   */
  public interruptActiveSmoke(): boolean {
    const activeExecution = this.activeExecution;
    if (!activeExecution) {
      return false;
    }

    const childProcess = activeExecution.childProcess;
    if (!childProcess) {
      return false;
    }

    if (childProcess.killed || childProcess.exitCode !== null || childProcess.signalCode !== null) {
      return false;
    }

    activeExecution.stopRequested = true;
    const sentTerminateSignal = this.sendSignalToSmokeProcess(childProcess, "SIGTERM");
    if (!sentTerminateSignal) {
      return false;
    }

    // Escalate if the smoke process still has not exited shortly after SIGTERM.
    setTimeout(() => {
      if (!this.activeExecution || this.activeExecution.runId !== activeExecution.runId) {
        return;
      }

      const activeChildProcess = this.activeExecution.childProcess;
      if (!activeChildProcess) {
        return;
      }

      if (activeChildProcess.killed || activeChildProcess.exitCode !== null || activeChildProcess.signalCode !== null) {
        return;
      }

      this.sendSignalToSmokeProcess(activeChildProcess, "SIGKILL");
    }, 500);

    return true;
  }

  /**
   * Executes one smoke-test run and streams per-language status into Tracker.
   *
   * @param {SmokeHandlerExecuteRequest} request Smoke execution request.
   * @returns {Promise<SmokeHandlerExecuteResult>} Smoke execution result.
   */
  public async execute(request: SmokeHandlerExecuteRequest): Promise<SmokeHandlerExecuteResult> {
    const preparedExecution = await this.prepareExecutionRequest(request);
    const activeExecution = this.createActiveExecutionContext(preparedExecution);
    this.activeExecution = activeExecution;

    for (const languageKey of preparedExecution.selectedLanguageKeys) {
      this.publishTrackerStatus(activeExecution, languageKey, "queued", "Smoke test queued.");
    }

    try {
      const processResult = await this.executeSmokeProcess(preparedExecution, activeExecution);
      const wasCancelled = activeExecution.stopRequested
        || processResult.signal === "SIGTERM"
        || processResult.signal === "SIGKILL";

      this.finalizeLanguageStatuses(activeExecution, processResult.exitCode, wasCancelled);

      if (wasCancelled) {
        return {
          ok: false,
          text: "Smoke test cancelled.",
          commandPreview: preparedExecution.commandPreview,
          exitCode: processResult.exitCode,
          selectedLanguageKeys: preparedExecution.selectedLanguageKeys,
        };
      }

      const succeeded = processResult.exitCode === 0;
      return {
        ok: succeeded,
        text: succeeded
          ? "Smoke test completed successfully."
          : `Smoke test failed with exit code ${processResult.exitCode}.`,
        commandPreview: preparedExecution.commandPreview,
        exitCode: processResult.exitCode,
        selectedLanguageKeys: preparedExecution.selectedLanguageKeys,
      };
    } finally {
      if (this.activeExecution?.runId === activeExecution.runId) {
        this.activeExecution = undefined;
      }
    }
  }

  /**
   * Validates one smoke request and resolves all command tokens and paths.
   *
   * @param {SmokeHandlerExecuteRequest} request Smoke execution request.
   * @returns {Promise<SmokeHandlerPreparedExecution>} Prepared execution metadata.
   */
  private async prepareExecutionRequest(
    request: SmokeHandlerExecuteRequest,
  ): Promise<SmokeHandlerPreparedExecution> {
    const algorithmDirectoryPath = path.resolve(request.algorithmDirectoryPath);
    await this.ensureDirectoryExists(algorithmDirectoryPath);

    const runScriptPath = path.join(this.repositoryRoot, runScriptFileName);
    await this.ensureRunScriptExists(runScriptPath);

    const selectedLanguageKeys = this.resolveSelectedLanguageKeys(request.smokeControls);
    if (selectedLanguageKeys.length === 0) {
      throw new Error("Select at least one smoke language before starting a smoke test.");
    }

    const processArgs = this.buildSmokeProcessArgs(request.smokeControls, selectedLanguageKeys);
    const commandPreview = this.buildCommandPreview(runScriptPath, processArgs);

    return {
      algorithmDirectoryPath,
      commandPreview,
      runScriptPath,
      processArgs,
      selectedLanguageKeys,
      runId: String(request.runId || "").trim() || this.createRunId(),
    };
  }

  /**
   * Creates mutable execution state for one prepared smoke run.
   *
   * @param {SmokeHandlerPreparedExecution} preparedExecution Prepared execution metadata.
   * @returns {ActiveSmokeExecutionContext} Active execution context.
   */
  private createActiveExecutionContext(
    preparedExecution: SmokeHandlerPreparedExecution,
  ): ActiveSmokeExecutionContext {
    return {
      algorithmPath: preparedExecution.algorithmDirectoryPath,
      runId: preparedExecution.runId,
      selectedLanguageKeys: [...preparedExecution.selectedLanguageKeys],
      statusByLanguageKey: new Map<string, TrackerRunStatus>(),
      stopRequested: false,
      childProcess: undefined,
    };
  }

  /**
   * Returns selected smoke language keys from smoke-controls state.
   *
   * @param {SmokeControlsState} smokeControls Smoke-controls snapshot.
   * @returns {string[]} Selected language keys.
   */
  private resolveSelectedLanguageKeys(smokeControls: SmokeControlsState): string[] {
    return smokeControls.languages
      .filter((language) => language.selected && !language.disabled)
      .map((language) => language.languageKey.trim().toLowerCase())
      .filter((languageKey) => languageKey.length > 0);
  }

  /**
   * Builds process args for `sh run.sh --smoke-test ...` invocation.
   *
   * @param {SmokeControlsState} smokeControls Smoke-controls snapshot.
   * @param {string[]} selectedLanguageKeys Selected language keys.
   * @returns {string[]} Process argument vector.
   */
  private buildSmokeProcessArgs(
    smokeControls: SmokeControlsState,
    selectedLanguageKeys: string[],
  ): string[] {
    const args = ["--smoke-test"];

    args.push(`--langs=${selectedLanguageKeys.join(" ")}`);

    const timeoutSeconds = String(smokeControls.timeoutSeconds || "").trim();
    if (timeoutSeconds.length > 0) {
      args.push(`--timeout=${timeoutSeconds}`);
    }

    const slowTimeoutSeconds = String(smokeControls.slowTimeoutSeconds || "").trim();
    if (slowTimeoutSeconds.length > 0) {
      args.push(`--slow-timeout=${slowTimeoutSeconds}`);
    }

    if (smokeControls.reportEnabled) {
      const markdownPath = String(smokeControls.markdownPath || "").trim();
      if (markdownPath.length > 0) {
        args.push(`--markdown=${markdownPath}`);
      } else {
        args.push("--markdown");
      }
    }

    return args;
  }

  /**
   * Executes one smoke process and parses streamed output for per-language status lines.
   *
   * @param {SmokeHandlerPreparedExecution} preparedExecution Prepared execution metadata.
   * @param {ActiveSmokeExecutionContext} activeExecution Mutable active execution context.
   * @returns {Promise<{exitCode: number | null; signal: NodeJS.Signals | null}>} Process completion details.
   */
  private async executeSmokeProcess(
    preparedExecution: SmokeHandlerPreparedExecution,
    activeExecution: ActiveSmokeExecutionContext,
  ): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }> {
    return await new Promise((resolve, reject) => {
      const childProcess = spawn(
        "sh",
        [preparedExecution.runScriptPath, ...preparedExecution.processArgs],
        {
          cwd: preparedExecution.algorithmDirectoryPath,
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
          detached: process.platform !== "win32",
        },
      );

      activeExecution.childProcess = childProcess;

      let stdoutRemainder = "";
      let stderrRemainder = "";

      childProcess.stdout.on("data", (chunk: Buffer) => {
        stdoutRemainder = this.consumeOutputChunk(
          activeExecution,
          stdoutRemainder,
          chunk.toString("utf8"),
        );
      });

      childProcess.stderr.on("data", (chunk: Buffer) => {
        stderrRemainder = this.consumeOutputChunk(
          activeExecution,
          stderrRemainder,
          chunk.toString("utf8"),
        );
      });

      childProcess.on("error", (error) => {
        reject(error);
      });

      childProcess.on("close", (exitCode, signal) => {
        this.consumeOutputChunk(activeExecution, stdoutRemainder, "\n");
        this.consumeOutputChunk(activeExecution, stderrRemainder, "\n");

        resolve({
          exitCode,
          signal,
        });
      });
    });
  }

  /**
   * Consumes one output chunk, parses complete lines, and returns new remainder text.
   *
   * @param {ActiveSmokeExecutionContext} activeExecution Active execution context.
   * @param {string} existingRemainder Unfinished remainder from previous chunk.
   * @param {string} chunkText New output chunk text.
   * @returns {string} Unfinished trailing line remainder.
   */
  private consumeOutputChunk(
    activeExecution: ActiveSmokeExecutionContext,
    existingRemainder: string,
    chunkText: string,
  ): string {
    const combinedText = `${existingRemainder}${chunkText}`;
    const lines = combinedText.split(/\r?\n/);
    const trailingRemainder = lines.pop() ?? "";

    for (const line of lines) {
      this.applySmokeStatusLine(activeExecution, line);
    }

    return trailingRemainder;
  }

  /**
   * Parses one smoke status line and updates tracker state when a valid token exists.
   *
   * @param {ActiveSmokeExecutionContext} activeExecution Active execution context.
   * @param {string} line Output line.
   * @returns {void} No return value.
   */
  private applySmokeStatusLine(activeExecution: ActiveSmokeExecutionContext, line: string): void {
    const parsedLineStatus = this.parseSmokeStatusLine(line);
    if (!parsedLineStatus) {
      return;
    }

    if (!activeExecution.selectedLanguageKeys.includes(parsedLineStatus.languageKey)) {
      return;
    }

    if (parsedLineStatus.status === "running") {
      this.publishTrackerStatus(
        activeExecution,
        parsedLineStatus.languageKey,
        "running",
        "Smoke test running.",
      );
      return;
    }

    if (parsedLineStatus.status === "completed") {
      this.publishTrackerStatus(
        activeExecution,
        parsedLineStatus.languageKey,
        "completed",
        "Smoke test passed.",
      );
      return;
    }

    this.publishTrackerStatus(
      activeExecution,
      parsedLineStatus.languageKey,
      "failed",
      "Smoke test failed.",
    );
  }

  /**
   * Maps smoke output token lines into tracker statuses.
   *
   * @param {string} line Raw output line.
   * @returns {ParsedSmokeLineStatus | undefined} Parsed smoke status payload.
   */
  private parseSmokeStatusLine(line: string): ParsedSmokeLineStatus | undefined {
    const normalizedLine = this.stripAnsiControlSequences(line);
    const match = smokeStatusLineRegex.exec(normalizedLine);
    if (!match) {
      return undefined;
    }

    const languageKey = (match[1] || "").trim().toLowerCase();
    const statusToken = (match[2] || match[3] || "").trim().toUpperCase();
    if (languageKey.length === 0) {
      return undefined;
    }

    if (statusToken === "RUNNING") {
      return {
        languageKey,
        status: "running",
      };
    }

    if (statusToken === "PASS") {
      return {
        languageKey,
        status: "completed",
      };
    }

    if (statusToken === "FAIL" || statusToken === "TIMEOUT") {
      return {
        languageKey,
        status: "failed",
      };
    }

    return undefined;
  }

  /**
   * Removes ANSI escape/control sequences from one output line.
   *
   * @param {string} value Raw line text.
   * @returns {string} Line text without ANSI control sequences.
   */
  private stripAnsiControlSequences(value: string): string {
    return value.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  }

  /**
   * Sends one signal to the smoke process, preferring process-group signaling on Unix.
   *
   * @param {ChildProcess} childProcess Active smoke child process.
   * @param {NodeJS.Signals} signal Signal to deliver.
   * @returns {boolean} True when a signal delivery attempt succeeded.
   */
  private sendSignalToSmokeProcess(childProcess: ChildProcess, signal: NodeJS.Signals): boolean {
    if (childProcess.killed || childProcess.exitCode !== null || childProcess.signalCode !== null) {
      return false;
    }

    if (process.platform !== "win32" && typeof childProcess.pid === "number") {
      try {
        // Detached Unix children can be terminated by signaling their process group.
        process.kill(-childProcess.pid, signal);
        return true;
      } catch {
        // Fall back to signaling only the parent process below.
      }
    }

    try {
      return childProcess.kill(signal);
    } catch {
      return false;
    }
  }

  /**
   * Finalizes all selected language statuses after process completion.
   *
   * @param {ActiveSmokeExecutionContext} activeExecution Active execution context.
   * @param {number | null} exitCode Process exit code.
   * @param {boolean} wasCancelled True when process was cancelled.
   * @returns {void} No return value.
   */
  private finalizeLanguageStatuses(
    activeExecution: ActiveSmokeExecutionContext,
    exitCode: number | null,
    wasCancelled: boolean,
  ): void {
    for (const languageKey of activeExecution.selectedLanguageKeys) {
      const existingStatus = activeExecution.statusByLanguageKey.get(languageKey);

      if (existingStatus === "completed" || existingStatus === "failed" || existingStatus === "cancelled") {
        continue;
      }

      if (wasCancelled) {
        this.publishTrackerStatus(
          activeExecution,
          languageKey,
          "cancelled",
          "Smoke test cancelled.",
        );
        continue;
      }

      if (exitCode === 0) {
        this.publishTrackerStatus(
          activeExecution,
          languageKey,
          "completed",
          "Smoke test passed.",
        );
        continue;
      }

      this.publishTrackerStatus(
        activeExecution,
        languageKey,
        "failed",
        `Smoke test failed with exit code ${exitCode}.`,
      );
    }
  }

  /**
   * Emits one tracker status update for a specific smoke language.
   *
   * @param {ActiveSmokeExecutionContext} activeExecution Active execution context.
   * @param {string} languageKey Language key.
   * @param {TrackerRunStatus} status Tracker run status.
   * @param {string} message Tracker status message.
   * @returns {void} No return value.
   */
  private publishTrackerStatus(
    activeExecution: ActiveSmokeExecutionContext,
    languageKey: string,
    status: TrackerRunStatus,
    message: string,
  ): void {
    activeExecution.statusByLanguageKey.set(languageKey, status);

    if (!this.tracker) {
      return;
    }

    this.tracker.setLanguageRunStatus({
      algorithmPath: activeExecution.algorithmPath,
      languageKey,
      runId: activeExecution.runId,
      source: "smoker",
      cancelability: "algorithm-run",
      status,
      message,
      updatedAt: Date.now(),
    });
  }

  /**
   * Creates one run identifier for smoke lifecycle projection.
   *
   * @returns {string} Generated run identifier.
   */
  private createRunId(): string {
    return `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Returns one shell-safe command preview string.
   *
   * @param {string} runScriptPath Absolute run.sh path.
   * @param {string[]} processArgs Process argument vector.
   * @returns {string} Command preview suitable for logs.
   */
  private buildCommandPreview(runScriptPath: string, processArgs: string[]): string {
    const quotedArgs = processArgs.map((arg) => this.quoteTokenForShell(arg));
    return ["sh", this.quoteTokenForShell(runScriptPath), ...quotedArgs].join(" ");
  }

  /**
   * Quotes one token for shell-display safety.
   *
   * @param {string} token Input token.
   * @returns {string} Shell-quoted token.
   */
  private quoteTokenForShell(token: string): string {
    if (/^[A-Za-z0-9_./:@=+\-]+$/.test(token)) {
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
}
