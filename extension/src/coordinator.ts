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
  createEligibilityResolver,
  createFilesystem,
} from "./filesystem";
import type { IFilesystem } from "./filesystem";
import type { IEligibilityResolver } from "./filesystem";
import {
  buildSmokeLanguageSelections,
  createLanguages,
  GENERATED_LANGUAGE_DATA,
} from "./languages";
import type { ILanguages } from "./languages";
import {
  createRootPathResolver,
} from "./algorithms";
import type { IRootPathResolver } from "./algorithms";
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

/**
 * Assembled coordinator components required to wire the root disposable.
 */
interface CoordinatorComponents {
  channels: {
    environmentControlsChannel: vscode.Disposable;
    runControlsChannel: vscode.Disposable;
    smokeControlsChannel: vscode.Disposable;
  };
  commands: IExtensionCommands;
  conductor: IConductor;
  stateMachine: vscode.Disposable;
  viewLayer: CoordinatorViewLayer;
}

interface CoordinatorRuntimeServices {
  algorithmsTerminalRunAdapter: ReturnType<typeof createAlgorithmsTerminalRunAdapter>;
  commandLine: ReturnType<typeof createCommandLine>;
  conductor: IConductor;
  eligibilityResolver: IEligibilityResolver;
  filesystem: IFilesystem;
  filterModeService: IFilterModeService;
  languages: ILanguages;
  notificationDispatcher: ReturnType<typeof createConductorNotificationDispatcher>;
  notificationRouter: INotificationRouter;
  rootPathResolver: IRootPathResolver;
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
  const rootPathResolver = createRootPathResolver();
  const eligibilityResolver = createEligibilityResolver();
  const conductor: IConductor = createConductorService({
    algorithmsTerminalRunAdapter,
    commandLine,
    filesystem,
    rootPathResolver,
    eligibilityResolver,
  });
  void conductor.initWorkspaceSupportedContext({ workspaceFolderPaths });
  const notificationDispatcher = createConductorNotificationDispatcher(notificationRouter);

  return {
    algorithmsTerminalRunAdapter,
    commandLine,
    conductor,
    eligibilityResolver,
    filesystem,
    filterModeService,
    languages,
    notificationDispatcher,
    notificationRouter,
    rootPathResolver,
    stateMachine,
    viewModeService,
    workspaceFolderPaths,
  };
}

/**
 * Wires all coordinator components into the root extension disposable.
 *
 * @param {CoordinatorComponents} components Fully constructed coordinator components.
 * @returns {vscode.Disposable} Root disposable for the bootstrap runtime.
 */
function buildCoordinatorDisposables(
  components: CoordinatorComponents
): vscode.Disposable {
  const conductorDisposer = {
    dispose(): void {
      components.conductor.dispose?.();
    },
  };

  return vscode.Disposable.from(
    components.stateMachine,
    components.viewLayer.communicationHub,
    components.channels.smokeControlsChannel,
    components.channels.runControlsChannel,
    components.channels.environmentControlsChannel,
    components.viewLayer.workspaceAlgorithmsTreeRegistration,
    components.viewLayer.workspaceStandardLibraryTreeRegistration,
    components.viewLayer.workspaceWatcherRegistration,
    components.viewLayer.runStatusTreeRefreshSubscription,
    conductorDisposer,
    components.viewLayer.languageStatusDecorationRegistration,
    components.viewLayer.viewHost,
    components.viewLayer.viewsRegistration,
    registerCommands(components.commands)
  );
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
  const { conductor, stateMachine, rootPathResolver } = runtimeServices;
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
  const { communicationHub, viewHost } = viewLayer;
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
    rootPathResolver,
    stateMachine,
    viewModeService: runtimeServices.viewModeService,
    workspaceAlgorithmsTreeProvider: viewLayer.workspaceAlgorithmsTreeProvider,
    workspaceStandardLibraryTreeProvider: viewLayer.workspaceStandardLibraryTreeProvider,
  });

  return buildCoordinatorDisposables({
    channels: {
      environmentControlsChannel,
      runControlsChannel,
      smokeControlsChannel,
    },
    commands,
    conductor,
    stateMachine,
    viewLayer,
  });
}
