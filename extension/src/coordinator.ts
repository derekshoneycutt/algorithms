import * as vscode from "vscode";

import {
  createCoordinatorCommands,
  registerCommands,
} from "./commands";
import type { IExtensionCommands } from "./commands";
import {
  createAlgorithmsTerminalRunAdapter,
  createCommandLine,
} from "./commandline";
import { createConductorService } from "./conductor";
import type { IConductor } from "./conductor";
import {
  createFilesystem,
} from "./filesystem";
import type { IFilesystem } from "./filesystem";
import {
  buildSmokeLanguageSelections,
  createLanguages,
  GENERATED_LANGUAGE_DATA,
} from "./languages";
import type { ILanguages } from "./languages";
import {
  createNotificationRouter,
  createConductorNotificationDispatcher,
} from "./notifications";
import type { INotificationRouter } from "./notifications";
import {
  createFilterModeService,
  createHostStateService,
  createStateFilesystemBridge,
  createViewModeService,
} from "./state";
import type {
  IFilterModeService,
  IStateMachine,
  IViewModeService,
} from "./state";
import {
  createCoordinatorControlsChannels,
  createCoordinatorViewLayer,
  getEnvironmentControlsSidebarViewId,
  getRunControlsSidebarViewId,
  getSmokeControlsSidebarViewId,
  getWorkspaceAlgorithmsTreeViewId,
  getWorkspaceStandardLibraryTreeViewId,
} from "./views";
import type { CoordinatorViewLayer } from "./views";

interface CoordinatorViewIds {
  environmentControlsViewId: string;
  runControlsViewId: string;
  smokeControlsViewId: string;
  workspaceAlgorithmsTreeViewId: string;
  workspaceStandardLibraryTreeViewId: string;
}

interface CoordinatorRuntimeServices {
  algorithmsTerminalRunAdapter: ReturnType<typeof createAlgorithmsTerminalRunAdapter>;
  commandLine: ReturnType<typeof createCommandLine>;
  conductor: IConductor;
  filesystem: IFilesystem;
  filterModeService: IFilterModeService;
  languages: ILanguages;
  notificationDispatcher: ReturnType<typeof createConductorNotificationDispatcher>;
  notificationRouter: INotificationRouter;
  stateMachine: IStateMachine;
  viewModeService: IViewModeService;
  workspaceFolderPaths: readonly string[];
}

/**
 * Returns currently opened workspace folder paths.
 *
 * @returns {readonly string[]} Workspace folder fs paths.
 */
function getWorkspaceFolderPaths(): readonly string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((workspaceFolder) => {
    return workspaceFolder.uri.fsPath;
  });
}

/**
 * Creates the runtime services required by the extension coordinator.
 *
 * @returns {CoordinatorRuntimeServices} Constructed runtime service graph.
 */
function createCoordinatorRuntimeServices(): CoordinatorRuntimeServices {
  const workspaceFolderPaths = getWorkspaceFolderPaths();
  const languages: ILanguages = createLanguages(GENERATED_LANGUAGE_DATA);
  const stateMachine: IStateMachine = createHostStateService({
    initialSmokeControls: {
      languages: buildSmokeLanguageSelections(languages),
    },
  });
  const filesystemStateBridge = createStateFilesystemBridge(stateMachine);
  const filesystem: IFilesystem = createFilesystem({
    cacheTtlMs: stateMachine.getSnapshot().filesystemCacheTtlMs,
    stateBridge: filesystemStateBridge,
  });
  const commandLine = createCommandLine();
  const algorithmsTerminalRunAdapter = createAlgorithmsTerminalRunAdapter();
  const viewModeService: IViewModeService = createViewModeService();
  const filterModeService: IFilterModeService = createFilterModeService();
  const notificationRouter: INotificationRouter = createNotificationRouter();
  const conductor: IConductor = createConductorService({
    algorithmsTerminalRunAdapter,
    commandLine,
    filesystem,
    repositoryRoot: workspaceFolderPaths[0] ?? "",
  });
  void conductor.initWorkspaceSupportedContext({ workspaceFolderPaths });
  const notificationDispatcher = createConductorNotificationDispatcher(notificationRouter);

  return {
    algorithmsTerminalRunAdapter,
    commandLine,
    conductor,
    filesystem,
    filterModeService,
    languages,
    notificationDispatcher,
    notificationRouter,
    stateMachine,
    viewModeService,
    workspaceFolderPaths,
  };
}


/**
 * Creates the coordinator for the bootstrap extension runtime.
 *
 * The coordinator is the only place that constructs concrete implementations
 * across module boundaries. All other modules receive only injected interfaces.
 *
 * The state machine is constructed eagerly but its underlying XState actor
 * starts lazily on the first command dispatch.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {vscode.Disposable} Root disposable for the bootstrap runtime.
 */
export function createCoordinator(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const viewIds: CoordinatorViewIds = {
    environmentControlsViewId: getEnvironmentControlsSidebarViewId(),
    runControlsViewId: getRunControlsSidebarViewId(),
    smokeControlsViewId: getSmokeControlsSidebarViewId(),
    workspaceAlgorithmsTreeViewId: getWorkspaceAlgorithmsTreeViewId(),
    workspaceStandardLibraryTreeViewId: getWorkspaceStandardLibraryTreeViewId(),
  };
  const runtimeServices = createCoordinatorRuntimeServices();
  const {
    conductor,
    stateMachine,
  } = runtimeServices;
  const viewLayer: CoordinatorViewLayer = createCoordinatorViewLayer({
    conductor,
    context,
    filesystem: runtimeServices.filesystem,
    filterModeService: runtimeServices.filterModeService,
    languages: runtimeServices.languages,
    notificationRouter: runtimeServices.notificationRouter,
    stateMachine,
    viewIds: {
      workspaceAlgorithmsTreeViewId: viewIds.workspaceAlgorithmsTreeViewId,
      workspaceStandardLibraryTreeViewId: viewIds.workspaceStandardLibraryTreeViewId,
    },
    viewModeService: runtimeServices.viewModeService,
    workspaceFolderPaths: runtimeServices.workspaceFolderPaths,
  });
  const {
    communicationHub,
    languageStatusDecorationRegistration,
    runStatusTreeRefreshSubscription,
    viewHost,
    viewsRegistration,
    workspaceAlgorithmsTreeProvider,
    workspaceAlgorithmsTreeRegistration,
    workspaceStandardLibraryTreeProvider,
    workspaceStandardLibraryTreeRegistration,
    workspaceWatcherRegistration,
  } = viewLayer;
  const {
    smokeControlsChannel,
    runControlsChannel,
    environmentControlsChannel,
  } = createCoordinatorControlsChannels({
    communicationHub,
    conductor,
    context,
    languages: runtimeServices.languages,
    notificationDispatcher: runtimeServices.notificationDispatcher,
    stateMachine,
    viewHost,
    viewIds: {
      environmentControlsViewId: viewIds.environmentControlsViewId,
      runControlsViewId: viewIds.runControlsViewId,
      smokeControlsViewId: viewIds.smokeControlsViewId,
    },
  });
  const commands: IExtensionCommands = createCoordinatorCommands({
    conductor,
    context,
    explorerRunCommands: viewLayer.explorerRunCommands,
    filesystem: runtimeServices.filesystem,
    filterModeService: runtimeServices.filterModeService,
    flaggedLanguages: viewLayer.flaggedLanguages,
    languages: runtimeServices.languages,
    notificationRouter: runtimeServices.notificationRouter,
    stateMachine,
    viewModeService: runtimeServices.viewModeService,
    workspaceAlgorithmsTreeProvider: viewLayer.workspaceAlgorithmsTreeProvider,
    workspaceStandardLibraryTreeProvider: viewLayer.workspaceStandardLibraryTreeProvider,
  });

  const conductorDisposer = {
    dispose(): void {
      conductor.dispose?.();
    },
  };

  return vscode.Disposable.from(
    stateMachine,
    communicationHub,
    smokeControlsChannel,
    runControlsChannel,
    environmentControlsChannel,
    workspaceAlgorithmsTreeRegistration,
    workspaceStandardLibraryTreeRegistration,
    workspaceWatcherRegistration,
    runStatusTreeRefreshSubscription,
    conductorDisposer,
    languageStatusDecorationRegistration,
    viewHost,
    viewsRegistration,
    registerCommands(commands)
  );
}