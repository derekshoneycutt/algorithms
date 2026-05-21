import * as vscode from "vscode";
import { IViews } from "./views";
import { Views } from "./views/views";
import { ILanguages } from "./languages";
import { Languages } from "./languages/languages";

/**
 * Activates the extension.
 *
 * @param {vscode.ExtensionContext} context Extension lifecycle context.
 * @returns {void} No return value.
 */
export function activate(context: vscode.ExtensionContext): void {
  const languages : ILanguages = new Languages();
  const views : IViews = new Views(languages);

  languages.activate(context);
  views.activate(context);

  context.subscriptions.push(languages);
  context.subscriptions.push(views);
}

/**
 * Deactivates the extension.
 *
 * @returns {void} No return value.
 */
export function deactivate(): void {}
