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
import type { IObservability } from "../observability";
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
  observability: IObservability;
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
  /**
   * Wraps one snapshot publisher with panel observability instrumentation.
   *
   * @param {"environment" | "run" | "smoke"} panel Panel key.
   * @param {() => void} publishRaw Raw publisher.
   * @returns {() => void} Instrumented publisher.
   */
  function instrumentPanelPublish(
    panel: "environment" | "run" | "smoke",
    publishRaw: () => void
  ): () => void {
    return (): void => {
      const observabilityCategory = "panel.snapshot";
      const startedAt = input.observability.isEnabled(observabilityCategory)
        ? Date.now()
        : 0;

      publishRaw();

      input.observability.increment("panel.snapshot.publish.count", 1, {
        panel,
      });

      if (startedAt > 0) {
        input.observability.log("debug", "panel.snapshot.publish.duration", {
          durationMs: Date.now() - startedAt,
          panel,
        });
      }
    };
  }

  const resolveSmokeLanguageIconUri = createSmokeLanguageIconUriResolver({
    languages: input.languages,
    viewHost: input.viewHost,
    viewId: input.viewIds.smokeControlsViewId,
    extensionUri: input.context.extensionUri,
  });
  const buildSmokeControlsSnapshot = createSmokeSnapshotBuilder(
    resolveSmokeLanguageIconUri
  );
  const publishSmokeSnapshot = createSmokeSnapshotPublisher({
    postMessage: input.communicationHub.post.bind(
      input.communicationHub,
      input.viewIds.smokeControlsViewId
    ),
    getSnapshot: input.stateMachine.getSmokeControlsSnapshot.bind(input.stateMachine),
    buildSnapshot: buildSmokeControlsSnapshot,
  });
  const publishSmokeSnapshotInstrumented = instrumentPanelPublish("smoke", publishSmokeSnapshot);
  const publishRunSnapshot = createRunControlsSnapshotPublisher({
    postMessage: input.communicationHub.post.bind(
      input.communicationHub,
      input.viewIds.runControlsViewId
    ),
    getSnapshot: input.stateMachine.getRunControlsSnapshot.bind(input.stateMachine),
    buildSnapshot: buildRunControlsSnapshot,
  });
  const publishRunSnapshotInstrumented = instrumentPanelPublish("run", publishRunSnapshot);
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
    getSnapshot: input.stateMachine.getEnvironmentControlsSnapshot.bind(input.stateMachine),
    buildSnapshot: buildEnvironmentControlsSnapshot,
  });
  const publishEnvironmentSnapshotInstrumented = instrumentPanelPublish(
    "environment",
    publishEnvironmentSnapshot
  );

  const smokeControlsChannelHandler = createSmokeControlsChannelMessageHandler({
    conductor: input.conductor,
    stateMachine: input.stateMachine,
    dispatchNotification: input.notificationDispatcher.dispatch,
    publishSnapshot: publishSmokeSnapshotInstrumented,
  });
  const runControlsChannelHandler = createRunControlsChannelMessageHandler({
    conductor: input.conductor,
    stateMachine: input.stateMachine,
    dispatchNotification: input.notificationDispatcher.dispatch,
    publishSnapshot: publishRunSnapshotInstrumented,
  });
  const environmentControlsChannelHandler = createEnvironmentControlsChannelMessageHandler({
    conductor: input.conductor,
    languages: input.languages,
    stateMachine: input.stateMachine,
    dispatchNotification: input.notificationDispatcher.dispatch,
    publishSnapshot: publishEnvironmentSnapshotInstrumented,
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