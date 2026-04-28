import * as vscode from "vscode";

import type { IConductor } from "../conductor";
import type { IFilesystem } from "../filesystem";
import type { IFlaggedLanguagesService } from "../algorithms";
import type { IRootPathResolver } from "../algorithms";
import type { ILanguages } from "../languages";
import type { INotificationRouter } from "../notifications";
import type {
  IFilterModeService,
  IStateMachine,
  IViewModeService,
} from "../state";
import type { RefreshableWorkspaceTreeDataProvider } from "../views";
import type { IExtensionCommands } from "./IExtensionCommands";
import {
  createAlgorithmsAddIncludeFileCommand,
  createAlgorithmsCheckOnlyDockerCommand,
  createAlgorithmsCheckOnlyNativeCommand,
  createAlgorithmsCheckOnlySshCommand,
  createAlgorithmsCleanCommand,
  createAlgorithmsClearRunResultsCommand,
  createAlgorithmsClearSmokeResultsCommand,
  createAlgorithmsCompileOnlyCommand,
  createAlgorithmsCreateFileCommand,
  createAlgorithmsCreateFolderAtRootCommand,
  createAlgorithmsCreateFolderCommand,
  createAlgorithmsDeleteCommand,
  createAlgorithmsEditorTitleCheckOnlyDockerCommand,
  createAlgorithmsEditorTitleCheckOnlyNativeCommand,
  createAlgorithmsEditorTitleCheckOnlySshCommand,
  createAlgorithmsEditorTitleCleanCommand,
  createAlgorithmsEditorTitleCompileOnlyCommand,
  createAlgorithmsEditorTitleLocalCleanCommand,
  createAlgorithmsEditorTitleRunFileCommand,
  createAlgorithmsExplorerRunCommands,
  createAlgorithmsFlagLanguageCommand,
  createAlgorithmsLocalCleanCommand,
  createAlgorithmsRunFileCommand,
  createAlgorithmsSidebarShowAllRowsCommand,
  createAlgorithmsSidebarShowFileViewCommand,
  createAlgorithmsSidebarShowLanguageViewCommand,
  createAlgorithmsSidebarShowProblemRowsCommand,
  createAlgorithmsSmokeTestCommand,
  createAlgorithmsStopSmokeTestCommand,
  createAlgorithmsUnflagLanguageCommand,
  createShowBootstrapStatusCommand,
  createStandardLibraryCreateFileCommand,
  createStandardLibraryCreateFolderCommand,
  createStandardLibraryDeleteCommand,
} from "./index";

/**
 * Input for coordinator command construction.
 */
export interface CreateCoordinatorCommandsInput {
  conductor: IConductor;
  context: vscode.ExtensionContext;
  explorerRunCommands: ReturnType<typeof createAlgorithmsExplorerRunCommands>;
  filesystem: IFilesystem;
  filterModeService: IFilterModeService;
  flaggedLanguages: IFlaggedLanguagesService;
  languages: ILanguages;
  notificationRouter: INotificationRouter;
  rootPathResolver: IRootPathResolver | undefined;
  stateMachine: IStateMachine;
  viewModeService: IViewModeService;
  workspaceAlgorithmsTreeProvider: RefreshableWorkspaceTreeDataProvider;
  workspaceStandardLibraryTreeProvider: RefreshableWorkspaceTreeDataProvider;
}

/**
 * Creates the coordinator command set from runtime and view dependencies.
 *
 * @param {CreateCoordinatorCommandsInput} input Coordinator command dependencies.
 * @returns {IExtensionCommands} Command set for registration.
 */
export function createCoordinatorCommands(
  input: CreateCoordinatorCommandsInput
): IExtensionCommands {
  return {
    showBootstrapStatus: createShowBootstrapStatusCommand({
      extensionDisplayName: String(
        input.context.extension.packageJSON.displayName ?? input.context.extension.id
      ),
      extensionVersion: String(input.context.extension.packageJSON.version ?? "0.0.0"),
      hostState: input.stateMachine,
      showStatusMessage: input.notificationRouter.info,
    }),
    standardLibraryCreateFile: createStandardLibraryCreateFileCommand({
      filesystem: input.filesystem,
      notificationRouter: input.notificationRouter,
      refreshStandardLibraryTree: input.workspaceStandardLibraryTreeProvider.refresh,
      rootPathResolver: input.rootPathResolver,
    }),
    standardLibraryCreateFolder: createStandardLibraryCreateFolderCommand({
      filesystem: input.filesystem,
      notificationRouter: input.notificationRouter,
      refreshStandardLibraryTree: input.workspaceStandardLibraryTreeProvider.refresh,
      rootPathResolver: input.rootPathResolver,
    }),
    standardLibraryDelete: createStandardLibraryDeleteCommand({
      filesystem: input.filesystem,
      notificationRouter: input.notificationRouter,
      refreshStandardLibraryTree: input.workspaceStandardLibraryTreeProvider.refresh,
      rootPathResolver: input.rootPathResolver,
    }),
    algorithmsCreateFolderAtRoot: createAlgorithmsCreateFolderAtRootCommand({
      filesystem: input.filesystem,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
      rootPathResolver: input.rootPathResolver,
    }),
    algorithmsCreateFolder: createAlgorithmsCreateFolderCommand({
      filesystem: input.filesystem,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
      rootPathResolver: input.rootPathResolver,
    }),
    algorithmsCreateFile: createAlgorithmsCreateFileCommand({
      filesystem: input.filesystem,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
      rootPathResolver: input.rootPathResolver,
    }),
    algorithmsAddIncludeFile: createAlgorithmsAddIncludeFileCommand({
      filesystem: input.filesystem,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
      rootPathResolver: input.rootPathResolver,
    }),
    algorithmsDelete: createAlgorithmsDeleteCommand({
      filesystem: input.filesystem,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
      rootPathResolver: input.rootPathResolver,
    }),
    algorithmsSidebarShowFileView: createAlgorithmsSidebarShowFileViewCommand(
      input.viewModeService
    ),
    algorithmsSidebarShowLanguageView: createAlgorithmsSidebarShowLanguageViewCommand(
      input.viewModeService
    ),
    algorithmsSidebarShowAllRows: createAlgorithmsSidebarShowAllRowsCommand(
      input.filterModeService
    ),
    algorithmsSidebarShowProblemRows: createAlgorithmsSidebarShowProblemRowsCommand(
      input.filterModeService
    ),
    algorithmsFlagLanguage: createAlgorithmsFlagLanguageCommand({
      filesystem: input.filesystem,
      flaggedLanguages: input.flaggedLanguages,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsUnflagLanguage: createAlgorithmsUnflagLanguageCommand({
      filesystem: input.filesystem,
      flaggedLanguages: input.flaggedLanguages,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsRunFile: createAlgorithmsRunFileCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsEditorTitleRunFile: createAlgorithmsEditorTitleRunFileCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsEditorTitleCompileOnly: createAlgorithmsEditorTitleCompileOnlyCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsEditorTitleCheckOnlyNative: createAlgorithmsEditorTitleCheckOnlyNativeCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsEditorTitleCheckOnlyDocker: createAlgorithmsEditorTitleCheckOnlyDockerCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsEditorTitleCheckOnlySsh: createAlgorithmsEditorTitleCheckOnlySshCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsEditorTitleClean: createAlgorithmsEditorTitleCleanCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsEditorTitleLocalClean: createAlgorithmsEditorTitleLocalCleanCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCompileOnly: createAlgorithmsCompileOnlyCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCheckOnlyNative: createAlgorithmsCheckOnlyNativeCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCheckOnlyDocker: createAlgorithmsCheckOnlyDockerCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCheckOnlySsh: createAlgorithmsCheckOnlySshCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsClean: createAlgorithmsCleanCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsLocalClean: createAlgorithmsLocalCleanCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsSmokeTest: createAlgorithmsSmokeTestCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsStopSmokeTest: createAlgorithmsStopSmokeTestCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsClearSmokeResults: createAlgorithmsClearSmokeResultsCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsClearRunResults: createAlgorithmsClearRunResultsCommand({
      conductor: input.conductor,
      filesystem: input.filesystem,
      hostState: input.stateMachine,
      languages: input.languages,
      notificationRouter: input.notificationRouter,
      refreshAlgorithmsTree: input.workspaceAlgorithmsTreeProvider.refresh,
    }),
    explorerRunFile: input.explorerRunCommands.runFile,
    explorerCompileOnly: input.explorerRunCommands.compileOnly,
    explorerCheckOnlyNative: input.explorerRunCommands.checkOnlyNative,
    explorerCheckOnlyDocker: input.explorerRunCommands.checkOnlyDocker,
    explorerCheckOnlySsh: input.explorerRunCommands.checkOnlySsh,
    explorerClean: input.explorerRunCommands.clean,
    explorerLocalClean: input.explorerRunCommands.localClean,
  };
}