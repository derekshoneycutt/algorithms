import * as vscode from 'vscode';

export const algorithmsTreeViewId = "algos.algorithmsTreeView";

/**
 * Tree item for the Algorithms tree view.
 */
export class AlgorithmTreeItem extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
  }
}

/**
 * Data provider for the Algorithms tree view.
 */
export class AlgorithmsTreeDataProvider implements vscode.TreeDataProvider<AlgorithmTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AlgorithmTreeItem | undefined | void>
    = new vscode.EventEmitter<AlgorithmTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<AlgorithmTreeItem | undefined | void>
    = this._onDidChangeTreeData.event;

  getTreeItem(element: AlgorithmTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AlgorithmTreeItem): Thenable<AlgorithmTreeItem[]> {
    // Super simple dummy data
    if (!element) {
      return Promise.resolve([
        new AlgorithmTreeItem('Bubble Sort'),
        new AlgorithmTreeItem('Quick Sort'),
        new AlgorithmTreeItem('Merge Sort'),
      ]);
    }
    return Promise.resolve([]);
  }
}

export class AlgorithmsTreeView implements vscode.Disposable {
  private dataProvider : AlgorithmsTreeDataProvider | undefined = undefined;
  private treeView : vscode.TreeView<AlgorithmTreeItem> | undefined = undefined;

  public register(showCollapseAll: boolean = false) {
    if (this.treeView !== undefined) {
      return;
    }

    this.dataProvider = new AlgorithmsTreeDataProvider();
    this.treeView = vscode.window.createTreeView(
      algorithmsTreeViewId,
      {
        treeDataProvider: this.dataProvider,
        showCollapseAll: showCollapseAll
      });
  }

  public isRegistered(): boolean {
    return (this.treeView !== undefined);
  }

  public getProvider(): AlgorithmsTreeDataProvider | undefined {
    return this.dataProvider;
  }

  public getTreeView(): vscode.TreeView<AlgorithmTreeItem> | undefined {
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
