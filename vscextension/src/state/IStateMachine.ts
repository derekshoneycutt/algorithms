import type { ExtensionHostEvent, ExtensionHostSnapshot } from "./types";

/**
 * DI contract for the canonical host state machine.
 *
 * This is the only surface of the `state` module that consumers outside
 * the module should depend on. The machine starts the underlying XState
 * actor lazily on the first call to `send`.
 * Callers may read `getSnapshot` before any `send` call to inspect initial state.
 */
export interface IStateMachine {
  /**
   * Returns a read-only snapshot of the current machine state.
   *
   * @returns {ExtensionHostSnapshot} Current snapshot.
   */
  getSnapshot(): ExtensionHostSnapshot;

  /**
   * Sends an event to the machine, starting it lazily if it has not started yet.
   *
   * @param {ExtensionHostEvent} event Event to dispatch.
   * @returns {void}
   */
  send(event: ExtensionHostEvent): void;

  /**
   * Stops the machine and releases resources.
   *
   * @returns {void}
   */
  dispose(): void;
}
