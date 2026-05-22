import * as vscode from 'vscode';

/**
 * Contract for managing extension views.
 */
export interface IViews extends vscode.Disposable {
  /**
   * Activates and registers all extension views.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  activate(context: vscode.ExtensionContext): void;
}
