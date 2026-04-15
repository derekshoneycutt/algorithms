const vscode = require("vscode");
const { resolveEligibilityState } = require("../runtime/pathResolver");

/**
 * Creates a default ineligible state for empty workspaces.
 *
 * @returns {{status: string, reason: string, guidance: string, selected: null, evaluations: object[]}} Empty-workspace state.
 */
function createEmptyWorkspaceState() {
  return {
    status: "ineligible",
    reason: "no-workspace-folders",
    guidance: "No workspace folders are open.",
    selected: null,
    evaluations: [],
  };
}

/**
 * Returns workspace folders from VS Code API.
 *
 * @returns {import("vscode").WorkspaceFolder[]} Open workspace folders.
 */
function getWorkspaceFolders() {
  return vscode.workspace.workspaceFolders || [];
}

/**
 * Resolves the sidebar state by selecting the first supported workspace folder.
 *
 * Scans folders in workspace order and immediately selects the first folder
 * that resolves to an eligible algorithms root. Later folders are ignored.
 *
 * @param {import("vscode").WorkspaceFolder[]} workspaceFolders Open workspace folders.
 * @returns {{supported: boolean, statusState: {status?: string, reason?: string, guidance?: string, selected?: {resolvedRoot?: string}|null, evaluations?: object[]}}} Sidebar workspace state.
 */
function resolveSidebarWorkspaceState(workspaceFolders) {
  if (!Array.isArray(workspaceFolders) || workspaceFolders.length === 0) {
    return {
      supported: false,
      statusState: createEmptyWorkspaceState(),
    };
  }

  for (const workspaceFolder of workspaceFolders) {
    const folderState = resolveEligibilityState([workspaceFolder]);

    if (folderState.status === "eligible" && folderState.selected?.resolvedRoot) {
      return {
        supported: true,
        statusState: folderState,
      };
    }
  }

  return {
    supported: false,
    statusState: resolveEligibilityState(workspaceFolders),
  };
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
    this._statusState = createEmptyWorkspaceState();
  }

  /**
   * Updates the cached status state used by the tree view.
   *
   * @param {{status?: string, reason?: string, guidance?: string, selected?: {resolvedRoot?: string}|null, evaluations?: object[]}} statusState Sidebar status state.
   * @returns {void}
   */
  setStatusState(statusState) {
    this._statusState = statusState || createEmptyWorkspaceState();
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

    const item = new vscode.TreeItem(
      buildWorkspaceStatusMessage(this._statusState),
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

  /**
   * Refreshes cached sidebar state and visibility context.
   *
   * @returns {Thenable<void>} Completion result.
   */
  function refreshWorkspaceViewState() {
    const sidebarState = resolveSidebarWorkspaceState(getWorkspaceFolders());
    provider.setStatusState(sidebarState.statusState);
    provider.refresh();

    return vscode.commands.executeCommand(
      "setContext",
      "algos.workspaceSupported",
      sidebarState.supported
    );
  }

  const refreshOnFolderChange = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    void refreshWorkspaceViewState();
  });

  void refreshWorkspaceViewState();

  return {
    refresh: () => {
      void refreshWorkspaceViewState();
    },
    disposables: [view, refreshOnFolderChange, provider],
  };
}

// Public API for the workspace algorithms run view.
module.exports = {
  buildWorkspaceStatusMessage,
  registerWorkspaceAlgorithmsRunView,
};
