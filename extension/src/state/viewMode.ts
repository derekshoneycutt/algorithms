import * as vscode from "vscode";

/**
 * Algorithms tree sidebar view mode.
 */
export type SidebarViewMode = "files" | "language";

/**
 * DI contract for sidebar view mode management.
 */
export interface IViewModeService {
  /**
   * Gets the currently active view mode.
   *
   * @returns {SidebarViewMode} Current view mode.
   */
  getViewMode(): SidebarViewMode;

  /**
   * Sets the view mode and updates the VS Code context.
   *
   * @param {SidebarViewMode} mode New view mode.
   * @returns {Promise<void>}
   */
  setViewMode(mode: SidebarViewMode): Promise<void>;

  /**
   * Fires whenever the view mode changes.
   */
  onDidChangeViewMode: vscode.Event<SidebarViewMode>;
}

/**
 * Creates the sidebar view mode service.
 *
 * Sets the initial VS Code context key to "files" on creation.
 *
 * @returns {IViewModeService} View mode service instance.
 */
export function createViewModeService(): IViewModeService {
  let currentMode: SidebarViewMode = "files";
  const onDidChangeViewModeEmitter = new vscode.EventEmitter<SidebarViewMode>();

  // Initialize the context key so toggle buttons appear correctly from the start
  void vscode.commands.executeCommand("setContext", "algos.sidebarViewMode", "files");

  return {
    getViewMode(): SidebarViewMode {
      return currentMode;
    },

    async setViewMode(mode: SidebarViewMode): Promise<void> {
      if (currentMode === mode) {
        return;
      }

      currentMode = mode;

      // Update the VS Code context key for menu visibility
      await vscode.commands.executeCommand(
        "setContext",
        "algos.sidebarViewMode",
        mode
      );

      onDidChangeViewModeEmitter.fire(mode);
    },

    onDidChangeViewMode: onDidChangeViewModeEmitter.event,
  };
}
