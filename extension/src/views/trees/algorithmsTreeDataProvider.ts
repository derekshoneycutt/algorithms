import * as path from "node:path";

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
import type { IConductor } from "../../conductor";

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
 * Resolves equivalent run-target kinds that may represent the same file row.
 *
 * @param {RunStatusNode["kind"]} kind Tree row kind.
 * @returns {RunStatusNode["kind"][]} Equivalent lookup order.
 */
function getEquivalentRunTargetKinds(kind: RunStatusNode["kind"]): RunStatusNode["kind"][] {
  if (kind === "algorithmDir") {
    return [kind];
  }

  return [kind, "mainFile", "languageSummary", "file"];
}

/**
 * Resolves one run snapshot for a tree row using equivalent target kinds.
 *
 * @param {IConductor} conductor Conductor dependency.
 * @param {RunStatusNode} element Tree row.
 * @returns {import("../../conductor").ConductorRunSnapshot | null} Snapshot if present.
 */
function getRunSnapshotForElement(
  conductor: IConductor,
  element: RunStatusNode
): import("../../conductor").ConductorRunSnapshot | null {
  const targetKinds = getEquivalentRunTargetKinds(element.kind);

  for (const targetKind of targetKinds) {
    const snapshot = conductor.getRunForTarget({
      filePath: element.filePath,
      nodeKind: targetKind,
    });

    if (snapshot !== null) {
      return snapshot;
    }
  }

  return null;
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
 * Returns true when one run status represents retained results.
 *
 * @param {WorkspaceTreeNode["runStatus"]} status Run status.
 * @returns {boolean} True when status is clearable retained output.
 */
function hasRetainedRunResults(status: WorkspaceTreeNode["runStatus"]): boolean {
  return status !== undefined && status !== "starting" && status !== "running";
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
    if (hasRetainedRunResults(element.runStatus) && element.hasOpenTarget !== false) {
      return element.isFlagged === true
        ? "algos.algorithmsLanguageSummaryRunResultsFlagged"
        : "algos.algorithmsLanguageSummaryRunResultsUnflagged";
    }

    return element.hasOpenTarget === false
      ? "algos.algorithmsLanguageSummaryAbsent"
      : element.isFlagged === true
        ? "algos.algorithmsLanguageSummaryFlagged"
        : "algos.algorithmsLanguageSummaryUnflagged";
  }

  if (element.kind === "mainFile") {
    if (hasRetainedRunResults(element.runStatus)) {
      return element.isFlagged === true
        ? "algos.algorithmsMainFileRunResultsFlagged"
        : "algos.algorithmsMainFileRunResultsUnflagged";
    }

    return element.isFlagged === true
      ? "algos.algorithmsMainFileFlagged"
      : "algos.algorithmsMainFileUnflagged";
  }

  if (element.isIncludeFile) {
    return "algos.algorithmsIncludeFile";
  }

  if (element.kind === "algorithmDir") {
    if (element.isSmokeRunning === true) {
      return "algos.algorithmsSecondLevelDirectorySmokeRunning";
    }

    if (element.hasSmokeResults === true) {
      return "algos.algorithmsSecondLevelDirectorySmokeResults";
    }

    return "algos.algorithmsSecondLevelDirectory";
  }

  if (element.kind === "directory") {
    return "algos.algorithmsFirstLevelDirectory";
  }

  if (element.kind === "file") {
    if (hasRetainedRunResults(element.runStatus)) {
      return element.isFlagged === true
        ? "algos.algorithmFileRunResultsFlagged"
        : "algos.algorithmFileRunResultsUnflagged";
    }

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
  const { viewId } = dependencies;
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
    let resolvedElement = element;

    if (conductor !== undefined && isRunStatusNode(element)) {
      const runSnapshot = getRunSnapshotForElement(conductor, element);

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
      && element.kind === "algorithmDir"
    ) {
      const snapshot = hostState.getSnapshot();
      const hasSmokeResults = snapshot.smokeRunStatusByAlgorithm[element.filePath] !== undefined;
      const isSmokeRunning = snapshot.activeSmokeRunAlgorithmPath === element.filePath;

      if (hasSmokeResults || isSmokeRunning) {
        resolvedElement = {
          ...resolvedElement,
          hasSmokeResults,
          isSmokeRunning,
        };
      }
    }

    if (
      hostState !== undefined
      && (element.kind === "languageSummary" || element.kind === "mainFile")
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

    const contextValue = getTreeItemContextValue(resolvedElement);

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

    /**
     * Triggers a tree refresh.
     *
     * @returns {void}
     */
    refresh(): void {
      onDidChangeTreeDataEmitter.fire();
    },

    /**
     * Resolves the logical parent for one tree element.
     *
     * @param {WorkspaceTreeNode} element Tree element to resolve.
     * @returns {Promise<WorkspaceTreeNode | undefined>} Parent node when present.
     */
    async getParent(element: WorkspaceTreeNode): Promise<WorkspaceTreeNode | undefined> {
      if (
        element.kind === "file"
        && element.isIncludeFile === true
        && element.parentAlgorithmPath !== undefined
        && element.languageKey !== undefined
      ) {
        const implementations = await algorithmsIndex.getImplementations(
          element.parentAlgorithmPath
        );
        const impl = implementations.find((i) => i.languageKey === element.languageKey);
        if (impl === undefined) {
          return undefined;
        }
        const viewMode = viewModeService.getViewMode();
        return {
          kind: viewMode === "language" ? "languageSummary" : "mainFile",
          filePath: impl.filePath,
          languageKey: element.languageKey,
          parentAlgorithmPath: element.parentAlgorithmPath,
          hasIncludes: impl.hasIncludes,
        };
      }

      if (
        element.kind === "file"
        && element.isIncludeFile !== true
        && element.parentAlgorithmPath !== undefined
      ) {
        return { kind: "algorithmDir", filePath: element.parentAlgorithmPath };
      }

      if (
        (element.kind === "mainFile" || element.kind === "languageSummary")
        && element.parentAlgorithmPath !== undefined
      ) {
        return { kind: "algorithmDir", filePath: element.parentAlgorithmPath };
      }

      if (element.kind === "algorithmDir") {
        return { kind: "directory", filePath: path.dirname(element.filePath) };
      }

      return undefined;
    },

    /**
     * Finds one tree node that corresponds to the given file path.
     *
     * @param {string} filePath Absolute file path.
     * @returns {Promise<{ node: WorkspaceTreeNode; viewId: string } | null>} Found node and owner view id, or null.
     */
    async findNodeForFilePath(
      filePath: string
    ): Promise<{ node: WorkspaceTreeNode; viewId: string } | null> {
      const lookup = await algorithmsIndex.getImplementationByFilePath(filePath);
      if (lookup === null) {
        return null;
      }

      if (lookup.fileKind === "main") {
        const viewMode = viewModeService.getViewMode();
        const node: WorkspaceTreeNode = viewMode === "language"
          ? {
              kind: "languageSummary",
              filePath: lookup.mainFilePath,
              languageKey: lookup.languageKey,
              parentAlgorithmPath: lookup.algorithmPath,
              hasIncludes: lookup.hasIncludes,
            }
          : {
              kind: "mainFile",
              filePath: lookup.mainFilePath,
              languageKey: lookup.languageKey,
              parentAlgorithmPath: lookup.algorithmPath,
              hasIncludes: lookup.hasIncludes,
            };
        return { node, viewId };
      }

      if (lookup.fileKind === "implementation") {
        return {
          node: {
            kind: "file",
            filePath: lookup.filePath,
            languageKey: lookup.languageKey,
            parentAlgorithmPath: lookup.algorithmPath,
            isFlagged: lookup.isFlagged,
          },
          viewId,
        };
      }

      return {
        node: {
          kind: "file",
          filePath: lookup.filePath,
          languageKey: lookup.languageKey,
          isIncludeFile: true,
          parentAlgorithmPath: lookup.algorithmPath,
        },
        viewId,
      };
    },
  };
}
