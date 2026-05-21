import * as vscode from 'vscode';
import { IViews } from ".";
import { SmokeView } from './smoke/smokeWebviewProvider';
import { RunView } from './run/runWebviewProvider';
import { AlgorithmsTreeView } from './algorithms/algorithmsTreeView';
import { StdLibTreeView } from './stdlib/stdlibTreeView';
import { EnvironmentView } from './environment/environmentWebviewProvider';
import { ILanguages } from '../languages';

export class Views implements IViews {
  private languages : ILanguages;

  private smokeView : SmokeView;
  private runView : RunView;
  private algosTreeView : AlgorithmsTreeView;
  private stdlibTreeView : StdLibTreeView;
  private environmentView : EnvironmentView;

  public constructor(languages : ILanguages) {
    this.languages = languages;
    this.smokeView = new SmokeView();
    this.runView = new RunView();
    this.algosTreeView = new AlgorithmsTreeView(this.languages);
    this.stdlibTreeView = new StdLibTreeView(this.languages);
    this.environmentView = new EnvironmentView();
  }

  public register(context: vscode.ExtensionContext): void {
    if (this.algosTreeView.isRegistered()) {
        return;
    }

    this.smokeView.register(context.extensionUri);
    this.runView.register(context.extensionUri);
    this.algosTreeView.register(context);
    this.stdlibTreeView.register(context.extensionUri);
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
