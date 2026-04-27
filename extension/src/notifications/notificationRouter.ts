import * as vscode from "vscode";

import type { INotificationRouter } from "./INotificationRouter";

/**
 * Creates the concrete VS Code-backed notification router.
 *
 * @returns {INotificationRouter} Notification router.
 */
export function createNotificationRouter(): INotificationRouter {
  return {
    info(message: string): Thenable<string | undefined> {
      return vscode.window.showInformationMessage(message);
    },

    warn(message: string): Thenable<string | undefined> {
      return vscode.window.showWarningMessage(message);
    },

    error(message: string): Thenable<string | undefined> {
      return vscode.window.showErrorMessage(message);
    },
  };
}
