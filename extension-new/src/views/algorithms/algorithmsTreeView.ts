import * as vscode from 'vscode';
import { ILanguages } from '../../languages';
import {
  algorithmsTreeViewId,
  docsImplementationKey,
  algorithmsIndicatorScheme,
  zeroCountLanguageFragment,
  flaggedImplementationFragment,
  AlgorithmImplementationFilterMode,
  AlgorithmImplementationViewMode,
  AlgorithmsTreeDataProvider,
  AlgorithmTreeItem
} from './algorithmsTreeDataProvider';

const setLanguageViewCommandId = "algos.algorithmsTreeView.setLanguageView";
const setFileViewCommandId = "algos.algorithmsTreeView.setFileView";
const showAllRowsCommandId = "algos.algorithmsTreeView.showAllRows";
const showProblemRowsCommandId = "algos.algorithmsTreeView.showProblemRows";
const flagImplementationCommandId = "algos.algorithmsTreeView.flagImplementation";
const unflagImplementationCommandId = "algos.algorithmsTreeView.unflagImplementation";

/**
 * Wrapper around the VS Code Algorithms tree view registration and lifecycle.
 */
export class AlgorithmsTreeView implements vscode.Disposable {
  private languages : ILanguages;
  private dataProvider : AlgorithmsTreeDataProvider | undefined;
  private treeView : vscode.TreeView<AlgorithmTreeItem> | undefined;
  private indicatorDecorationProviderSubscription: vscode.Disposable | undefined;
  private setLanguageViewCommandSubscription: vscode.Disposable | undefined;
  private setFileViewCommandSubscription: vscode.Disposable | undefined;
  private showAllRowsCommandSubscription: vscode.Disposable | undefined;
  private showProblemRowsCommandSubscription: vscode.Disposable | undefined;
  private flagImplementationCommandSubscription: vscode.Disposable | undefined;
  private unflagImplementationCommandSubscription: vscode.Disposable | undefined;

  /**
   * Creates the Algorithms tree view manager.
   *
   * @param {ILanguages} languages Language/discovery service.
   */
  public constructor(languages : ILanguages) {
    this.languages = languages;
    this.dataProvider = undefined;
    this.treeView = undefined;
    this.indicatorDecorationProviderSubscription = undefined;
    this.setLanguageViewCommandSubscription = undefined;
    this.setFileViewCommandSubscription = undefined;
    this.showAllRowsCommandSubscription = undefined;
    this.showProblemRowsCommandSubscription = undefined;
    this.flagImplementationCommandSubscription = undefined;
    this.unflagImplementationCommandSubscription = undefined;
  }

  /**
   * Updates context values used by the title-bar view mode toggle buttons.
   *
   * @param {AlgorithmImplementationViewMode} mode Active implementation view mode.
   * @returns {void} No return value.
   */
  private updateViewModeContext(mode: AlgorithmImplementationViewMode): void {
    void vscode.commands.executeCommand("setContext", "algos.algorithmsTreeView.mode", mode);
  }

  /**
   * Updates context values used by the title-bar filter toggle buttons.
   *
   * @param {AlgorithmImplementationFilterMode} mode Active implementation filter mode.
   * @returns {void} No return value.
   */
  private updateFilterModeContext(mode: AlgorithmImplementationFilterMode): void {
    void vscode.commands.executeCommand("setContext", "algos.algorithmsTreeView.filterMode", mode);
  }

  /**
   * Returns file-decoration metadata for synthetic indicator URIs.
   *
   * @param {vscode.Uri} uri Resource URI provided by VS Code decoration pipeline.
   * @returns {vscode.FileDecoration | undefined} Decoration data when URI maps to one indicator state.
   */
  private provideIndicatorDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== algorithmsIndicatorScheme) {
      return undefined;
    }

    if (uri.fragment === flaggedImplementationFragment) {
      return {
        badge: "●",
        color: new vscode.ThemeColor("testing.iconFailed"),
        tooltip: "Language is flagged for this algorithm",
      };
    }

    if (uri.fragment !== zeroCountLanguageFragment) {
      return undefined;
    }

    return {
      badge: "●",
      color: new vscode.ThemeColor("testing.iconQueued"),
      tooltip: "Language has no files in this algorithm",
    };
  }

  /**
   * Registers the synthetic file-decoration provider used for algorithm row badges.
   *
   * @returns {void} No return value.
   */
  private registerIndicatorDecorationProvider(): void {
    this.indicatorDecorationProviderSubscription = vscode.window.registerFileDecorationProvider({
      provideFileDecoration: (uri: vscode.Uri) => this.provideIndicatorDecoration(uri),
    });
  }

  /**
   * Registers the language/file mode toggle commands.
   *
   * @returns {void} No return value.
   */
  private registerViewModeCommands(): void {
    this.setLanguageViewCommandSubscription = vscode.commands.registerCommand(
      setLanguageViewCommandId,
      () => {
        this.dataProvider?.setImplementationViewMode("language");
        this.updateViewModeContext("language");
      },
    );

    this.setFileViewCommandSubscription = vscode.commands.registerCommand(
      setFileViewCommandId,
      () => {
        this.dataProvider?.setImplementationViewMode("file");
        this.updateViewModeContext("file");
      },
    );
  }

  /**
   * Registers the all/problem filter toggle commands.
   *
   * @returns {void} No return value.
   */
  private registerFilterModeCommands(): void {
    this.showAllRowsCommandSubscription = vscode.commands.registerCommand(
      showAllRowsCommandId,
      () => {
        this.dataProvider?.setImplementationFilterMode("all");
        this.updateFilterModeContext("all");
      },
    );

    this.showProblemRowsCommandSubscription = vscode.commands.registerCommand(
      showProblemRowsCommandId,
      () => {
        this.dataProvider?.setImplementationFilterMode("problem");
        this.updateFilterModeContext("problem");
      },
    );
  }

  /**
   * Returns true when a tree item points to a flaggable algorithm implementation.
   *
   * @param {AlgorithmTreeItem | undefined} item Candidate tree item from command invocation.
   * @returns {boolean} True when item can be flagged or unflagged.
   */
  private isFlaggableImplementationItem(item: AlgorithmTreeItem | undefined): item is AlgorithmTreeItem {
    if (!item?.algorithmImplementation || !item.implementationParentDirectory) {
      return false;
    }

    return item.algorithmImplementation.languageKey !== docsImplementationKey;
  }

  /**
   * Persists flagged state for one implementation item and refreshes the tree.
   *
   * @param {AlgorithmTreeItem | undefined} item Tree item whose implementation flag should be updated.
   * @param {boolean} isFlagged True to set flagged state; false to clear it.
   * @returns {Promise<void>} Resolves when state is persisted and view refreshed.
   */
  private async updateImplementationFlag(
    item: AlgorithmTreeItem | undefined,
    isFlagged: boolean,
  ): Promise<void> {
    const algorithmImplementation = item?.algorithmImplementation;
    const implementationParentDirectory = item?.implementationParentDirectory;
    if (!algorithmImplementation || !implementationParentDirectory) {
      return;
    }

    if (algorithmImplementation.languageKey === docsImplementationKey) {
      return;
    }

    await this.languages.setAlgorithmImplementationFlagged(
      implementationParentDirectory,
      algorithmImplementation,
      isFlagged,
    );

    this.dataProvider?.refresh();
  }

  /**
   * Registers inline tree commands for flagging and unflagging implementation rows.
   *
   * @returns {void} No return value.
   */
  private registerFlagCommands(): void {
    this.flagImplementationCommandSubscription = vscode.commands.registerCommand(
      flagImplementationCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.updateImplementationFlag(item, true);
      },
    );

    this.unflagImplementationCommandSubscription = vscode.commands.registerCommand(
      unflagImplementationCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.updateImplementationFlag(item, false);
      },
    );
  }

  /**
   * Registers the Algorithms tree view if it is not already registered.
   *
    * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @param {boolean} showCollapseAll Whether to show the collapse-all button.
   * @returns {void} No return value.
   */
  public register(context: vscode.ExtensionContext, showCollapseAll: boolean = false): void {
    if (this.treeView !== undefined) {
      return;
    }

    this.dataProvider = new AlgorithmsTreeDataProvider(this.languages, context.extensionUri);
    this.treeView = vscode.window.createTreeView(
      algorithmsTreeViewId,
      {
        treeDataProvider: this.dataProvider,
        showCollapseAll: showCollapseAll
      });

    this.registerIndicatorDecorationProvider();

    this.updateViewModeContext("language");
    this.updateFilterModeContext("all");

    this.registerViewModeCommands();
    this.registerFilterModeCommands();
    this.registerFlagCommands();
  }

  /**
   * Returns whether the tree view has been registered.
   *
   * @returns {boolean} True when the tree view exists.
   */
  public isRegistered(): boolean {
    return (this.treeView !== undefined);
  }

  /**
   * Returns the active data provider instance.
   *
   * @returns {AlgorithmsTreeDataProvider | undefined} Current data provider.
   */
  public getProvider(): AlgorithmsTreeDataProvider | undefined {
    return this.dataProvider;
  }

  /**
   * Returns the active tree view instance.
   *
   * @returns {vscode.TreeView<AlgorithmTreeItem> | undefined} Current tree view.
   */
  public getTreeView(): vscode.TreeView<AlgorithmTreeItem> | undefined {
    return this.treeView;
  }

  /**
   * Refreshes the Algorithms tree view when registered.
   *
   * @returns {void} No return value.
   */
  public refresh(): void {
    this.dataProvider?.refresh();
  }

  /**
   * Reveals one file path in the Algorithms tree when currently visible in the active mode.
   *
   * @param {string} filePath Absolute file path to reveal.
   * @returns {Promise<boolean>} True when an item was found and revealed.
   */
  public async revealFile(filePath: string): Promise<boolean> {
    if (!this.treeView || !this.dataProvider) {
      return false;
    }

    const item = await this.dataProvider.findItemForFilePath(filePath);
    if (!item) {
      return false;
    }

    try {
      await this.treeView.reveal(item, { select: true, focus: false, expand: true });
      return true;
    }
    catch {
      return false;
    }
  }

  /**
   * Disposes the tree view and provider references.
   *
   * @returns {void} No return value.
   */
  public dispose() : void {
    this.indicatorDecorationProviderSubscription?.dispose();
    this.indicatorDecorationProviderSubscription = undefined;

    this.setLanguageViewCommandSubscription?.dispose();
    this.setLanguageViewCommandSubscription = undefined;
    this.setFileViewCommandSubscription?.dispose();
    this.setFileViewCommandSubscription = undefined;

    this.showAllRowsCommandSubscription?.dispose();
    this.showAllRowsCommandSubscription = undefined;
    this.showProblemRowsCommandSubscription?.dispose();
    this.showProblemRowsCommandSubscription = undefined;

    this.flagImplementationCommandSubscription?.dispose();
    this.flagImplementationCommandSubscription = undefined;
    this.unflagImplementationCommandSubscription?.dispose();
    this.unflagImplementationCommandSubscription = undefined;

    if (this.treeView !== undefined) {
      this.treeView.dispose();
      this.treeView = undefined;
    }
    if (this.dataProvider !== undefined) {
      this.dataProvider = undefined;
    }
    this.updateViewModeContext("language");
    this.updateFilterModeContext("all");
  }
}
