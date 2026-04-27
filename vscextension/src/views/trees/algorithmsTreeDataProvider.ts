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
 * Returns true when one tree node kind can project Run File status.
 *
 * @param {WorkspaceTreeNode} element Tree node.
 * @returns {boolean} True when run-status projection is supported.
 */
type RunStatusNode = WorkspaceTreeNode & {
  kind: "file" | "mainFile" | "languageSummary" | "algorithmDir";
};

function isRunStatusNode(element: WorkspaceTreeNode): element is RunStatusNode {
  return element.kind === "file"
    || element.kind === "mainFile"
    || element.kind === "languageSummary"
    || element.kind === "algorithmDir";
}

/**
 * Formats one run status to title case for tooltip text.
 *
 * @param {string} status Raw run status.
 * @returns {string} Human-readable status.
 */
function formatRunStatusLabel(status: string): string {
  if (status.length === 0) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Builds one run-status tooltip text from snapshot details.
 *
 * @param {string} status Run status.
 * @param {string | null} message Snapshot message.
 * @param {string | null} errorMessage Snapshot error message.
 * @returns {string} Tooltip text.
 */
function buildRunStatusTooltip(
  status: string,
  message: string | null,
  errorMessage: string | null
): string {
  const lines = [`Run Action: ${formatRunStatusLabel(status)}`];

  if (errorMessage !== null && errorMessage.trim().length > 0) {
    lines.push(`Error: ${errorMessage}`);
  } else if (message !== null && message.trim().length > 0) {
    lines.push(message);
  }

  return lines.join("\n");
}

/**
 * Formats one smoke runtime status to title case for tooltip text.
 *
 * @param {"queued" | "running" | "passed" | "failed"} status Runtime smoke status.
 * @returns {string} Human-readable status.
 */
function formatSmokeStatusLabel(
  status: "queued" | "running" | "passed" | "failed"
): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Builds one smoke-status tooltip for language summary rows.
 *
 * @param {string} algorithmPath Algorithm path key.
 * @param {string} languageKey Language key.
 * @param {"queued" | "running" | "passed" | "failed"} status Runtime smoke status.
 * @returns {string} Tooltip text.
 */
function buildSmokeStatusTooltip(
  algorithmPath: string,
  languageKey: string,
  status: "queued" | "running" | "passed" | "failed"
): string {
  const algorithmName = algorithmPath.split(/[\\/]/).pop() ?? algorithmPath;
  return `Smoke Test: ${formatSmokeStatusLabel(status)} (${languageKey}) in ${algorithmName}`;
}

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
    conductor,
    hostState,
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
    let resolvedElement = element;

    if (conductor !== undefined && isRunStatusNode(element)) {
      const runSnapshot = conductor.getRunForTarget({
        filePath: element.filePath,
        nodeKind: element.kind,
      });

      if (runSnapshot !== null) {
        resolvedElement = {
          ...element,
          runStatus: runSnapshot.status,
          runStatusTooltip: buildRunStatusTooltip(
            runSnapshot.status,
            runSnapshot.message,
            runSnapshot.errorMessage
          ),
        };
      }
    }

    if (
      hostState !== undefined
      && element.kind === "languageSummary"
      && element.languageKey !== undefined
      && element.parentAlgorithmPath !== undefined
    ) {
      const snapshot = hostState.getSnapshot();
      const byLanguage = snapshot.smokeRunStatusByAlgorithm[element.parentAlgorithmPath];
      const smokeStatus = byLanguage?.[element.languageKey.trim().toLowerCase()];

      if (smokeStatus !== undefined) {
        resolvedElement = {
          ...resolvedElement,
          smokeStatus,
          smokeStatusTooltip: buildSmokeStatusTooltip(
            element.parentAlgorithmPath,
            element.languageKey,
            smokeStatus
          ),
        };
      }
    }

    const treeItem = createTreeItem(resolvedElement, contextValue);

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
