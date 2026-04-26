/**
 * DI contract for the full set of extension commands.
 *
 * Consumers that need to invoke or register commands depend on this interface
 * rather than concrete implementations. The coordinator is the only module
 * that constructs a concrete value satisfying `IExtensionCommands`.
 */
export interface IExtensionCommands {
  /**
   * Displays the current bootstrap status.
   *
   * @returns {Promise<string>} The status message that was displayed.
   */
  showBootstrapStatus: () => Promise<string>;
}
