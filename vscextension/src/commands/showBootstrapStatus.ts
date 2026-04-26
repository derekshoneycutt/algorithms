import type { ExtensionHostSnapshot, IStateMachine } from "../state";

/** The command ID this command handler is responsible for. */
const COMMAND_ID = "algos.showBootstrapStatus";

/**
 * Dependencies required to build the bootstrap status command.
 */
export interface BootstrapStatusCommandDependencies {
  extensionDisplayName: string;
  extensionVersion: string;
  hostState: IStateMachine;
  showStatusMessage: (message: string) => unknown;
}

/**
 * Builds the bootstrap status message from the current machine snapshot.
 *
 * @param {Pick<BootstrapStatusCommandDependencies, "extensionDisplayName" | "extensionVersion">} config Static extension metadata.
 * @param {ExtensionHostSnapshot} snapshot Current host state snapshot.
 * @returns {string} User-facing bootstrap status message.
 */
export function buildBootstrapStatusMessage(
  config: Pick<
    BootstrapStatusCommandDependencies,
    "extensionDisplayName" | "extensionVersion"
  >,
  snapshot: ExtensionHostSnapshot
): string {
  const base = `${config.extensionDisplayName} bootstrap is active (v${config.extensionVersion})`;

  if (snapshot.lastCommandId !== null) {
    return `${base} — last: ${snapshot.lastCommandId}.`;
  }

  return `${base}.`;
}

/**
 * Creates the bootstrap status command handler.
 *
 * On each invocation the handler sends a COMMAND_REQUESTED event to start the
 * machine lazily, reads the resulting snapshot to build the message, then
 * records the outcome via COMMAND_SUCCEEDED before returning.
 *
 * @param {BootstrapStatusCommandDependencies} dependencies Command dependencies.
 * @returns {() => Promise<string>} Command handler.
 */
export function createShowBootstrapStatusCommand(
  dependencies: BootstrapStatusCommandDependencies
): () => Promise<string> {
  return async function showBootstrapStatus(): Promise<string> {
    dependencies.hostState.send({
      type: "COMMAND_REQUESTED",
      commandId: COMMAND_ID,
    });

    const snapshot = dependencies.hostState.getSnapshot();
    const message = buildBootstrapStatusMessage(dependencies, snapshot);

    dependencies.hostState.send({ type: "COMMAND_SUCCEEDED", result: message });
    dependencies.showStatusMessage(message);

    return message;
  };
}