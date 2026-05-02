import * as vscode from "vscode";

import { createCommunicationHub } from "../comms";
import type { IConductor } from "../conductor";
import type { IFilesystem } from "../filesystem";
import {
  createAlgorithmsIndex,
  createFlaggedLanguagesService,
  type IAlgorithmsIndex,
  type IFlaggedLanguagesService,
} from "../algorithms";
import type { ILanguages } from "../languages";
import type { INotificationRouter } from "../notifications";
import type {
  IFilterModeService,
  IStateMachine,
  IViewModeService,
} from "../state";
import { createAlgorithmsExplorerRunCommands } from "../commands";
import {
  createLanguageStatusDecorationProvider,
  createViewHost,
  createWorkspaceAlgorithmsTreeDataProvider,
  createWorkspaceStandardLibraryTreeDataProvider,
  createWorkspaceWatcherAdapter,
  type ITreeViewHandle,
  type IViewHost,
  type IWorkspaceWatcherAdapter,
  type RefreshableWorkspaceTreeDataProvider,
  type WorkspaceTreeNode,
} from "./index";
import type { ICommunicationHub } from "../comms";

/**
 * Input for coordinator view-layer construction.
 */
export interface CreateCoordinatorViewLayerInput {
  conductor: IConductor;
  context: vscode.ExtensionContext;
  filesystem: IFilesystem;
  filterModeService: IFilterModeService;
  languages: ILanguages;
  notificationRouter: INotificationRouter;
  stateMachine: IStateMachine;
  viewIds: {
    workspaceAlgorithmsTreeViewId: string;
    workspaceStandardLibraryTreeViewId: string;
  };
  viewModeService: IViewModeService;
  workspaceFolderPaths: readonly string[];
}

/**
 * View-layer services and registrations used by coordinator composition.
 */
export interface CoordinatorViewLayer {
  algorithmsIndex: IAlgorithmsIndex;
  communicationHub: ICommunicationHub;
  explorerRunCommands: ReturnType<typeof createAlgorithmsExplorerRunCommands>;
  flaggedLanguages: IFlaggedLanguagesService;
  languageStatusDecorationRegistration: vscode.Disposable;
  runStatusTreeRefreshSubscription: vscode.Disposable;
  viewHost: IViewHost;
  viewsRegistration: vscode.Disposable;
  workspaceAlgorithmsTreeProvider: RefreshableWorkspaceTreeDataProvider;
  workspaceAlgorithmsTreeRegistration: ITreeViewHandle<WorkspaceTreeNode>;
  workspaceStandardLibraryTreeProvider: RefreshableWorkspaceTreeDataProvider;
  workspaceStandardLibraryTreeRegistration: ITreeViewHandle<WorkspaceTreeNode>;
  workspaceWatcherAdapter: IWorkspaceWatcherAdapter;
  workspaceWatcherRegistration: vscode.Disposable;
}

/**
 * Creates the view-layer services and registrations required by the coordinator.
 *
 * @param {CreateCoordinatorViewLayerInput} input Coordinator view-layer dependencies.
 * @returns {CoordinatorViewLayer} Constructed view layer and registrations.
 */
export function createCoordinatorViewLayer(
  input: CreateCoordinatorViewLayerInput
): CoordinatorViewLayer {
  const viewHost: IViewHost = createViewHost(input.context);
  const communicationHub: ICommunicationHub = createCommunicationHub(viewHost);
  const viewsRegistration = viewHost.register();
  const algorithmsIndex: IAlgorithmsIndex = createAlgorithmsIndex({
    filesystem: input.filesystem,
    languages: input.languages,
    workspaceFolderPaths: input.workspaceFolderPaths,
  });
  const flaggedLanguages: IFlaggedLanguagesService = createFlaggedLanguagesService(
    input.filesystem
  );
  const workspaceAlgorithmsTreeProvider: RefreshableWorkspaceTreeDataProvider =
    createWorkspaceAlgorithmsTreeDataProvider({
      viewModeService: input.viewModeService,
      filterModeService: input.filterModeService,
      algorithmsIndex,
      conductor: input.conductor,
      hostState: input.stateMachine,
      viewId: input.viewIds.workspaceAlgorithmsTreeViewId,
      languages: input.languages,
    });
  const runStatusTreeRefreshSubscription = input.conductor.subscribeRunTargetStatus(() => {
    workspaceAlgorithmsTreeProvider.refresh();
  });
  const explorerRunCommands = createAlgorithmsExplorerRunCommands({
    conductor: input.conductor,
    filesystem: input.filesystem,
    hostState: input.stateMachine,
    languages: input.languages,
    notificationRouter: input.notificationRouter,
    refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
  });
  const workspaceStandardLibraryTreeProvider: RefreshableWorkspaceTreeDataProvider =
    createWorkspaceStandardLibraryTreeDataProvider({
      viewId: input.viewIds.workspaceStandardLibraryTreeViewId,
      algorithmsIndex,
    });
  const workspaceWatcherAdapter: IWorkspaceWatcherAdapter = createWorkspaceWatcherAdapter({
    conductor: input.conductor,
    filesystem: input.filesystem,
    algorithmsIndex,
    refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
  });
  const workspaceWatcherRegistration = workspaceWatcherAdapter.activate();
  const workspaceAlgorithmsTreeRegistration = viewHost.registerTreeDataProvider(
    input.viewIds.workspaceAlgorithmsTreeViewId,
    workspaceAlgorithmsTreeProvider
  );
  const workspaceStandardLibraryTreeRegistration = viewHost.registerTreeDataProvider(
    input.viewIds.workspaceStandardLibraryTreeViewId,
    workspaceStandardLibraryTreeProvider
  );
  const languageStatusDecorationRegistration = vscode.window.registerFileDecorationProvider(
    createLanguageStatusDecorationProvider()
  );

  return {
    algorithmsIndex,
    communicationHub,
    explorerRunCommands,
    flaggedLanguages,
    languageStatusDecorationRegistration,
    runStatusTreeRefreshSubscription,
    viewHost,
    viewsRegistration,
    workspaceAlgorithmsTreeProvider,
    workspaceAlgorithmsTreeRegistration,
    workspaceStandardLibraryTreeProvider,
    workspaceStandardLibraryTreeRegistration,
    workspaceWatcherAdapter,
    workspaceWatcherRegistration,
  };
}