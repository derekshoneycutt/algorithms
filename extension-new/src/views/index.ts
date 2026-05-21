import * as vscode from 'vscode';

export interface IViews extends vscode.Disposable {
  activate(context: vscode.ExtensionContext): void;
}
