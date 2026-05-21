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
  languages.register(context);
  context.subscriptions.push(languages);

  const views : IViews = new Views(languages);
  views.register(context);
  context.subscriptions.push(views);
}

/**
 * Deactivates the extension.
 *
 * @returns {void} No return value.
 */
export function deactivate(): void {}
