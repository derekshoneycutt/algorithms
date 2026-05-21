import * as vscode from "vscode";
import { IViews } from "./views";
import { Views } from "./views/views";
import { ILanguages } from "./languages";
import { Languages } from "./languages/languages";
import { Runner } from "./runner/runner";
import { IRunner } from "./runner";
import { ISmoker } from "./smoker";
import { Smoker } from "./smoker/smoker";
import { IEnvironment } from "./environment";
import { Environment } from "./environment/environment";

/**
 * Activates the extension.
 *
 * @param {vscode.ExtensionContext} context Extension lifecycle context.
 * @returns {void} No return value.
 */
export function activate(context: vscode.ExtensionContext): void {
  const languages : ILanguages = new Languages();
  const environment : IEnvironment = new Environment(languages);
  const runner : IRunner = new Runner(environment);
  const smoker : ISmoker = new Smoker(languages, environment);
  const views : IViews = new Views(languages, environment, runner, smoker);

  languages.activate(context);
  environment.activate(context);
  runner.activate(context);
  smoker.activate(context);
  views.activate(context);

  context.subscriptions.push(languages);
  context.subscriptions.push(environment);
  context.subscriptions.push(runner);
  context.subscriptions.push(smoker);
  context.subscriptions.push(views);
}

/**
 * Deactivates the extension.
 *
 * @returns {void} No return value.
 */
export function deactivate(): void {}
