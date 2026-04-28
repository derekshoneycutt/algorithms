import type { ICommandLine } from "../../commandline";
import {
  loadShellProfile,
  writeShellProfile,
} from "../../commandline";
import type { IFilesystem } from "../../filesystem";
import {
  buildCheckEnvCommand,
  buildCopyIconsCommand,
  parseCheckEnvOutput,
} from "./environmentOps";
import type {
  CheckEnvResult,
  CopyIconsResult,
  EnvironmentReadResult,
  EnvironmentWriteRequest,
  EnvironmentWriteResult,
} from "./types";

/**
 * Dependencies required for environment operations.
 */
export interface EnvironmentAdapterInput {
  filesystem: IFilesystem;
  commandLine: ICommandLine;
  repositoryRoot: string;
}

/**
 * Reads the managed DEREKALGOS environment profile.
 *
 * @param {EnvironmentAdapterInput} input Adapter dependencies.
 * @param {string} [profilePath] Optional profile path override.
 * @returns {Promise<EnvironmentReadResult>} Parsed profile result.
 */
export async function readEnvironment(
  input: EnvironmentAdapterInput,
  profilePath?: string
): Promise<EnvironmentReadResult> {
  return loadShellProfile({
    filesystem: input.filesystem,
    profilePath,
  });
}

/**
 * Writes the managed DEREKALGOS environment profile.
 *
 * @param {EnvironmentAdapterInput} input Adapter dependencies.
 * @param {EnvironmentWriteRequest} request Write request with values.
 * @returns {Promise<EnvironmentWriteResult>} Written profile result.
 */
export async function writeEnvironment(
  input: EnvironmentAdapterInput,
  request: EnvironmentWriteRequest
): Promise<EnvironmentWriteResult> {
  return writeShellProfile({
    filesystem: input.filesystem,
    values: request.values,
    profilePath: request.profilePath,
  });
}

/**
 * Executes the check-environment diagnostics operation.
 *
 * @param {EnvironmentAdapterInput} input Adapter dependencies.
 * @param {string} [profilePath] Optional profile path override.
 * @returns {Promise<CheckEnvResult>} Check-environment result.
 */
export async function executeCheckEnv(
  input: EnvironmentAdapterInput,
  profilePath?: string
): Promise<CheckEnvResult> {
  const command = buildCheckEnvCommand(input.repositoryRoot, profilePath);

  try {
    const result = await input.commandLine.spawn("sh", ["-c", command], {
      cwd: input.repositoryRoot,
    });

    const { errors: _errors, filteredOutput, rawOutput } = parseCheckEnvOutput(
      (result.stdout || "") + (result.stderr || "")
    );

    const exitCode = result.exitCode ?? null;
    const isSuccess = exitCode === 0;

    return {
      kind: isSuccess ? "ok" : "error",
      text: isSuccess
        ? "Environment check succeeded."
        : "Environment check found issues.",
      filteredOutput,
      rawOutput,
      exitCode,
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
 * Executes the copy-icons operation.
 *
 * @param {EnvironmentAdapterInput} input Adapter dependencies.
 * @param {string} [profilePath] Optional profile path override.
 * @param {string} [copyIconsPath] Optional destination path for icons.
 * @returns {Promise<CopyIconsResult>} Copy-icons result.
 */
export async function executeCopyIcons(
  input: EnvironmentAdapterInput,
  profilePath?: string,
  copyIconsPath?: string
): Promise<CopyIconsResult> {
  const command = buildCopyIconsCommand(
    input.repositoryRoot,
    profilePath,
    copyIconsPath
  );

  try {
    const result = await input.commandLine.spawn("sh", ["-c", command], {
      cwd: input.repositoryRoot,
    });

    const exitCode = result.exitCode ?? null;
    const isSuccess = exitCode === 0;

    return {
      kind: isSuccess ? "ok" : "error",
      text: isSuccess
        ? "Icons copied successfully."
        : `Icon copy failed with exit code ${exitCode}.`,
      exitCode,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      kind: "error",
      text: `Icon copy failed: ${errorMessage}`,
      exitCode: null,
    };
  }
}
