import * as vscode from "vscode";

import type { IConductor, ConductorRunStatus } from "../../conductor";
import type { IFilesystem } from "../../filesystem";
import type { ILanguages } from "../../languages";
import type { IAlgorithmsIndex } from "../../algorithms";
import type { IFilterModeService } from "../../state/filterMode";
import type { IViewModeService } from "../../state/viewMode";
import type { IStateMachine, SmokeLanguageRunStatus } from "../../state";

/**
 * One tree node rendered in the workspace tree panels.
 *
 * Node kinds:
 * - "directory": generic folder (category-level dir, stdlib dir)
 * - "algorithmDir": algorithm directory (second-level in algorithms tree, has implementations)
 * - "docsFolder": synthetic docs container under one algorithm directory
 * - "file": plain file (non-collapsible)
 * - "docsFile": documentation file under one docs folder
 * - "mainFile": algorithm main file (collapsible, may have includes)
 * - "languageSummary": language grouping row for LANGUAGE view (collapsible)
 *
 * Algorithm directories have:
 * - kind: "algorithmDir"
 * - filePath: the algorithm directory path
 *
 * Main files (in FILES view) have:
 * - kind: "mainFile"
 * - filePath: the main file path
 * - languageKey: the language of this main file
 * - parentAlgorithmPath: the algorithm directory
 *
 * Language summary rows (in LANGUAGE view) have:
 * - kind: "languageSummary"
 * - filePath: the main file path (for opening)
 * - languageKey: the language key (for label display)
 * - parentAlgorithmPath: the algorithm directory
 *
 * Include files have:
 * - kind: "file"
 * - filePath: the include file path
 * - languageKey: the language of the include file
 * - isIncludeFile: true
 */
export interface WorkspaceTreeNode {
  kind: "directory" | "algorithmDir" | "docsFolder" | "file" | "docsFile" | "mainFile" | "languageSummary";
  filePath: string;
  filePathsByLanguage?: Record<string, string[]>;
  languageKey?: string;
  parentAlgorithmPath?: string;
  /** Optional documentation file count shown on synthetic docs folder rows. */
  docsFileCount?: number;
  isIncludeFile?: boolean;
  isFlagged?: boolean;
  isMissing?: boolean;
  /** True when this node has include files nested under it. Controls collapse arrow. */
  hasIncludes?: boolean;
  /** Total language file count in the current algorithm (main and include files). */
  languageFileCount?: number;
  /** True when this row has a concrete open target file. */
  hasOpenTarget?: boolean;
  /** Optional run status for row decoration. */
  runStatus?: ConductorRunStatus;
  /** Optional tooltip detail for run status. */
  runStatusTooltip?: string;
  /** Optional runtime smoke-test status for language rows. */
  smokeStatus?: SmokeLanguageRunStatus;
  /** Optional tooltip detail for smoke-test status. */
  smokeStatusTooltip?: string;
  /** True when one smoke test is actively running for this algorithm folder. */
  isSmokeRunning?: boolean;
  /** True when retained smoke results currently exist for this algorithm folder. */
  hasSmokeResults?: boolean;
}

/**
 * Tree data provider contract with explicit refresh support.
 */
export interface RefreshableWorkspaceTreeDataProvider
  extends vscode.TreeDataProvider<WorkspaceTreeNode> {
  /**
   * Triggers a tree refresh.
   *
   * @returns {void}
   */
  refresh(): void;
  /**
   * Finds the tree node for one file path, if the file is present in this tree.
   *
   * @param {string} filePath Absolute file path to locate.
   * @returns {Promise<{ node: WorkspaceTreeNode; viewId: string } | null>} Found node with view id, or null.
   */
  findNodeForFilePath(filePath: string): Promise<{ node: WorkspaceTreeNode; viewId: string } | null>;
}

/**
 * Dependencies for restricted tree node discovery.
 */
export interface RestrictedTreeDiscoveryDependencies {
  filesystem: IFilesystem;
  languages: ILanguages;
}

/**
 * Dependencies for creating one algorithms tree data provider.
 */
export interface AlgorithmsTreeDataProviderDependencies {
  algorithmsIndex: IAlgorithmsIndex;
  conductor?: IConductor;
  hostState?: IStateMachine;
  viewModeService: IViewModeService;
  filterModeService: IFilterModeService;
  languages: ILanguages;
  viewId: string;
}

/**
 * Dependencies for creating one standard-library tree data provider.
 */
export interface StandardLibraryTreeDataProviderDependencies {
  algorithmsIndex: IAlgorithmsIndex;
  viewId: string;
}
