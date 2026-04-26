import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

import * as vscode from "vscode";

import type { HostToViewMessage, ViewToHostMessage } from "../comms";
import { isViewToHostMessage } from "../comms";
import type { IViewHost } from "./IViewHost";
import { getSmokeControlsSidebarViewId } from "./viewIds";

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
 * Creates the concrete host-side view module implementation.
 *
 * @param {vscode.ExtensionContext} context Extension activation context.
 * @returns {IViewHost} View host implementation.
 */
export function createViewHost(context: vscode.ExtensionContext): IViewHost {
  const smokeControlsViewId = getSmokeControlsSidebarViewId();
  const mediaRoot = vscode.Uri.joinPath(
    context.extensionUri,
    "src",
    "views",
    "media",
    "smokeControls"
  );
  const webviewDistRoot = vscode.Uri.joinPath(
    context.extensionUri,
    "dist",
    "views",
    "smokeControls"
  );

  let resolvedView: vscode.WebviewView | undefined;
  let registration: vscode.Disposable | undefined;
  const inboundListeners = new Set<(message: ViewToHostMessage) => void>();

  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView) {
      resolvedView = webviewView;
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [mediaRoot, webviewDistRoot],
      };

      webviewView.webview.onDidReceiveMessage((message: unknown) => {
        if (!isViewToHostMessage(message)) {
          return;
        }

        for (const listener of inboundListeners) {
          listener(message);
        }
      });

      webviewView.webview.html = renderSmokeControlsHtml(
        webviewView.webview,
        context
      );
    },
  };

  return {
    register(): vscode.Disposable {
      if (registration !== undefined) {
        return registration;
      }

      registration = vscode.window.registerWebviewViewProvider(
        smokeControlsViewId,
        provider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        }
      );

      return registration;
    },

    focusPrimaryView(): Thenable<void> {
      return vscode.commands.executeCommand(`${smokeControlsViewId}.focus`);
    },

    onDidReceiveMessage(
      listener: (message: ViewToHostMessage) => void
    ): vscode.Disposable {
      inboundListeners.add(listener);
      return new vscode.Disposable(() => {
        inboundListeners.delete(listener);
      });
    },

    postMessageToPrimaryWebview(
      message: HostToViewMessage
    ): Thenable<boolean> | undefined {
      return resolvedView?.webview.postMessage(message);
    },

    dispose(): void {
      inboundListeners.clear();
      registration?.dispose();
      registration = undefined;
      resolvedView = undefined;
    },
  };
}
