import type * as vscode from "vscode";

import type { HostToViewMessage, ViewToHostMessage } from "./shared/messageTypes";

/**
 * DI contract for host-side communication between runtime modules and webviews.
 */
export interface ICommunicationHub extends vscode.Disposable {
  /**
   * Subscribes to view-to-host messages for one panel.
   *
   * @param {string} viewId Sidebar view identifier.
   * @param {(message: ViewToHostMessage) => void} listener Message listener.
   * @returns {vscode.Disposable} Disposable listener registration.
   */
  subscribe(
    viewId: string,
    listener: (message: ViewToHostMessage) => void
  ): vscode.Disposable;

  /**
   * Posts a typed message to one panel when available.
   *
   * @param {string} viewId Sidebar view identifier.
   * @param {HostToViewMessage} message Message payload.
   * @returns {Thenable<boolean> | undefined} Delivery result or undefined when unresolved.
   */
  post(
    viewId: string,
    message: HostToViewMessage
  ): Thenable<boolean> | undefined;
}
