/**
 * Host API exposed by VS Code webview runtime.
 */
export interface IVsCodeApiAdapter {
  /**
   * Posts a message to the extension host.
   *
   * @param {unknown} message Message payload.
   * @returns {void}
   */
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): IVsCodeApiAdapter;

/**
 * Returns the VS Code API adapter for the current webview runtime.
 *
 * @returns {IVsCodeApiAdapter} VS Code API adapter.
 */
export function getVsCodeApiAdapter(): IVsCodeApiAdapter {
  return acquireVsCodeApi();
}
