import type {
  CommandLineResult,
  CommandLineSpawnOptions,
  ICommandLine,
} from "../ICommandLine";

/**
 * Adapter contract for run-command behavior.
 */
export interface IRunCommandAdapter {
  /**
   * Runs one command through the commandline module.
   *
   * @param {string} command Executable path or command.
   * @param {string[]} args Command arguments.
   * @param {CommandLineSpawnOptions} [options] Launch options.
   * @returns {Promise<CommandLineResult>} Normalized command result.
   */
  run(
    command: string,
    args: string[],
    options?: CommandLineSpawnOptions
  ): Promise<CommandLineResult>;
}

/**
 * Creates the bootstrap run-command adapter.
 *
 * This is a structural adapter layer scaffold. It currently delegates directly
 * to the underlying commandline module while preserving adapter boundaries.
 *
 * @param {ICommandLine} commandLine Commandline module dependency.
 * @returns {IRunCommandAdapter} Run-command adapter.
 */
export function createRunCommandAdapter(
  commandLine: ICommandLine
): IRunCommandAdapter {
  return {
    run(
      command: string,
      args: string[],
      options?: CommandLineSpawnOptions
    ): Promise<CommandLineResult> {
      return commandLine.spawn(command, args, options);
    },
  };
}
