import * as vscode from "vscode";
import { IViews } from "./views";
import { Views } from "./views/views";
import { SupportedWorkspaceChecker } from "./isSupportedWorkspace";

/**
 * Activates the extension.
 *
 * @param {vscode.ExtensionContext} context Extension lifecycle context.
 * @returns {void} No return value.
 */
export function activate(context: vscode.ExtensionContext): void {
  if (!SupportedWorkspaceChecker.isSupported()) {
    vscode.commands.executeCommand("setContext", "algos.workspaceSupported", false);
    return;
  }
  vscode.commands.executeCommand("setContext", "algos.workspaceSupported", true);
  const views : IViews = new Views();
  views.register(context);
  context.subscriptions.push(views);
}

/**
 * Deactivates the extension.
 *
 * @returns {void} No return value.
 */
export function deactivate(): void {}
