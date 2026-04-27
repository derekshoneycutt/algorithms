import * as vscode from "vscode";

import {
  createStandardLibraryCreateFileCommand,
  createStandardLibraryCreateFolderCommand,
  createStandardLibraryDeleteCommand,
  createAlgorithmsCreateFolderAtRootCommand,
  createAlgorithmsCreateFolderCommand,
  createAlgorithmsCreateFileCommand,
  createAlgorithmsAddIncludeFileCommand,
  createAlgorithmsSidebarShowFileViewCommand,
  createAlgorithmsSidebarShowLanguageViewCommand,
  createAlgorithmsSidebarShowAllRowsCommand,
  createAlgorithmsSidebarShowProblemRowsCommand,
  createAlgorithmsDeleteCommand,
  createAlgorithmsFlagLanguageCommand,
  createAlgorithmsUnflagLanguageCommand,
  createAlgorithmsRunFileCommand,
  createAlgorithmsCompileOnlyCommand,
  createAlgorithmsCheckOnlyCommand,
  createAlgorithmsCleanCommand,
  createAlgorithmsLocalCleanCommand,
  createAlgorithmsSmokeTestCommand,
  createAlgorithmsStopSmokeTestCommand,
  createAlgorithmsClearSmokeResultsCommand,
  createAlgorithmsClearRunResultsCommand,
  createShowBootstrapStatusCommand,
  registerCommands,
} from "./commands";
import type { IExtensionCommands } from "./commands";
import {
  buildRunControlsSnapshot,
  createEnvironmentControlsSnapshotBuilder,
  createEnvironmentControlsSnapshotPublisher,
  createEnvironmentLanguageIconUriResolver,
  createRunControlsSnapshotPublisher,
  createSmokeLanguageIconUriResolver,
  createSmokeSnapshotBuilder,
  createSmokeSnapshotPublisher,
  createCommunicationHub,
} from "./comms";
import type { ICommunicationHub } from "./comms";
import {
  createAlgorithmsTerminalRunAdapter,
  createCommandLine,
} from "./commandline";
import {
  createEnvironmentControlsChannelMessageHandler,
  createConductorService,
  createRunControlsChannelMessageHandler,
  createSmokeControlsChannelMessageHandler,
} from "./conductor";
import type { IConductor } from "./conductor";
import {
  createFilesystem,
} from "./filesystem";
import type { IFilesystem } from "./filesystem";
import {
  createAlgorithmsIndex,
  createFlaggedLanguagesService,
} from "./algorithms";
import type {
  IAlgorithmsIndex,
  IFlaggedLanguagesService,
} from "./algorithms";
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
  createViewModeService,
} from "./state";
import type {
  IFilterModeService,
  IStateMachine,
  IViewModeService,
} from "./state";
import {
  createWorkspaceAlgorithmsTreeDataProvider,
  createWorkspaceStandardLibraryTreeDataProvider,
  createLanguageStatusDecorationProvider,
  createViewHost,
  getEnvironmentControlsSidebarViewId,
  getRunControlsSidebarViewId,
  getSmokeControlsSidebarViewId,
  getWorkspaceAlgorithmsTreeViewId,
  getWorkspaceStandardLibraryTreeViewId,
} from "./views";
import type { IViewHost, RefreshableWorkspaceTreeDataProvider } from "./views";

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
  const runControlsViewId = getRunControlsSidebarViewId();
  const smokeControlsViewId = getSmokeControlsSidebarViewId();
  const environmentControlsViewId = getEnvironmentControlsSidebarViewId();
  const workspaceAlgorithmsTreeViewId = getWorkspaceAlgorithmsTreeViewId();
  const workspaceStandardLibraryTreeViewId = getWorkspaceStandardLibraryTreeViewId();
  const workspaceFolderPaths = (vscode.workspace.workspaceFolders ?? []).map(
    (workspaceFolder) => workspaceFolder.uri.fsPath
  );
  const languages: ILanguages = createLanguages(GENERATED_LANGUAGE_DATA);

  const stateMachine: IStateMachine = createHostStateService({
    initialSmokeControls: {
      languages: buildSmokeLanguageSelections(languages),
    },
  });
  const filesystem: IFilesystem = createFilesystem({
    cacheTtlMs: stateMachine.getSnapshot().filesystemCacheTtlMs,
    stateBridge: {
      onCacheTtlSet(ttlMs) {
        stateMachine.send({
          type: "FILESYSTEM_CACHE_TTL_SET",
          ttlMs,
        });
      },
      onCacheCleared(targetPath) {
        stateMachine.send({
          type: "FILESYSTEM_CACHE_CLEARED",
          targetPath,
        });
      },
      onStatCacheEntrySet(targetPath, exists, kind, updatedAt) {
        stateMachine.send({
          type: "FILESYSTEM_STAT_CACHE_ENTRY_SET",
          targetPath,
          exists,
          kind,
          updatedAt,
        });
      },
      onDirectoryCacheEntrySet(targetPath, entryCount, updatedAt) {
        stateMachine.send({
          type: "FILESYSTEM_DIRECTORY_CACHE_ENTRY_SET",
          targetPath,
          entryCount,
          updatedAt,
        });
      },
      onPendingOperationSet(operationId, operationType, targetPath, status, updatedAt) {
        stateMachine.send({
          type: "FILESYSTEM_PENDING_OPERATION_SET",
          operationId,
          operationType,
          targetPath,
          status,
          updatedAt,
        });
      },
      onPendingOperationCleared(operationId) {
        stateMachine.send({
          type: "FILESYSTEM_PENDING_OPERATION_CLEARED",
          operationId,
        });
      },
      onOperationErrorSet(targetPath, message) {
        stateMachine.send({
          type: "FILESYSTEM_OPERATION_ERROR_SET",
          targetPath,
          message,
        });
      },
    },
  });
  const commandLine = createCommandLine();
  const algorithmsTerminalRunAdapter = createAlgorithmsTerminalRunAdapter();
  const viewModeService: IViewModeService = createViewModeService();
  const filterModeService: IFilterModeService = createFilterModeService();
  const conductor: IConductor = createConductorService({
    algorithmsTerminalRunAdapter,
    commandLine,
    filesystem,
    repositoryRoot: workspaceFolderPaths[0] ?? "",
  });
  void conductor.initWorkspaceSupportedContext({ workspaceFolderPaths });
  const notificationRouter: INotificationRouter = createNotificationRouter();
  const notificationDispatcher = createConductorNotificationDispatcher(notificationRouter);
  const viewHost: IViewHost = createViewHost(context);
  const communicationHub: ICommunicationHub = createCommunicationHub(viewHost);
  const viewsRegistration = viewHost.register();
  const algorithmsIndex: IAlgorithmsIndex = createAlgorithmsIndex({
    filesystem,
    languages,
    workspaceFolderPaths,
  });
  const flaggedLanguages: IFlaggedLanguagesService = createFlaggedLanguagesService(
    filesystem
  );
  const workspaceAlgorithmsTreeProvider: RefreshableWorkspaceTreeDataProvider =
    createWorkspaceAlgorithmsTreeDataProvider({
      viewModeService,
      filterModeService,
      algorithmsIndex,
      conductor,
      hostState: stateMachine,
      languages,
    });
  const runStatusTreeRefreshSubscription = conductor.subscribeRunTargetStatus(() => {
    workspaceAlgorithmsTreeProvider.refresh();
  });
  const workspaceStandardLibraryTreeProvider: RefreshableWorkspaceTreeDataProvider =
    createWorkspaceStandardLibraryTreeDataProvider({
      algorithmsIndex,
    });

  const workspaceWatcher = vscode.workspace.createFileSystemWatcher("**/*");
  const workspaceCreateWatcher = workspaceWatcher.onDidCreate((uri) => {
    conductor.handleWorkspacePathChanged?.({
      targetPath: uri.fsPath,
      filesystem,
      algorithmsIndex,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
      refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
    });
  });
  const workspaceChangeWatcher = workspaceWatcher.onDidChange((uri) => {
    conductor.handleWorkspacePathChanged?.({
      targetPath: uri.fsPath,
      filesystem,
      algorithmsIndex,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
      refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
    });
  });
  const workspaceDeleteWatcher = workspaceWatcher.onDidDelete((uri) => {
    conductor.handleWorkspacePathChanged?.({
      targetPath: uri.fsPath,
      filesystem,
      algorithmsIndex,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
      refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
    });
  });
  const workspaceFoldersChangeWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    const updatedFolderPaths = (vscode.workspace.workspaceFolders ?? []).map(
      (workspaceFolder) => workspaceFolder.uri.fsPath
    );
    void conductor.refreshWorkspaceSupportedContext({ workspaceFolderPaths: updatedFolderPaths });
    conductor.handleWorkspaceRootsChanged?.({
      filesystem,
      algorithmsIndex,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
      refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
    });
  });

  const workspaceAlgorithmsTreeRegistration = viewHost.registerTreeDataProvider(
    workspaceAlgorithmsTreeViewId,
    workspaceAlgorithmsTreeProvider
  );
  const workspaceStandardLibraryTreeRegistration = viewHost.registerTreeDataProvider(
    workspaceStandardLibraryTreeViewId,
    workspaceStandardLibraryTreeProvider
  );
  const languageStatusDecorationProvider = createLanguageStatusDecorationProvider();
  const languageStatusDecorationRegistration = vscode.window.registerFileDecorationProvider(
    languageStatusDecorationProvider
  );
  const resolveSmokeLanguageIconUri = createSmokeLanguageIconUriResolver({
    languages,
    viewHost,
    viewId: smokeControlsViewId,
    extensionUri: context.extensionUri,
  });
  const buildSmokeControlsSnapshot = createSmokeSnapshotBuilder(
    resolveSmokeLanguageIconUri
  );
  const getStateSnapshot = stateMachine.getSnapshot.bind(stateMachine);
  const publishSmokeSnapshot = createSmokeSnapshotPublisher({
    postMessage: communicationHub.post.bind(communicationHub, smokeControlsViewId),
    getSnapshot: getStateSnapshot,
    buildSnapshot: buildSmokeControlsSnapshot,
  });
  const publishRunSnapshot = createRunControlsSnapshotPublisher({
    postMessage: communicationHub.post.bind(communicationHub, runControlsViewId),
    getSnapshot: getStateSnapshot,
    buildSnapshot: buildRunControlsSnapshot,
  });
  const resolveEnvironmentLanguageIconUri = createEnvironmentLanguageIconUriResolver({
    languages,
    viewHost,
    viewId: environmentControlsViewId,
    extensionUri: context.extensionUri,
  });
  const buildEnvironmentControlsSnapshot = createEnvironmentControlsSnapshotBuilder(
    resolveEnvironmentLanguageIconUri
  );
  const publishEnvironmentSnapshot = createEnvironmentControlsSnapshotPublisher({
    postMessage: communicationHub.post.bind(communicationHub, environmentControlsViewId),
    getSnapshot: getStateSnapshot,
    buildSnapshot: buildEnvironmentControlsSnapshot,
  });

  const smokeControlsChannel = communicationHub.subscribe(
    smokeControlsViewId,
    createSmokeControlsChannelMessageHandler({
      conductor,
      stateMachine,
      dispatchNotification: notificationDispatcher.dispatch,
      publishSnapshot: publishSmokeSnapshot,
    })
  );
  const runControlsChannel = communicationHub.subscribe(
    runControlsViewId,
    createRunControlsChannelMessageHandler({
      conductor,
      stateMachine,
      dispatchNotification: notificationDispatcher.dispatch,
      publishSnapshot: publishRunSnapshot,
    })
  );
  const environmentControlsChannel = communicationHub.subscribe(
    environmentControlsViewId,
    createEnvironmentControlsChannelMessageHandler({
      conductor,
      languages,
      stateMachine,
      dispatchNotification: notificationDispatcher.dispatch,
      publishSnapshot: publishEnvironmentSnapshot,
    })
  );

  const commands: IExtensionCommands = {
    showBootstrapStatus: createShowBootstrapStatusCommand({
      extensionDisplayName: String(
        context.extension.packageJSON.displayName ?? context.extension.id
      ),
      extensionVersion: String(context.extension.packageJSON.version ?? "0.0.0"),
      hostState: stateMachine,
      showStatusMessage: notificationRouter.info,
    }),
    standardLibraryCreateFile: createStandardLibraryCreateFileCommand({
      filesystem,
      notificationRouter,
      refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
    }),
    standardLibraryCreateFolder: createStandardLibraryCreateFolderCommand({
      filesystem,
      notificationRouter,
      refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
    }),
    standardLibraryDelete: createStandardLibraryDeleteCommand({
      filesystem,
      notificationRouter,
      refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
    }),
    algorithmsCreateFolderAtRoot: createAlgorithmsCreateFolderAtRootCommand({
      filesystem,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCreateFolder: createAlgorithmsCreateFolderCommand({
      filesystem,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCreateFile: createAlgorithmsCreateFileCommand({
      filesystem,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsAddIncludeFile: createAlgorithmsAddIncludeFileCommand({
      filesystem,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsDelete: createAlgorithmsDeleteCommand({
      filesystem,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsSidebarShowFileView: createAlgorithmsSidebarShowFileViewCommand(
      viewModeService
    ),
    algorithmsSidebarShowLanguageView: createAlgorithmsSidebarShowLanguageViewCommand(
      viewModeService
    ),
    algorithmsSidebarShowAllRows: createAlgorithmsSidebarShowAllRowsCommand(
      filterModeService
    ),
    algorithmsSidebarShowProblemRows: createAlgorithmsSidebarShowProblemRowsCommand(
      filterModeService
    ),
    algorithmsFlagLanguage: createAlgorithmsFlagLanguageCommand({
      filesystem,
      flaggedLanguages,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsUnflagLanguage: createAlgorithmsUnflagLanguageCommand({
      filesystem,
      flaggedLanguages,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsRunFile: createAlgorithmsRunFileCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCompileOnly: createAlgorithmsCompileOnlyCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCheckOnly: createAlgorithmsCheckOnlyCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsClean: createAlgorithmsCleanCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsLocalClean: createAlgorithmsLocalCleanCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsSmokeTest: createAlgorithmsSmokeTestCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsStopSmokeTest: createAlgorithmsStopSmokeTestCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsClearSmokeResults: createAlgorithmsClearSmokeResultsCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsClearRunResults: createAlgorithmsClearRunResultsCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
  };

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
    workspaceWatcher,
    workspaceCreateWatcher,
    workspaceChangeWatcher,
    workspaceDeleteWatcher,
    workspaceFoldersChangeWatcher,
    runStatusTreeRefreshSubscription,
    conductorDisposer,
    languageStatusDecorationRegistration,
    viewHost,
    viewsRegistration,
    registerCommands(commands)
  );
}