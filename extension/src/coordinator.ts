import * as vscode from "vscode";

import type { ActivationServicesGraph } from "./activator";
import {
  createCoordinatorCommands,
  registerCommands,
} from "./commands";
import type { IExtensionCommands } from "./commands";
import type { IConductor } from "./conductor";
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
  observability: vscode.Disposable;
  stateMachine: vscode.Disposable;
  viewLayer: CoordinatorViewLayer;
  activeEditorRevealSubscription: vscode.Disposable;
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
    components.observability,
    components.viewLayer.communicationHub,
    components.activeEditorRevealSubscription,
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
 * The coordinator owns host wiring and final disposable composition for the
 * already-constructed activation services graph.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @param {ActivationServicesGraph} runtimeServices Prebuilt activation services.
 * @returns {vscode.Disposable} Root disposable for the bootstrap runtime.
 */
export function createCoordinator(
  context: vscode.ExtensionContext,
  runtimeServices: ActivationServicesGraph
): vscode.Disposable {
  const viewIds: CoordinatorViewIds = {
    environmentControlsViewId: getEnvironmentControlsSidebarViewId(),
    runControlsViewId: getRunControlsSidebarViewId(),
    smokeControlsViewId: getSmokeControlsSidebarViewId(),
    workspaceAlgorithmsTreeViewId: getWorkspaceAlgorithmsTreeViewId(),
    workspaceStandardLibraryTreeViewId: getWorkspaceStandardLibraryTreeViewId(),
  };
  const { conductor, stateMachine, rootPathResolver } = runtimeServices;
  const viewLayer: CoordinatorViewLayer = createCoordinatorViewLayer({
    conductor,
    context,
    filesystem: runtimeServices.filesystem,
    filterModeService: runtimeServices.filterModeService,
    languages: runtimeServices.languages,
    notificationRouter: runtimeServices.notificationRouter,
    observability: runtimeServices.observability,
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
    observability: runtimeServices.observability,
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

  let lastRevealKey = "";

  const activeEditorRevealSubscription = vscode.window.onDidChangeActiveTextEditor(
    async (editor) => {
      if (!editor) { return; }

      const activeUri = editor.document.uri;
      if (activeUri.scheme !== "file") {
        return;
      }

      const filePath = activeUri.fsPath;
      if (runtimeServices.languages.normalizeFileExtension(filePath) === undefined) {
        return;
      }

      if (!viewLayer.workspaceAlgorithmsTreeRegistration.visible &&
          !viewLayer.workspaceStandardLibraryTreeRegistration.visible) {
        return;
      }

      const result =
        await viewLayer.workspaceAlgorithmsTreeProvider.findNodeForFilePath(filePath) ??
        await viewLayer.workspaceStandardLibraryTreeProvider.findNodeForFilePath(filePath);
      if (!result) { return; }

      const revealKey = `${filePath}:${result.viewId}:${result.node.filePath}`;
      if (revealKey === lastRevealKey) {
        return;
      }

      lastRevealKey = revealKey;

      await viewLayer.viewHost.revealInTree(
        result.viewId,
        result.node,
        { select: true, focus: false }
      );
    }
  );

  return buildCoordinatorDisposables({
    activeEditorRevealSubscription,
    channels: {
      environmentControlsChannel,
      runControlsChannel,
      smokeControlsChannel,
    },
    commands,
    conductor,
    observability: runtimeServices.observability,
    stateMachine,
    viewLayer,
  });
}
