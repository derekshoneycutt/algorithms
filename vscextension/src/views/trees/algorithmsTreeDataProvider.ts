import * as vscode from "vscode";

import type {
  AlgorithmsTreeDataProviderDependencies,
  RefreshableWorkspaceTreeDataProvider,
  WorkspaceTreeNode,
} from "./types";
import {
  getChildrenRoot,
  getChildrenCategory,
  getChildrenAlgorithmDir,
  getChildrenLanguageOrMainFile,
} from "./algorithmChildren";
import { createTreeItem } from "./treeProviders";

/**
 * Resolves the context value for a tree item based on element kind and flags.
 *
 * @param {WorkspaceTreeNode} element Tree element.
 * @returns {string | undefined} Context value for menu targeting.
 */
function getTreeItemContextValue(element: WorkspaceTreeNode): string | undefined {
  if (element.kind === "languageSummary" && element.languageKey) {
    return element.hasOpenTarget === false
      ? "algos.algorithmsLanguageSummaryAbsent"
      : element.isFlagged === true
        ? "algos.algorithmsLanguageSummaryFlagged"
        : "algos.algorithmsLanguageSummaryUnflagged";
  }

  if (element.kind === "mainFile") {
    return element.isFlagged === true
      ? "algos.algorithmsMainFileFlagged"
      : "algos.algorithmsMainFileUnflagged";
  }

  if (element.isIncludeFile) {
    return "algos.algorithmsIncludeFile";
  }

  if (element.kind === "algorithmDir") {
    return "algos.algorithmsSecondLevelDirectory";
  }

  if (element.kind === "directory") {
    return "algos.algorithmsFirstLevelDirectory";
  }

  if (element.kind === "file") {
    return element.isFlagged === true
      ? "algos.algorithmFileFlagged"
      : "algos.algorithmFileUnflagged";
  }

  return undefined;
}

/**
 * Creates one algorithms tree data provider.
 *
 * @param {AlgorithmsTreeDataProviderDependencies} dependencies Provider dependencies.
 * @returns {RefreshableWorkspaceTreeDataProvider} Algorithms tree provider.
 */
export function createWorkspaceAlgorithmsTreeDataProvider(
  dependencies: AlgorithmsTreeDataProviderDependencies
): RefreshableWorkspaceTreeDataProvider {
  const {
    algorithmsIndex,
    filterModeService,
    viewModeService,
    languages,
  } = dependencies;
  const onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    WorkspaceTreeNode | undefined | null | void
  >();

  // Refresh the tree whenever the user switches view modes
  viewModeService.onDidChangeViewMode(() => {
    onDidChangeTreeDataEmitter.fire();
  });

  filterModeService.onDidChangeFilterMode(() => {
    onDidChangeTreeDataEmitter.fire();
  });

  /**
   * Resolves child nodes for the given element.
   *
   * @param {WorkspaceTreeNode | undefined} element Parent element.
   * @returns {Promise<WorkspaceTreeNode[]>} Child nodes.
   */
  async function getChildrenForElement(
    element: WorkspaceTreeNode | undefined
  ): Promise<WorkspaceTreeNode[]> {
    const viewMode = viewModeService.getViewMode();
    const filterMode = filterModeService.getFilterMode();

    // Include file parents: return include files from precomputed paths
    if (
      element !== undefined &&
      (element.kind === "languageSummary" || element.kind === "mainFile") &&
      element.languageKey &&
      element.parentAlgorithmPath
    ) {
      return getChildrenLanguageOrMainFile(element, algorithmsIndex);
    }

    // Algorithm directory: return mainFile or languageSummary nodes
    if (element !== undefined && element.kind === "algorithmDir") {
      return getChildrenAlgorithmDir(
        element.filePath,
        algorithmsIndex,
        languages,
        filterMode,
        viewMode
      );
    }

    // Category directory: return algorithm dirs
    if (element !== undefined && element.kind === "directory") {
      return getChildrenCategory(
        element.filePath,
        algorithmsIndex,
        languages,
        filterMode,
        viewMode
      );
    }

    if (element !== undefined) {
      return [];
    }

    // Root: return categories
    return getChildrenRoot(algorithmsIndex, languages, filterMode, viewMode);
  }

  /**
   * Resolves the tree item for the given element.
   *
   * @param {WorkspaceTreeNode} element Tree element.
   * @returns {vscode.TreeItem} Resolved tree item.
   */
  function getTreeItemForElement(element: WorkspaceTreeNode): vscode.TreeItem {
    const contextValue = getTreeItemContextValue(element);
    const treeItem = createTreeItem(element, contextValue);

    if (element.kind === "languageSummary" && element.languageKey) {
      treeItem.label =
        languages.getDisplayLabel(element.languageKey)
        ?? element.languageKey;
    }

    return treeItem;
  }

  return {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,
    getChildren: getChildrenForElement,
    getTreeItem: getTreeItemForElement,
    refresh(): void {
      onDidChangeTreeDataEmitter.fire();
    },
  };
}
