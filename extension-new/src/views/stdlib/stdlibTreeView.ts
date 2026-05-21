import * as vscode from 'vscode';
import { ILanguages } from '../../languages';
import {
  StdLibTreeDataProvider,
  StdLibTreeItem,
  stdlibTreeViewId
} from './stdlibTreeDataProvider';

export class StdLibTreeView implements vscode.Disposable {
  private languages : ILanguages;

  private dataProvider : StdLibTreeDataProvider | undefined;
  private treeView : vscode.TreeView<StdLibTreeItem> | undefined;

  public constructor(languages : ILanguages) {
    this.languages = languages;
    this.dataProvider = undefined;
    this.treeView = undefined;
  }

  public register(extensionUri: vscode.Uri, showCollapseAll: boolean = false) {
    if (this.treeView !== undefined) {
      return;
    }

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

  /**
   * Refreshes the StdLib tree view when registered.
   *
   * @returns {void} No return value.
   */
  public refresh(): void {
    this.dataProvider?.refresh();
  }

  /**
   * Reveals one file path in the StdLib tree when currently visible.
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
