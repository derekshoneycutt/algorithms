import * as vscode from 'vscode';
import { ILanguages, IStdLibCategory } from '../../languages';

export const stdlibTreeViewId = "algos.stdlibTreeView";

/**
 * Tree item for the StdLib tree view.
 */
export class StdLibTreeItem extends vscode.TreeItem {
  public category: IStdLibCategory | undefined;
  public parentCategory: IStdLibCategory | undefined;

  constructor(
    label: string,
    path: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    category?: IStdLibCategory,
    parentCategory?: IStdLibCategory,
  ) {
    super(label, collapsibleState);
    this.resourceUri = vscode.Uri.file(path);
    this.category = category;
    this.parentCategory = parentCategory;
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
   * Refreshes the entire StdLib tree.
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
   * Configures a tree item to open a file in the active editor.
   *
   * @param {StdLibTreeItem} item Tree item to configure.
   * @param {string} filePath Backing file path to open.
   * @returns {void} No return value.
   */
  private setOpenFileCommand(item: StdLibTreeItem, filePath: string): void {
    item.command = {
      command: "vscode.open",
      title: "Open",
      arguments: [vscode.Uri.file(filePath)],
    };
  }

  getTreeItem(element: StdLibTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: StdLibTreeItem): Promise<StdLibTreeItem[]> {
    if (!element) {
        const categories = await this.languages.getStandardLibraryCategories();
      const treeItems = categories.map(
        (category) => {
          const item = new StdLibTreeItem(
            category.displayName,
            category.directoryPath,
            vscode.TreeItemCollapsibleState.Collapsed,
            category,
          );
          item.contextValue = "stdlibFolder";
          return item;
        });
        return treeItems;
    }

    if (element.category) {
        const files = await this.languages.getStandardLibraryFiles(element.category);
      const fileItems = files.map((file) => {
        const item = new StdLibTreeItem(
          file.displayName,
          file.filePath,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          element.category,
        );
          item.contextValue = "stdlibFile";
          this.setOpenFileCommand(item, file.filePath);
          if (file.languageIconFileName) {
            item.iconPath = this.getLanguageIconUri(file.languageIconFileName);
          }
        return item;
      });
        return fileItems;
    }

      return [];
  }

  /**
   * Returns the parent item for one StdLib tree element.
   *
   * @param {StdLibTreeItem} element Tree element whose parent is requested.
   * @returns {StdLibTreeItem | undefined} Parent element when available.
   */
  public getParent(element: StdLibTreeItem): StdLibTreeItem | undefined {
    if (!element.parentCategory) {
      return undefined;
    }

    return new StdLibTreeItem(
      element.parentCategory.displayName,
      element.parentCategory.directoryPath,
      vscode.TreeItemCollapsibleState.Collapsed,
      element.parentCategory,
    );
  }

  /**
   * Finds the first currently visible StdLib tree item for one file path.
   *
   * @param {string} filePath Absolute file path to locate in the StdLib tree.
   * @returns {Promise<StdLibTreeItem | undefined>} Matching tree item when visible.
   */
  public async findItemForFilePath(filePath: string): Promise<StdLibTreeItem | undefined> {
    const categoryItems = await this.getChildren();
    for (const categoryItem of categoryItems) {
      const fileItems = await this.getChildren(categoryItem);
      for (const fileItem of fileItems) {
        if (fileItem.resourceUri?.scheme !== "file") {
          continue;
        }

        if (fileItem.resourceUri.fsPath === filePath) {
          return fileItem;
        }
      }
    }

    return undefined;
  }
}
