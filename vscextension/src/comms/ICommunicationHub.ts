import type * as vscode from "vscode";

import type { HostToViewMessage, ViewToHostMessage } from "./shared/messageTypes";

/**
 * DI contract for host-side communication between runtime modules and webviews.
 */
export interface ICommunicationHub extends vscode.Disposable {
  /**
   * Subscribes to view-to-host messages.
   *
   * @param {(message: ViewToHostMessage) => void} listener Message listener.
   * @returns {vscode.Disposable} Disposable listener registration.
   */
  subscribe(listener: (message: ViewToHostMessage) => void): vscode.Disposable;

  /**
   * Posts a typed message to the primary webview when available.
   *
   * @param {HostToViewMessage} message Message payload.
   * @returns {Thenable<boolean> | undefined} Delivery result or undefined when unresolved.
   */
  post(message: HostToViewMessage): Thenable<boolean> | undefined;
}
