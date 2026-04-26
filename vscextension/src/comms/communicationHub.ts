import * as vscode from "vscode";

import type { IViewHost } from "../views";
import type { ICommunicationHub } from "./ICommunicationHub";
import type { HostToViewMessage, ViewToHostMessage } from "./shared/messageTypes";

/**
 * Creates the concrete communication hub implementation.
 *
 * @param {IViewHost} viewHost View host dependency.
 * @returns {ICommunicationHub} Communication hub instance.
 */
export function createCommunicationHub(viewHost: IViewHost): ICommunicationHub {
  const listeners = new Set<(message: ViewToHostMessage) => void>();

  const inboundSubscription = viewHost.onDidReceiveMessage((message) => {
    for (const listener of listeners) {
      listener(message);
    }
  });

  return {
    subscribe(listener: (message: ViewToHostMessage) => void): vscode.Disposable {
      listeners.add(listener);
      return new vscode.Disposable(() => {
        listeners.delete(listener);
      });
    },

    post(message: HostToViewMessage): Thenable<boolean> | undefined {
      return viewHost.postMessageToPrimaryWebview(message);
    },

    dispose(): void {
      listeners.clear();
      inboundSubscription.dispose();
    },
  };
}
