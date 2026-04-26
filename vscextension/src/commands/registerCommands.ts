import * as vscode from "vscode";

import type { IExtensionCommands } from "./IExtensionCommands";

/**
 * Registers the full extension command set using the provided commands interface.
 *
 * @param {IExtensionCommands} commands Concrete command implementations owned by the coordinator.
 * @returns {vscode.Disposable} Disposable covering all registered commands.
 */
export function registerCommands(
  commands: IExtensionCommands
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "algos.showBootstrapStatus",
    commands.showBootstrapStatus
  );
}