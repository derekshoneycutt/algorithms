import * as vscode from "vscode";
import { IViews } from "./views";
import { Views } from "./views/views";
import { ILanguages } from "./languages";
import { Languages } from "./languages/languages";
import { Runner } from "./runner/runner";
import { IRunner } from "./runner";

/**
 * Activates the extension.
 *
 * @param {vscode.ExtensionContext} context Extension lifecycle context.
 * @returns {void} No return value.
 */
export function activate(context: vscode.ExtensionContext): void {
  const languages : ILanguages = new Languages();
  const runner : IRunner = new Runner();
  const views : IViews = new Views(languages, runner);

  languages.activate(context);
  runner.activate(context);
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
