import * as vscode from 'vscode';
import {
  IAlgorithmCategory,
  IAlgorithmDirectory,
  IAlgorithmImplementation,
  ILanguages,
} from '../../languages';
import {
  ITracker,
  TrackerLanguageRunState,
  TrackerRunStatus,
} from '../../tracker';

export const algorithmsTreeViewId = "algos.algorithmsTreeView";
export const docsImplementationKey = "__docs";
export const algorithmsIndicatorScheme = "algos-indicator";
export const zeroCountLanguageFragment = "zero-language-count";
export const flaggedImplementationFragment = "flagged-implementation";
export const runStatusQueuedFragment = "run-status-queued";
export const runStatusRunningFragment = "run-status-running";
export const runStatusCompletedFragment = "run-status-completed";
export const runStatusFailedFragment = "run-status-failed";
export const runStatusCancelledFragment = "run-status-cancelled";
export const implementationItemContextValueUnflagged = "algorithmImplementationUnflagged";
export const implementationItemContextValueFlagged = "algorithmImplementationFlagged";
export const implementationItemContextValueWithHistoryUnflagged = "algorithmImplementationWithHistoryUnflagged";
export const implementationItemContextValueWithHistoryFlagged = "algorithmImplementationWithHistoryFlagged";
export const implementationItemContextValueBusyCancellableUnflagged = "algorithmImplementationBusyCancellableUnflagged";
export const implementationItemContextValueBusyCancellableFlagged = "algorithmImplementationBusyCancellableFlagged";
export const implementationItemContextValueBusyUncancellableUnflagged = "algorithmImplementationBusyUncancellableUnflagged";
export const implementationItemContextValueBusyUncancellableFlagged = "algorithmImplementationBusyUncancellableFlagged";
export const implementationItemContextValueMissingUnflagged = "algorithmImplementationMissingUnflagged";
export const implementationItemContextValueMissingFlagged = "algorithmImplementationMissingFlagged";
export const docsImplementationItemContextValue = "algorithmDocs";
export const docsFileItemContextValue = "algorithmDocsFile";
export const algorithmCategoryItemContextValue = "algorithmCategory";
export const algorithmFolderItemContextValue = "algorithmFolder";
export const algorithmFolderItemContextValueWithRunHistory = "algorithmFolderWithRunHistory";

export type AlgorithmImplementationViewMode = "language" | "file";
export type AlgorithmImplementationFilterMode = "all" | "problem";

/**
 * Tree item for the Algorithms tree view.
 */
export class AlgorithmTreeItem extends vscode.TreeItem {
  public category: IAlgorithmCategory | undefined;
  public algorithmDirectory: IAlgorithmDirectory | undefined;
  public algorithmImplementation: IAlgorithmImplementation | undefined;
  public implementationParentDirectory: IAlgorithmDirectory | undefined;
  public implementationParentCategory: IAlgorithmCategory | undefined;
  public isImplementationRow: boolean;

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
   * @param {IAlgorithmCategory | undefined} implementationParentCategory Parent category for one implementation node.
   * @param {boolean} isImplementationRow True when this item is the implementation row itself.
   */
  constructor(
    label: string,
    path: string | undefined,
    collapsibleState: vscode.TreeItemCollapsibleState,
    category?: IAlgorithmCategory,
    algorithmDirectory?: IAlgorithmDirectory,
    algorithmImplementation?: IAlgorithmImplementation,
    implementationParentDirectory?: IAlgorithmDirectory,
    implementationParentCategory?: IAlgorithmCategory,
    isImplementationRow: boolean = false,
  ) {
    super(label, collapsibleState);
    if (path) {
      this.resourceUri = vscode.Uri.file(path);
    }
    this.category = category;
    this.algorithmDirectory = algorithmDirectory;
    this.algorithmImplementation = algorithmImplementation;
    this.implementationParentDirectory = implementationParentDirectory;
    this.implementationParentCategory = implementationParentCategory;
    this.isImplementationRow = isImplementationRow;
  }
}

/**
 * Data provider for the Algorithms tree view.
 */
export class AlgorithmsTreeDataProvider implements vscode.TreeDataProvider<AlgorithmTreeItem> {
  private languages : ILanguages;
  private tracker: ITracker;
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
   * @param {ITracker} tracker Tracker for language run-status lookup.
   */
  public constructor(languages : ILanguages, extensionUri: vscode.Uri, tracker: ITracker) {
    this.languages = languages;
    this.tracker = tracker;
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
    runStatus?: TrackerRunStatus,
  ): vscode.Uri {
    const runStatusFragment = this.getRunStatusFragment(runStatus);
    if (runStatusFragment !== undefined) {
      const key = `${algorithmDirectory.directoryPath}|${implementation.languageKey}`;
      return vscode.Uri.from({
        scheme: algorithmsIndicatorScheme,
        path: `/${encodeURIComponent(key)}`,
        fragment: runStatusFragment,
      });
    }

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
   * Returns one synthetic URI fragment for tracker run status.
   *
   * @param {TrackerRunStatus | undefined} runStatus Tracker run status.
   * @returns {string | undefined} Run-status fragment for decoration lookup.
   */
  private getRunStatusFragment(runStatus: TrackerRunStatus | undefined): string | undefined {
    if (runStatus === "queued") {
      return runStatusQueuedFragment;
    }

    if (runStatus === "running") {
      return runStatusRunningFragment;
    }

    if (runStatus === "completed") {
      return runStatusCompletedFragment;
    }

    if (runStatus === "failed") {
      return runStatusFailedFragment;
    }

    if (runStatus === "cancelled") {
      return runStatusCancelledFragment;
    }

    return undefined;
  }

  /**
   * Builds one run-status tooltip text from tracker details.
   *
   * @param {TrackerRunStatus} status Tracker run status.
   * @param {string} message Tracker status message.
   * @returns {string} Tooltip text.
   */
  private buildRunStatusTooltip(status: TrackerRunStatus, message: string): string {
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const trimmedMessage = String(message || "").trim();

    if (trimmedMessage.length === 0) {
      return `Run File: ${statusLabel}`;
    }

    return `Run File: ${statusLabel}\n${trimmedMessage}`;
  }

  /**
   * Resolves one implementation row context value from missing/flagged/run-status inputs.
   *
   * @param {IAlgorithmImplementation} implementation Implementation row metadata.
   * @param {TrackerLanguageRunState | undefined} trackerRunState Optional tracker run state.
   * @returns {string} Context value used by menu when-clauses.
   */
  private getImplementationContextValue(
    implementation: IAlgorithmImplementation,
    trackerRunState: TrackerLanguageRunState | undefined,
  ): string {
    const isMissingInLanguageView = this.implementationViewMode === "language"
      && !implementation.hasImplementation;

    if (isMissingInLanguageView) {
      return implementation.isFlagged
        ? implementationItemContextValueMissingFlagged
        : implementationItemContextValueMissingUnflagged;
    }

    const runStatus = trackerRunState?.status;
    const hasRunHistory = runStatus !== undefined && runStatus !== "idle";
    const isBusy = runStatus === "queued" || runStatus === "running";
    const isSingleCancellable = trackerRunState?.cancelability === "single-run";

    if (hasRunHistory && isBusy) {
      if (isSingleCancellable) {
        return implementation.isFlagged
          ? implementationItemContextValueBusyCancellableFlagged
          : implementationItemContextValueBusyCancellableUnflagged;
      }

      return implementation.isFlagged
        ? implementationItemContextValueBusyUncancellableFlagged
        : implementationItemContextValueBusyUncancellableUnflagged;
    }

    if (hasRunHistory) {
      return implementation.isFlagged
        ? implementationItemContextValueWithHistoryFlagged
        : implementationItemContextValueWithHistoryUnflagged;
    }

    return implementation.isFlagged
      ? implementationItemContextValueFlagged
      : implementationItemContextValueUnflagged;
  }

  /**
   * Returns true when one algorithm has any retained non-idle run status.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @returns {boolean} True when any implementation under the algorithm has run history.
   */
  private hasAlgorithmRunHistory(algorithmPath: string): boolean {
    const trackerState = this.tracker.getTrackerState();
    const languageRuns = trackerState.languageRunsByAlgorithmPath?.[algorithmPath];
    if (!languageRuns) {
      return false;
    }

    return Object.values(languageRuns).some((runState) => runState.status !== "idle");
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

    return visibleCategories.map((category) => {
      const item = new AlgorithmTreeItem(
        category.displayName,
        category.directoryPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        category,
      );
      item.contextValue = algorithmCategoryItemContextValue;
      return item;
    });
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

    return visibleAlgorithms.map((algorithm) => {
      const item = new AlgorithmTreeItem(
        algorithm.displayName,
        algorithm.directoryPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        category,
        algorithm,
      );
      item.contextValue = this.hasAlgorithmRunHistory(algorithm.directoryPath)
        ? algorithmFolderItemContextValueWithRunHistory
        : algorithmFolderItemContextValue;
      return item;
    });
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
    category: IAlgorithmCategory | undefined,
    implementation: IAlgorithmImplementation,
    fileCount: number,
  ): AlgorithmTreeItem {
    const label = this.implementationViewMode === "language"
      && implementation.languageKey !== docsImplementationKey
      ? implementation.languageDisplayName
      : (implementation.fileName ?? implementation.languageDisplayName);

    const normalizedLanguageKey = implementation.languageKey.trim().toLowerCase();
    const trackerRunState = implementation.languageKey === docsImplementationKey
      ? undefined
      : this.tracker.getLanguageRunStatus(algorithmDirectory.directoryPath, normalizedLanguageKey);

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
      category,
      true,
    );

    item.resourceUri = this.getIndicatorResourceUri(
      algorithmDirectory,
      implementation,
      fileCount,
      trackerRunState?.status,
    );

    if (trackerRunState?.status && trackerRunState.status !== "idle") {
      item.tooltip = this.buildRunStatusTooltip(trackerRunState.status, trackerRunState.message);
    }

    if (implementation.languageKey === docsImplementationKey) {
      item.contextValue = docsImplementationItemContextValue;
    }
    else {
      item.contextValue = this.getImplementationContextValue(implementation, trackerRunState);
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
    category?: IAlgorithmCategory,
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
        category,
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
    category: IAlgorithmCategory | undefined,
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
        undefined,
        undefined,
        implementation,
        algorithmDirectory,
        category,
      );
      item.iconPath = this.getImplementationIconUri(implementation);
      if (implementation.languageKey === docsImplementationKey) {
        item.contextValue = docsFileItemContextValue;
      }
      this.setOpenFileCommand(item);
      return item;
    });
  }

  /**
   * Returns the parent item for one Algorithms tree element.
   *
   * @param {AlgorithmTreeItem} element Tree element whose parent is requested.
   * @returns {AlgorithmTreeItem | undefined} Parent element when available.
   */
  public getParent(element: AlgorithmTreeItem): AlgorithmTreeItem | undefined {
    if (element.category && !element.algorithmDirectory) {
      return undefined;
    }

    if (element.algorithmDirectory && element.category) {
      return new AlgorithmTreeItem(
        element.category.displayName,
        element.category.directoryPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        element.category,
      );
    }

    if (element.algorithmImplementation && element.implementationParentDirectory) {
      const implementation = element.algorithmImplementation;
      const parentAlgorithmDirectory = element.implementationParentDirectory;
      const elementPath = element.resourceUri?.scheme === "file"
        ? element.resourceUri.fsPath
        : undefined;
      const isImplementationNode = elementPath === implementation.filePath
        || (implementation.languageKey === docsImplementationKey
          && elementPath === parentAlgorithmDirectory.directoryPath);

      if (element.isImplementationRow || isImplementationNode) {
        return new AlgorithmTreeItem(
          parentAlgorithmDirectory.displayName,
          parentAlgorithmDirectory.directoryPath,
          vscode.TreeItemCollapsibleState.Collapsed,
          element.implementationParentCategory,
          parentAlgorithmDirectory,
        );
      }

      const parentImplementationLabel = this.implementationViewMode === "language"
        && implementation.languageKey !== docsImplementationKey
        ? implementation.languageDisplayName
        : (implementation.fileName ?? implementation.languageDisplayName);

      return new AlgorithmTreeItem(
        parentImplementationLabel,
        implementation.filePath,
        implementation.hasChildren
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        implementation,
        parentAlgorithmDirectory,
        element.implementationParentCategory,
      );
    }

    if (element.algorithmDirectory) {
      return undefined;
    }

    return undefined;
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

    if (element.algorithmDirectory) {
      return await this.getAlgorithmImplementationItems(element.algorithmDirectory, element.category);
    }

    if (element.category) {
      return await this.getCategoryAlgorithmItems(element.category);
    }

    if (element.algorithmImplementation && element.implementationParentDirectory) {
      return await this.getImplementationChildItems(
        element.implementationParentDirectory,
        element.implementationParentCategory,
        element.algorithmImplementation,
      );
    }

    return [];
  }

  /**
   * Finds the first currently visible tree item that matches one file path.
   *
   * @param {string} filePath Absolute file path to locate in the Algorithms tree.
   * @returns {Promise<AlgorithmTreeItem | undefined>} Matching tree item when visible in current mode.
   */
  public async findItemForFilePath(filePath: string): Promise<AlgorithmTreeItem | undefined> {
    const categoryItems = await this.getChildren();
    for (const categoryItem of categoryItems) {
      const algorithmItems = await this.getChildren(categoryItem);
      for (const algorithmItem of algorithmItems) {
        const implementationItems = await this.getChildren(algorithmItem);
        for (const implementationItem of implementationItems) {
          const implementationPath = implementationItem.algorithmImplementation?.filePath;
          if (implementationPath === filePath) {
            return implementationItem;
          }

          if (implementationItem.collapsibleState === vscode.TreeItemCollapsibleState.None) {
            continue;
          }

          const childItems = await this.getChildren(implementationItem);
          for (const childItem of childItems) {
            if (childItem.resourceUri?.scheme !== "file") {
              continue;
            }

            if (childItem.resourceUri.fsPath === filePath) {
              return childItem;
            }
          }
        }
      }
    }

    return undefined;
  }
}
