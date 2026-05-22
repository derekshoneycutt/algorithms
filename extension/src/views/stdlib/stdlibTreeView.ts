import * as vscode from 'vscode';
import * as path from 'node:path';
import { ILanguages } from '../../languages';
import {
  StdLibTreeDataProvider,
  StdLibTreeItem,
  stdlibTreeViewId
} from './stdlibTreeDataProvider';

const stdlibCreateFolderCommandId = "algos.stdlibTreeView.createFolder";
const stdlibCreateFileCommandId = "algos.stdlibTreeView.createFile";
const stdlibDeleteFolderCommandId = "algos.stdlibTreeView.deleteFolder";
const stdlibDeleteFileCommandId = "algos.stdlibTreeView.deleteFile";

/**
 * Manages registration, commands, and lifecycle for the Standard Library tree view.
 */
export class StdLibTreeView implements vscode.Disposable {

  private languages : ILanguages;
  private dataProvider : StdLibTreeDataProvider | undefined;
  private treeView : vscode.TreeView<StdLibTreeItem> | undefined;
  private createFolderCommandRegistration: vscode.Disposable | undefined;
  private createFileCommandRegistration: vscode.Disposable | undefined;
  private deleteFolderCommandRegistration: vscode.Disposable | undefined;
  private deleteFileCommandRegistration: vscode.Disposable | undefined;

  /**
   * Creates the Standard Library tree view manager.
   *
   * @param {ILanguages} languages Languages service dependency.
   */
  public constructor(languages : ILanguages) {
    this.languages = languages;
    this.dataProvider = undefined;
    this.treeView = undefined;
    this.createFolderCommandRegistration = undefined;
    this.createFileCommandRegistration = undefined;
    this.deleteFolderCommandRegistration = undefined;
    this.deleteFileCommandRegistration = undefined;
  }

  /**
   * Registers the Standard Library tree view and related commands.
   *
   * @param {vscode.Uri} extensionUri Extension installation URI.
   * @param {boolean} [showCollapseAll=false] Whether collapse-all control should be shown.
   * @returns {void} No return value.
   */
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

    this.createFolderCommandRegistration = vscode.commands.registerCommand(
      stdlibCreateFolderCommandId,
      async () => {
        await this.createFolderInStdlibRoot();
      },
    );

    this.createFileCommandRegistration = vscode.commands.registerCommand(
      stdlibCreateFileCommandId,
      async (item?: StdLibTreeItem) => {
        await this.createStdlibFile(item);
      },
    );

    this.deleteFolderCommandRegistration = vscode.commands.registerCommand(
      stdlibDeleteFolderCommandId,
      async (item?: StdLibTreeItem) => {
        await this.deleteStdlibFolder(item);
      },
    );

    this.deleteFileCommandRegistration = vscode.commands.registerCommand(
      stdlibDeleteFileCommandId,
      async (item?: StdLibTreeItem) => {
        await this.deleteStdlibFile(item);
      },
    );
  }

  /**
   * Creates one file under the selected stdlib folder.
   *
   * @param {StdLibTreeItem | undefined} item Target folder tree item.
   * @returns {Promise<void>} Resolves after create-file flow completes.
   */
  private async createStdlibFile(item: StdLibTreeItem | undefined): Promise<void> {
    const relativeDirectoryPath = this.getStdlibRelativePath(item);
    if (!relativeDirectoryPath) {
      void vscode.window.showErrorMessage("Unable to determine stdlib folder path for file creation.");
      return;
    }

    const fileName = await vscode.window.showInputBox({
      title: "Create Standard Library File",
      prompt: `Enter a new file name to create under stdlib/${relativeDirectoryPath}/`,
      placeHolder: "example.ext",
      ignoreFocusOut: true,
      validateInput: (value) => {
        const normalizedValue = value.trim();
        if (normalizedValue.length === 0) {
          return "File name is required.";
        }

        if (normalizedValue.includes("/") || normalizedValue.includes("\\")) {
          return "Use a single file name only (no path separators).";
        }

        if (normalizedValue === "." || normalizedValue === "..") {
          return "File name cannot be '.' or '..'.";
        }

        return undefined;
      },
    });

    if (fileName === undefined) {
      return;
    }

    const normalizedFileName = fileName.trim();
    const relativeFilePath = path.join(relativeDirectoryPath, normalizedFileName);

    try {
      await this.languages.createFile({
        root: "stdlib",
        relativeFilePath,
      });
      this.refresh();
      void vscode.window.showInformationMessage(`Created stdlib file: ${relativeFilePath}`);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === "EEXIST") {
        void vscode.window.showWarningMessage(`File already exists in stdlib/${relativeDirectoryPath}: ${normalizedFileName}`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to create stdlib file: ${errorMessage}`);
    }
  }

  /**
   * Returns stdlib-relative path for one tree item resource URI.
   *
   * @param {StdLibTreeItem | undefined} item Target tree item.
   * @returns {string | undefined} Path relative to stdlib root.
   */
  private getStdlibRelativePath(item: StdLibTreeItem | undefined): string | undefined {
    const absolutePath = item?.resourceUri?.fsPath;
    if (!absolutePath) {
      return undefined;
    }

    const pathSegments = absolutePath.split(path.sep).filter((segment) => segment.length > 0);
    const stdlibIndex = pathSegments.lastIndexOf("stdlib");
    if (stdlibIndex < 0 || stdlibIndex === pathSegments.length - 1) {
      return undefined;
    }

    return pathSegments.slice(stdlibIndex + 1).join(path.sep);
  }

  /**
    * Moves one stdlib folder (category) to Trash after confirmation.
   *
   * @param {StdLibTreeItem | undefined} item Target folder tree item.
    * @returns {Promise<void>} Resolves after move-to-trash flow completes.
   */
  private async deleteStdlibFolder(item: StdLibTreeItem | undefined): Promise<void> {
    const relativeDirectoryPath = this.getStdlibRelativePath(item);
    if (!relativeDirectoryPath) {
      void vscode.window.showErrorMessage("Unable to determine stdlib folder path for delete.");
      return;
    }

    const confirmedDelete = await vscode.window.showWarningMessage(
      `Move stdlib folder '${relativeDirectoryPath}' and its contents to Trash?`,
      { modal: true },
      "Move to Trash",
    );

    if (confirmedDelete !== "Move to Trash") {
      return;
    }

    try {
      await this.languages.deleteDirectory({
        root: "stdlib",
        relativeDirectoryPath,
        recursive: true,
      });
      this.refresh();
      void vscode.window.showInformationMessage(`Moved stdlib folder to Trash: ${relativeDirectoryPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to move stdlib folder to Trash: ${errorMessage}`);
    }
  }

  /**
   * Moves one stdlib file to Trash after confirmation.
   *
   * @param {StdLibTreeItem | undefined} item Target file tree item.
   * @returns {Promise<void>} Resolves after move-to-trash flow completes.
   */
  private async deleteStdlibFile(item: StdLibTreeItem | undefined): Promise<void> {
    const relativeFilePath = this.getStdlibRelativePath(item);
    if (!relativeFilePath) {
      void vscode.window.showErrorMessage("Unable to determine stdlib file path for delete.");
      return;
    }

    const confirmedDelete = await vscode.window.showWarningMessage(
      `Move stdlib file '${relativeFilePath}' to Trash?`,
      { modal: true },
      "Move to Trash",
    );

    if (confirmedDelete !== "Move to Trash") {
      return;
    }

    try {
      await this.languages.deleteFile({
        root: "stdlib",
        relativeFilePath,
      });
      this.refresh();
      void vscode.window.showInformationMessage(`Moved stdlib file to Trash: ${relativeFilePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to move stdlib file to Trash: ${errorMessage}`);
    }
  }

  /**
   * Creates one folder directly under stdlib/, independent of tree selection.
   *
   * @returns {Promise<void>} Resolves when the create-folder flow completes.
   */
  private async createFolderInStdlibRoot(): Promise<void> {
    const folderName = await vscode.window.showInputBox({
      title: "Create Standard Library Folder",
      prompt: "Enter a new folder name to create under stdlib/",
      placeHolder: "example-category",
      ignoreFocusOut: true,
      validateInput: (value) => {
        const normalizedValue = value.trim();
        if (normalizedValue.length === 0) {
          return "Folder name is required.";
        }

        if (normalizedValue.includes("/") || normalizedValue.includes("\\")) {
          return "Use a single folder name only (no path separators).";
        }

        if (normalizedValue === "." || normalizedValue === "..") {
          return "Folder name cannot be '.' or '..'.";
        }

        return undefined;
      },
    });

    if (folderName === undefined) {
      return;
    }

    const normalizedFolderName = folderName.trim();
    try {
      await this.languages.createDirectory({
        root: "stdlib",
        relativeDirectoryPath: normalizedFolderName,
      });
      this.refresh();
      void vscode.window.showInformationMessage(`Created stdlib folder: ${normalizedFolderName}`);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === "EEXIST") {
        void vscode.window.showWarningMessage(`Folder already exists in stdlib/: ${normalizedFolderName}`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to create stdlib folder: ${errorMessage}`);
    }
  }

  /**
   * Returns true when the Standard Library tree view has been registered.
   *
   * @returns {boolean} True when registered.
   */
  public isRegistered(): boolean {
    return (this.treeView !== undefined);
  }

  /**
   * Returns the registered Standard Library data provider instance.
   *
   * @returns {StdLibTreeDataProvider | undefined} Current provider when registered.
   */
  public getProvider(): StdLibTreeDataProvider | undefined {
    return this.dataProvider;
  }

  /**
   * Returns the registered Standard Library tree view instance.
   *
   * @returns {vscode.TreeView<StdLibTreeItem> | undefined} Current tree view when registered.
   */
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

  /**
   * Disposes command registrations and tree view resources.
   *
   * @returns {void} No return value.
   */
  public dispose() {
    this.createFolderCommandRegistration?.dispose();
    this.createFolderCommandRegistration = undefined;
    this.createFileCommandRegistration?.dispose();
    this.createFileCommandRegistration = undefined;
    this.deleteFolderCommandRegistration?.dispose();
    this.deleteFolderCommandRegistration = undefined;
    this.deleteFileCommandRegistration?.dispose();
    this.deleteFileCommandRegistration = undefined;

    if (this.treeView !== undefined) {
      this.treeView.dispose();
      this.treeView = undefined;
    }
    if (this.dataProvider !== undefined) {
      this.dataProvider = undefined;
    }
  }
}
