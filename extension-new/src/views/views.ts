import * as vscode from 'vscode';
import { IViews } from ".";
import { SmokeView } from './smoke/smokeWebviewProvider';
import { RunView } from './run/runWebviewProvider';
import { AlgorithmsTreeView } from './algorithms/algorithmsTreeView';
import { StdLibTreeView } from './stdlib/stdlibTreeView';
import { EnvironmentView } from './environment/environmentWebviewProvider';

export class Views implements IViews {
  private smokeView : SmokeView;
  private runView : RunView;
  private algosTreeView : AlgorithmsTreeView;
  private stdlibTreeView : StdLibTreeView;
  private environmentView : EnvironmentView;

  public constructor() {
    this.smokeView = new SmokeView();
    this.runView = new RunView();
    this.algosTreeView = new AlgorithmsTreeView();
    this.stdlibTreeView = new StdLibTreeView();
    this.environmentView = new EnvironmentView();
  }

  public register(context: vscode.ExtensionContext): void {
    if (this.algosTreeView.isRegistered()) {
        return;
    }

    this.smokeView.register(context.extensionUri);
    this.runView.register(context.extensionUri);
    this.algosTreeView.register();
    this.stdlibTreeView.register();
    this.environmentView.register(context.extensionUri);
  }

  public dispose() : void {
    this.smokeView.dispose();
    this.runView.dispose();
    this.algosTreeView.dispose();
    this.stdlibTreeView.dispose();
    this.environmentView.dispose();
  }
}
