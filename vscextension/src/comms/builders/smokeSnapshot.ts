import * as vscode from "vscode";

import type { ILanguages } from "../../languages";
import type { ExtensionHostSnapshot } from "../../state";
import type { IViewHost } from "../../views";
import type { SmokeControlsViewSnapshot } from "../shared/messageTypes";

/**
 * Dependencies for creating one smoke language icon URI resolver.
 */
export interface CreateSmokeLanguageIconUriResolverInput {
  languages: ILanguages;
  viewHost: IViewHost;
  viewId: string;
  extensionUri: vscode.Uri;
}

/**
 * Creates a smoke language icon URI resolver with fallback icon behavior.
 *
 * @param {CreateSmokeLanguageIconUriResolverInput} input Resolver dependencies.
 * @returns {(languageKey: string) => string | undefined} Icon URI resolver callback.
 */
export function createSmokeLanguageIconUriResolver(
  input: CreateSmokeLanguageIconUriResolverInput
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
 * Builds a typed smoke controls snapshot payload from host state and resolved icon URIs.
 *
 * @param {ExtensionHostSnapshot} snapshot Current host state snapshot.
 * @param {(languageKey: string) => string | undefined} resolveIconUri Callback that resolves one language icon URI.
 * @returns {SmokeControlsViewSnapshot} Typed smoke controls payload ready for transport.
 */
export function buildSmokeSnapshot(
  snapshot: ExtensionHostSnapshot,
  resolveIconUri: (languageKey: string) => string | undefined
): SmokeControlsViewSnapshot {
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
        iconUri: resolveIconUri(language.languageKey),
      };
    }),
  };
}

/**
 * Creates a smoke snapshot builder bound to one icon URI resolver.
 *
 * @param {(languageKey: string) => string | undefined} resolveIconUri Icon URI resolver.
 * @returns {(snapshot: ExtensionHostSnapshot) => SmokeControlsViewSnapshot} Bound smoke snapshot builder.
 */
export function createSmokeSnapshotBuilder(
  resolveIconUri: (languageKey: string) => string | undefined
): (snapshot: ExtensionHostSnapshot) => SmokeControlsViewSnapshot {
  return (snapshot: ExtensionHostSnapshot): SmokeControlsViewSnapshot => {
    return buildSmokeSnapshot(snapshot, resolveIconUri);
  };
}
