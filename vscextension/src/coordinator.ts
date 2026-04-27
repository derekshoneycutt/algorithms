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
  createAlgorithmsEditorTitleRunFileCommand,
  createAlgorithmsCompileOnlyCommand,
  createAlgorithmsCheckOnlyNativeCommand,
  createAlgorithmsCheckOnlyDockerCommand,
  createAlgorithmsCheckOnlySshCommand,
  createAlgorithmsCleanCommand,
  createAlgorithmsLocalCleanCommand,
  createAlgorithmsSmokeTestCommand,
  createAlgorithmsStopSmokeTestCommand,
  createAlgorithmsClearSmokeResultsCommand,
  createAlgorithmsClearRunResultsCommand,
  createShowBootstrapStatusCommand,
    createAlgorithmsExplorerRunCommands,
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
  createStateFilesystemBridge,
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
  createWorkspaceWatcherAdapter,
  registerControlsChannels,
  createViewHost,
  getEnvironmentControlsSidebarViewId,
  getRunControlsSidebarViewId,
  getSmokeControlsSidebarViewId,
  getWorkspaceAlgorithmsTreeViewId,
  getWorkspaceStandardLibraryTreeViewId,
} from "./views";
import type {
  IViewHost,
  IWorkspaceWatcherAdapter,
  RefreshableWorkspaceTreeDataProvider,
} from "./views";

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
    notificationRouter,
    repositoryRoot: workspaceFolderPaths[0] ?? "",
  });
  void conductor.initWorkspaceSupportedContext({ workspaceFolderPaths });
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
    const explorerRunCommands = createAlgorithmsExplorerRunCommands({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    });
  const workspaceStandardLibraryTreeProvider: RefreshableWorkspaceTreeDataProvider =
    createWorkspaceStandardLibraryTreeDataProvider({
      algorithmsIndex,
    });
  const workspaceWatcherAdapter: IWorkspaceWatcherAdapter = createWorkspaceWatcherAdapter(
    {
      conductor,
      filesystem,
      algorithmsIndex,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
      refreshStandardLibraryTree: workspaceStandardLibraryTreeProvider.refresh,
    }
  );
  const workspaceWatcherRegistration = workspaceWatcherAdapter.activate();

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

  const smokeControlsChannelHandler = createSmokeControlsChannelMessageHandler({
    conductor,
    stateMachine,
    dispatchNotification: notificationDispatcher.dispatch,
    publishSnapshot: publishSmokeSnapshot,
  });
  const runControlsChannelHandler = createRunControlsChannelMessageHandler({
    conductor,
    stateMachine,
    dispatchNotification: notificationDispatcher.dispatch,
    publishSnapshot: publishRunSnapshot,
  });
  const environmentControlsChannelHandler = createEnvironmentControlsChannelMessageHandler({
    conductor,
    languages,
    stateMachine,
    dispatchNotification: notificationDispatcher.dispatch,
    publishSnapshot: publishEnvironmentSnapshot,
  });

  const {
    smokeControlsChannel,
    runControlsChannel,
    environmentControlsChannel,
  } = registerControlsChannels({
    smokeControlsViewId,
    runControlsViewId,
    environmentControlsViewId,
    communicationHub,
    smokeControlsListener: smokeControlsChannelHandler,
    runControlsListener: runControlsChannelHandler,
    environmentControlsListener: environmentControlsChannelHandler,
  });

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
    algorithmsEditorTitleRunFile: createAlgorithmsEditorTitleRunFileCommand({
      conductor,
    }),
    algorithmsCompileOnly: createAlgorithmsCompileOnlyCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCheckOnlyNative: createAlgorithmsCheckOnlyNativeCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCheckOnlyDocker: createAlgorithmsCheckOnlyDockerCommand({
      conductor,
      filesystem,
      hostState: stateMachine,
      languages,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCheckOnlySsh: createAlgorithmsCheckOnlySshCommand({
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
        explorerRunFile: explorerRunCommands.runFile,
        explorerCompileOnly: explorerRunCommands.compileOnly,
        explorerCheckOnlyNative: explorerRunCommands.checkOnlyNative,
        explorerCheckOnlyDocker: explorerRunCommands.checkOnlyDocker,
        explorerCheckOnlySsh: explorerRunCommands.checkOnlySsh,
        explorerClean: explorerRunCommands.clean,
        explorerLocalClean: explorerRunCommands.localClean,
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
    workspaceWatcherRegistration,
    runStatusTreeRefreshSubscription,
    conductorDisposer,
    languageStatusDecorationRegistration,
    viewHost,
    viewsRegistration,
    registerCommands(commands)
  );
}