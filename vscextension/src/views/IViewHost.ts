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
    * Focuses one registered sidebar webview.
   *
   * @param {string} viewId Sidebar view identifier.
   * @returns {Thenable<void>} Completion signal.
   */
  focusView(viewId: string): Thenable<void>;

  /**
   * Subscribes to typed messages received from one resolved webview.
   *
   * @param {string} viewId Sidebar view identifier.
   * @param {(message: ViewToHostMessage) => void} listener Message listener.
   * @returns {vscode.Disposable} Disposable listener registration.
   */
  onDidReceiveMessage(
    viewId: string,
    listener: (message: ViewToHostMessage) => void
  ): vscode.Disposable;

  /**
   * Posts a message to one webview if it is currently resolved.
   *
   * @param {string} viewId Sidebar view identifier.
   * @param {HostToViewMessage} message Message payload.
   * @returns {Thenable<boolean> | undefined} Message delivery result or undefined if unresolved.
   */
  postMessageToWebview(
    viewId: string,
    message: HostToViewMessage
  ): Thenable<boolean> | undefined;

  /**
   * Converts one extension resource URI into a webview-safe URI string for one resolved webview.
   *
   * @param {string} viewId Sidebar view identifier.
   * @param {vscode.Uri} resourceUri Extension resource URI.
   * @returns {string | undefined} Webview-safe URI or undefined when unresolved.
   */
  toWebviewResourceUri(
    viewId: string,
    resourceUri: vscode.Uri
  ): string | undefined;
}
