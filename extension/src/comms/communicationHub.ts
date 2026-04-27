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
  const listenersByViewId = new Map<string, Set<(message: ViewToHostMessage) => void>>();
  const inboundSubscriptions = new Map<string, vscode.Disposable>();

  /**
   * Returns the listener set for one view ID, creating it when missing.
   *
   * @param {string} viewId Sidebar view identifier.
   * @returns {Set<(message: ViewToHostMessage) => void>} Listener set.
   */
  function getOrCreateListeners(
    viewId: string
  ): Set<(message: ViewToHostMessage) => void> {
    const existingListeners = listenersByViewId.get(viewId);
    if (existingListeners !== undefined) {
      return existingListeners;
    }

    const nextListeners = new Set<(message: ViewToHostMessage) => void>();
    listenersByViewId.set(viewId, nextListeners);
    return nextListeners;
  }

  /**
   * Ensures one inbound subscription exists for one view ID.
   *
   * @param {string} viewId Sidebar view identifier.
   * @returns {void}
   */
  function ensureInboundSubscription(viewId: string): void {
    if (inboundSubscriptions.has(viewId)) {
      return;
    }

    const inboundSubscription = viewHost.onDidReceiveMessage(viewId, (message) => {
      const listeners = listenersByViewId.get(viewId);
      if (listeners === undefined) {
        return;
      }

      for (const listener of listeners) {
        listener(message);
      }
    });

    inboundSubscriptions.set(viewId, inboundSubscription);
  }

  return {
    subscribe(
      viewId: string,
      listener: (message: ViewToHostMessage) => void
    ): vscode.Disposable {
      ensureInboundSubscription(viewId);
      const listeners = getOrCreateListeners(viewId);
      listeners.add(listener);

      return new vscode.Disposable(() => {
        listeners.delete(listener);
      });
    },

    post(
      viewId: string,
      message: HostToViewMessage
    ): Thenable<boolean> | undefined {
      return viewHost.postMessageToWebview(viewId, message);
    },

    dispose(): void {
      listenersByViewId.clear();

      for (const inboundSubscription of inboundSubscriptions.values()) {
        inboundSubscription.dispose();
      }

      inboundSubscriptions.clear();
    },
  };
}
