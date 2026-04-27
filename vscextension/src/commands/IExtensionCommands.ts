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
}
