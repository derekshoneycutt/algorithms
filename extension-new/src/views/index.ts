import * as vscode from 'vscode';

export interface IViews extends vscode.Disposable {
  register(context: vscode.ExtensionContext): void;
}
