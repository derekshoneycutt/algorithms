import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

import * as vscode from "vscode";

import type { HostToViewMessage, ViewToHostMessage } from "../comms";
import { isViewToHostMessage } from "../comms";
import type { IViewHost } from "./IViewHost";
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

    registerTreeDataProvider<T>(
      viewId: string,
      provider: vscode.TreeDataProvider<T>
    ): vscode.Disposable {
      const treeRegistration = vscode.window.registerTreeDataProvider(viewId, provider);
      treeRegistrations.push(treeRegistration);
      return treeRegistration;
    },

    focusView(viewId: string): Thenable<void> {
      return vscode.commands.executeCommand(`${viewId}.focus`);
    },

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

    postMessageToWebview(
      viewId: string,
      message: HostToViewMessage
    ): Thenable<boolean> | undefined {
      return resolvedViews.get(viewId)?.webview.postMessage(message);
    },

    toWebviewResourceUri(
      viewId: string,
      resourceUri: vscode.Uri
    ): string | undefined {
      return resolvedViews.get(viewId)?.webview.asWebviewUri(resourceUri).toString();
    },

    dispose(): void {
      inboundListenersByViewId.clear();
      for (const treeRegistration of treeRegistrations.splice(0)) {
        treeRegistration.dispose();
      }
      registration?.dispose();
      registration = undefined;
      resolvedViews.clear();
    },
  };
}
