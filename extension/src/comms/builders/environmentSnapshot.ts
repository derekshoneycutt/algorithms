import * as vscode from "vscode";

import type { ILanguages } from "../../languages";
import type { EnvironmentControlsSettings, ExtensionHostStateValue } from "../../state";
import type { IViewHost } from "../../views";
import type {
  EnvironmentControlsViewSnapshot,
  HostToViewMessage,
} from "../shared/messageTypes";

interface EnvironmentSnapshotSource {
  stateValue: ExtensionHostStateValue;
  environmentControls: EnvironmentControlsSettings;
}

/**
 * Dependencies for creating one environment language icon URI resolver.
 */
export interface CreateEnvironmentLanguageIconUriResolverInput {
  languages: ILanguages;
  viewHost: IViewHost;
  viewId: string;
  extensionUri: vscode.Uri;
}

/**
 * Creates an environment language icon URI resolver with fallback icon behavior.
 *
 * @param {CreateEnvironmentLanguageIconUriResolverInput} input Resolver dependencies.
 * @returns {(languageKey: string) => string | undefined} Icon URI resolver callback.
 */
export function createEnvironmentLanguageIconUriResolver(
  input: CreateEnvironmentLanguageIconUriResolverInput
): (languageKey: string) => string | undefined {
  const fallbackIconResourceUri = vscode.Uri.joinPath(
    input.extensionUri,
    "icons",
    "play-sidebar.svg"
  );

  return (languageKey: string): string | undefined => {
    const iconFileName = input.languages.getByKey(languageKey)?.icon.fileName.trim();

    if (iconFileName !== undefined && iconFileName.length > 0) {
      const iconResourceUri = vscode.Uri.joinPath(
        input.extensionUri,
        "icons",
        "languages",
        iconFileName
      );
      const iconUri = input.viewHost.toWebviewResourceUri(input.viewId, iconResourceUri);

      if (iconUri !== undefined) {
        return iconUri;
      }
    }

    return input.viewHost.toWebviewResourceUri(input.viewId, fallbackIconResourceUri);
  };
}

/**
 * Builds a typed environment controls snapshot payload from host state.
 *
 * @param {ExtensionHostSnapshot} snapshot Current host state snapshot.
 * @param {(languageKey: string) => string | undefined} resolveIconUri Callback that resolves one language icon URI.
 * @returns {EnvironmentControlsViewSnapshot} Typed environment controls payload ready for transport.
 */
export function buildEnvironmentControlsSnapshot(
  snapshot: EnvironmentSnapshotSource,
  resolveIconUri: (languageKey: string) => string | undefined
): EnvironmentControlsViewSnapshot {
  return {
    stateValue: snapshot.stateValue,
    profilePath: snapshot.environmentControls.profilePath,
    profilePlaceholder: snapshot.environmentControls.profilePlaceholder,
    effectiveProfilePath: snapshot.environmentControls.effectiveProfilePath,
    copyIconsPath: snapshot.environmentControls.copyIconsPath,
    checkEnvStatusText: snapshot.environmentControls.checkEnvStatusText,
    checkEnvStatusClassName: snapshot.environmentControls.checkEnvStatusClassName,
    checkEnvFilteredOutput: snapshot.environmentControls.checkEnvFilteredOutput,
    checkEnvRawOutput: snapshot.environmentControls.checkEnvRawOutput,
    copyIconsStatusText: snapshot.environmentControls.copyIconsStatusText,
    copyIconsStatusClassName: snapshot.environmentControls.copyIconsStatusClassName,
    routingDockerMapText: snapshot.environmentControls.routingDockerMapText,
    routingSshMapText: snapshot.environmentControls.routingSshMapText,
    routingStatusText: snapshot.environmentControls.routingStatusText,
    routingStatusClassName: snapshot.environmentControls.routingStatusClassName,
    routingEntries: snapshot.environmentControls.routingEntries.map((entry) => {
      return {
        ...entry,
        iconUri: resolveIconUri(entry.languageKey),
      };
    }),
    batchRouting: {
      dockerEnabled: snapshot.environmentControls.batchRoutingDockerEnabled,
      dockerValue: snapshot.environmentControls.batchRoutingDockerValue,
      sshEnabled: snapshot.environmentControls.batchRoutingSshEnabled,
      sshValue: snapshot.environmentControls.batchRoutingSshValue,
      isConflict: snapshot.environmentControls.batchRoutingConflict,
      statusText: snapshot.environmentControls.routingStatusText,
      statusClassName: snapshot.environmentControls.routingStatusClassName,
    },
    variables: snapshot.environmentControls.variables.map((variable) => {
      return {
        ...variable,
      };
    }),
  };
}

/**
 * Creates an environment snapshot builder bound to one icon URI resolver.
 *
 * @param {(languageKey: string) => string | undefined} resolveIconUri Icon URI resolver.
 * @returns {(snapshot: ExtensionHostSnapshot) => EnvironmentControlsViewSnapshot} Bound environment snapshot builder.
 */
export function createEnvironmentControlsSnapshotBuilder(
  resolveIconUri: (languageKey: string) => string | undefined
): (snapshot: EnvironmentSnapshotSource) => EnvironmentControlsViewSnapshot {
  return (snapshot: EnvironmentSnapshotSource): EnvironmentControlsViewSnapshot => {
    return buildEnvironmentControlsSnapshot(snapshot, resolveIconUri);
  };
}

/**
 * Dependencies for creating an environment snapshot publisher.
 */
export interface CreateEnvironmentControlsSnapshotPublisherInput {
  postMessage: (message: HostToViewMessage) => Thenable<boolean> | undefined;
  getSnapshot: () => EnvironmentSnapshotSource;
  buildSnapshot: (snapshot: EnvironmentSnapshotSource) => EnvironmentControlsViewSnapshot;
}

/**
 * Creates an environment snapshot publisher bound to one transport channel.
 *
 * @param {CreateEnvironmentControlsSnapshotPublisherInput} input Publisher dependencies.
 * @returns {() => void} Environment snapshot publisher.
 */
export function createEnvironmentControlsSnapshotPublisher(
  input: CreateEnvironmentControlsSnapshotPublisherInput
): () => void {
  return (): void => {
    input.postMessage({
      type: "environment.snapshot",
      payload: input.buildSnapshot(input.getSnapshot()),
    });
  };
}
