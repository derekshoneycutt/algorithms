import type {
  HostToViewMessage,
  ViewToHostMessage,
} from "../../../../comms/shared/messageTypes";
import { isHostToViewMessage } from "../../../../comms/shared/messageTypes";

import type { IVsCodeApiAdapter } from "./vscodeApiAdapter";
import { getVsCodeApiAdapter } from "./vscodeApiAdapter";

interface IWebviewWindow {
  addEventListener(
    type: "message",
    listener: (event: { data?: unknown }) => void
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: { data?: unknown }) => void
  ): void;
}

declare const window: IWebviewWindow;

/**
 * Frontend comms facade used by webview panels.
 */
export interface IWebviewCommsFacade {
  /**
   * Sends one typed message to the host runtime.
   *
   * @param {ViewToHostMessage} message Message payload.
   * @returns {void}
   */
  send(message: ViewToHostMessage): void;

  /**
   * Subscribes to host-to-view messages.
   *
   * @param {(message: HostToViewMessage) => void} listener Message listener.
   * @returns {() => void} Unsubscribe callback.
   */
  onMessage(listener: (message: HostToViewMessage) => void): () => void;
}

/**
 * Creates the reusable webview comms facade.
 *
 * @param {IVsCodeApiAdapter} [vscodeApi] Optional VS Code API adapter.
 * @returns {IWebviewCommsFacade} Webview comms facade.
 */
export function createWebviewCommsFacade(
  vscodeApi: IVsCodeApiAdapter = getVsCodeApiAdapter()
): IWebviewCommsFacade {
  return {
    send(message: ViewToHostMessage): void {
      vscodeApi.postMessage(message);
    },

    onMessage(listener: (message: HostToViewMessage) => void): () => void {
      const handler = (event: { data?: unknown }): void => {
        if (!isHostToViewMessage(event.data)) {
          return;
        }

        listener(event.data);
      };

      window.addEventListener("message", handler);
      return () => {
        window.removeEventListener("message", handler);
      };
    },
  };
}
