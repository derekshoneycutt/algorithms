import * as vscode from "vscode";

import type { IExtensionCommands } from "./IExtensionCommands";
import {
  getShowBootstrapStatusCommandId,
  getStandardLibraryCreateFileCommandId,
  getStandardLibraryCreateFolderCommandId,
  getStandardLibraryDeleteCommandId,
  getAlgorithmsCreateFolderAtRootCommandId,
  getAlgorithmsCreateFolderCommandId,
  getAlgorithmsCreateFileCommandId,
  getAlgorithmsAddIncludeFileCommandId,
  getAlgorithmsSidebarShowFileViewCommandId,
  getAlgorithmsSidebarShowLanguageViewCommandId,
  getAlgorithmsSidebarShowAllRowsCommandId,
  getAlgorithmsSidebarShowProblemRowsCommandId,
  getAlgorithmsDeleteCommandId,
  getAlgorithmsFlagLanguageCommandId,
  getAlgorithmsUnflagLanguageCommandId,
  getAlgorithmsRunFileCommandId,
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
    ),
    vscode.commands.registerCommand(
      getAlgorithmsCreateFolderAtRootCommandId(),
      commands.algorithmsCreateFolderAtRoot
    ),
    vscode.commands.registerCommand(
      getAlgorithmsCreateFolderCommandId(),
      commands.algorithmsCreateFolder
    ),
    vscode.commands.registerCommand(
      getAlgorithmsCreateFileCommandId(),
      commands.algorithmsCreateFile
    ),
    vscode.commands.registerCommand(
      getAlgorithmsAddIncludeFileCommandId(),
      commands.algorithmsAddIncludeFile
    ),
    vscode.commands.registerCommand(
      getAlgorithmsSidebarShowFileViewCommandId(),
      commands.algorithmsSidebarShowFileView
    ),
    vscode.commands.registerCommand(
      getAlgorithmsSidebarShowLanguageViewCommandId(),
      commands.algorithmsSidebarShowLanguageView
    ),
    vscode.commands.registerCommand(
      getAlgorithmsSidebarShowAllRowsCommandId(),
      commands.algorithmsSidebarShowAllRows
    ),
    vscode.commands.registerCommand(
      getAlgorithmsSidebarShowProblemRowsCommandId(),
      commands.algorithmsSidebarShowProblemRows
    ),
    vscode.commands.registerCommand(
      getAlgorithmsDeleteCommandId(),
      commands.algorithmsDelete
    ),
    vscode.commands.registerCommand(
      getAlgorithmsFlagLanguageCommandId(),
      commands.algorithmsFlagLanguage
    ),
    vscode.commands.registerCommand(
      getAlgorithmsUnflagLanguageCommandId(),
      commands.algorithmsUnflagLanguage
    ),
    vscode.commands.registerCommand(
      getAlgorithmsRunFileCommandId(),
      commands.algorithmsRunFile
    )
  );
}