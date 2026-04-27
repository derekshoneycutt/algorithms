import type { ChildProcess } from "node:child_process";

/**
 * Options for asynchronous process launch.
 */
export interface CommandLineSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  onStdoutData?: (chunk: string) => void;
  onStderrData?: (chunk: string) => void;
}

/**
 * Options for synchronous process launch.
 */
export interface CommandLineSpawnSyncOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  encoding?: BufferEncoding;
}

/**
 * Normalized process execution result.
 */
export interface CommandLineResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  combinedOutput: string;
  reason: string | null;
  errorMessage: string | null;
}

/**
 * Handle for managing one running process.
 */
export interface ICommandLineProcessHandle {
  pid: number | null;

  /**
   * Returns whether the process still appears to be running.
   *
   * @returns {boolean} True when running.
   */
  isRunning(): boolean;

  /**
   * Sends a signal to the process.
   *
   * @param {NodeJS.Signals | number} [signal] Signal to send.
   * @returns {{ ok: boolean; reason: string | null }} Kill result.
   */
  kill(signal?: NodeJS.Signals | number): { ok: boolean; reason: string | null };
}

/**
 * One tracked asynchronous process execution.
 */
export interface ICommandLineTrackedExecution {
  handle: ICommandLineProcessHandle;
  result: Promise<CommandLineResult>;
}

/**
 * DI contract for launching and managing command-line processes.
 */
export interface ICommandLine {
  /**
   * Spawns a command and captures output.
   *
   * @param {string} command Executable path or command.
   * @param {string[]} args Command arguments.
   * @param {CommandLineSpawnOptions} [options] Launch options.
   * @returns {Promise<CommandLineResult>} Normalized result.
   */
  spawn(
    command: string,
    args: string[],
    options?: CommandLineSpawnOptions
  ): Promise<CommandLineResult>;

  /**
   * Spawns a command and returns both the process handle and completion result.
   *
   * @param {string} command Executable path or command.
   * @param {string[]} args Command arguments.
   * @param {CommandLineSpawnOptions} [options] Launch options.
   * @returns {ICommandLineTrackedExecution} Tracked execution.
   */
  spawnTracked(
    command: string,
    args: string[],
    options?: CommandLineSpawnOptions
  ): ICommandLineTrackedExecution;

  /**
   * Runs a command synchronously and captures output.
   *
   * @param {string} command Executable path or command.
   * @param {string[]} args Command arguments.
   * @param {CommandLineSpawnSyncOptions} [options] Launch options.
   * @returns {CommandLineResult} Normalized result.
   */
  spawnSync(
    command: string,
    args: string[],
    options?: CommandLineSpawnSyncOptions
  ): CommandLineResult;

  /**
   * Creates a process handle for kill/isRunning operations.
   *
   * @param {ChildProcess} childProcess Child process instance.
   * @returns {ICommandLineProcessHandle} Process handle.
   */
  createHandle(childProcess: ChildProcess): ICommandLineProcessHandle;
}
