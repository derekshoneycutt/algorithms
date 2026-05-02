import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

import * as vscode from "vscode";

import type { HostToViewMessage, ViewToHostMessage } from "../comms";
import { isViewToHostMessage } from "../comms";
import type { ITreeViewHandle, IViewHost } from "./IViewHost";
import {
  getEnvironmentControlsSidebarViewId,
  getRunControlsSidebarViewId,
  getSmokeControlsSidebarViewId,
} from "./viewIds";

interface ViewProviderRegistration {
  viewId: string;
  mediaRoot: vscode.Uri;
  webviewDistRoot: vscode.Uri;
  renderHtml: (webview: vscode.Webview) => string;
}

/**
 * Builds a nonce used by the webview content security policy.
 *
 * @returns {string} CSP nonce value.
 */
function createNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

/**
 * Reads the HTML template for the smoke controls webview.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {string} Template HTML content.
 */
function readSmokeControlsTemplate(context: vscode.ExtensionContext): string {
  const templatePath = context.asAbsolutePath(
    path.join(
      "src",
      "views",
      "media",
      "smokeControls",
      "smokeControlsView.html"
    )
  );
  return fs.readFileSync(templatePath, "utf8");
}

/**
 * Reads the HTML template for the run controls webview.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {string} Template HTML content.
 */
function readRunControlsTemplate(context: vscode.ExtensionContext): string {
  const templatePath = context.asAbsolutePath(
    path.join("src", "views", "media", "runControls", "runControlsView.html")
  );
  return fs.readFileSync(templatePath, "utf8");
}

/**
 * Reads the HTML template for the environment controls webview.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {string} Template HTML content.
 */
function readEnvironmentControlsTemplate(context: vscode.ExtensionContext): string {
  const templatePath = context.asAbsolutePath(
    path.join(
      "src",
      "views",
      "media",
      "environmentControls",
      "environmentControlsView.html"
    )
  );
  return fs.readFileSync(templatePath, "utf8");
}

/**
 * Applies a triple-curly replacement map to one template string.
 *
 * @param {string} template Template content.
 * @param {Record<string, string>} replacements Token replacement map.
 * @returns {string} Rendered template.
 */
function renderTripleCurlyTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  let renderedTemplate = template;

  for (const [token, value] of Object.entries(replacements)) {
    renderedTemplate = renderedTemplate.replaceAll(`{{{${token}}}}`, value);
  }

  return renderedTemplate;
}

/**
 * Creates rendered HTML from the triple-curly webview template.
 *
 * @param {vscode.Webview} webview Webview instance.
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {string} Rendered webview HTML.
 */
function renderSmokeControlsHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): string {
  const template = readSmokeControlsTemplate(context);
  const nonce = createNonce();

  const styleUri = webview
    .asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "src",
        "views",
        "media",
        "smokeControls",
        "smokeControlsView.css"
      )
    )
    .toString();

  const scriptUri = webview
    .asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "dist",
        "views",
        "smokeControls",
        "smokeControlsView.js"
      )
    )
    .toString();

  return renderTripleCurlyTemplate(template, {
    TITLE: "Algorithms Sidebar",
    CSP_SOURCE: webview.cspSource,
    NONCE: nonce,
    STYLE_URI: styleUri,
    SCRIPT_URI: scriptUri,
  });
}

/**
 * Creates rendered HTML from the run controls webview template.
 *
 * @param {vscode.Webview} webview Webview instance.
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {string} Rendered webview HTML.
 */
function renderRunControlsHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): string {
  const template = readRunControlsTemplate(context);
  const nonce = createNonce();

  const styleUri = webview
    .asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "src",
        "views",
        "media",
        "runControls",
        "runControlsView.css"
      )
    )
    .toString();

  const scriptUri = webview
    .asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "dist",
        "views",
        "runControls",
        "runControlsView.js"
      )
    )
    .toString();

  return renderTripleCurlyTemplate(template, {
    TITLE: "Algorithms Sidebar",
    CSP_SOURCE: webview.cspSource,
    NONCE: nonce,
    STYLE_URI: styleUri,
    SCRIPT_URI: scriptUri,
  });
}

/**
 * Creates rendered HTML from the environment controls webview template.
 *
 * @param {vscode.Webview} webview Webview instance.
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {string} Rendered webview HTML.
 */
function renderEnvironmentControlsHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): string {
  const template = readEnvironmentControlsTemplate(context);
  const nonce = createNonce();

  const styleUri = webview
    .asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "src",
        "views",
        "media",
        "environmentControls",
        "environmentControlsView.css"
      )
    )
    .toString();

  const scriptUri = webview
    .asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "dist",
        "views",
        "environmentControls",
        "environmentControlsView.js"
      )
    )
    .toString();

  return renderTripleCurlyTemplate(template, {
    TITLE: "Algorithms Sidebar",
    CSP_SOURCE: webview.cspSource,
    NONCE: nonce,
    STYLE_URI: styleUri,
    SCRIPT_URI: scriptUri,
  });
}

/**
 * Creates the concrete host-side view module implementation.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {IViewHost} View host implementation.
 */
export function createViewHost(context: vscode.ExtensionContext): IViewHost {
  const iconsRoot = vscode.Uri.joinPath(context.extensionUri, "icons");
  const providerRegistrations: ViewProviderRegistration[] = [
    {
      viewId: getSmokeControlsSidebarViewId(),
      mediaRoot: vscode.Uri.joinPath(
        context.extensionUri,
        "src",
        "views",
        "media",
        "smokeControls"
      ),
      webviewDistRoot: vscode.Uri.joinPath(
        context.extensionUri,
        "dist",
        "views",
        "smokeControls"
      ),
      renderHtml: (webview: vscode.Webview) => {
        return renderSmokeControlsHtml(webview, context);
      },
    },
    {
      viewId: getRunControlsSidebarViewId(),
      mediaRoot: vscode.Uri.joinPath(
        context.extensionUri,
        "src",
        "views",
        "media",
        "runControls"
      ),
      webviewDistRoot: vscode.Uri.joinPath(
        context.extensionUri,
        "dist",
        "views",
        "runControls"
      ),
      renderHtml: (webview: vscode.Webview) => {
        return renderRunControlsHtml(webview, context);
      },
    },
    {
      viewId: getEnvironmentControlsSidebarViewId(),
      mediaRoot: vscode.Uri.joinPath(
        context.extensionUri,
        "src",
        "views",
        "media",
        "environmentControls"
      ),
      webviewDistRoot: vscode.Uri.joinPath(
        context.extensionUri,
        "dist",
        "views",
        "environmentControls"
      ),
      renderHtml: (webview: vscode.Webview) => {
        return renderEnvironmentControlsHtml(webview, context);
      },
    },
  ];

  const resolvedViews = new Map<string, vscode.WebviewView>();
  let registration: vscode.Disposable | undefined;
  const treeRegistrations: vscode.Disposable[] = [];
  const treeViewsByViewId = new Map<string, vscode.TreeView<unknown>>();
  const inboundListenersByViewId = new Map<
    string,
    Set<(message: ViewToHostMessage) => void>
  >();

  /**
   * Returns the listener set for one view ID, creating it when missing.
   *
   * @param {string} viewId Sidebar view identifier.
   * @returns {Set<(message: ViewToHostMessage) => void>} Listener set.
   */
  function getOrCreateInboundListeners(
    viewId: string
  ): Set<(message: ViewToHostMessage) => void> {
    const existingListeners = inboundListenersByViewId.get(viewId);
    if (existingListeners !== undefined) {
      return existingListeners;
    }

    const nextListeners = new Set<(message: ViewToHostMessage) => void>();
    inboundListenersByViewId.set(viewId, nextListeners);
    return nextListeners;
  }

  return {
    /**
     * Registers contributed sidebar webview providers.
     *
     * @returns {vscode.Disposable} Registration handle.
     */
    register(): vscode.Disposable {
      if (registration !== undefined) {
        return registration;
      }

      const registrations = providerRegistrations.map((providerRegistration) => {
        const provider: vscode.WebviewViewProvider = {
          resolveWebviewView(webviewView) {
            resolvedViews.set(providerRegistration.viewId, webviewView);
            webviewView.webview.options = {
              enableScripts: true,
              localResourceRoots: [
                providerRegistration.mediaRoot,
                providerRegistration.webviewDistRoot,
                iconsRoot,
              ],
            };

            webviewView.webview.onDidReceiveMessage((message: unknown) => {
              if (!isViewToHostMessage(message)) {
                return;
              }

              const inboundListeners = inboundListenersByViewId.get(
                providerRegistration.viewId
              );

              if (inboundListeners === undefined) {
                return;
              }

              for (const listener of inboundListeners) {
                listener(message);
              }
            });

            webviewView.webview.html = providerRegistration.renderHtml(
              webviewView.webview
            );
          },
        };

        return vscode.window.registerWebviewViewProvider(
          providerRegistration.viewId,
          provider,
          {
            webviewOptions: {
              retainContextWhenHidden: true,
            },
          }
        );
      });

      registration = vscode.Disposable.from(...registrations);

      return registration;
    },

    /**
     * Registers one tree data provider and returns a reveal-capable handle.
     *
     * @template T Element type returned by the provider.
     * @param {string} viewId Tree view identifier.
     * @param {vscode.TreeDataProvider<T>} provider Tree data provider.
     * @returns {ITreeViewHandle<T>} Registered tree view handle.
     */
    registerTreeDataProvider<T>(
      viewId: string,
      provider: vscode.TreeDataProvider<T>
    ): ITreeViewHandle<T> {
      const treeView = vscode.window.createTreeView(viewId, {
        treeDataProvider: provider,
      });
      treeViewsByViewId.set(viewId, treeView as vscode.TreeView<unknown>);
      treeRegistrations.push(treeView);
      return treeView as unknown as ITreeViewHandle<T>;
    },

    /**
     * Focuses one contributed sidebar view.
     *
     * @param {string} viewId Sidebar view identifier.
     * @returns {Thenable<void>} Completion signal.
     */
    focusView(viewId: string): Thenable<void> {
      return vscode.commands.executeCommand(`${viewId}.focus`);
    },

    /**
     * Reveals one element in a registered tree view when the tree is visible.
     *
     * @param {string} viewId Tree view identifier.
     * @param {unknown} element Tree element to reveal.
     * @param {{ select?: boolean; focus?: boolean; expand?: boolean | number }} [options] Reveal options.
     * @returns {Thenable<void>} Completion signal.
     */
    revealInTree(
      viewId: string,
      element: unknown,
      options?: { select?: boolean; focus?: boolean; expand?: boolean | number }
    ): Thenable<void> {
      const treeView = treeViewsByViewId.get(viewId);
      if (treeView === undefined || !treeView.visible) {
        return Promise.resolve();
      }
      return treeView.reveal(element, options);
    },

    /**
     * Subscribes one listener to inbound messages for a resolved webview.
     *
     * @param {string} viewId Sidebar view identifier.
     * @param {(message: ViewToHostMessage) => void} listener Typed message listener.
     * @returns {vscode.Disposable} Disposable subscription handle.
     */
    onDidReceiveMessage(
      viewId: string,
      listener: (message: ViewToHostMessage) => void
    ): vscode.Disposable {
      const inboundListeners = getOrCreateInboundListeners(viewId);
      inboundListeners.add(listener);

      return new vscode.Disposable(() => {
        inboundListeners.delete(listener);
      });
    },

    /**
     * Posts a typed host message to one resolved webview.
     *
     * @param {string} viewId Sidebar view identifier.
     * @param {HostToViewMessage} message Typed host-to-view payload.
     * @returns {Thenable<boolean> | undefined} Delivery result when resolved.
     */
    postMessageToWebview(
      viewId: string,
      message: HostToViewMessage
    ): Thenable<boolean> | undefined {
      return resolvedViews.get(viewId)?.webview.postMessage(message);
    },

    /**
     * Converts one extension URI into a webview-safe URI string.
     *
     * @param {string} viewId Sidebar view identifier.
     * @param {vscode.Uri} resourceUri Extension resource URI.
     * @returns {string | undefined} Webview-safe URI when the view is resolved.
     */
    toWebviewResourceUri(
      viewId: string,
      resourceUri: vscode.Uri
    ): string | undefined {
      return resolvedViews.get(viewId)?.webview.asWebviewUri(resourceUri).toString();
    },

    /**
     * Disposes all view-host registrations and listeners.
     *
     * @returns {void}
     */
    dispose(): void {
      inboundListenersByViewId.clear();
      for (const treeRegistration of treeRegistrations.splice(0)) {
        treeRegistration.dispose();
      }
      treeViewsByViewId.clear();
      registration?.dispose();
      registration = undefined;
      resolvedViews.clear();
    },
  };
}
