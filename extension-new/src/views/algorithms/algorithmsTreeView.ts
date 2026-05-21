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

type AlgorithmImplementationViewMode = "language" | "file";

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
   * Configures a tree item to open its file in the active editor.
   *
   * @param {AlgorithmTreeItem} item Tree item to configure.
   * @returns {void} No return value.
   */
  private setOpenFileCommand(item: AlgorithmTreeItem): void {
    if (!item.resourceUri) {
      return;
    }

    item.command = {
      command: "vscode.open",
      title: "Open",
      arguments: [item.resourceUri],
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
   * Returns children for the provided tree node.
   *
   * @param {AlgorithmTreeItem | undefined} element Parent node, or undefined for root items.
   * @returns {Thenable<AlgorithmTreeItem[]>} Child nodes for the current level.
   */
  getChildren(element?: AlgorithmTreeItem): Thenable<AlgorithmTreeItem[]> {
    if (!element) {
      const categories = this.languages.getAlgorithmCategories();
      const treeItems = categories.map(
        (category) => new AlgorithmTreeItem(
          category.displayName,
          category.directoryPath,
          vscode.TreeItemCollapsibleState.Collapsed,
          category,
        ));
      return Promise.resolve(treeItems);
    }

    if (element.category) {
      const algorithms = this.languages.getAlgorithmsInCategory(element.category);
      const algorithmItems = algorithms.map(
        (algorithm) => new AlgorithmTreeItem(
          algorithm.displayName,
          algorithm.directoryPath,
          vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          algorithm,
        ));
      return Promise.resolve(algorithmItems);
    }

    if (element.algorithmDirectory) {
      const implementations = this.languages.getAlgorithmImplementations(element.algorithmDirectory);
      const visibleImplementations = this.implementationViewMode === "language"
        ? implementations
        : implementations.filter((implementation) => {
          if (implementation.languageKey === docsImplementationKey) {
            return true;
          }

          return implementation.hasImplementation
            && !!implementation.fileName
            && !!implementation.filePath;
        });

      const implementationItems = visibleImplementations.map((implementation) => {
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
            element.algorithmDirectory,
          );
          item.iconPath = this.getImplementationIconUri(implementation);
          if (item.collapsibleState === vscode.TreeItemCollapsibleState.None
              && implementation.hasImplementation
              && !!implementation.filePath) {
            this.setOpenFileCommand(item);
          }
          return item;
        });
      return Promise.resolve(implementationItems);
    }

    if (element.algorithmImplementation && element.implementationParentDirectory) {
      const implementation = element.algorithmImplementation;
      const children = this.languages.getAlgorithmImplementationChildren(
        element.implementationParentDirectory,
        implementation,
      );
      const childItems = children.map((child) => {
        const item = new AlgorithmTreeItem(
          child.displayName,
          child.filePath,
          vscode.TreeItemCollapsibleState.None,
        );
        item.iconPath = this.getImplementationIconUri(implementation);
        this.setOpenFileCommand(item);
        return item;
      });
      return Promise.resolve(childItems);
    }

    return Promise.resolve([]);
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
  private setLanguageViewCommandSubscription: vscode.Disposable | undefined;
  private setFileViewCommandSubscription: vscode.Disposable | undefined;

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
    this.setLanguageViewCommandSubscription = undefined;
    this.setFileViewCommandSubscription = undefined;
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

    this.updateViewModeContext("language");

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
    this.setLanguageViewCommandSubscription?.dispose();
    this.setLanguageViewCommandSubscription = undefined;
    this.setFileViewCommandSubscription?.dispose();
    this.setFileViewCommandSubscription = undefined;

    if (this.treeView !== undefined) {
      this.treeView.dispose();
      this.treeView = undefined;
    }
    if (this.dataProvider !== undefined) {
      this.dataProvider = undefined;
    }
    this.extensionUri = undefined;
    this.updateViewModeContext("language");
  }
}
