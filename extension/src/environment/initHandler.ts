import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "node:child_process";

const initScriptFileName = "init.sh";
const defaultProcessTimeoutMs = 2 * 60 * 1000;
const forceKillDelayMs = 2000;

/**
 * Canonical operation result kind for init.sh commands.
 */
export type InitHandlerResultKind = "ok" | "error";

/**
 * Shared request options for init.sh operations.
 */
export interface InitHandlerOperationRequest {
  profilePath?: string;
  timeoutMs?: number;
}

/**
 * Request options for the check-environment operation.
 */
export type InitHandlerCheckEnvironmentRequest = InitHandlerOperationRequest;

/**
 * Request options for the copy-icons operation.
 */
export interface InitHandlerCopyIconsRequest extends InitHandlerOperationRequest {
  copyIconsPath?: string;
}

/**
 * Result for the check-environment operation.
 */
export interface InitHandlerCheckEnvironmentResult {
  kind: InitHandlerResultKind;
  text: string;
  filteredOutput: string;
  rawOutput: string;
  exitCode: number | null;
}

/**
 * Result for the copy-icons operation.
 */
export interface InitHandlerCopyIconsResult {
  kind: InitHandlerResultKind;
  text: string;
  rawOutput: string;
  exitCode: number | null;
}

interface SpawnedProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  didTimeout: boolean;
}

/**
 * Encapsulates init.sh command management for Environment actions.
 */
export class InitHandler {

  private readonly repositoryRoot: string;

  /**
   * Creates an init.sh command handler scoped to one repository root.
   *
   * @param {string} repositoryRoot Absolute path to the algorithms repository root.
   */
  public constructor(repositoryRoot: string) {
    this.repositoryRoot = repositoryRoot;
  }

  /**
   * Runs `init.sh --check-env` and returns parsed/filtered diagnostics output.
   *
   * @param {InitHandlerCheckEnvironmentRequest} [request] Optional operation overrides.
   * @returns {Promise<InitHandlerCheckEnvironmentResult>} Check-environment result.
   */
  public async checkEnvironment(
    request?: InitHandlerCheckEnvironmentRequest,
  ): Promise<InitHandlerCheckEnvironmentResult> {
    const args = ["--no-prompt", "--no-icons", "--check-env"];
    const profilePath = this.normalizeOptionalValue(request?.profilePath);
    if (profilePath) {
      args.push(`--update-profile=${profilePath}`);
    }

    try {
      const processResult = await this.runInitScript(args, request?.timeoutMs);
      const rawOutput = `${processResult.stdout}${processResult.stderr}`;
      const filteredOutput = this.filterCheckEnvironmentOutput(rawOutput);
      const isSuccess = !processResult.didTimeout && processResult.exitCode === 0;

      return {
        kind: isSuccess ? "ok" : "error",
        text: isSuccess
          ? "Environment check succeeded."
          : processResult.didTimeout
            ? "Environment check timed out."
            : "Environment check found issues.",
        filteredOutput,
        rawOutput,
        exitCode: processResult.exitCode,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        kind: "error",
        text: `Environment check failed: ${errorMessage}`,
        filteredOutput: "",
        rawOutput: errorMessage,
        exitCode: null,
      };
    }
  }

  /**
   * Runs `init.sh --copy-icons --skip-environment`.
   *
   * @param {InitHandlerCopyIconsRequest} [request] Optional operation overrides.
   * @returns {Promise<InitHandlerCopyIconsResult>} Copy-icons result.
   */
  public async copyIcons(
    request?: InitHandlerCopyIconsRequest,
  ): Promise<InitHandlerCopyIconsResult> {
    const args = ["--no-prompt", "--copy-icons", "--skip-environment"];
    const profilePath = this.normalizeOptionalValue(request?.profilePath);
    if (profilePath) {
      args.push(`--update-profile=${profilePath}`);
    }

    const copyIconsPath = this.normalizeOptionalValue(request?.copyIconsPath);
    if (copyIconsPath) {
      args.push(`--icons-to=${copyIconsPath}`);
    }

    try {
      const processResult = await this.runInitScript(args, request?.timeoutMs);
      const rawOutput = `${processResult.stdout}${processResult.stderr}`;
      const isSuccess = !processResult.didTimeout && processResult.exitCode === 0;

      return {
        kind: isSuccess ? "ok" : "error",
        text: isSuccess
          ? "Icons copied successfully."
          : processResult.didTimeout
            ? "Copy icons timed out."
            : `Icon copy failed with exit code ${processResult.exitCode}.`,
        rawOutput,
        exitCode: processResult.exitCode,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        kind: "error",
        text: `Icon copy failed: ${errorMessage}`,
        rawOutput: errorMessage,
        exitCode: null,
      };
    }
  }

  /**
   * Runs one init.sh invocation and captures process output.
   *
   * @param {string[]} scriptArgs init.sh argument vector.
   * @param {number | undefined} timeoutMs Optional process timeout in milliseconds.
   * @returns {Promise<SpawnedProcessResult>} Captured process result.
   */
  private async runInitScript(scriptArgs: string[], timeoutMs: number | undefined): Promise<SpawnedProcessResult> {
    await this.ensureInitScriptExists();
    const initScriptPath = path.join(this.repositoryRoot, initScriptFileName);
    const effectiveTimeoutMs = typeof timeoutMs === "number" && timeoutMs > 0
      ? timeoutMs
      : defaultProcessTimeoutMs;

    return await new Promise<SpawnedProcessResult>((resolve, reject) => {
      const child = spawn("sh", [initScriptPath, ...scriptArgs], {
        cwd: this.repositoryRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let didTimeout = false;

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += String(chunk);
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += String(chunk);
      });

      const timeoutHandle = setTimeout(() => {
        didTimeout = true;
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, forceKillDelayMs);
      }, effectiveTimeoutMs);

      child.on("error", (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });

      child.on("close", (exitCode, signal) => {
        clearTimeout(timeoutHandle);
        resolve({
          stdout,
          stderr,
          exitCode,
          signal,
          didTimeout,
        });
      });
    });
  }

  /**
   * Returns a display-focused check-environment output subset.
   *
   * @param {string} rawOutput Raw combined stdout/stderr output.
   * @returns {string} Filtered output for primary UI display.
   */
  private filterCheckEnvironmentOutput(rawOutput: string): string {
    const rawText = String(rawOutput || "");
    const lines = rawText.split("\n");
    const errorLines = lines.filter((line) => {
      return /(error|invalid|failed|missing|unsupported)/i.test(line);
    });

    if (errorLines.length > 0) {
      return errorLines.join("\n");
    }

    if (lines.length > 40) {
      return lines.slice(-40).join("\n");
    }

    return rawText;
  }

  /**
   * Returns an optional trimmed value.
   *
   * @param {string | undefined} value Candidate optional value.
   * @returns {string | undefined} Trimmed value when non-empty.
   */
  private normalizeOptionalValue(value: string | undefined): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      return undefined;
    }

    return normalizedValue;
  }

  /**
   * Throws when init.sh cannot be found at the configured repository root.
   *
   * @returns {Promise<void>} Resolves when script exists.
   */
  private async ensureInitScriptExists(): Promise<void> {
    const initScriptPath = path.join(this.repositoryRoot, initScriptFileName);
    try {
      await fs.access(initScriptPath);
    } catch {
      throw new Error(`Unable to find ${initScriptFileName} at ${initScriptPath}`);
    }
  }

}
