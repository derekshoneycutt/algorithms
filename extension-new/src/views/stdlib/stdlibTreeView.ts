import * as vscode from 'vscode';
import { ILanguages, IStdLibCategory } from '../../languages';

export const stdlibTreeViewId = "algos.stdlibTreeView";

/**
 * Tree item for the StdLib tree view.
 */
export class StdLibTreeItem extends vscode.TreeItem {
  public category: IStdLibCategory | undefined;

  constructor(
    label: string,
    path: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    category?: IStdLibCategory,
  ) {
    super(label, collapsibleState);
    this.resourceUri = vscode.Uri.file(path);
    this.category = category;
  }
}

/**
 * Data provider for the StdLib tree view.
 */
export class StdLibTreeDataProvider implements vscode.TreeDataProvider<StdLibTreeItem> {
  private languages : ILanguages;
  private extensionUri : vscode.Uri;

  private _onDidChangeTreeData: vscode.EventEmitter<StdLibTreeItem | undefined | void>;


  readonly onDidChangeTreeData: vscode.Event<StdLibTreeItem | undefined | void>;
    
  public constructor(languages : ILanguages, extensionUri: vscode.Uri) {
    this.languages = languages;
    this.extensionUri = extensionUri;
    this._onDidChangeTreeData = new vscode.EventEmitter<StdLibTreeItem | undefined | void>();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
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

  getTreeItem(element: StdLibTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: StdLibTreeItem): Thenable<StdLibTreeItem[]> {
    if (!element) {
      const categories = this.languages.getStandardLibraryCategories();
      const treeItems = categories.map(
        (category) => new StdLibTreeItem(
          category.displayName,
          category.directoryPath,
          vscode.TreeItemCollapsibleState.Collapsed,
          category,
        ));
      return Promise.resolve(treeItems);
    }

    if (element.category) {
      const files = this.languages.getStandardLibraryFiles(element.category);
      const fileItems = files.map((file) => {
        const item = new StdLibTreeItem(
          file.displayName,
          file.filePath,
          vscode.TreeItemCollapsibleState.None,
        );
          if (file.languageIconFileName) {
            item.iconPath = this.getLanguageIconUri(file.languageIconFileName);
          }
        return item;
      });
      return Promise.resolve(fileItems);
    }

    return Promise.resolve([]);
  }
}

export class StdLibTreeView implements vscode.Disposable {
  private languages : ILanguages;
  private extensionUri : vscode.Uri | undefined;

  private dataProvider : StdLibTreeDataProvider | undefined;
  private treeView : vscode.TreeView<StdLibTreeItem> | undefined;

  public constructor(languages : ILanguages) {
    this.languages = languages;
    this.extensionUri = undefined;
    this.dataProvider = undefined;
    this.treeView = undefined;
  }

  public register(extensionUri: vscode.Uri, showCollapseAll: boolean = false) {
    if (this.treeView !== undefined) {
      return;
    }

    this.extensionUri = extensionUri;
    this.dataProvider = new StdLibTreeDataProvider(this.languages, extensionUri);
    this.treeView = vscode.window.createTreeView(
      stdlibTreeViewId,
      {
        treeDataProvider: this.dataProvider,
        showCollapseAll: showCollapseAll
      });
  }

  public isRegistered(): boolean {
    return (this.treeView !== undefined);
  }

  public getProvider(): StdLibTreeDataProvider | undefined {
    return this.dataProvider;
  }

  public getTreeView(): vscode.TreeView<StdLibTreeItem> | undefined {
    return this.treeView;
  }

  public dispose() {
    if (this.treeView !== undefined) {
      this.treeView.dispose();
      this.treeView = undefined;
    }
    if (this.dataProvider !== undefined) {
      this.dataProvider = undefined;
    }
    this.extensionUri = undefined;
  }
}
