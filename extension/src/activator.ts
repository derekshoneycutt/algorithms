import * as vscode from "vscode";

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

/**
 * Fully constructed activation-time services passed into coordinator wiring.
 */
export interface ActivationServicesGraph {
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
 * Creates the activation-time runtime services required by coordinator wiring.
 *
 * @returns {ActivationServicesGraph} Constructed runtime service graph.
 */
export function createActivationServices(): ActivationServicesGraph {
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