import * as vscode from "vscode";

import { createActivationServices } from "./activator";
import { createCoordinator } from "./coordinator";

/**
 * Activates the TypeScript bootstrap extension runtime.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {void} No return value.
 */
export function activate(context: vscode.ExtensionContext): void {
  const activationServices = createActivationServices(context);
  const coordinator = createCoordinator(context, activationServices);
  context.subscriptions.push(coordinator);
}

/**
 * Deactivates the TypeScript bootstrap extension runtime.
 *
 * @returns {void} No return value.
 */
export function deactivate(): void {}