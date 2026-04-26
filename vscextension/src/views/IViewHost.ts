import type * as vscode from "vscode";

import type {
  HostToViewMessage,
  ViewToHostMessage,
} from "../comms";

/**
 * DI contract for host-side view interactions.
 */
export interface IViewHost extends vscode.Disposable {
  /**
   * Registers the current set of view providers.
   *
   * @returns {vscode.Disposable} Disposable registration handle.
   */
  register(): vscode.Disposable;

  /**
    * Focuses the primary smoke controls webview.
   *
   * @returns {Thenable<void>} Completion signal.
   */
  focusPrimaryView(): Thenable<void>;

  /**
   * Subscribes to typed messages received from the primary webview.
   *
   * @param {(message: ViewToHostMessage) => void} listener Message listener.
   * @returns {vscode.Disposable} Disposable listener registration.
   */
  onDidReceiveMessage(
    listener: (message: ViewToHostMessage) => void
  ): vscode.Disposable;

  /**
   * Posts a message to the primary webview if it is currently resolved.
   *
   * @param {HostToViewMessage} message Message payload.
   * @returns {Thenable<boolean> | undefined} Message delivery result or undefined if unresolved.
   */
  postMessageToPrimaryWebview(
    message: HostToViewMessage
  ): Thenable<boolean> | undefined;
}
