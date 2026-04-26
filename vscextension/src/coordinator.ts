import * as vscode from "vscode";

import {
  createShowBootstrapStatusCommand,
  registerCommands,
} from "./commands";
import { createCommunicationHub } from "./comms";
import type {
  ICommunicationHub,
  SmokeControlsViewSnapshot,
  ViewSmokeControlIntent,
} from "./comms";
import { createConductorService } from "./conductor";
import type {
  ConductorNotificationEffect,
  ConductorSmokeIntent,
  IConductor,
} from "./conductor";
import type { IExtensionCommands } from "./commands";
import { createLanguages, GENERATED_LANGUAGE_DATA } from "./languages";
import type { ILanguages, LanguageRecord } from "./languages";
import { createNotificationRouter } from "./notifications";
import type { INotificationRouter } from "./notifications";
import type { IStateMachine } from "./state";
import { createHostStateService } from "./state";
import type { SmokeLanguageSelection } from "./state";
import type { IViewHost } from "./views";
import { createViewHost } from "./views";

/**
 * Returns the schema-aligned platform token for the current host.
 *
 * @returns {string} Platform token.
 */
function getCurrentPlatformToken(): string {
  if (process.platform === "darwin") {
    return "Darwin";
  }

  if (process.platform === "linux") {
    return "Linux";
  }

  if (process.platform === "freebsd") {
    return "FreeBSD";
  }

  if (process.platform === "win32") {
    return "MINGW64_NT";
  }

  return "*";
}

/**
 * Returns the schema-aligned architecture token for the current host.
 *
 * @returns {string} Architecture token.
 */
function getCurrentArchitectureToken(): string {
  if (process.arch === "arm64") {
    return "arm64";
  }

  if (process.arch === "x64") {
    return "x86_64";
  }

  return process.arch;
}

/**
 * Checks whether one language is runnable on the current host.
 *
 * @param {LanguageRecord} language Language record.
 * @returns {boolean} True when at least one rule permits current platform and arch.
 */
function isLanguageRunnableOnCurrentHost(language: LanguageRecord): boolean {
  const canRunRules = Array.isArray(language.constraints?.canRun)
    ? language.constraints.canRun
    : [];

  if (canRunRules.length === 0) {
    return true;
  }

  const platformToken = getCurrentPlatformToken();
  const archToken = getCurrentArchitectureToken();

  for (const rule of canRunRules) {
    const platforms = Array.isArray(rule.platform) ? rule.platform : ["*"];
    const archValues = Array.isArray(rule.arch) ? rule.arch : ["*"];
    const platformMatch = platforms.includes("*") || platforms.includes(platformToken);
    const archMatch = archValues.includes("*") || archValues.includes(archToken);

    if (platformMatch && archMatch) {
      return true;
    }
  }

  return false;
}

/**
 * Builds initial smoke language selections from generated language metadata.
 *
 * @param {ILanguages} languages Languages module instance.
 * @returns {SmokeLanguageSelection[]} Initial smoke language selections.
 */
function buildInitialSmokeLanguageSelections(
  languages: ILanguages
): SmokeLanguageSelection[] {
  const defaultSmokeKeys = new Set(languages.getDefaultSmokeKeys());

  return languages
    .getAll()
    .filter((language) => language.smoke.visible !== false)
    .map((language) => {
      const languageKey = language.key.trim().toLowerCase();
      const runnable = isLanguageRunnableOnCurrentHost(language);

      return {
        languageKey,
        label: language.displayLabel,
        selected: defaultSmokeKeys.has(languageKey) && runnable,
        disabled: !runnable,
        disabledReason: runnable
          ? ""
          : "Not runnable on this platform/architecture.",
      };
    });
}

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
  const languages: ILanguages = createLanguages(GENERATED_LANGUAGE_DATA);
  const smokeLanguages: SmokeLanguageSelection[] =
    buildInitialSmokeLanguageSelections(languages);
  const languageIconFileByKey = new Map<string, string>();

  for (const language of languages.getAll()) {
    const canonicalKey = language.key.trim().toLowerCase();
    const iconFileName = language.icon.fileName.trim();

    if (iconFileName.length > 0) {
      languageIconFileByKey.set(canonicalKey, iconFileName);
    }
  }

  const stateMachine: IStateMachine = createHostStateService({
    initialSmokeControls: {
      languages: smokeLanguages,
    },
  });
  const conductor: IConductor = createConductorService();
  const notificationRouter: INotificationRouter = createNotificationRouter();
  const viewHost: IViewHost = createViewHost(context);
  const communicationHub: ICommunicationHub = createCommunicationHub(viewHost);
  const viewsRegistration = viewHost.register();

  /**
   * Resolves one language icon URI for the smoke controls snapshot.
   *
   * @param {string} languageKey Language key.
   * @returns {string | undefined} Icon URI string if resolvable.
   */
  function resolveLanguageIconUri(languageKey: string): string | undefined {
    const canonicalKey = languageKey.trim().toLowerCase();
    const iconFileName = languageIconFileByKey.get(canonicalKey);

    if (iconFileName !== undefined) {
      const iconUri = viewHost.toWebviewResourceUri(
        vscode.Uri.joinPath(context.extensionUri, "icons", "languages", iconFileName)
      );

      if (iconUri !== undefined) {
        return iconUri;
      }
    }

    return viewHost.toWebviewResourceUri(
      vscode.Uri.joinPath(context.extensionUri, "icons", "play-sidebar.svg")
    );
  }

  /**
   * Builds the host->view smoke snapshot payload from state.
   *
    * @returns {SmokeControlsViewSnapshot} Snapshot payload.
   */
    function buildSmokeSnapshotPayload(): SmokeControlsViewSnapshot {
    const snapshot = stateMachine.getSnapshot();

    return {
      stateValue: snapshot.stateValue,
      reportEnabled: snapshot.smokeControls.reportEnabled,
      markdownPath: snapshot.smokeControls.markdownPath,
      timeoutSeconds: snapshot.smokeControls.timeoutSeconds,
      slowTimeoutSeconds: snapshot.smokeControls.slowTimeoutSeconds,
      statusLabel: snapshot.smokeControls.statusLabel,
      reportStatusText: snapshot.smokeControls.reportStatusText,
      reportStatusClassName: snapshot.smokeControls.reportStatusClassName,
      smokeStatusText: snapshot.smokeControls.smokeStatusText,
      smokeStatusClassName: snapshot.smokeControls.smokeStatusClassName,
      languages: snapshot.smokeControls.languages.map((language) => {
        return {
          ...language,
          iconUri: resolveLanguageIconUri(language.languageKey),
        };
      }),
    };
  }

  /**
   * Maps one comms smoke intent into the conductor intent contract.
   *
   * @param {ViewSmokeControlIntent} intent Message intent.
   * @returns {ConductorSmokeIntent} Conductor intent.
   */
  function mapViewIntentToConductorIntent(intent: ViewSmokeControlIntent): ConductorSmokeIntent {
    return intent;
  }

  /**
   * Routes one conductor notification effect.
   *
   * @param {ConductorNotificationEffect} notification Notification effect.
   * @returns {void}
   */
  function routeConductorNotification(
    notification: ConductorNotificationEffect
  ): void {
    if (notification.level === "error") {
      void notificationRouter.error(notification.message);
      return;
    }

    if (notification.level === "warn") {
      void notificationRouter.warn(notification.message);
      return;
    }

    void notificationRouter.info(notification.message);
  }

  const commsSubscription = communicationHub.subscribe((message) => {
    if (message.type === "smoke.ready") {
      communicationHub.post({
        type: "smoke.snapshot",
        payload: buildSmokeSnapshotPayload(),
      });
      return;
    }

    if (message.type === "smoke.intent") {
      const reaction = conductor.reactToSmokeIntent({
        intent: mapViewIntentToConductorIntent(message.payload),
        snapshot: stateMachine.getSnapshot(),
      });

      for (const stateEvent of reaction.stateEvents) {
        stateMachine.send(stateEvent);
      }

      if (reaction.notification !== null) {
        routeConductorNotification(reaction.notification);
      }

      if (reaction.shouldPublishSnapshot) {
        communicationHub.post({
          type: "smoke.snapshot",
          payload: buildSmokeSnapshotPayload(),
        });
      }
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