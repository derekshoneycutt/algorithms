export type {
  CheckEnvResult,
  CheckEnvStatus,
  CopyIconsResult,
  CopyIconsStatus,
  EnvironmentOperationState,
  EnvironmentReadResult,
  EnvironmentWriteRequest,
  EnvironmentWriteResult,
} from "./types";
export {
  buildCheckEnvCommand,
  buildCopyIconsCommand,
  parseCheckEnvOutput,
} from "./environmentOps";
export type { EnvironmentAdapterInput } from "./environmentAdapter";
export {
  executeCheckEnv,
  executeCopyIcons,
  readEnvironment,
  writeEnvironment,
} from "./environmentAdapter";
export type {
  CreateEnvironmentControlsChannelMessageHandlerInput,
} from "./environmentChannelHandler";
export {
  createEnvironmentControlsChannelMessageHandler,
} from "./environmentChannelHandler";
export type { ApplyConductorReactionDependencies } from "../channels/types";

/**
 * Creates an initial environment operation state.
 *
 * @returns {import("./types").EnvironmentOperationState} Initial state.
 */
export function createEnvironmentInitialState(): import("./types").EnvironmentOperationState {
  return {
    checkEnv: null,
    copyIcons: null,
    read: null,
    write: null,
  };
}
