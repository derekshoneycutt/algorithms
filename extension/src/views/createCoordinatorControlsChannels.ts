import * as vscode from "vscode";

import {
  buildRunControlsSnapshot,
  createEnvironmentControlsSnapshotBuilder,
  createEnvironmentControlsSnapshotPublisher,
  createEnvironmentLanguageIconUriResolver,
  createRunControlsSnapshotPublisher,
  createSmokeLanguageIconUriResolver,
  createSmokeSnapshotBuilder,
  createSmokeSnapshotPublisher,
} from "../comms";
import {
  createEnvironmentControlsChannelMessageHandler,
  createRunControlsChannelMessageHandler,
  createSmokeControlsChannelMessageHandler,
  type IConductor,
} from "../conductor";
import type { ILanguages } from "../languages";
import { createConductorNotificationDispatcher } from "../notifications";
import type { IStateMachine } from "../state";
import type { ICommunicationHub } from "../comms";
import type { IViewHost } from "./IViewHost";
import {
  registerControlsChannels,
  type ControlsChannelRegistrations,
} from "./controlsChannelRegistration";

/**
 * Input for coordinator controls-channel construction.
 */
export interface CreateCoordinatorControlsChannelsInput {
  communicationHub: ICommunicationHub;
  conductor: IConductor;
  context: vscode.ExtensionContext;
  languages: ILanguages;
  notificationDispatcher: ReturnType<typeof createConductorNotificationDispatcher>;
  stateMachine: IStateMachine;
  viewHost: IViewHost;
  viewIds: {
    environmentControlsViewId: string;
    runControlsViewId: string;
    smokeControlsViewId: string;
  };
}

/**
 * Creates the controls snapshot publishers and channel registrations.
 *
 * @param {CreateCoordinatorControlsChannelsInput} input Coordinator controls-channel dependencies.
 * @returns {ControlsChannelRegistrations} Registered controls channels.
 */
export function createCoordinatorControlsChannels(
  input: CreateCoordinatorControlsChannelsInput
): ControlsChannelRegistrations {
  const resolveSmokeLanguageIconUri = createSmokeLanguageIconUriResolver({
    languages: input.languages,
    viewHost: input.viewHost,
    viewId: input.viewIds.smokeControlsViewId,
    extensionUri: input.context.extensionUri,
  });
  const buildSmokeControlsSnapshot = createSmokeSnapshotBuilder(
    resolveSmokeLanguageIconUri
  );
  const getStateSnapshot = input.stateMachine.getSnapshot.bind(input.stateMachine);
  const publishSmokeSnapshot = createSmokeSnapshotPublisher({
    postMessage: input.communicationHub.post.bind(
      input.communicationHub,
      input.viewIds.smokeControlsViewId
    ),
    getSnapshot: getStateSnapshot,
    buildSnapshot: buildSmokeControlsSnapshot,
  });
  const publishRunSnapshot = createRunControlsSnapshotPublisher({
    postMessage: input.communicationHub.post.bind(
      input.communicationHub,
      input.viewIds.runControlsViewId
    ),
    getSnapshot: getStateSnapshot,
    buildSnapshot: buildRunControlsSnapshot,
  });
  const resolveEnvironmentLanguageIconUri = createEnvironmentLanguageIconUriResolver({
    languages: input.languages,
    viewHost: input.viewHost,
    viewId: input.viewIds.environmentControlsViewId,
    extensionUri: input.context.extensionUri,
  });
  const buildEnvironmentControlsSnapshot = createEnvironmentControlsSnapshotBuilder(
    resolveEnvironmentLanguageIconUri
  );
  const publishEnvironmentSnapshot = createEnvironmentControlsSnapshotPublisher({
    postMessage: input.communicationHub.post.bind(
      input.communicationHub,
      input.viewIds.environmentControlsViewId
    ),
    getSnapshot: getStateSnapshot,
    buildSnapshot: buildEnvironmentControlsSnapshot,
  });

  const smokeControlsChannelHandler = createSmokeControlsChannelMessageHandler({
    conductor: input.conductor,
    stateMachine: input.stateMachine,
    dispatchNotification: input.notificationDispatcher.dispatch,
    publishSnapshot: publishSmokeSnapshot,
  });
  const runControlsChannelHandler = createRunControlsChannelMessageHandler({
    conductor: input.conductor,
    stateMachine: input.stateMachine,
    dispatchNotification: input.notificationDispatcher.dispatch,
    publishSnapshot: publishRunSnapshot,
  });
  const environmentControlsChannelHandler = createEnvironmentControlsChannelMessageHandler({
    conductor: input.conductor,
    languages: input.languages,
    stateMachine: input.stateMachine,
    dispatchNotification: input.notificationDispatcher.dispatch,
    publishSnapshot: publishEnvironmentSnapshot,
  });

  return registerControlsChannels({
    smokeControlsViewId: input.viewIds.smokeControlsViewId,
    runControlsViewId: input.viewIds.runControlsViewId,
    environmentControlsViewId: input.viewIds.environmentControlsViewId,
    communicationHub: input.communicationHub,
    smokeControlsListener: smokeControlsChannelHandler,
    runControlsListener: runControlsChannelHandler,
    environmentControlsListener: environmentControlsChannelHandler,
  });
}