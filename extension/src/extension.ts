import * as vscode from "vscode";

import { createCoordinator } from "./coordinator";

/**
 * Activates the TypeScript bootstrap extension runtime.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {void} No return value.
 */
export function activate(context: vscode.ExtensionContext): void {
  const coordinator = createCoordinator(context);
  context.subscriptions.push(coordinator);
}

/**
 * Deactivates the TypeScript bootstrap extension runtime.
 *
 * @returns {void} No return value.
 */
export function deactivate(): void {}