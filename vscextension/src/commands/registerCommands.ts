import * as vscode from "vscode";

import type { IExtensionCommands } from "./IExtensionCommands";
import {
  getShowBootstrapStatusCommandId,
  getStandardLibraryCreateFileCommandId,
  getStandardLibraryCreateFolderCommandId,
  getStandardLibraryDeleteCommandId,
} from "./commandIds";

/**
 * Registers the full extension command set using the provided commands interface.
 *
 * @param {IExtensionCommands} commands Concrete command implementations owned by the coordinator.
 * @returns {vscode.Disposable} Disposable covering all registered commands.
 */
export function registerCommands(
  commands: IExtensionCommands
): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.commands.registerCommand(
      getShowBootstrapStatusCommandId(),
      commands.showBootstrapStatus
    ),
    vscode.commands.registerCommand(
      getStandardLibraryCreateFileCommandId(),
      commands.standardLibraryCreateFile
    ),
    vscode.commands.registerCommand(
      getStandardLibraryCreateFolderCommandId(),
      commands.standardLibraryCreateFolder
    ),
    vscode.commands.registerCommand(
      getStandardLibraryDeleteCommandId(),
      commands.standardLibraryDelete
    )
  );
}