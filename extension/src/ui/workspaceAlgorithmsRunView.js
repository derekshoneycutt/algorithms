const vscode = require("vscode");
const { resolveEligibilityState } = require("../runtime/pathResolver");

/**
 * Returns workspace folders from VS Code API.
 *
 * @returns {import("vscode").WorkspaceFolder[]} Open workspace folders.
 */
function getWorkspaceFolders() {
  return vscode.workspace.workspaceFolders || [];
}

/**
 * Builds a user-facing status message from aggregated eligibility state.
 *
 * @param {{status?: string, reason?: string, selected?: {resolvedRoot?: string}}} state Eligibility state.
 * @returns {string} Human-readable status text.
 */
function buildWorkspaceStatusMessage(state) {
  if (!state || state.reason === "no-workspace-folders") {
    return "No Workspace Open";
  }

  if (state.status === "eligible" && state.selected?.resolvedRoot) {
    return `Supported Directory: ${state.selected.resolvedRoot}`;
  }

  if (state.status === "ambiguous") {
    return "Multiple Supported Roots Open";
  }

  if (state.status === "partial" || state.status === "ineligible") {
    return `Unsupported Workspace (${state.reason || "unknown"})`;
  }

  return "Workspace Status Unknown";
}

/**
 * Provides a single status row for the Algorithms sidebar view.
 */
class WorkspaceStatusTreeDataProvider {
  /**
   * Creates a workspace status provider.
   */
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  /**
   * Refreshes the view's tree data.
   *
   * @returns {void}
   */
  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Returns tree item metadata for a status item.
   *
   * @param {import("vscode").TreeItem} element Tree element.
   * @returns {import("vscode").TreeItem} Tree item.
   */
  getTreeItem(element) {
    return element;
  }

  /**
   * Returns the status rows for the root of the view.
   *
   * @param {import("vscode").TreeItem|undefined} element Parent element.
   * @returns {Thenable<import("vscode").TreeItem[]>} Tree items.
   */
  getChildren(element) {
    if (element) {
      return Promise.resolve([]);
    }

    const statusState = resolveEligibilityState(getWorkspaceFolders());
    const item = new vscode.TreeItem(
      buildWorkspaceStatusMessage(statusState),
      vscode.TreeItemCollapsibleState.None
    );
    item.contextValue = "algos.workspaceStatus";
    item.tooltip = item.label;

    return Promise.resolve([item]);
  }

  /**
   * Disposes provider-owned resources.
   *
   * @returns {void}
   */
  dispose() {
    this._onDidChangeTreeData.dispose();
  }
}

/**
 * Registers the workspace status view and refresh hooks.
 *
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerWorkspaceAlgorithmsRunView() {
  const provider = new WorkspaceStatusTreeDataProvider();
  const view = vscode.window.createTreeView("algosWorkspaceAlgorithmsRunView", {
    treeDataProvider: provider,
    showCollapseAll: false,
  });

  const refreshOnFolderChange = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    provider.refresh();
  });

  provider.refresh();

  return {
    refresh: () => {
      provider.refresh();
    },
    disposables: [view, refreshOnFolderChange, provider],
  };
}

module.exports = {
  buildWorkspaceStatusMessage,
  registerWorkspaceAlgorithmsRunView,
};
