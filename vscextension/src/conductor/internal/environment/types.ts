import type {
  AlgorithmsProfileValues,
  AlgorithmsProfileWritableValues,
  ShellProfileLoadResult,
  ShellProfileWriteResult,
} from "../../../commandline";

/**
 * Explicit operation state for check-environment diagnostics.
 */
export type CheckEnvStatus = "running" | "ok" | "error";

/**
 * Result from executing check-environment diagnostics.
 */
export interface CheckEnvResult {
  kind: CheckEnvStatus;
  text: string;
  filteredOutput: string;
  rawOutput: string;
  exitCode: number | null;
}

/**
 * Explicit operation state for copy-icons operation.
 */
export type CopyIconsStatus = "running" | "ok" | "error";

/**
 * Result from executing copy-icons operation.
 */
export interface CopyIconsResult {
  kind: CopyIconsStatus;
  text: string;
  exitCode: number | null;
}

/**
 * Result from reading the managed environment profile.
 */
export type EnvironmentReadResult = ShellProfileLoadResult;

/**
 * Request to write managed environment variables.
 */
export interface EnvironmentWriteRequest {
  values: AlgorithmsProfileWritableValues;
  profilePath?: string;
}

/**
 * Result from writing the managed environment profile.
 */
export type EnvironmentWriteResult = ShellProfileWriteResult;

/**
 * Initial state container for environment operations.
 */
export interface EnvironmentOperationState {
  checkEnv: CheckEnvResult | null;
  copyIcons: CopyIconsResult | null;
  read: EnvironmentReadResult | null;
  write: EnvironmentWriteResult | null;
}
