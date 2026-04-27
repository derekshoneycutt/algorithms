import * as vscode from "vscode";

import {
  createStandardLibraryCreateFileCommand,
  createStandardLibraryCreateFolderCommand,
  createStandardLibraryDeleteCommand,
  createAlgorithmsCreateFolderAtRootCommand,
  createAlgorithmsCreateFolderCommand,
  createAlgorithmsCreateFileCommand,
  createAlgorithmsDeleteCommand,
  createShowBootstrapStatusCommand,
  registerCommands,
} from "./commands";
import type { IExtensionCommands } from "./commands";
import {
  buildRunControlsSnapshot,
  createRunControlsSnapshotPublisher,
  createSmokeLanguageIconUriResolver,
  createSmokeSnapshotBuilder,
  createSmokeSnapshotPublisher,
  createCommunicationHub,
} from "./comms";
import type { ICommunicationHub } from "./comms";
import {
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
import { createHostStateService } from "./state";
import type { IStateMachine } from "./state";
import {
  createWorkspaceAlgorithmsTreeDataProvider,
  createWorkspaceStandardLibraryTreeDataProvider,
  createViewHost,
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
  const workspaceAlgorithmsTreeViewId = getWorkspaceAlgorithmsTreeViewId();
  const workspaceStandardLibraryTreeViewId = getWorkspaceStandardLibraryTreeViewId();

  const filesystem: IFilesystem = createFilesystem();
  const languages: ILanguages = createLanguages(GENERATED_LANGUAGE_DATA);
  const stateMachine: IStateMachine = createHostStateService({
    initialSmokeControls: {
      languages: buildSmokeLanguageSelections(languages),
    },
  });
  const conductor: IConductor = createConductorService();
  const notificationRouter: INotificationRouter = createNotificationRouter();
  const notificationDispatcher = createConductorNotificationDispatcher(notificationRouter);
  const viewHost: IViewHost = createViewHost(context);
  const communicationHub: ICommunicationHub = createCommunicationHub(viewHost);
  const viewsRegistration = viewHost.register();
  const workspaceAlgorithmsTreeProvider: RefreshableWorkspaceTreeDataProvider =
    createWorkspaceAlgorithmsTreeDataProvider({
    filesystem,
    languages,
    });
  const workspaceStandardLibraryTreeProvider: RefreshableWorkspaceTreeDataProvider =
    createWorkspaceStandardLibraryTreeDataProvider({
      filesystem,
      languages,
    });
  const workspaceAlgorithmsTreeRegistration = viewHost.registerTreeDataProvider(
    workspaceAlgorithmsTreeViewId,
    workspaceAlgorithmsTreeProvider
  );
  const workspaceStandardLibraryTreeRegistration = viewHost.registerTreeDataProvider(
    workspaceStandardLibraryTreeViewId,
    workspaceStandardLibraryTreeProvider
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
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCreateFolder: createAlgorithmsCreateFolderCommand({
      filesystem,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsCreateFile: createAlgorithmsCreateFileCommand({
      filesystem,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
    algorithmsDelete: createAlgorithmsDeleteCommand({
      filesystem,
      notificationRouter,
      refreshAlgorithmsTree: workspaceAlgorithmsTreeProvider.refresh,
    }),
  };

  return vscode.Disposable.from(
    stateMachine,
    communicationHub,
    smokeControlsChannel,
    runControlsChannel,
    workspaceAlgorithmsTreeRegistration,
    workspaceStandardLibraryTreeRegistration,
    viewHost,
    viewsRegistration,
    registerCommands(commands)
  );
}