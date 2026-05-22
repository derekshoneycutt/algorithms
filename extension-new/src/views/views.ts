import * as vscode from 'vscode';
import { IViews } from ".";
import { SmokeView } from './smoke/smokeWebviewProvider';
import { RunView } from './run/runWebviewProvider';
import { AlgorithmsTreeView } from './algorithms/algorithmsTreeView';
import { StdLibTreeView } from './stdlib/stdlibTreeView';
import { EnvironmentView } from './environment/environmentWebviewProvider';
import { ILanguages, ILanguagesDataChangeEvent } from '../languages';
import { IRunner } from '../runner';
import { ISmoker } from '../smoker';
import { IEnvironment } from '../environment';
import { ITracker } from '../tracker';
import { ContextMenuRunHelper } from './shared/contextMenuRunHelper';

const explorerRunFileCommandId = 'algos.explorerRunFile';
const explorerCompileOnlyCommandId = 'algos.explorerCompileOnly';
const explorerCheckOnlyNativeCommandId = 'algos.explorerCheckOnlyNative';
const explorerCheckOnlyDockerCommandId = 'algos.explorerCheckOnlyDocker';
const explorerCheckOnlySshCommandId = 'algos.explorerCheckOnlySsh';
const explorerCleanCommandId = 'algos.explorerClean';
const explorerLocalCleanCommandId = 'algos.explorerLocalClean';

export class Views implements IViews {

  private readonly languages : ILanguages;
  private readonly environment : IEnvironment;
  private readonly runner : IRunner;
  private readonly smoker : ISmoker;
  private readonly tracker : ITracker;

  private readonly smokeView : SmokeView;
  private readonly runView : RunView;
  private readonly algosTreeView : AlgorithmsTreeView;
  private readonly stdlibTreeView : StdLibTreeView;
  private readonly environmentView : EnvironmentView;
  private readonly contextMenuRunHelper: ContextMenuRunHelper;
  private dataChangeSubscription : vscode.Disposable | undefined;
  private activeEditorChangeSubscription : vscode.Disposable | undefined;
  private algorithmsTreeVisibilitySubscription : vscode.Disposable | undefined;
  private stdlibTreeVisibilitySubscription : vscode.Disposable | undefined;
  private trackerStateSubscription : vscode.Disposable | undefined;
  private environmentStateSubscription : vscode.Disposable | undefined;
  private explorerRunFileCommandSubscription: vscode.Disposable | undefined;
  private explorerCompileOnlyCommandSubscription: vscode.Disposable | undefined;
  private explorerCheckOnlyNativeCommandSubscription: vscode.Disposable | undefined;
  private explorerCheckOnlyDockerCommandSubscription: vscode.Disposable | undefined;
  private explorerCheckOnlySshCommandSubscription: vscode.Disposable | undefined;
  private explorerCleanCommandSubscription: vscode.Disposable | undefined;
  private explorerLocalCleanCommandSubscription: vscode.Disposable | undefined;
  private lastRevealKey: string;

  /**
   * Creates the Views orchestrator for all extension views.
   *
   * @param {ILanguages} languages Language/discovery service dependency.
   * @param {IEnvironment} environment Enviroment actor managing environment state.
   * @param {IRunner} runner Runner actor managing run states.
   * @param {ISmoker} smoker Smoker actor managing smoke states.
   * @param {ITracker} tracker Tracker actor managing language run statuses.
   */
  public constructor(
    languages : ILanguages,
    environment: IEnvironment,
    runner: IRunner,
    smoker: ISmoker,
    tracker: ITracker) {
  
    this.languages = languages;
    this.environment = environment;
    this.runner = runner;
    this.smoker = smoker;
    this.tracker = tracker;
    this.smokeView = new SmokeView(this.smoker);
    this.runView = new RunView(this.runner);
    this.algosTreeView = new AlgorithmsTreeView(this.languages, this.runner, this.smoker, this.tracker);
    this.stdlibTreeView = new StdLibTreeView(this.languages);
    this.environmentView = new EnvironmentView(this.environment);
    this.contextMenuRunHelper = new ContextMenuRunHelper(this.languages, this.runner);
    this.dataChangeSubscription = undefined;
    this.activeEditorChangeSubscription = undefined;
    this.algorithmsTreeVisibilitySubscription = undefined;
    this.stdlibTreeVisibilitySubscription = undefined;
    this.trackerStateSubscription = undefined;
    this.environmentStateSubscription = undefined;
    this.explorerRunFileCommandSubscription = undefined;
    this.explorerCompileOnlyCommandSubscription = undefined;
    this.explorerCheckOnlyNativeCommandSubscription = undefined;
    this.explorerCheckOnlyDockerCommandSubscription = undefined;
    this.explorerCheckOnlySshCommandSubscription = undefined;
    this.explorerCleanCommandSubscription = undefined;
    this.explorerLocalCleanCommandSubscription = undefined;
    this.lastRevealKey = "";
  }

  /**
   * Registers Explorer context run commands and routes them through the shared run helper.
   *
   * @returns {void} No return value.
   */
  private registerExplorerRunCommands(): void {
    this.explorerRunFileCommandSubscription = vscode.commands.registerCommand(
      explorerRunFileCommandId,
      async (clickedUri?: vscode.Uri) => {
        await this.contextMenuRunHelper.executeAction({
          actionKind: 'run-file',
          resourceUri: clickedUri,
        });
      },
    );

    this.explorerCompileOnlyCommandSubscription = vscode.commands.registerCommand(
      explorerCompileOnlyCommandId,
      async (clickedUri?: vscode.Uri) => {
        await this.contextMenuRunHelper.executeAction({
          actionKind: 'compile-only',
          resourceUri: clickedUri,
        });
      },
    );

    this.explorerCheckOnlyNativeCommandSubscription = vscode.commands.registerCommand(
      explorerCheckOnlyNativeCommandId,
      async (clickedUri?: vscode.Uri) => {
        await this.contextMenuRunHelper.executeAction({
          actionKind: 'check-only',
          checkOnlyRouteOverride: 'native',
          resourceUri: clickedUri,
        });
      },
    );

    this.explorerCheckOnlyDockerCommandSubscription = vscode.commands.registerCommand(
      explorerCheckOnlyDockerCommandId,
      async (clickedUri?: vscode.Uri) => {
        await this.contextMenuRunHelper.executeAction({
          actionKind: 'check-only',
          checkOnlyRouteOverride: 'docker',
          resourceUri: clickedUri,
        });
      },
    );

    this.explorerCheckOnlySshCommandSubscription = vscode.commands.registerCommand(
      explorerCheckOnlySshCommandId,
      async (clickedUri?: vscode.Uri) => {
        await this.contextMenuRunHelper.executeAction({
          actionKind: 'check-only',
          checkOnlyRouteOverride: 'ssh',
          resourceUri: clickedUri,
        });
      },
    );

    this.explorerCleanCommandSubscription = vscode.commands.registerCommand(
      explorerCleanCommandId,
      async (clickedUri?: vscode.Uri) => {
        await this.contextMenuRunHelper.executeAction({
          actionKind: 'clean',
          resourceUri: clickedUri,
        });
      },
    );

    this.explorerLocalCleanCommandSubscription = vscode.commands.registerCommand(
      explorerLocalCleanCommandId,
      async (clickedUri?: vscode.Uri) => {
        await this.contextMenuRunHelper.executeAction({
          actionKind: 'localclean',
          resourceUri: clickedUri,
        });
      },
    );
  }

  /**
   * Updates the context key that controls Algorithms tree edit-only icon visibility.
   *
   * @param {boolean} editModeEnabled True when environment edit mode is enabled.
   * @returns {void} No return value.
   */
  private updateAlgorithmsEditModeContext(editModeEnabled: boolean): void {
    void vscode.commands.executeCommand("setContext", "algos.environment.editModeEnabled", editModeEnabled);
  }

  /**
   * Handles Languages data change notifications and routes refresh actions by scope.
   *
   * @param {ILanguagesDataChangeEvent} event Data change event from Languages.
   * @returns {void} No return value.
   */
  private handleLanguagesDataChange(event: ILanguagesDataChangeEvent): void {
    if (event.scope === "workspace") {
      this.algosTreeView.refresh();
      this.stdlibTreeView.refresh();
      return;
    }

    if (event.scope === "algorithms") {
      this.algosTreeView.refresh();
      return;
    }

    if (event.scope === "stdlib") {
      this.stdlibTreeView.refresh();
    }
  }

  /**
   * Returns true when at least one tree view is currently visible.
   *
   * @returns {boolean} True when reveal work should be attempted.
   */
  private hasAnyVisibleTreeView(): boolean {
    const algorithmsVisible = this.algosTreeView.getTreeView()?.visible ?? false;
    const stdlibVisible = this.stdlibTreeView.getTreeView()?.visible ?? false;
    return algorithmsVisible || stdlibVisible;
  }

  /**
   * Attempts to reveal the active editor file in Algorithms first, then StdLib.
   *
   * @param {string} filePath Absolute file path to reveal.
   * @returns {Promise<string | undefined>} View key for successful reveal, or undefined.
   */
  private async revealActiveFileInTrees(filePath: string): Promise<string | undefined> {
    const algorithmsRevealed = await this.algosTreeView.revealFile(filePath);
    if (algorithmsRevealed) {
      return "algorithms";
    }

    const stdlibRevealed = await this.stdlibTreeView.revealFile(filePath);
    if (stdlibRevealed) {
      return "stdlib";
    }

    return undefined;
  }

  /**
   * Handles active-editor change events and reveals recognized files in tree views.
   *
   * @param {vscode.TextEditor | undefined} editor Active text editor.
   * @returns {Promise<void>} Resolves when reveal processing is complete.
   */
  private async handleActiveEditorChanged(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!editor) {
      return;
    }

    const activeUri = editor.document.uri;
    if (activeUri.scheme !== "file") {
      return;
    }

    if (!this.hasAnyVisibleTreeView()) {
      return;
    }

    const filePath = activeUri.fsPath;
    const isRecognized = await this.languages.isRecognizedFile(filePath);
    if (!isRecognized) {
      return;
    }

    const previousAlgorithmsKey = `${filePath}:algorithms`;
    const previousStdlibKey = `${filePath}:stdlib`;
    if (this.lastRevealKey === previousAlgorithmsKey
        || this.lastRevealKey === previousStdlibKey) {
      return;
    }

    const revealedView = await this.revealActiveFileInTrees(filePath);
    if (!revealedView) {
      return;
    }

    this.lastRevealKey = `${filePath}:${revealedView}`;
  }

  /**
   * Runs one reveal pass for the current active editor when available.
   *
   * @returns {void} No return value.
   */
  private revealCurrentActiveEditor(): void {
    void this.handleActiveEditorChanged(vscode.window.activeTextEditor);
  }

  /**
   * Activates and registers all views and related subscriptions.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  public activate(context: vscode.ExtensionContext): void {
    if (this.algosTreeView.isRegistered()) {
        return;
    }

    this.smokeView.register(context.extensionUri);
    this.runView.register(context.extensionUri);
    this.algosTreeView.register(context);
    this.stdlibTreeView.register(context.extensionUri);
    this.environmentView.register(context.extensionUri);

    this.updateAlgorithmsEditModeContext(this.environment.getEnvironmentControlsState().editModeEnabled);

    this.dataChangeSubscription = this.languages.subscribeToDataChanges((event) => {
      this.handleLanguagesDataChange(event);
    });

    this.activeEditorChangeSubscription = vscode.window.onDidChangeActiveTextEditor((editor) => {
      void this.handleActiveEditorChanged(editor);
    });

    this.algorithmsTreeVisibilitySubscription = this.algosTreeView
      .getTreeView()
      ?.onDidChangeVisibility(() => {
        this.revealCurrentActiveEditor();
      });

    this.stdlibTreeVisibilitySubscription = this.stdlibTreeView
      .getTreeView()
      ?.onDidChangeVisibility(() => {
        this.revealCurrentActiveEditor();
      });

    this.trackerStateSubscription = this.tracker.subscribeToStateChanges(() => {
      this.algosTreeView.refresh();
    });

    this.environmentStateSubscription = this.environment.subscribeToStateChanges((state) => {
      this.updateAlgorithmsEditModeContext(state.editModeEnabled);
    });

    this.registerExplorerRunCommands();

    // Initial pass for already-open editors in the debug host.
    this.revealCurrentActiveEditor();
  }

  /**
   * Disposes all view registrations and event subscriptions.
   *
   * @returns {void} No return value.
   */
  public dispose() : void {
    this.dataChangeSubscription?.dispose();
    this.dataChangeSubscription = undefined;

    this.activeEditorChangeSubscription?.dispose();
    this.activeEditorChangeSubscription = undefined;

    this.algorithmsTreeVisibilitySubscription?.dispose();
    this.algorithmsTreeVisibilitySubscription = undefined;
    this.stdlibTreeVisibilitySubscription?.dispose();
    this.stdlibTreeVisibilitySubscription = undefined;
    this.trackerStateSubscription?.dispose();
    this.trackerStateSubscription = undefined;

    this.environmentStateSubscription?.dispose();
    this.environmentStateSubscription = undefined;

    this.explorerRunFileCommandSubscription?.dispose();
    this.explorerRunFileCommandSubscription = undefined;
    this.explorerCompileOnlyCommandSubscription?.dispose();
    this.explorerCompileOnlyCommandSubscription = undefined;
    this.explorerCheckOnlyNativeCommandSubscription?.dispose();
    this.explorerCheckOnlyNativeCommandSubscription = undefined;
    this.explorerCheckOnlyDockerCommandSubscription?.dispose();
    this.explorerCheckOnlyDockerCommandSubscription = undefined;
    this.explorerCheckOnlySshCommandSubscription?.dispose();
    this.explorerCheckOnlySshCommandSubscription = undefined;
    this.explorerCleanCommandSubscription?.dispose();
    this.explorerCleanCommandSubscription = undefined;
    this.explorerLocalCleanCommandSubscription?.dispose();
    this.explorerLocalCleanCommandSubscription = undefined;

    this.updateAlgorithmsEditModeContext(false);

    this.lastRevealKey = "";

    this.smokeView.dispose();
    this.runView.dispose();
    this.algosTreeView.dispose();
    this.stdlibTreeView.dispose();
    this.environmentView.dispose();
  }
}
