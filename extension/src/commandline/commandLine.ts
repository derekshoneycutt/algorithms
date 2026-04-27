import * as childProcess from "node:child_process";
import type { ChildProcess } from "node:child_process";

import type {
  CommandLineResult,
  CommandLineSpawnOptions,
  CommandLineSpawnSyncOptions,
  ICommandLine,
  ICommandLineProcessHandle,
  ICommandLineTrackedExecution,
} from "./ICommandLine";

/**
 * Builds one normalized command-line result.
 *
 * @param {Partial<CommandLineResult>} partial Partial result values.
 * @returns {CommandLineResult} Normalized result.
 */
function createResult(partial: Partial<CommandLineResult>): CommandLineResult {
  return {
    ok: partial.ok ?? false,
    exitCode: partial.exitCode ?? null,
    stdout: partial.stdout ?? "",
    stderr: partial.stderr ?? "",
    combinedOutput: partial.combinedOutput ?? "",
    reason: partial.reason ?? null,
    errorMessage: partial.errorMessage ?? null,
  };
}

/**
 * Creates one process handle adapter.
 *
 * @param {ChildProcess} runningChildProcess Child process.
 * @returns {ICommandLineProcessHandle} Process handle.
 */
function createProcessHandle(runningChildProcess: ChildProcess): ICommandLineProcessHandle {
  return {
    pid: runningChildProcess.pid ?? null,

    isRunning(): boolean {
      return (
        !runningChildProcess.killed &&
        runningChildProcess.exitCode === null &&
        runningChildProcess.signalCode === null
      );
    },

    kill(signal: NodeJS.Signals | number = "SIGTERM"): {
      ok: boolean;
      reason: string | null;
    } {
      if (
        runningChildProcess.killed ||
        runningChildProcess.exitCode !== null ||
        runningChildProcess.signalCode !== null
      ) {
        return { ok: false, reason: "not-running" };
      }

      try {
        const delivered = runningChildProcess.kill(signal);
        if (!delivered) {
          return { ok: false, reason: "signal-not-delivered" };
        }

        return { ok: true, reason: null };
      } catch {
        return { ok: false, reason: "kill-failed" };
      }
    },
  };
}

/**
 * Creates one tracked asynchronous process execution.
 *
 * @param {string} command Executable path or command.
 * @param {string[]} args Command arguments.
 * @param {CommandLineSpawnOptions} [options] Launch options.
 * @returns {ICommandLineTrackedExecution} Tracked execution.
 */
function createTrackedExecution(
  command: string,
  args: string[],
  options?: CommandLineSpawnOptions
): ICommandLineTrackedExecution {
  let child: ChildProcess;
  try {
    child = childProcess.spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      shell: false,
    });
  } catch (error) {
    return {
      handle: {
        pid: null,
        isRunning(): boolean {
          return false;
        },
        kill(): { ok: boolean; reason: string | null } {
          return { ok: false, reason: "not-running" };
        },
      },
      result: Promise.resolve(
        createResult({
          ok: false,
          reason: "spawn-failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        })
      ),
    };
  }

  const handle = createProcessHandle(child);
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let spawnErrorMessage: string | null = null;
  let timeoutId: NodeJS.Timeout | undefined;

  if (typeof options?.timeoutMs === "number" && options.timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      handle.kill("SIGTERM");
    }, options.timeoutMs);
  }

  child.stdout?.on("data", (chunk: Buffer | string) => {
    const text = chunk.toString();
    stdout += text;
    options?.onStdoutData?.(text);
  });

  child.stderr?.on("data", (chunk: Buffer | string) => {
    const text = chunk.toString();
    stderr += text;
    options?.onStderrData?.(text);
  });

  const result = new Promise<CommandLineResult>((resolve) => {
    child.on("error", (error: Error) => {
      spawnErrorMessage = error.message;
    });

    child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const combinedOutput = `${stdout}${stderr}`;

      if (spawnErrorMessage !== null) {
        resolve(
          createResult({
            ok: false,
            exitCode: code,
            stdout,
            stderr,
            combinedOutput,
            reason: timedOut ? "timeout-exceeded" : "spawn-failed",
            errorMessage: spawnErrorMessage,
          })
        );
        return;
      }

      if (timedOut) {
        resolve(
          createResult({
            ok: false,
            exitCode: code,
            stdout,
            stderr,
            combinedOutput,
            reason: "timeout-exceeded",
            errorMessage: null,
          })
        );
        return;
      }

      if (code === 0) {
        resolve(
          createResult({
            ok: true,
            exitCode: 0,
            stdout,
            stderr,
            combinedOutput,
            reason: null,
            errorMessage: null,
          })
        );
        return;
      }

      resolve(
        createResult({
          ok: false,
          exitCode: code,
          stdout,
          stderr,
          combinedOutput,
          reason: signal !== null ? "terminated-by-signal" : "non-zero-exit",
          errorMessage: null,
        })
      );
    });
  });

  return {
    handle,
    result,
  };
}

/**
 * Creates the concrete command-line module.
 *
 * @returns {ICommandLine} Command-line module.
 */
export function createCommandLine(): ICommandLine {
  return {
    async spawn(
      command: string,
      args: string[],
      options?: CommandLineSpawnOptions
    ): Promise<CommandLineResult> {
      return await createTrackedExecution(command, args, options).result;
    },

    spawnTracked(
      command: string,
      args: string[],
      options?: CommandLineSpawnOptions
    ): ICommandLineTrackedExecution {
      return createTrackedExecution(command, args, options);
    },

    spawnSync(
      command: string,
      args: string[],
      options?: CommandLineSpawnSyncOptions
    ): CommandLineResult {
      const result = childProcess.spawnSync(command, args, {
        cwd: options?.cwd,
        env: options?.env,
        timeout: options?.timeoutMs,
        encoding: options?.encoding ?? "utf8",
      });

      const stdout = typeof result.stdout === "string" ? result.stdout : "";
      const stderr = typeof result.stderr === "string" ? result.stderr : "";
      const combinedOutput = `${stdout}${stderr}`;

      if (result.error) {
        const errorCode =
          typeof result.error === "object" &&
          result.error !== null &&
          "code" in result.error &&
          typeof result.error.code === "string"
            ? result.error.code
            : null;

        return createResult({
          ok: false,
          exitCode: typeof result.status === "number" ? result.status : null,
          stdout,
          stderr,
          combinedOutput,
          reason: errorCode === "ETIMEDOUT" ? "timeout-exceeded" : "spawn-sync-failed",
          errorMessage: result.error.message,
        });
      }

      if (result.status === 0) {
        return createResult({
          ok: true,
          exitCode: 0,
          stdout,
          stderr,
          combinedOutput,
          reason: null,
          errorMessage: null,
        });
      }

      return createResult({
        ok: false,
        exitCode: typeof result.status === "number" ? result.status : null,
        stdout,
        stderr,
        combinedOutput,
        reason: result.signal ? "terminated-by-signal" : "non-zero-exit",
        errorMessage: null,
      });
    },

    createHandle(child: ChildProcess): ICommandLineProcessHandle {
      return createProcessHandle(child);
    },
  };
}
