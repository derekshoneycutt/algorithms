import * as vscode from "vscode";

import {
  createShowBootstrapStatusCommand,
  registerCommands,
} from "./commands";
import { createCommunicationHub } from "./comms";
import type { ICommunicationHub } from "./comms";
import type { IExtensionCommands } from "./commands";
import { createNotificationRouter } from "./notifications";
import type { INotificationRouter } from "./notifications";
import type { IStateMachine } from "./state";
import { createHostStateService } from "./state";
import type { IViewHost } from "./views";
import { createViewHost } from "./views";

/**
 * Creates the coordinator for the bootstrap extension runtime.
 *
 * The coordinator is the only place that constructs concrete implementations
 * of `IStateMachine` and `IExtensionCommands`. All other modules receive
 * only the interfaces.
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
  const stateMachine: IStateMachine = createHostStateService();
  const notificationRouter: INotificationRouter = createNotificationRouter();
  const viewHost: IViewHost = createViewHost(context);
  const communicationHub: ICommunicationHub = createCommunicationHub(viewHost);
  const viewsRegistration = viewHost.register();
  const commsSubscription = communicationHub.subscribe((message) => {
    if (message.type === "bootstrap.ready") {
      communicationHub.post({
        type: "bootstrap.snapshot",
        payload: { status: "ready" },
      });
      return;
    }

    if (message.type === "bootstrap.pong") {
      void notificationRouter.info("Bootstrap view comms active");
    }
  });

  const commands: IExtensionCommands = {
    showBootstrapStatus: createShowBootstrapStatusCommand({
      extensionDisplayName: String(
        context.extension.packageJSON.displayName ?? context.extension.id
      ),
      extensionVersion: String(context.extension.packageJSON.version ?? "0.0.0"),
      hostState: stateMachine,
      showStatusMessage: (message) => {
        return notificationRouter.info(message);
      },
    }),
  };

  return vscode.Disposable.from(
    stateMachine,
    communicationHub,
    commsSubscription,
    viewHost,
    viewsRegistration,
    registerCommands(commands)
  );
}