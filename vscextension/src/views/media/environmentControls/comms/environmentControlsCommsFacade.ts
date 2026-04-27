import type {
  HostToViewMessage,
  ViewToHostMessage,
} from "../../../../comms/shared/messageTypes";

import {
  createWebviewCommsFacade,
  type IWebviewCommsFacade,
} from "../../shared";

/**
 * Environment controls panel comms facade.
 */
export interface IEnvironmentControlsCommsFacade {
  /**
   * Sends one typed message to the host.
   *
   * @param {ViewToHostMessage} message Message payload.
   * @returns {void}
   */
  send(message: ViewToHostMessage): void;

  /**
   * Subscribes to host messages for this panel.
   *
   * @param {(message: HostToViewMessage) => void} listener Message listener.
   * @returns {() => void} Unsubscribe callback.
   */
  onMessage(listener: (message: HostToViewMessage) => void): () => void;
}

/**
 * Creates environment controls panel comms facade from shared frontend comms base.
 *
 * @param {IWebviewCommsFacade} [base] Shared comms base.
 * @returns {IEnvironmentControlsCommsFacade} Environment controls comms facade.
 */
export function createEnvironmentControlsCommsFacade(
  base: IWebviewCommsFacade = createWebviewCommsFacade()
): IEnvironmentControlsCommsFacade {
  return {
    send(message: ViewToHostMessage): void {
      base.send(message);
    },

    onMessage(listener: (message: HostToViewMessage) => void): () => void {
      return base.onMessage(listener);
    },
  };
}
