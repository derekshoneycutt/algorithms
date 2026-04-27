import * as vscode from "vscode";

/**
 * Algorithms tree sidebar filter mode.
 */
export type SidebarFilterMode = "all" | "problems";

/**
 * DI contract for sidebar filter mode management.
 */
export interface IFilterModeService {
  /**
   * Gets the currently active filter mode.
   *
   * @returns {SidebarFilterMode} Current filter mode.
   */
  getFilterMode(): SidebarFilterMode;

  /**
   * Sets the filter mode and updates the VS Code context.
   *
   * @param {SidebarFilterMode} mode New filter mode.
   * @returns {Promise<void>}
   */
  setFilterMode(mode: SidebarFilterMode): Promise<void>;

  /**
   * Fires whenever the filter mode changes.
   */
  onDidChangeFilterMode: vscode.Event<SidebarFilterMode>;
}

/**
 * Creates the sidebar filter mode service.
 *
 * Sets the initial VS Code context key to "all" on creation.
 *
 * @returns {IFilterModeService} Filter mode service instance.
 */
export function createFilterModeService(): IFilterModeService {
  let currentMode: SidebarFilterMode = "all";
  const onDidChangeFilterModeEmitter = new vscode.EventEmitter<SidebarFilterMode>();

  void vscode.commands.executeCommand("setContext", "algos.sidebarFilterMode", "all");

  return {
    getFilterMode(): SidebarFilterMode {
      return currentMode;
    },

    async setFilterMode(mode: SidebarFilterMode): Promise<void> {
      if (currentMode === mode) {
        return;
      }

      currentMode = mode;

      await vscode.commands.executeCommand(
        "setContext",
        "algos.sidebarFilterMode",
        mode
      );

      onDidChangeFilterModeEmitter.fire(mode);
    },

    onDidChangeFilterMode: onDidChangeFilterModeEmitter.event,
  };
}