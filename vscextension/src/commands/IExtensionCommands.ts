import type { WorkspaceTreeNode } from "../views";

/**
 * DI contract for the full set of extension commands.
 *
 * Consumers that need to invoke or register commands depend on this interface
 * rather than concrete implementations. The coordinator is the only module
 * that constructs a concrete value satisfying `IExtensionCommands`.
 */
export interface IExtensionCommands {
  /**
   * Displays the current bootstrap status.
   *
   * @returns {Promise<string>} The status message that was displayed.
   */
  showBootstrapStatus: () => Promise<string>;

  /**
   * Creates one Standard Library file at the selected tree target.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  standardLibraryCreateFile: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Creates one Standard Library folder at the selected tree target.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  standardLibraryCreateFolder: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Deletes one Standard Library tree item.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  standardLibraryDelete: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Creates one Algorithms folder at the src root.
   *
   * @returns {Promise<void>}
   */
  algorithmsCreateFolderAtRoot: () => Promise<void>;

  /**
   * Creates one Algorithms folder inside the selected first-level directory.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsCreateFolder: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Creates one Algorithms file inside the selected second-level directory.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsCreateFile: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Deletes one Algorithms tree item.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsDelete: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Adds one Algorithms include file to a selected algorithm source file.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node (algorithm file).
   * @returns {Promise<void>}
   */
  algorithmsAddIncludeFile: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Switches the algorithms sidebar to file view.
   *
   * @returns {Promise<void>}
   */
  algorithmsSidebarShowFileView: () => Promise<void>;

  /**
   * Switches the algorithms sidebar to language view.
   *
   * @returns {Promise<void>}
   */
  algorithmsSidebarShowLanguageView: () => Promise<void>;

  /**
   * Switches the algorithms sidebar to show all rows.
   *
   * @returns {Promise<void>}
   */
  algorithmsSidebarShowAllRows: () => Promise<void>;

  /**
   * Switches the algorithms sidebar to show only problem rows.
   *
   * @returns {Promise<void>}
   */
  algorithmsSidebarShowProblemRows: () => Promise<void>;

  /**
   * Flags one language for the hovered algorithm row.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsFlagLanguage: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Clears one language flag for the hovered algorithm row.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsUnflagLanguage: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Runs one Algorithms source file from a hovered file/language row.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsRunFile: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Compiles one Algorithms source target without running it.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsCompileOnly: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Performs one check-only pass for the hovered Algorithms target.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsCheckOnly: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Cleans run output plus optional stdlib/archive artifacts.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsClean: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Cleans only local output artifacts for the hovered target.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsLocalClean: (treeNode?: WorkspaceTreeNode) => Promise<void>;

  /**
   * Runs smoke tests for the hovered Algorithms directory.
   *
   * @param {WorkspaceTreeNode} [treeNode] Hovered tree node.
   * @returns {Promise<void>}
   */
  algorithmsSmokeTest: (treeNode?: WorkspaceTreeNode) => Promise<void>;
}
