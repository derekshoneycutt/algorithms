export type {
  CommandLineResult,
  CommandLineSpawnOptions,
  CommandLineSpawnSyncOptions,
  ICommandLine,
  ICommandLineProcessHandle,
  ICommandLineTrackedExecution,
} from "./ICommandLine";
export { createCommandLine } from "./commandLine";
export type {
  AlgorithmsProfileValues,
  AlgorithmsProfileWritableValues,
  ParsedProfileValue,
} from "./internal/shellProfileCatalog";
export type {
  DockerRouteMap,
  ParsedAlgorithmsProfile,
  ParsedSshRoute,
  SshDirectConnectionRoute,
  SshNamedDestinationRoute,
  SshRouteMap,
} from "./internal/shellProfileParse";
export {
  extractManagedExportValue,
  parseAlgorithmsProfile,
  parseAlgorithmsProfileValues,
  parseDockerRouteMap,
  parseSshRouteMap,
  parseSshRouteValue,
  PROFILE_BLOCK_END,
  PROFILE_BLOCK_START,
} from "./internal/shellProfileParse";
export {
  renderAlgorithmsProfileBlock,
  upsertAlgorithmsProfileBlock,
} from "./internal/shellProfileWrite";
export {
  getDefaultProfilePathForPlatform,
  getProfilePlaceholderForPlatform,
} from "./internal/platformProfile";
export type { IRunCommandAdapter } from "./adapters";
export { createRunCommandAdapter } from "./adapters";
export type {
  ShellProfileAdapterInput,
  ShellProfileLoadResult,
  ShellProfileWriteResult,
  ShellProfileWriterInput,
} from "./adapters";
export { loadShellProfile, writeShellProfile } from "./adapters";
export type {
  AlgorithmsTerminalRunInput,
  IAlgorithmsTerminalRunAdapter,
} from "./adapters";
export {
  buildAlgorithmsTerminalRunCommand,
  createAlgorithmsTerminalRunAdapter,
} from "./adapters";
