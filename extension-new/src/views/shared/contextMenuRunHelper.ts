import * as path from "node:path";
import * as vscode from "vscode";
import { GENERATED_LANGUAGE_DATA } from "../../languages/generated/languages.generated";
import type { ILanguages } from "../../languages";
import type { IRunner, RunnerCheckOnlyRoute, RunnerRunActionKind } from "../../runner";

/**
 * Minimal tree-item shape needed to resolve run context from Algorithms tree commands.
 */
export interface ContextMenuRunTreeItem {
  isImplementationRow: boolean;
  resourceUri?: vscode.Uri;
  algorithmDirectory?: {
    directoryPath: string;
  };
  algorithmImplementation?: {
    languageKey: string;
    hasImplementation: boolean;
    filePath: string | undefined;
  };
  implementationParentDirectory?: {
    directoryPath: string;
  };
}

/**
 * One context-menu run action request.
 */
export interface ExecuteContextMenuRunActionRequest {
  actionKind: RunnerRunActionKind;
  checkOnlyRouteOverride?: RunnerCheckOnlyRoute;
  treeItem?: ContextMenuRunTreeItem;
  resourceUri?: vscode.Uri;
}

/**
 * Resolved execution context required by Runner.executeRunAction.
 */
interface RunExecutionContext {
  algorithmDirectoryPath: string;
  targetFilePath: string | undefined;
  targetToken: string | undefined;
  languageKey: string | undefined;
  targetLabel: string;
}

/**
 * Shared helper for run actions triggered from tree, explorer, or editor context menus.
 */
export class ContextMenuRunHelper {
  private readonly languages: ILanguages;
  private readonly runner: IRunner;

  /**
   * Creates one context-menu run helper.
   *
   * @param {ILanguages} languages Languages service used for recognition checks.
   * @param {IRunner} runner Runner service used to execute actions.
   */
  public constructor(languages: ILanguages, runner: IRunner) {
    this.languages = languages;
    this.runner = runner;
  }

  /**
   * Executes one run action resolved from tree item or resource URI context.
   *
   * @param {ExecuteContextMenuRunActionRequest} request Context-menu run request.
   * @returns {Promise<void>} Resolves when invocation flow completes.
   */
  public async executeAction(request: ExecuteContextMenuRunActionRequest): Promise<void> {
    const runContext = await this.resolveRunExecutionContext(request);
    if (!runContext) {
      return;
    }

    try {
      const result = await this.runner.executeRunAction({
        algorithmDirectoryPath: runContext.algorithmDirectoryPath,
        actionKind: request.actionKind,
        checkOnlyRouteOverride: request.checkOnlyRouteOverride,
        targetToken: runContext.targetToken,
        targetFilePath: runContext.targetFilePath,
        languageKey: runContext.languageKey,
      });

      if (!result.ok) {
        void vscode.window.showErrorMessage(result.text);
        return;
      }

      void vscode.window.showInformationMessage(
        `${this.getActionLabel(request.actionKind)} completed: ${runContext.targetLabel}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `Failed to ${this.getActionVerb(request.actionKind)}: ${errorMessage}`,
      );
    }
  }

  /**
   * Resolves run execution context from tree or URI invocation payload.
   *
   * @param {ExecuteContextMenuRunActionRequest} request Context-menu run request.
   * @returns {Promise<RunExecutionContext | undefined>} Resolved context when available.
   */
  private async resolveRunExecutionContext(
    request: ExecuteContextMenuRunActionRequest,
  ): Promise<RunExecutionContext | undefined> {
    const fromTree = this.resolveRunExecutionContextFromTreeItem(request.actionKind, request.treeItem);
    if (fromTree) {
      return fromTree;
    }

    const resourceUri = request.resourceUri ?? vscode.window.activeTextEditor?.document.uri;
    if (!resourceUri || resourceUri.scheme !== "file") {
      void vscode.window.showErrorMessage("Unable to resolve a file or folder for this run action.");
      return undefined;
    }

    const fromUri = await this.resolveRunExecutionContextFromUri(request.actionKind, resourceUri);
    if (!fromUri) {
      void vscode.window.showErrorMessage(
        "Run actions are only available for files or folders inside src/<category>/<algorithm>/.",
      );
    }

    return fromUri;
  }

  /**
   * Resolves run execution context from one Algorithms tree item.
   *
   * @param {RunnerRunActionKind} actionKind Requested action kind.
   * @param {ContextMenuRunTreeItem | undefined} treeItem Tree item from command invocation.
   * @returns {RunExecutionContext | undefined} Resolved run execution context.
   */
  private resolveRunExecutionContextFromTreeItem(
    actionKind: RunnerRunActionKind,
    treeItem: ContextMenuRunTreeItem | undefined,
  ): RunExecutionContext | undefined {
    const algorithmDirectoryPath = treeItem?.implementationParentDirectory?.directoryPath
      ?? treeItem?.algorithmDirectory?.directoryPath;
    if (!algorithmDirectoryPath) {
      return undefined;
    }

    if (!this.actionRequiresConcreteTargetFile(actionKind)) {
      return {
        algorithmDirectoryPath,
        targetFilePath: undefined,
        targetToken: undefined,
        languageKey: undefined,
        targetLabel: path.basename(algorithmDirectoryPath),
      };
    }

    const implementation = treeItem?.algorithmImplementation;
    const targetFilePath = implementation?.filePath;
    if (!targetFilePath || !implementation?.hasImplementation) {
      return undefined;
    }

    return {
      algorithmDirectoryPath,
      targetFilePath,
      targetToken: path.basename(targetFilePath),
      languageKey: implementation.languageKey,
      targetLabel: path.basename(targetFilePath),
    };
  }

  /**
   * Resolves run execution context from one file/folder URI.
   *
   * @param {RunnerRunActionKind} actionKind Requested action kind.
   * @param {vscode.Uri} resourceUri Invoked resource URI.
   * @returns {Promise<RunExecutionContext | undefined>} Resolved run execution context.
   */
  private async resolveRunExecutionContextFromUri(
    actionKind: RunnerRunActionKind,
    resourceUri: vscode.Uri,
  ): Promise<RunExecutionContext | undefined> {
    const resourcePath = resourceUri.fsPath;
    const resourceType = await this.tryGetResourceType(resourceUri);

    if (resourceType === vscode.FileType.Directory) {
      if (this.actionRequiresConcreteTargetFile(actionKind)) {
        return undefined;
      }

      const algorithmDirectoryPath = this.resolveAlgorithmDirectoryPath(resourcePath);
      if (!algorithmDirectoryPath) {
        return undefined;
      }

      return {
        algorithmDirectoryPath,
        targetFilePath: undefined,
        targetToken: undefined,
        languageKey: undefined,
        targetLabel: path.basename(algorithmDirectoryPath),
      };
    }

    if (this.actionRequiresConcreteTargetFile(actionKind)) {
      const isRecognized = await this.languages.isRecognizedFile(resourcePath);
      if (!isRecognized) {
        return undefined;
      }
    }

    const algorithmDirectoryPath = this.resolveAlgorithmDirectoryPath(resourcePath);
    if (!algorithmDirectoryPath) {
      return undefined;
    }

    const targetFilePath = this.actionRequiresConcreteTargetFile(actionKind)
      ? resourcePath
      : undefined;
    const targetToken = targetFilePath ? path.basename(targetFilePath) : undefined;
    const languageKey = targetFilePath ? this.resolveLanguageKeyFromFilePath(targetFilePath) : undefined;

    return {
      algorithmDirectoryPath,
      targetFilePath,
      targetToken,
      languageKey,
      targetLabel: targetToken ?? path.basename(algorithmDirectoryPath),
    };
  }

  /**
   * Resolves the algorithm directory path for a file/folder under src/<category>/<algorithm>/.
   *
   * @param {string} absolutePath Absolute file or folder path.
   * @returns {string | undefined} Absolute algorithm directory path when resolvable.
   */
  private resolveAlgorithmDirectoryPath(absolutePath: string): string | undefined {
    const normalizedPath = path.resolve(absolutePath);
    const srcMarker = `${path.sep}src${path.sep}`;
    const srcMarkerIndex = normalizedPath.lastIndexOf(srcMarker);
    if (srcMarkerIndex < 0) {
      return undefined;
    }

    const prefix = normalizedPath.slice(0, srcMarkerIndex);
    const pathWithinSrc = normalizedPath.slice(srcMarkerIndex + srcMarker.length);
    const pathWithinSrcSegments = pathWithinSrc
      .split(path.sep)
      .filter((segment) => segment.length > 0);
    if (pathWithinSrcSegments.length < 2) {
      return undefined;
    }

    const algorithmRelativePath = path.join("src", pathWithinSrcSegments[0], pathWithinSrcSegments[1]);
    return path.join(prefix, algorithmRelativePath);
  }

  /**
   * Resolves language key from file extension for tracker metadata.
   *
   * @param {string} filePath Absolute file path.
   * @returns {string | undefined} Language key when extension matches known language data.
   */
  private resolveLanguageKeyFromFilePath(filePath: string): string | undefined {
    const extension = path.extname(filePath).trim().toLowerCase();
    if (extension.length === 0) {
      return undefined;
    }

    const language = GENERATED_LANGUAGE_DATA.languages.find((entry) => {
      return entry.aliases.fileExtensions.some((aliasExtension) => {
        return aliasExtension.trim().toLowerCase() === extension;
      });
    });

    return language?.key;
  }

  /**
   * Returns one resource type when stat succeeds.
   *
   * @param {vscode.Uri} resourceUri Resource URI to inspect.
   * @returns {Promise<vscode.FileType | undefined>} Resource type when stat succeeds.
   */
  private async tryGetResourceType(resourceUri: vscode.Uri): Promise<vscode.FileType | undefined> {
    try {
      const stat = await vscode.workspace.fs.stat(resourceUri);
      return stat.type;
    } catch {
      return undefined;
    }
  }

  /**
   * Returns true when action requires a concrete target file.
   *
   * @param {RunnerRunActionKind} actionKind Requested action kind.
   * @returns {boolean} True when file target is required.
   */
  private actionRequiresConcreteTargetFile(actionKind: RunnerRunActionKind): boolean {
    return actionKind !== "clean" && actionKind !== "localclean";
  }

  /**
   * Returns a short label for one run action kind.
   *
   * @param {RunnerRunActionKind} actionKind Requested action kind.
   * @returns {string} Human-friendly action label.
   */
  private getActionLabel(actionKind: RunnerRunActionKind): string {
    if (actionKind === "compile-only") {
      return "Compile Only";
    }

    if (actionKind === "check-only") {
      return "Check Only";
    }

    if (actionKind === "clean") {
      return "Clean";
    }

    if (actionKind === "localclean") {
      return "Local Clean";
    }

    return "Run File";
  }

  /**
   * Returns a short verb phrase for one run action kind.
   *
   * @param {RunnerRunActionKind} actionKind Requested action kind.
   * @returns {string} Action verb phrase.
   */
  private getActionVerb(actionKind: RunnerRunActionKind): string {
    if (actionKind === "compile-only") {
      return "compile file";
    }

    if (actionKind === "check-only") {
      return "check file";
    }

    if (actionKind === "clean") {
      return "clean algorithm";
    }

    if (actionKind === "localclean") {
      return "local clean algorithm";
    }

    return "run file";
  }
}