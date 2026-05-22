import * as vscode from 'vscode';
import * as path from 'node:path';
import { ILanguages } from '../../languages';
import { IRunner } from '../../runner';
import { ISmoker } from '../../smoker';
import { ITracker } from '../../tracker';
import { ContextMenuRunHelper } from '../shared/contextMenuRunHelper';
import { GENERATED_LANGUAGE_DATA } from '../../languages/generated/languages.generated';
import {
  algorithmsTreeViewId,
  docsImplementationKey,
  algorithmsIndicatorScheme,
  zeroCountLanguageFragment,
  flaggedImplementationFragment,
  runStatusQueuedFragment,
  runStatusRunningFragment,
  runStatusCompletedFragment,
  runStatusFailedFragment,
  runStatusCancelledFragment,
  AlgorithmImplementationFilterMode,
  AlgorithmImplementationViewMode,
  AlgorithmsTreeDataProvider,
  AlgorithmTreeItem,
} from './algorithmsTreeDataProvider';

const setLanguageViewCommandId = "algos.algorithmsTreeView.setLanguageView";
const setFileViewCommandId = "algos.algorithmsTreeView.setFileView";
const showAllRowsCommandId = "algos.algorithmsTreeView.showAllRows";
const showProblemRowsCommandId = "algos.algorithmsTreeView.showProblemRows";
const flagImplementationCommandId = "algos.algorithmsTreeView.flagImplementation";
const unflagImplementationCommandId = "algos.algorithmsTreeView.unflagImplementation";
const createTopLevelAlgorithmFolderCommandId = "algos.algorithmsTreeView.createFolder";
const createAlgorithmFolderInCategoryCommandId = "algos.algorithmsTreeView.createFolderInCategory";
const deleteAlgorithmCategoryCommandId = "algos.algorithmsTreeView.deleteCategory";
const createFileInAlgorithmFolderCommandId = "algos.algorithmsTreeView.createFileInAlgorithm";
const runImplementationFileCommandId = "algos.algorithmsTreeView.runImplementationFile";
const compileImplementationFileCommandId = "algos.algorithmsTreeView.compileImplementationFile";
const checkImplementationFileNativeCommandId = "algos.algorithmsTreeView.checkImplementationFileNative";
const checkImplementationFileDockerCommandId = "algos.algorithmsTreeView.checkImplementationFileDocker";
const checkImplementationFileSshCommandId = "algos.algorithmsTreeView.checkImplementationFileSsh";
const cleanImplementationCommandId = "algos.algorithmsTreeView.cleanImplementation";
const localCleanImplementationCommandId = "algos.algorithmsTreeView.localCleanImplementation";
const stopImplementationRunCommandId = "algos.algorithmsTreeView.stopImplementationRun";
const clearImplementationRunStatusCommandId = "algos.algorithmsTreeView.clearImplementationRunStatus";
const addImplementationIncludeFileCommandId = "algos.algorithmsTreeView.addImplementationIncludeFile";
const clearAlgorithmRunStatusesCommandId = "algos.algorithmsTreeView.clearAlgorithmRunStatuses";
const startAlgorithmSmokeRunCommandId = "algos.algorithmsTreeView.startAlgorithmSmokeRun";
const stopAlgorithmSmokeRunCommandId = "algos.algorithmsTreeView.stopAlgorithmSmokeRun";
const deleteAlgorithmFolderCommandId = "algos.algorithmsTreeView.deleteAlgorithm";
const deleteImplementationFileCommandId = "algos.algorithmsTreeView.deleteImplementationFile";
const createDocsFileCommandId = "algos.algorithmsTreeView.createDocsFile";
const deleteDocsFileCommandId = "algos.algorithmsTreeView.deleteDocsFile";

/**
 * Wrapper around the VS Code Algorithms tree view registration and lifecycle.
 */
export class AlgorithmsTreeView implements vscode.Disposable {
  private languages : ILanguages;
  private runner: IRunner;
  private smoker: ISmoker;
  private tracker: ITracker;
  private contextMenuRunHelper: ContextMenuRunHelper;
  private dataProvider : AlgorithmsTreeDataProvider | undefined;
  private treeView : vscode.TreeView<AlgorithmTreeItem> | undefined;
  private indicatorDecorationProviderSubscription: vscode.Disposable | undefined;
  private setLanguageViewCommandSubscription: vscode.Disposable | undefined;
  private setFileViewCommandSubscription: vscode.Disposable | undefined;
  private showAllRowsCommandSubscription: vscode.Disposable | undefined;
  private showProblemRowsCommandSubscription: vscode.Disposable | undefined;
  private flagImplementationCommandSubscription: vscode.Disposable | undefined;
  private unflagImplementationCommandSubscription: vscode.Disposable | undefined;
  private createTopLevelAlgorithmFolderCommandSubscription: vscode.Disposable | undefined;
  private createAlgorithmFolderInCategoryCommandSubscription: vscode.Disposable | undefined;
  private deleteAlgorithmCategoryCommandSubscription: vscode.Disposable | undefined;
  private createFileInAlgorithmFolderCommandSubscription: vscode.Disposable | undefined;
  private runImplementationFileCommandSubscription: vscode.Disposable | undefined;
  private compileImplementationFileCommandSubscription: vscode.Disposable | undefined;
  private checkImplementationFileNativeCommandSubscription: vscode.Disposable | undefined;
  private checkImplementationFileDockerCommandSubscription: vscode.Disposable | undefined;
  private checkImplementationFileSshCommandSubscription: vscode.Disposable | undefined;
  private cleanImplementationCommandSubscription: vscode.Disposable | undefined;
  private localCleanImplementationCommandSubscription: vscode.Disposable | undefined;
  private stopImplementationRunCommandSubscription: vscode.Disposable | undefined;
  private clearImplementationRunStatusCommandSubscription: vscode.Disposable | undefined;
  private addImplementationIncludeFileCommandSubscription: vscode.Disposable | undefined;
  private clearAlgorithmRunStatusesCommandSubscription: vscode.Disposable | undefined;
  private startAlgorithmSmokeRunCommandSubscription: vscode.Disposable | undefined;
  private stopAlgorithmSmokeRunCommandSubscription: vscode.Disposable | undefined;
  private deleteAlgorithmFolderCommandSubscription: vscode.Disposable | undefined;
  private deleteImplementationFileCommandSubscription: vscode.Disposable | undefined;
  private createDocsFileCommandSubscription: vscode.Disposable | undefined;
  private deleteDocsFileCommandSubscription: vscode.Disposable | undefined;

  /**
   * Creates the Algorithms tree view manager.
   *
   * @param {ILanguages} languages Language/discovery service.
   * @param {IRunner} runner Run execution service.
   * @param {ISmoker} smoker Smoke execution service.
   * @param {ITracker} tracker Run status tracker service.
   */
  public constructor(languages : ILanguages, runner: IRunner, smoker: ISmoker, tracker: ITracker) {
    this.languages = languages;
    this.runner = runner;
    this.smoker = smoker;
    this.tracker = tracker;
    this.contextMenuRunHelper = new ContextMenuRunHelper(this.languages, this.runner);
    this.dataProvider = undefined;
    this.treeView = undefined;
    this.indicatorDecorationProviderSubscription = undefined;
    this.setLanguageViewCommandSubscription = undefined;
    this.setFileViewCommandSubscription = undefined;
    this.showAllRowsCommandSubscription = undefined;
    this.showProblemRowsCommandSubscription = undefined;
    this.flagImplementationCommandSubscription = undefined;
    this.unflagImplementationCommandSubscription = undefined;
    this.createTopLevelAlgorithmFolderCommandSubscription = undefined;
    this.createAlgorithmFolderInCategoryCommandSubscription = undefined;
    this.deleteAlgorithmCategoryCommandSubscription = undefined;
    this.createFileInAlgorithmFolderCommandSubscription = undefined;
    this.runImplementationFileCommandSubscription = undefined;
    this.compileImplementationFileCommandSubscription = undefined;
    this.checkImplementationFileNativeCommandSubscription = undefined;
    this.checkImplementationFileDockerCommandSubscription = undefined;
    this.checkImplementationFileSshCommandSubscription = undefined;
    this.cleanImplementationCommandSubscription = undefined;
    this.localCleanImplementationCommandSubscription = undefined;
    this.stopImplementationRunCommandSubscription = undefined;
    this.clearImplementationRunStatusCommandSubscription = undefined;
    this.addImplementationIncludeFileCommandSubscription = undefined;
    this.clearAlgorithmRunStatusesCommandSubscription = undefined;
    this.startAlgorithmSmokeRunCommandSubscription = undefined;
    this.stopAlgorithmSmokeRunCommandSubscription = undefined;
    this.deleteAlgorithmFolderCommandSubscription = undefined;
    this.deleteImplementationFileCommandSubscription = undefined;
    this.createDocsFileCommandSubscription = undefined;
    this.deleteDocsFileCommandSubscription = undefined;
  }

  /**
   * Returns src-relative path for one tree item resource URI.
   *
   * @param {AlgorithmTreeItem | undefined} item Target tree item.
   * @returns {string | undefined} Path relative to src root.
   */
  private getSrcRelativePathFromAbsolutePath(absolutePath: string | undefined): string | undefined {
    if (!absolutePath) {
      return undefined;
    }

    const pathSegments = absolutePath.split(path.sep).filter((segment) => segment.length > 0);
    const srcIndex = pathSegments.lastIndexOf("src");
    if (srcIndex < 0 || srcIndex === pathSegments.length - 1) {
      return undefined;
    }

    return pathSegments.slice(srcIndex + 1).join(path.sep);
  }

  /**
   * Returns src-relative path for one tree item resource URI.
   *
   * @param {AlgorithmTreeItem | undefined} item Target tree item.
   * @returns {string | undefined} Path relative to src root.
   */
  private getSrcRelativePath(item: AlgorithmTreeItem | undefined): string | undefined {
    return this.getSrcRelativePathFromAbsolutePath(item?.resourceUri?.fsPath);
  }

  /**
   * Returns src-relative algorithm directory path for one tree item.
   *
   * @param {AlgorithmTreeItem | undefined} item Target tree item.
   * @returns {string | undefined} Algorithm directory path relative to src.
   */
  private getAlgorithmDirectoryRelativePath(item: AlgorithmTreeItem | undefined): string | undefined {
    const implementationParentDirectoryPath = item?.implementationParentDirectory?.directoryPath;
    if (implementationParentDirectoryPath) {
      const pathSegments = implementationParentDirectoryPath
        .split(path.sep)
        .filter((segment) => segment.length > 0);
      const srcIndex = pathSegments.lastIndexOf("src");
      if (srcIndex < 0 || srcIndex === pathSegments.length - 1) {
        return undefined;
      }

      return pathSegments.slice(srcIndex + 1).join(path.sep);
    }

    return this.getSrcRelativePath(item);
  }

  /**
   * Returns language extension (including dot) for one algorithm implementation row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected tree item.
   * @returns {string | undefined} File extension with leading dot.
   */
  private getLanguageExtensionForItem(item: AlgorithmTreeItem | undefined): string | undefined {
    const languageKey = item?.algorithmImplementation?.languageKey;
    if (!languageKey || languageKey === docsImplementationKey) {
      return undefined;
    }

    const language = GENERATED_LANGUAGE_DATA.languages.find((entry) => entry.key === languageKey);
    const extension = language?.extension;
    if (!extension) {
      return undefined;
    }

    return extension.startsWith(".") ? extension : `.${extension}`;
  }

  /**
   * Returns file basename without extension.
   *
   * @param {string} fileName Candidate filename.
   * @returns {string} Basename with no trailing extension.
   */
  private getFileStem(fileName: string): string {
    const extension = path.extname(fileName);
    if (!extension) {
      return fileName;
    }

    return fileName.slice(0, -extension.length);
  }

  /**
   * Picks the most common filename stem when at least two files share the same stem.
   *
   * @param {string[]} stems Candidate stems from sibling files.
   * @returns {string | undefined} Most common stem when frequency >= 2.
   */
  private getMostCommonStem(stems: string[]): string | undefined {
    const counts = new Map<string, number>();
    for (const stem of stems) {
      counts.set(stem, (counts.get(stem) ?? 0) + 1);
    }

    let selectedStem: string | undefined;
    let selectedCount = 1;
    for (const [stem, count] of counts.entries()) {
      if (count > selectedCount) {
        selectedStem = stem;
        selectedCount = count;
      }
    }

    return selectedStem;
  }

  /**
   * Computes a default filename for missing-language implementation rows.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected tree item.
   * @returns {Promise<string | undefined>} Suggested filename with extension.
   */
  private async getDefaultFileNameForItem(item: AlgorithmTreeItem | undefined): Promise<string | undefined> {
    const algorithmDirectoryPath = item?.implementationParentDirectory?.directoryPath;
    const languageExtension = this.getLanguageExtensionForItem(item);
    if (!algorithmDirectoryPath || !languageExtension) {
      return undefined;
    }

    const algorithmFolderName = path.basename(algorithmDirectoryPath);
    let chosenStem = algorithmFolderName;

    try {
      const directoryEntries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(algorithmDirectoryPath));
      const knownLanguageExtensions = new Set(
        GENERATED_LANGUAGE_DATA.languages.flatMap((language) => language.aliases.fileExtensions),
      );
      const candidateStems = directoryEntries
        .filter(([entryName, entryType]) => {
          if (entryType !== vscode.FileType.File || entryName.startsWith(".")) {
            return false;
          }

          const entryExtension = path.extname(entryName);
          return knownLanguageExtensions.has(entryExtension);
        })
        .map(([entryName]) => this.getFileStem(entryName))
        .filter((stem) => stem.length > 0);

      const mostCommonStem = this.getMostCommonStem(candidateStems);
      if (mostCommonStem) {
        chosenStem = mostCommonStem;
      }
    }
    catch {
      chosenStem = algorithmFolderName;
    }

    return `${chosenStem}${languageExtension}`;
  }

  /**
   * Returns true when one item is a missing implementation language row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected tree item.
   * @returns {boolean} True when item represents a language with no existing file.
   */
  private isMissingImplementationLanguageRow(item: AlgorithmTreeItem | undefined): boolean {
    if (!item?.isImplementationRow || !item.algorithmImplementation) {
      return false;
    }

    if (item.algorithmImplementation.languageKey === docsImplementationKey) {
      return false;
    }

    return !item.algorithmImplementation.hasImplementation;
  }

  /**
   * Opens one file in the active editor.
   *
   * @param {string} absoluteFilePath Absolute path to open.
   * @returns {Promise<void>} Resolves when the editor is shown.
   */
  private async openFileInEditor(absoluteFilePath: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(absoluteFilePath));
    await vscode.window.showTextDocument(document, { preview: false, preserveFocus: false });
  }

  /**
   * Creates one folder directly under src/.
   *
   * @returns {Promise<void>} Resolves when create-folder flow completes.
   */
  private async createFolderInSrcRoot(): Promise<void> {
    const folderName = await vscode.window.showInputBox({
      title: "Create Algorithms Category",
      prompt: "Enter a new folder name to create under src/",
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
        root: "src",
        relativeDirectoryPath: normalizedFolderName,
      });
      this.dataProvider?.refresh();
      void vscode.window.showInformationMessage(`Created src folder: ${normalizedFolderName}`);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === "EEXIST") {
        void vscode.window.showWarningMessage(`Folder already exists in src/: ${normalizedFolderName}`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to create src folder: ${errorMessage}`);
    }
  }

  /**
   * Creates one algorithm folder under the selected category folder.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected category tree item.
   * @returns {Promise<void>} Resolves when create-folder flow completes.
   */
  private async createFolderInCategory(item: AlgorithmTreeItem | undefined): Promise<void> {
    const relativeCategoryPath = this.getSrcRelativePath(item);
    if (!relativeCategoryPath) {
      void vscode.window.showErrorMessage("Unable to determine category path for folder creation.");
      return;
    }

    const folderName = await vscode.window.showInputBox({
      title: "Create Algorithm Folder",
      prompt: `Enter a new folder name to create under src/${relativeCategoryPath}/`,
      placeHolder: "example-algorithm",
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
    const relativeDirectoryPath = path.join(relativeCategoryPath, normalizedFolderName);

    try {
      await this.languages.createDirectory({
        root: "src",
        relativeDirectoryPath,
      });
      this.dataProvider?.refresh();
      void vscode.window.showInformationMessage(`Created algorithm folder: ${relativeDirectoryPath}`);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === "EEXIST") {
        void vscode.window.showWarningMessage(`Folder already exists: ${relativeDirectoryPath}`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to create algorithm folder: ${errorMessage}`);
    }
  }

  /**
   * Moves one category folder to Trash.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected category tree item.
   * @returns {Promise<void>} Resolves when move-to-trash flow completes.
   */
  private async deleteCategory(item: AlgorithmTreeItem | undefined): Promise<void> {
    const relativeCategoryPath = this.getSrcRelativePath(item);
    if (!relativeCategoryPath) {
      void vscode.window.showErrorMessage("Unable to determine category path for trash operation.");
      return;
    }

    const confirmedDelete = await vscode.window.showWarningMessage(
      `Move category 'src/${relativeCategoryPath}' and all its algorithms to Trash?`,
      { modal: true },
      "Move to Trash",
    );

    if (confirmedDelete !== "Move to Trash") {
      return;
    }

    try {
      await this.languages.deleteDirectory({
        root: "src",
        relativeDirectoryPath: relativeCategoryPath,
        recursive: true,
      });
      this.dataProvider?.refresh();
      void vscode.window.showInformationMessage(`Moved category to Trash: src/${relativeCategoryPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to move category to Trash: ${errorMessage}`);
    }
  }

  /**
   * Creates one file under the selected algorithm folder.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected algorithm tree item.
   * @returns {Promise<void>} Resolves when create-file flow completes.
   */
  private async createFileInAlgorithmFolder(item: AlgorithmTreeItem | undefined): Promise<void> {
    const relativeAlgorithmPath = this.getAlgorithmDirectoryRelativePath(item);
    if (!relativeAlgorithmPath) {
      void vscode.window.showErrorMessage("Unable to determine algorithm path for file creation.");
      return;
    }

    const defaultFileName = await this.getDefaultFileNameForItem(item);

    const createFromMissingLanguageRow = this.isMissingImplementationLanguageRow(item);
    let normalizedFileName: string | undefined;

    if (createFromMissingLanguageRow) {
      normalizedFileName = defaultFileName?.trim();
      if (!normalizedFileName) {
        void vscode.window.showErrorMessage("Unable to determine default file name for selected language.");
        return;
      }
    }

    if (!createFromMissingLanguageRow) {
      const fileName = await vscode.window.showInputBox({
        title: "Create Algorithm File",
        prompt: `Enter a new file name to create under src/${relativeAlgorithmPath}/`,
        placeHolder: defaultFileName ?? "example.ext",
        value: defaultFileName,
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

      normalizedFileName = fileName.trim();
    }

    if (!normalizedFileName) {
      return;
    }

    const relativeFilePath = path.join(relativeAlgorithmPath, normalizedFileName);

    try {
      const createdFilePath = await this.languages.createFile({
        root: "src",
        relativeFilePath,
      });

      this.dataProvider?.refresh();
      await this.revealFile(createdFilePath);
      await this.openFileInEditor(createdFilePath);

      void vscode.window.showInformationMessage(`Created file: src/${relativeFilePath}`);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === "EEXIST") {
        void vscode.window.showWarningMessage(`File already exists: src/${relativeFilePath}`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to create file: ${errorMessage}`);
    }
  }

  /**
   * Moves one algorithm folder to Trash.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected algorithm tree item.
   * @returns {Promise<void>} Resolves when move-to-trash flow completes.
   */
  private async deleteAlgorithmFolder(item: AlgorithmTreeItem | undefined): Promise<void> {
    const relativeAlgorithmPath = this.getSrcRelativePath(item);
    if (!relativeAlgorithmPath) {
      void vscode.window.showErrorMessage("Unable to determine algorithm path for trash operation.");
      return;
    }

    const confirmedDelete = await vscode.window.showWarningMessage(
      `Move algorithm folder 'src/${relativeAlgorithmPath}' and its contents to Trash?`,
      { modal: true },
      "Move to Trash",
    );

    if (confirmedDelete !== "Move to Trash") {
      return;
    }

    try {
      await this.languages.deleteDirectory({
        root: "src",
        relativeDirectoryPath: relativeAlgorithmPath,
        recursive: true,
      });
      this.dataProvider?.refresh();
      void vscode.window.showInformationMessage(`Moved algorithm folder to Trash: src/${relativeAlgorithmPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to move algorithm folder to Trash: ${errorMessage}`);
    }
  }

  /**
   * Moves one implementation file to Trash.
   *
   * Handles both implementation rows and include child-file rows.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when move-to-trash flow completes.
   */
  private async deleteImplementationFile(item: AlgorithmTreeItem | undefined): Promise<void> {
    if (!item?.algorithmImplementation || !item.implementationParentDirectory) {
      return;
    }

    if (item.algorithmImplementation.languageKey === docsImplementationKey) {
      return;
    }

    if (!item.isImplementationRow) {
      const includeFilePath = item.resourceUri?.fsPath;
      if (!includeFilePath) {
        return;
      }

      const includeFileName = path.basename(includeFilePath);
      const confirmedIncludeDelete = await vscode.window.showWarningMessage(
        `Move include file '${includeFileName}' to Trash?`,
        { modal: true },
        "Move to Trash",
      );

      if (confirmedIncludeDelete !== "Move to Trash") {
        return;
      }

      try {
        await this.languages.deleteAlgorithmIncludeFile({
          algorithmDirectoryPath: item.implementationParentDirectory.directoryPath,
          languageKey: item.algorithmImplementation.languageKey,
          fileName: includeFileName,
        });
        this.dataProvider?.refresh();
        void vscode.window.showInformationMessage(`Moved include file to Trash: ${includeFileName}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to move include file to Trash: ${errorMessage}`);
      }
      return;
    }

    if (!item.algorithmImplementation.filePath) {
      return;
    }

    const relativeFilePath = this.getSrcRelativePathFromAbsolutePath(item.algorithmImplementation.filePath);
    if (!relativeFilePath) {
      void vscode.window.showErrorMessage("Unable to determine implementation file path for trash operation.");
      return;
    }

    const confirmedDelete = await vscode.window.showWarningMessage(
      `Move implementation file 'src/${relativeFilePath}' to Trash?`,
      { modal: true },
      "Move to Trash",
    );

    if (confirmedDelete !== "Move to Trash") {
      return;
    }

    try {
      await this.languages.deleteFile({
        root: "src",
        relativeFilePath,
      });
      this.dataProvider?.refresh();
      void vscode.window.showInformationMessage(`Moved implementation file to Trash: src/${relativeFilePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to move implementation file to Trash: ${errorMessage}`);
    }
  }

  /**
   * Executes run.sh for one implementation row file.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when run flow completes.
   */
  private async runImplementationFile(item: AlgorithmTreeItem | undefined): Promise<void> {
    await this.contextMenuRunHelper.executeAction({
      actionKind: "run-file",
      treeItem: item,
    });
  }

  /**
   * Executes compile-only run action for one implementation row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when run flow completes.
   */
  private async compileImplementationFile(item: AlgorithmTreeItem | undefined): Promise<void> {
    await this.contextMenuRunHelper.executeAction({
      actionKind: "compile-only",
      treeItem: item,
    });
  }

  /**
   * Executes native check-only run action for one implementation row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when run flow completes.
   */
  private async checkImplementationFileNative(item: AlgorithmTreeItem | undefined): Promise<void> {
    await this.contextMenuRunHelper.executeAction({
      actionKind: "check-only",
      checkOnlyRouteOverride: "native",
      treeItem: item,
    });
  }

  /**
   * Executes docker check-only run action for one implementation row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when run flow completes.
   */
  private async checkImplementationFileDocker(item: AlgorithmTreeItem | undefined): Promise<void> {
    await this.contextMenuRunHelper.executeAction({
      actionKind: "check-only",
      checkOnlyRouteOverride: "docker",
      treeItem: item,
    });
  }

  /**
   * Executes ssh check-only run action for one implementation row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when run flow completes.
   */
  private async checkImplementationFileSsh(item: AlgorithmTreeItem | undefined): Promise<void> {
    await this.contextMenuRunHelper.executeAction({
      actionKind: "check-only",
      checkOnlyRouteOverride: "ssh",
      treeItem: item,
    });
  }

  /**
   * Executes clean run action for one implementation row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when run flow completes.
   */
  private async cleanImplementation(item: AlgorithmTreeItem | undefined): Promise<void> {
    await this.contextMenuRunHelper.executeAction({
      actionKind: "clean",
      treeItem: item,
    });
  }

  /**
   * Executes local clean run action for one implementation row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when run flow completes.
   */
  private async localCleanImplementation(item: AlgorithmTreeItem | undefined): Promise<void> {
    await this.contextMenuRunHelper.executeAction({
      actionKind: "localclean",
      treeItem: item,
    });
  }

  /**
   * Sends Ctrl+C to stop the currently active implementation run when allowed.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when stop request flow completes.
   */
  private async stopImplementationRun(item: AlgorithmTreeItem | undefined): Promise<void> {
    const algorithmImplementation = item?.algorithmImplementation;
    const implementationParentDirectory = item?.implementationParentDirectory;
    if (!item?.isImplementationRow || !algorithmImplementation || !implementationParentDirectory) {
      return;
    }

    const runState = this.tracker.getLanguageRunStatus(
      implementationParentDirectory.directoryPath,
      algorithmImplementation.languageKey.trim().toLowerCase(),
    );

    const isBusy = runState?.status === "queued" || runState?.status === "running";
    const isSingleCancellable = runState?.cancelability === "single-run";
    if (!isBusy || !isSingleCancellable) {
      return;
    }

    const interrupted = this.runner.interruptActiveRun();
    if (!interrupted) {
      void vscode.window.showWarningMessage("No active run is available to stop.");
      return;
    }

    void vscode.window.showInformationMessage("Sent Ctrl+C to Algorithms Runner.");
  }

  /**
   * Clears retained run status for one implementation language row.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when clear flow completes.
   */
  private async clearImplementationRunStatus(item: AlgorithmTreeItem | undefined): Promise<void> {
    const algorithmImplementation = item?.algorithmImplementation;
    const implementationParentDirectory = item?.implementationParentDirectory;
    if (!item?.isImplementationRow || !algorithmImplementation || !implementationParentDirectory) {
      return;
    }

    if (algorithmImplementation.languageKey === docsImplementationKey) {
      return;
    }

    this.tracker.clearLanguageRunStatus({
      algorithmPath: implementationParentDirectory.directoryPath,
      languageKey: algorithmImplementation.languageKey.trim().toLowerCase(),
    });

    this.dataProvider?.refresh();
  }

  /**
   * Creates one include file under the selected implementation language include directory.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected implementation tree item.
   * @returns {Promise<void>} Resolves when include-file creation completes.
   */
  private async addImplementationIncludeFile(item: AlgorithmTreeItem | undefined): Promise<void> {
    const algorithmImplementation = item?.algorithmImplementation;
    const implementationParentDirectory = item?.implementationParentDirectory;
    if (!item?.isImplementationRow || !algorithmImplementation || !implementationParentDirectory) {
      return;
    }

    if (!algorithmImplementation.hasImplementation || !algorithmImplementation.filePath) {
      return;
    }

    if (algorithmImplementation.languageKey === docsImplementationKey) {
      return;
    }

    const primaryFileName = path.basename(algorithmImplementation.filePath);
    const primaryFileStem = this.getFileStem(primaryFileName);
    const extension = path.extname(primaryFileName) || this.getLanguageExtensionForItem(item) || "";
    const defaultIncludeFileName = `${primaryFileStem}_include${extension}`;

    const fileName = await vscode.window.showInputBox({
      title: "Add Include File",
      prompt: `Enter include file name for ${algorithmImplementation.languageDisplayName}`,
      placeHolder: defaultIncludeFileName,
      value: defaultIncludeFileName,
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

    try {
      const createdFilePath = await this.languages.createAlgorithmIncludeFile({
        algorithmDirectoryPath: implementationParentDirectory.directoryPath,
        languageKey: algorithmImplementation.languageKey,
        fileName: normalizedFileName,
      });

      this.dataProvider?.refresh();
      await this.revealFile(createdFilePath);
      await this.openFileInEditor(createdFilePath);
      void vscode.window.showInformationMessage(`Created include file: ${normalizedFileName}`);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === "EEXIST") {
        void vscode.window.showWarningMessage(`Include file already exists: ${normalizedFileName}`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to create include file: ${errorMessage}`);
    }
  }

  /**
   * Clears retained run statuses for every implementation under one algorithm folder.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected algorithm folder tree item.
   * @returns {Promise<void>} Resolves when clear flow completes.
   */
  private async clearAlgorithmRunStatuses(item: AlgorithmTreeItem | undefined): Promise<void> {
    const algorithmDirectoryPath = item?.algorithmDirectory?.directoryPath;
    if (!algorithmDirectoryPath) {
      return;
    }

    this.tracker.clearAlgorithmRunStatuses(algorithmDirectoryPath);
    this.dataProvider?.refresh();
  }

  /**
   * Starts a smoke run for one algorithm folder.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected algorithm folder tree item.
   * @returns {Promise<void>} Resolves when start flow completes.
   */
  private async startAlgorithmSmokeRun(item: AlgorithmTreeItem | undefined): Promise<void> {
    const algorithmDirectoryPath = item?.algorithmDirectory?.directoryPath;
    if (!algorithmDirectoryPath) {
      return;
    }

    try {
      const result = await this.smoker.executeSmokeRun({
        algorithmDirectoryPath,
      });

      if (!result.ok) {
        void vscode.window.showErrorMessage(result.text);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to start smoke run: ${errorMessage}`);
    }
  }

  /**
   * Stops an active smoke run for one algorithm folder.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected algorithm folder tree item.
   * @returns {Promise<void>} Resolves when stop flow completes.
   */
  private async stopAlgorithmSmokeRun(item: AlgorithmTreeItem | undefined): Promise<void> {
    const algorithmDirectoryPath = item?.algorithmDirectory?.directoryPath;
    if (!algorithmDirectoryPath) {
      return;
    }

    const interrupted = this.smoker.interruptSmokeRun(algorithmDirectoryPath);
    if (!interrupted) {
      void vscode.window.showWarningMessage("No active smoke run is available to stop for this folder.");
    }
  }

  /**
   * Creates one docs file under the selected algorithm directory.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected Docs implementation row.
   * @returns {Promise<void>} Resolves when create-file flow completes.
   */
  private async createDocsFile(item: AlgorithmTreeItem | undefined): Promise<void> {
    if (!item?.isImplementationRow || item.algorithmImplementation?.languageKey !== docsImplementationKey) {
      return;
    }

    const relativeAlgorithmPath = this.getAlgorithmDirectoryRelativePath(item);
    if (!relativeAlgorithmPath) {
      void vscode.window.showErrorMessage("Unable to determine algorithm path for docs file creation.");
      return;
    }

    const fileName = await vscode.window.showInputBox({
      title: "Create Docs File",
      prompt: `Enter a docs file name to create under src/${relativeAlgorithmPath}/`,
      placeHolder: "notes.md",
      value: "notes.md",
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
    const relativeFilePath = path.join(relativeAlgorithmPath, normalizedFileName);

    try {
      const createdFilePath = await this.languages.createFile({
        root: "src",
        relativeFilePath,
      });
      this.dataProvider?.refresh();
      await this.revealFile(createdFilePath);
      await this.openFileInEditor(createdFilePath);

      void vscode.window.showInformationMessage(`Created docs file: src/${relativeFilePath}`);
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === "EEXIST") {
        void vscode.window.showWarningMessage(`File already exists: src/${relativeFilePath}`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to create docs file: ${errorMessage}`);
    }
  }

  /**
   * Moves one docs child file to Trash.
   *
   * @param {AlgorithmTreeItem | undefined} item Selected docs child file row.
   * @returns {Promise<void>} Resolves when move-to-trash flow completes.
   */
  private async deleteDocsFile(item: AlgorithmTreeItem | undefined): Promise<void> {
    if (item?.isImplementationRow || item?.algorithmImplementation?.languageKey !== docsImplementationKey) {
      return;
    }

    const absoluteFilePath = item?.resourceUri?.fsPath;
    const relativeFilePath = this.getSrcRelativePathFromAbsolutePath(absoluteFilePath);
    if (!relativeFilePath) {
      void vscode.window.showErrorMessage("Unable to determine docs file path for trash operation.");
      return;
    }

    const confirmedDelete = await vscode.window.showWarningMessage(
      `Move docs file 'src/${relativeFilePath}' to Trash?`,
      { modal: true },
      "Move to Trash",
    );

    if (confirmedDelete !== "Move to Trash") {
      return;
    }

    try {
      await this.languages.deleteFile({
        root: "src",
        relativeFilePath,
      });
      this.dataProvider?.refresh();
      void vscode.window.showInformationMessage(`Moved docs file to Trash: src/${relativeFilePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to move docs file to Trash: ${errorMessage}`);
    }
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

    if (uri.fragment === runStatusQueuedFragment) {
      return {
        badge: "◷",
        color: new vscode.ThemeColor("testing.iconQueued"),
        tooltip: "Run File: Queued",
      };
    }

    if (uri.fragment === runStatusRunningFragment) {
      return {
        badge: "▶",
        color: new vscode.ThemeColor("testing.iconQueued"),
        tooltip: "Run File: Running",
      };
    }

    if (uri.fragment === runStatusCompletedFragment) {
      return {
        badge: "✓",
        color: new vscode.ThemeColor("testing.iconPassed"),
        tooltip: "Run File: Completed",
      };
    }

    if (uri.fragment === runStatusFailedFragment) {
      return {
        badge: "✕",
        color: new vscode.ThemeColor("testing.iconFailed"),
        tooltip: "Run File: Failed",
      };
    }

    if (uri.fragment === runStatusCancelledFragment) {
      return {
        badge: "■",
        color: new vscode.ThemeColor("testing.iconQueued"),
        tooltip: "Run File: Cancelled",
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
   * Registers create/delete commands for algorithms category/algorithm/file actions.
   *
   * @returns {void} No return value.
   */
  private registerCreateDeleteCommands(): void {
    this.createTopLevelAlgorithmFolderCommandSubscription = vscode.commands.registerCommand(
      createTopLevelAlgorithmFolderCommandId,
      async () => {
        await this.createFolderInSrcRoot();
      },
    );

    this.createAlgorithmFolderInCategoryCommandSubscription = vscode.commands.registerCommand(
      createAlgorithmFolderInCategoryCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.createFolderInCategory(item);
      },
    );

    this.deleteAlgorithmCategoryCommandSubscription = vscode.commands.registerCommand(
      deleteAlgorithmCategoryCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.deleteCategory(item);
      },
    );

    this.createFileInAlgorithmFolderCommandSubscription = vscode.commands.registerCommand(
      createFileInAlgorithmFolderCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.createFileInAlgorithmFolder(item);
      },
    );

    this.runImplementationFileCommandSubscription = vscode.commands.registerCommand(
      runImplementationFileCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.runImplementationFile(item);
      },
    );

    this.compileImplementationFileCommandSubscription = vscode.commands.registerCommand(
      compileImplementationFileCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.compileImplementationFile(item);
      },
    );

    this.checkImplementationFileNativeCommandSubscription = vscode.commands.registerCommand(
      checkImplementationFileNativeCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.checkImplementationFileNative(item);
      },
    );

    this.checkImplementationFileDockerCommandSubscription = vscode.commands.registerCommand(
      checkImplementationFileDockerCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.checkImplementationFileDocker(item);
      },
    );

    this.checkImplementationFileSshCommandSubscription = vscode.commands.registerCommand(
      checkImplementationFileSshCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.checkImplementationFileSsh(item);
      },
    );

    this.cleanImplementationCommandSubscription = vscode.commands.registerCommand(
      cleanImplementationCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.cleanImplementation(item);
      },
    );

    this.localCleanImplementationCommandSubscription = vscode.commands.registerCommand(
      localCleanImplementationCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.localCleanImplementation(item);
      },
    );

    this.stopImplementationRunCommandSubscription = vscode.commands.registerCommand(
      stopImplementationRunCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.stopImplementationRun(item);
      },
    );

    this.clearImplementationRunStatusCommandSubscription = vscode.commands.registerCommand(
      clearImplementationRunStatusCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.clearImplementationRunStatus(item);
      },
    );

    this.addImplementationIncludeFileCommandSubscription = vscode.commands.registerCommand(
      addImplementationIncludeFileCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.addImplementationIncludeFile(item);
      },
    );

    this.clearAlgorithmRunStatusesCommandSubscription = vscode.commands.registerCommand(
      clearAlgorithmRunStatusesCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.clearAlgorithmRunStatuses(item);
      },
    );

    this.startAlgorithmSmokeRunCommandSubscription = vscode.commands.registerCommand(
      startAlgorithmSmokeRunCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.startAlgorithmSmokeRun(item);
      },
    );

    this.stopAlgorithmSmokeRunCommandSubscription = vscode.commands.registerCommand(
      stopAlgorithmSmokeRunCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.stopAlgorithmSmokeRun(item);
      },
    );

    this.deleteAlgorithmFolderCommandSubscription = vscode.commands.registerCommand(
      deleteAlgorithmFolderCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.deleteAlgorithmFolder(item);
      },
    );

    this.deleteImplementationFileCommandSubscription = vscode.commands.registerCommand(
      deleteImplementationFileCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.deleteImplementationFile(item);
      },
    );

    this.createDocsFileCommandSubscription = vscode.commands.registerCommand(
      createDocsFileCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.createDocsFile(item);
      },
    );

    this.deleteDocsFileCommandSubscription = vscode.commands.registerCommand(
      deleteDocsFileCommandId,
      async (item?: AlgorithmTreeItem) => {
        await this.deleteDocsFile(item);
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

    this.dataProvider = new AlgorithmsTreeDataProvider(this.languages, context.extensionUri, this.tracker);
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
    this.registerCreateDeleteCommands();
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

    this.createTopLevelAlgorithmFolderCommandSubscription?.dispose();
    this.createTopLevelAlgorithmFolderCommandSubscription = undefined;
    this.createAlgorithmFolderInCategoryCommandSubscription?.dispose();
    this.createAlgorithmFolderInCategoryCommandSubscription = undefined;
    this.deleteAlgorithmCategoryCommandSubscription?.dispose();
    this.deleteAlgorithmCategoryCommandSubscription = undefined;
    this.createFileInAlgorithmFolderCommandSubscription?.dispose();
    this.createFileInAlgorithmFolderCommandSubscription = undefined;
    this.runImplementationFileCommandSubscription?.dispose();
    this.runImplementationFileCommandSubscription = undefined;
    this.compileImplementationFileCommandSubscription?.dispose();
    this.compileImplementationFileCommandSubscription = undefined;
    this.checkImplementationFileNativeCommandSubscription?.dispose();
    this.checkImplementationFileNativeCommandSubscription = undefined;
    this.checkImplementationFileDockerCommandSubscription?.dispose();
    this.checkImplementationFileDockerCommandSubscription = undefined;
    this.checkImplementationFileSshCommandSubscription?.dispose();
    this.checkImplementationFileSshCommandSubscription = undefined;
    this.cleanImplementationCommandSubscription?.dispose();
    this.cleanImplementationCommandSubscription = undefined;
    this.localCleanImplementationCommandSubscription?.dispose();
    this.localCleanImplementationCommandSubscription = undefined;
    this.stopImplementationRunCommandSubscription?.dispose();
    this.stopImplementationRunCommandSubscription = undefined;
    this.clearImplementationRunStatusCommandSubscription?.dispose();
    this.clearImplementationRunStatusCommandSubscription = undefined;
    this.addImplementationIncludeFileCommandSubscription?.dispose();
    this.addImplementationIncludeFileCommandSubscription = undefined;
    this.clearAlgorithmRunStatusesCommandSubscription?.dispose();
    this.clearAlgorithmRunStatusesCommandSubscription = undefined;
    this.startAlgorithmSmokeRunCommandSubscription?.dispose();
    this.startAlgorithmSmokeRunCommandSubscription = undefined;
    this.stopAlgorithmSmokeRunCommandSubscription?.dispose();
    this.stopAlgorithmSmokeRunCommandSubscription = undefined;
    this.deleteAlgorithmFolderCommandSubscription?.dispose();
    this.deleteAlgorithmFolderCommandSubscription = undefined;
    this.deleteImplementationFileCommandSubscription?.dispose();
    this.deleteImplementationFileCommandSubscription = undefined;
    this.createDocsFileCommandSubscription?.dispose();
    this.createDocsFileCommandSubscription = undefined;
    this.deleteDocsFileCommandSubscription?.dispose();
    this.deleteDocsFileCommandSubscription = undefined;

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
