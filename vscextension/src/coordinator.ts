import * as vscode from "vscode";

import {
  createShowBootstrapStatusCommand,
  registerCommands,
} from "./commands";
import type { IExtensionCommands } from "./commands";
import {
  buildRunControlsSnapshot,
  createSmokeLanguageIconUriResolver,
  createSmokeSnapshotBuilder,
  createCommunicationHub,
} from "./comms";
import type { ICommunicationHub } from "./comms";
import { createConductorService } from "./conductor";
import type { IConductor } from "./conductor";
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
  createViewHost,
  getRunControlsSidebarViewId,
  getSmokeControlsSidebarViewId,
} from "./views";
import type { IViewHost } from "./views";

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
  const resolveSmokeLanguageIconUri = createSmokeLanguageIconUriResolver({
    languages,
    viewHost,
    viewId: smokeControlsViewId,
    extensionUri: context.extensionUri,
  });
  const buildSmokeControlsSnapshot = createSmokeSnapshotBuilder(
    resolveSmokeLanguageIconUri
  );
  const smokeControlsChannel = communicationHub.registerSmokeControlsChannel({
    viewId: smokeControlsViewId,
    stateMachine,
    conductor,
    dispatchNotification: notificationDispatcher.dispatch,
    buildSnapshot: buildSmokeControlsSnapshot,
  });
  const runControlsChannel = communicationHub.registerRunControlsChannel({
    viewId: runControlsViewId,
    stateMachine,
    conductor,
    dispatchNotification: notificationDispatcher.dispatch,
    buildSnapshot: buildRunControlsSnapshot,
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
  };

  return vscode.Disposable.from(
    stateMachine,
    communicationHub,
    smokeControlsChannel,
    runControlsChannel,
    viewHost,
    viewsRegistration,
    registerCommands(commands)
  );
}