import type {
  HostToViewMessage,
  ViewToHostMessage,
} from "../../../../comms/shared/messageTypes";

import {
  createWebviewCommsFacade,
  type IWebviewCommsFacade,
} from "../../shared";

/**
 * Bootstrap panel comms facade.
 */
export interface IBootstrapCommsFacade {
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
 * Creates bootstrap panel comms facade from shared frontend comms base.
 *
 * @param {IWebviewCommsFacade} [base] Shared comms base.
 * @returns {IBootstrapCommsFacade} Bootstrap comms facade.
 */
export function createBootstrapCommsFacade(
  base: IWebviewCommsFacade = createWebviewCommsFacade()
): IBootstrapCommsFacade {
  return {
    send(message: ViewToHostMessage): void {
      base.send(message);
    },

    onMessage(listener: (message: HostToViewMessage) => void): () => void {
      return base.onMessage(listener);
    },
  };
}
