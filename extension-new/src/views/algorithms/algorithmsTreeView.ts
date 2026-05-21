import * as vscode from 'vscode';
import {
  IAlgorithmCategory,
  IAlgorithmDirectory,
  IAlgorithmImplementation,
  ILanguages,
} from '../../languages';

export const algorithmsTreeViewId = "algos.algorithmsTreeView";
const docsImplementationKey = "__docs";
const setLanguageViewCommandId = "algos.algorithmsTreeView.setLanguageView";
const setFileViewCommandId = "algos.algorithmsTreeView.setFileView";
const showAllRowsCommandId = "algos.algorithmsTreeView.showAllRows";
const showProblemRowsCommandId = "algos.algorithmsTreeView.showProblemRows";
const flagImplementationCommandId = "algos.algorithmsTreeView.flagImplementation";
const unflagImplementationCommandId = "algos.algorithmsTreeView.unflagImplementation";
const algorithmsIndicatorScheme = "algos-indicator";
const zeroCountLanguageFragment = "zero-language-count";
const flaggedImplementationFragment = "flagged-implementation";
const implementationItemContextValueUnflagged = "algorithmImplementationUnflagged";
const implementationItemContextValueFlagged = "algorithmImplementationFlagged";

type AlgorithmImplementationViewMode = "language" | "file";
type AlgorithmImplementationFilterMode = "all" | "problem";

/**
 * Tree item for the Algorithms tree view.
 */
export class AlgorithmTreeItem extends vscode.TreeItem {
  public category: IAlgorithmCategory | undefined;
  public algorithmDirectory: IAlgorithmDirectory | undefined;
  public algorithmImplementation: IAlgorithmImplementation | undefined;
  public implementationParentDirectory: IAlgorithmDirectory | undefined;

  /**
   * Creates a tree item for any level of the Algorithms tree.
   *
   * @param {string} label Display label shown in the tree.
   * @param {string | undefined} path Backing filesystem path for the item.
   * @param {vscode.TreeItemCollapsibleState} collapsibleState Expansion behavior for the item.
   * @param {IAlgorithmCategory | undefined} category Category payload when this is a category node.
   * @param {IAlgorithmDirectory | undefined} algorithmDirectory Algorithm payload when this is an algorithm node.
   * @param {IAlgorithmImplementation | undefined} algorithmImplementation Implementation payload when this is an implementation node.
   * @param {IAlgorithmDirectory | undefined} implementationParentDirectory Parent algorithm directory for an implementation node.
   */
  constructor(
    label: string,
    path: string | undefined,
    collapsibleState: vscode.TreeItemCollapsibleState,
    category?: IAlgorithmCategory,
    algorithmDirectory?: IAlgorithmDirectory,
    algorithmImplementation?: IAlgorithmImplementation,
    implementationParentDirectory?: IAlgorithmDirectory,
  ) {
    super(label, collapsibleState);
    if (path) {
      this.resourceUri = vscode.Uri.file(path);
    }
    this.category = category;
    this.algorithmDirectory = algorithmDirectory;
    this.algorithmImplementation = algorithmImplementation;
    this.implementationParentDirectory = implementationParentDirectory;
  }
}

/**
 * Data provider for the Algorithms tree view.
 */
export class AlgorithmsTreeDataProvider implements vscode.TreeDataProvider<AlgorithmTreeItem> {
  private languages : ILanguages;
  private extensionUri : vscode.Uri;
  private implementationViewMode: AlgorithmImplementationViewMode;
  private implementationFilterMode: AlgorithmImplementationFilterMode;

  private _onDidChangeTreeData: vscode.EventEmitter<AlgorithmTreeItem | undefined | void>;

  public readonly onDidChangeTreeData: vscode.Event<AlgorithmTreeItem | undefined | void>;

  /**
   * Creates the data provider used by the Algorithms tree view.
   *
   * @param {ILanguages} languages Language/discovery service.
   * @param {vscode.Uri} extensionUri Extension root URI for icon resolution.
   */
  public constructor(languages : ILanguages, extensionUri: vscode.Uri) {
    this.languages = languages;
    this.extensionUri = extensionUri;
    this.implementationViewMode = "language";
    this.implementationFilterMode = "all";
    this._onDidChangeTreeData = new vscode.EventEmitter<AlgorithmTreeItem | undefined | void>();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  /**
   * Sets the implementation view mode and refreshes the tree.
   *
   * @param {AlgorithmImplementationViewMode} mode New implementation view mode.
   * @returns {void} No return value.
   */
  public setImplementationViewMode(mode: AlgorithmImplementationViewMode): void {
    if (this.implementationViewMode === mode) {
      return;
    }

    this.implementationViewMode = mode;
    this._onDidChangeTreeData.fire();
  }

  /**
   * Sets the implementation filter mode and refreshes the tree.
   *
   * @param {AlgorithmImplementationFilterMode} mode New implementation filter mode.
   * @returns {void} No return value.
   */
  public setImplementationFilterMode(mode: AlgorithmImplementationFilterMode): void {
    if (this.implementationFilterMode === mode) {
      return;
    }

    this.implementationFilterMode = mode;
    this._onDidChangeTreeData.fire();
  }

  /**
   * Refreshes the entire Algorithms tree.
   *
   * @returns {void} No return value.
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Resolves a language icon URI from the generated icon filename.
   *
   * @param {string} iconFileName Icon filename from language metadata.
   * @returns {vscode.Uri} Resolved extension-resource URI.
   */
  private getLanguageIconUri(iconFileName: string): vscode.Uri {
    return vscode.Uri.joinPath(this.extensionUri, "icons", "languages", iconFileName);
  }

  /**
   * Resolves implementation icon URI, including special non-language nodes.
   *
   * @param {IAlgorithmImplementation} implementation Implementation entry for the tree item.
   * @returns {vscode.Uri} Resolved extension-resource URI.
   */
  private getImplementationIconUri(implementation: IAlgorithmImplementation): vscode.Uri {
    if (implementation.languageKey === docsImplementationKey) {
      return vscode.Uri.joinPath(this.extensionUri,
        "icons", "languages", implementation.languageIconFileName);
    }

    return this.getLanguageIconUri(implementation.languageIconFileName);
  }

  /**
   * Computes the total visible file count represented by one implementation row.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Parent algorithm directory.
   * @param {IAlgorithmImplementation} implementation Implementation row metadata.
   * @returns {number} Total files represented by the row.
   */
  private async getImplementationFileCount(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation,
  ): Promise<number> {
    const childCount = (await this.languages.getAlgorithmImplementationChildren(
      algorithmDirectory,
      implementation,
    )).length;

    if (implementation.languageKey === docsImplementationKey) {
      return childCount;
    }

    if (!implementation.hasImplementation || !implementation.filePath) {
      return 0;
    }

    return 1 + childCount;
  }

  /**
   * Returns a synthetic URI used for tree-decoration badges.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Parent algorithm directory.
   * @param {IAlgorithmImplementation} implementation Implementation row metadata.
   * @param {number} fileCount Computed file count for the row.
   * @returns {vscode.Uri} Synthetic URI for decoration badges.
   */
  private getIndicatorResourceUri(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation,
    fileCount: number,
  ): vscode.Uri {
    const flaggedBadge = implementation.languageKey !== docsImplementationKey
      && implementation.isFlagged;

    const zeroBadge = this.implementationViewMode === "language"
      && implementation.languageKey !== docsImplementationKey
      && fileCount === 0;

    const fragment = flaggedBadge
      ? flaggedImplementationFragment
      : (zeroBadge ? zeroCountLanguageFragment : "");
    const key = `${algorithmDirectory.directoryPath}|${implementation.languageKey}`;
    return vscode.Uri.from({
      scheme: algorithmsIndicatorScheme,
      path: `/${encodeURIComponent(key)}`,
      fragment,
    });
  }

  /**
   * Configures a tree item to open its file in the active editor.
   *
   * @param {AlgorithmTreeItem} item Tree item to configure.
   * @returns {void} No return value.
   */
  private setOpenFileCommand(item: AlgorithmTreeItem, filePath?: string): void {
    const targetUri = filePath ? vscode.Uri.file(filePath) : item.resourceUri;
    if (!targetUri) {
      return;
    }

    item.command = {
      command: "vscode.open",
      title: "Open",
      arguments: [targetUri],
    };
  }

  /**
   * Returns the rendered tree item for a node.
   *
   * @param {AlgorithmTreeItem} element Node to render.
   * @returns {vscode.TreeItem} Rendered tree item.
   */
  getTreeItem(element: AlgorithmTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Builds root-level category items.
   *
   * @returns {Promise<AlgorithmTreeItem[]>} Root category tree items.
   */
  private async getRootCategoryItems(): Promise<AlgorithmTreeItem[]> {
    const categories = await this.languages.getAlgorithmCategories();
    const visibleCategories = this.implementationFilterMode === "problem"
      ? (await Promise.all(categories.map(async (category) => {
        const algorithms = await this.getCategoryAlgorithmItems(category);
        return {
          category,
          hasVisibleAlgorithms: algorithms.length > 0,
        };
      }))).filter((entry) => entry.hasVisibleAlgorithms).map((entry) => entry.category)
      : categories;

    return visibleCategories.map(
      (category) => new AlgorithmTreeItem(
        category.displayName,
        category.directoryPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        category,
      ));
  }

  /**
   * Builds algorithm items for one category node.
   *
   * @param {IAlgorithmCategory} category Category to enumerate.
   * @returns {Promise<AlgorithmTreeItem[]>} Algorithm items under the category.
   */
  private async getCategoryAlgorithmItems(category: IAlgorithmCategory): Promise<AlgorithmTreeItem[]> {
    const algorithms = await this.languages.getAlgorithmsInCategory(category);
    const visibleAlgorithms = this.implementationFilterMode === "problem"
      ? (await Promise.all(algorithms.map(async (algorithm) => {
        const hasVisibleImplementations = await this.hasVisibleImplementationRows(algorithm);
        return {
          algorithm,
          hasVisibleImplementations,
        };
      }))).filter((entry) => entry.hasVisibleImplementations).map((entry) => entry.algorithm)
      : algorithms;

    return visibleAlgorithms.map(
      (algorithm) => new AlgorithmTreeItem(
        algorithm.displayName,
        algorithm.directoryPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        algorithm,
      ));
  }

  /**
   * Returns true when one algorithm currently has at least one visible implementation row.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Algorithm directory to inspect.
   * @returns {Promise<boolean>} True when at least one implementation row is visible.
   */
  private async hasVisibleImplementationRows(
    algorithmDirectory: IAlgorithmDirectory,
  ): Promise<boolean> {
    const implementationItems = await this.getAlgorithmImplementationItems(algorithmDirectory);
    return implementationItems.length > 0;
  }

  /**
   * Returns true when one implementation row should appear in the current view mode.
   *
   * @param {IAlgorithmImplementation} implementation Candidate implementation row.
   * @returns {boolean} True when row is visible for the active view mode.
   */
  private isImplementationVisibleInCurrentView(implementation: IAlgorithmImplementation): boolean {
    if (this.implementationViewMode === "language") {
      return true;
    }

    if (implementation.languageKey === docsImplementationKey) {
      return true;
    }

    return implementation.hasImplementation
      && !!implementation.fileName
      && !!implementation.filePath;
  }

  /**
   * Returns true when one implementation row matches the problem filter.
   *
   * @param {IAlgorithmImplementation} implementation Candidate implementation row.
   * @param {number} fileCount Computed visible file count for the row.
   * @returns {boolean} True when row should be shown in problem filter mode.
   */
  private isProblemImplementationRow(
    implementation: IAlgorithmImplementation,
    fileCount: number,
  ): boolean {
    if (implementation.languageKey === docsImplementationKey) {
      return false;
    }

    if (implementation.isFlagged) {
      return true;
    }

    return this.implementationViewMode === "language" && fileCount === 0;
  }

  /**
   * Creates one rendered implementation tree item.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Parent algorithm directory.
   * @param {IAlgorithmImplementation} implementation Implementation row metadata.
   * @param {number} fileCount Computed visible file count.
   * @returns {AlgorithmTreeItem} Rendered implementation item.
   */
  private createImplementationTreeItem(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation,
    fileCount: number,
  ): AlgorithmTreeItem {
    const label = this.implementationViewMode === "language"
      && implementation.languageKey !== docsImplementationKey
      ? implementation.languageDisplayName
      : (implementation.fileName ?? implementation.languageDisplayName);

    const item = new AlgorithmTreeItem(
      label,
      implementation.filePath,
      implementation.hasChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      undefined,
      undefined,
      implementation,
      algorithmDirectory,
    );

    item.resourceUri = this.getIndicatorResourceUri(
      algorithmDirectory,
      implementation,
      fileCount,
    );

    if (implementation.languageKey !== docsImplementationKey) {
      item.contextValue = implementation.isFlagged
        ? implementationItemContextValueFlagged
        : implementationItemContextValueUnflagged;
    }

    item.iconPath = this.getImplementationIconUri(implementation);
    item.description = `${fileCount}`;

    if (item.collapsibleState === vscode.TreeItemCollapsibleState.None
        && implementation.languageKey !== docsImplementationKey
        && implementation.hasImplementation
        && !!implementation.filePath) {
      this.setOpenFileCommand(item, implementation.filePath);
    }

    return item;
  }

  /**
   * Builds implementation rows for one algorithm directory with view and filter modes applied.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Algorithm directory to enumerate.
   * @returns {Promise<AlgorithmTreeItem[]>} Implementation row items.
   */
  private async getAlgorithmImplementationItems(
    algorithmDirectory: IAlgorithmDirectory,
  ): Promise<AlgorithmTreeItem[]> {
    const implementations = await this.languages.getAlgorithmImplementations(algorithmDirectory);
    const viewVisibleImplementations = implementations
      .filter((implementation) => this.isImplementationVisibleInCurrentView(implementation));

    const implementationsWithCounts = await Promise.all(viewVisibleImplementations.map(async (implementation) => {
      const fileCount = await this.getImplementationFileCount(algorithmDirectory, implementation);
      return { implementation, fileCount };
    }));

    const filteredImplementationsWithCounts = this.implementationFilterMode === "problem"
      ? implementationsWithCounts
        .filter(({ implementation, fileCount }) => this.isProblemImplementationRow(implementation, fileCount))
      : implementationsWithCounts;

    return filteredImplementationsWithCounts
      .map(({ implementation, fileCount }) => this.createImplementationTreeItem(
        algorithmDirectory,
        implementation,
        fileCount,
      ));
  }

  /**
   * Builds child file rows for one implementation node.
   *
   * @param {IAlgorithmDirectory} algorithmDirectory Parent algorithm directory.
   * @param {IAlgorithmImplementation} implementation Parent implementation row.
   * @returns {Promise<AlgorithmTreeItem[]>} Child file items.
   */
  private async getImplementationChildItems(
    algorithmDirectory: IAlgorithmDirectory,
    implementation: IAlgorithmImplementation,
  ): Promise<AlgorithmTreeItem[]> {
    const children = await this.languages.getAlgorithmImplementationChildren(
      algorithmDirectory,
      implementation,
    );

    return children.map((child) => {
      const item = new AlgorithmTreeItem(
        child.displayName,
        child.filePath,
        vscode.TreeItemCollapsibleState.None,
      );
      item.iconPath = this.getImplementationIconUri(implementation);
      this.setOpenFileCommand(item);
      return item;
    });
  }

  /**
   * Returns children for the provided tree node.
   *
   * @param {AlgorithmTreeItem | undefined} element Parent node, or undefined for root items.
   * @returns {Thenable<AlgorithmTreeItem[]>} Child nodes for the current level.
   */
  async getChildren(element?: AlgorithmTreeItem): Promise<AlgorithmTreeItem[]> {
    if (!element) {
      return await this.getRootCategoryItems();
    }

    if (element.category) {
      return await this.getCategoryAlgorithmItems(element.category);
    }

    if (element.algorithmDirectory) {
      return await this.getAlgorithmImplementationItems(element.algorithmDirectory);
    }

    if (element.algorithmImplementation && element.implementationParentDirectory) {
      return await this.getImplementationChildItems(
        element.implementationParentDirectory,
        element.algorithmImplementation,
      );
    }

    return [];
  }
}

/**
 * Wrapper around the VS Code Algorithms tree view registration and lifecycle.
 */
export class AlgorithmsTreeView implements vscode.Disposable {
  private languages : ILanguages;
  private extensionUri : vscode.Uri | undefined;

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
    this.extensionUri = undefined;
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

    this.extensionUri = context.extensionUri;
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
    this.extensionUri = undefined;
    this.updateViewModeContext("language");
    this.updateFilterModeContext("all");
  }
}
