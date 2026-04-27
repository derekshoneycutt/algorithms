import * as vscode from "vscode";

import type { IConductor } from "../conductor";

/**
 * Dependencies for the editor-title Run File command.
 */
export interface EditorTitleRunCommandDependencies {
  conductor: IConductor;
}

/**
 * Creates the editor-title Run File command.
 *
 * Delegates to conductor for direct run.sh dispatch via the active editor.
 *
 * @param {EditorTitleRunCommandDependencies} dependencies Command dependencies.
 * @returns {(...commandArgs: unknown[]) => Promise<void>} Command handler.
 */
export function createAlgorithmsEditorTitleRunFileCommand(
  dependencies: EditorTitleRunCommandDependencies
): (...commandArgs: unknown[]) => Promise<void> {
  return async (): Promise<void> => {
    const uri = vscode.window.activeTextEditor?.document.uri;
    if (uri === undefined) {
      // Conductor will warn if needed
      await dependencies.conductor.runAlgorithmFile({ fsPath: "" });
      return;
    }
    await dependencies.conductor.runAlgorithmFile(uri);
  };
}

