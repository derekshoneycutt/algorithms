import * as childProcess from "node:child_process";
import type { ChildProcess } from "node:child_process";

import type {
  CommandLineResult,
  CommandLineSpawnOptions,
  CommandLineSpawnSyncOptions,
  ICommandLine,
  ICommandLineProcessHandle,
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
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let spawnErrorMessage: string | null = null;

      let child: ChildProcess;
      try {
        child = childProcess.spawn(command, args, {
          cwd: options?.cwd,
          env: options?.env,
          shell: false,
        });
      } catch (error) {
        return createResult({
          ok: false,
          reason: "spawn-failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

      const handle = createProcessHandle(child);
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

      const closeResult = await new Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
      }>((resolve) => {
        child.on("error", (error: Error) => {
          spawnErrorMessage = error.message;
        });

        child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
          resolve({ code, signal });
        });
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const combinedOutput = `${stdout}${stderr}`;

      if (spawnErrorMessage !== null) {
        return createResult({
          ok: false,
          exitCode: closeResult.code,
          stdout,
          stderr,
          combinedOutput,
          reason: timedOut ? "timeout-exceeded" : "spawn-failed",
          errorMessage: spawnErrorMessage,
        });
      }

      if (timedOut) {
        return createResult({
          ok: false,
          exitCode: closeResult.code,
          stdout,
          stderr,
          combinedOutput,
          reason: "timeout-exceeded",
          errorMessage: null,
        });
      }

      if (closeResult.code === 0) {
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
        exitCode: closeResult.code,
        stdout,
        stderr,
        combinedOutput,
        reason:
          closeResult.signal !== null ? "terminated-by-signal" : "non-zero-exit",
        errorMessage: null,
      });
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
