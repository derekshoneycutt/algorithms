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
  createObservability,
} from "./observability";
import type { IObservability } from "./observability";
import {
  createWorkspacePersistenceKey,
  createWorkspaceSettingsPersistenceService,
  createWorkspaceStatePersistenceStore,
  WORKSPACE_PERSISTENCE_STORAGE_KEY,
} from "./persistence";
import type { IWorkspaceSettingsPersistenceService } from "./persistence";
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
  observability: IObservability;
  persistenceService: IWorkspaceSettingsPersistenceService;
  rootPathResolver: IRootPathResolver;
  stateMachine: IStateMachine;
  viewModeService: IViewModeService;
  workspaceFolderPaths: readonly string[];
  workspacePersistenceKey: string;
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
export function createActivationServices(
  context: vscode.ExtensionContext
): ActivationServicesGraph {
  const workspaceFolderPaths = getWorkspaceFolderPaths();
  const workspacePersistenceKey = workspaceFolderPaths.length > 0
    ? createWorkspacePersistenceKey(workspaceFolderPaths[0])
    : "";
  const persistenceStore = createWorkspaceStatePersistenceStore({
    context,
    storageKey: WORKSPACE_PERSISTENCE_STORAGE_KEY,
  });
  const persistenceService = createWorkspaceSettingsPersistenceService(persistenceStore);
  const persistedWorkspaceSettings = workspacePersistenceKey.length > 0
    ? persistenceService.loadWorkspaceSettings(workspacePersistenceKey)
    : null;
  const languages: ILanguages = createLanguages(GENERATED_LANGUAGE_DATA);
  const defaultSmokeLanguages = buildSmokeLanguageSelections(languages);
  const persistedSmokeSelectionByKey = new Map(
    persistedWorkspaceSettings?.domains.smokeControls?.languages.map((language) => {
      return [language.languageKey.trim().toLowerCase(), language.selected] as const;
    }) ?? []
  );
  const hydratedSmokeLanguages = defaultSmokeLanguages.map((language) => {
    const persistedSelection = persistedSmokeSelectionByKey.get(
      language.languageKey.trim().toLowerCase()
    );

    if (persistedSelection === undefined || language.disabled) {
      return language;
    }

    return {
      ...language,
      selected: persistedSelection,
    };
  });
  const shouldHydratePersistedSettings = persistedWorkspaceSettings?.persistSessionEnabled === true;
  const stateMachine: IStateMachine = createHostStateService({
    initialSmokeControls: {
      reportEnabled: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.smokeControls?.reportEnabled
        : undefined,
      markdownPath: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.smokeControls?.markdownPath
        : undefined,
      timeoutSeconds: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.smokeControls?.timeoutSeconds
        : undefined,
      slowTimeoutSeconds: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.smokeControls?.slowTimeoutSeconds
        : undefined,
      languages: shouldHydratePersistedSettings
        ? hydratedSmokeLanguages
        : defaultSmokeLanguages,
    },
    initialRunControls: {
      runArgsEnabled: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.runControls?.runArgsEnabled
        : undefined,
      runArgsText: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.runControls?.runArgsText
        : undefined,
      sourceProfileEnabled: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.runControls?.sourceProfileEnabled
        : undefined,
      sourceProfileText: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.runControls?.sourceProfileText
        : undefined,
      runChecksMode: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.runControls?.runChecksMode
        : undefined,
      runChecksRoute: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.runControls?.runChecksRoute
        : undefined,
      cleanStdlibEnabled: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.runControls?.cleanStdlibEnabled
        : undefined,
      cleanArchivesEnabled: shouldHydratePersistedSettings
        ? persistedWorkspaceSettings?.domains.runControls?.cleanArchivesEnabled
        : undefined,
    },
    initialEnvironmentControls: {
      persistSessionEnabled: persistedWorkspaceSettings?.persistSessionEnabled,
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
  const observability: IObservability = createObservability({
    enabledByCategory: {
      "index.problems": true,
      "watcher.invalidation": true,
      "panel.snapshot": true,
    },
  });
  const rootPathResolver = createRootPathResolver();
  const eligibilityResolver = createEligibilityResolver();
  const conductor: IConductor = createConductorService({
    algorithmsTerminalRunAdapter,
    commandLine,
    observability,
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
    observability,
    persistenceService,
    rootPathResolver,
    stateMachine,
    viewModeService,
    workspaceFolderPaths,
    workspacePersistenceKey,
  };
}