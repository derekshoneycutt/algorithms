import * as vscode from 'vscode';

export const stdlibTreeViewId = "algos.stdlibTreeView";

/**
 * Tree item for the StdLib tree view.
 */
export class StdLibTreeItem extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
  }
}

/**
 * Data provider for the StdLib tree view.
 */
export class StdLibTreeDataProvider implements vscode.TreeDataProvider<StdLibTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<StdLibTreeItem | undefined | void>
    = new vscode.EventEmitter<StdLibTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<StdLibTreeItem | undefined | void>
    = this._onDidChangeTreeData.event;

  getTreeItem(element: StdLibTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: StdLibTreeItem): Thenable<StdLibTreeItem[]> {
    // Super simple dummy data
    if (!element) {
      return Promise.resolve([
        new StdLibTreeItem('Bubble Sort'),
        new StdLibTreeItem('Quick Sort'),
        new StdLibTreeItem('Merge Sort'),
      ]);
    }
    return Promise.resolve([]);
  }
}

export class StdLibTreeView implements vscode.Disposable {
  private dataProvider : StdLibTreeDataProvider | undefined = undefined;
  private treeView : vscode.TreeView<StdLibTreeItem> | undefined = undefined;

  public register(showCollapseAll: boolean = false) {
    if (this.treeView !== undefined) {
      return;
    }

    this.dataProvider = new StdLibTreeDataProvider();
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
  }
}
