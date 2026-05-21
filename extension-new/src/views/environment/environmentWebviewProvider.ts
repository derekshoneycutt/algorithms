import * as vscode from "vscode";
import { TemplateLoader } from "../shared/templateLoader";

export const environmentViewId = "algos.environmentView";

const environmentWebviewName = "environment";
const environmentWebviewHtml = "environmentWebview.html";
const environmentWebviewCss = "environmentWebview.css";
const environmentWebviewScript = "environmentWebviewApp.js";
const environmentWebviewUiPathSegments =
    ["src", "views", environmentWebviewName, "ui"] as const;
const environmentWebviewCssPathSegments =
    [...environmentWebviewUiPathSegments, environmentWebviewCss] as const;
const environmentWebviewDistUiPathSegments = ["dist", "views", environmentWebviewName, "ui"] as const;
const environmentWebviewScriptPathSegments =
  [...environmentWebviewDistUiPathSegments, environmentWebviewScript] as const;
const commonWebviewUiPathSegments = ["src", "views", "shared", "ui"] as const;
const commonWebviewCssPathSegments =
  [...commonWebviewUiPathSegments, "webviewCommon.css"] as const;

/**
 * Minimal webview provider for the environment sidebar view.
 */
export class EnvironmentWebviewProvider implements vscode.WebviewViewProvider {
  private readonly extensionUri: vscode.Uri;

  /**
   * Creates a provider for the environment webview.
   *
   * @param {vscode.Uri} extensionUri Extension installation URI.
   */
  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  /**
   * Resolves the environment webview when VS Code reveals the view.
   *
   * @param {vscode.WebviewView} webviewView The webview container provided by VS Code.
   * @returns {Promise<void>} Resolves after loading HTML content.
   */
  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, ...environmentWebviewUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...environmentWebviewDistUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...commonWebviewUiPathSegments),
      ],
    };

    webviewView.webview.html = await this.getHtmlFromFile(webviewView.webview);
  }

  /**
   * Loads static HTML shown in the environment view from disk.
   *
   * @returns {string} Webview HTML.
   */
  private async getHtmlFromFile(webview: vscode.Webview): Promise<string> {
    const commonCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...commonWebviewCssPathSegments)
    ).toString();

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...environmentWebviewCssPathSegments)
    ).toString();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...environmentWebviewScriptPathSegments)
    ).toString();

    const loader = new TemplateLoader({
      COMMON_CSS_URI: commonCssUri,
      CSS_URI: cssUri,
      SCRIPT_URI: scriptUri,
    });

    return await loader.loadFile(this.extensionUri,
      environmentWebviewName, environmentWebviewHtml);
  }
}

export class EnvironmentView implements vscode.Disposable {
  private webviewProvider : EnvironmentWebviewProvider | undefined = undefined;
  private webviewRegistration : vscode.Disposable | undefined = undefined;

  public register(extensionUri: vscode.Uri) {
    if (this.webviewRegistration !== undefined) {
      return;
    }

    this.webviewProvider = new EnvironmentWebviewProvider(extensionUri);
    this.webviewRegistration = vscode.window.registerWebviewViewProvider(
      environmentViewId,
      this.webviewProvider,
    );
  }

  public isRegistered(): boolean {
    return (this.webviewRegistration !== undefined);
  }

  public getProvider(): EnvironmentWebviewProvider | undefined {
    return this.webviewProvider;
  }

  public getRegistration(): vscode.Disposable | undefined {
    return this.webviewRegistration;
  }

  public dispose() {
    if (this.webviewRegistration !== undefined) {
      this.webviewRegistration.dispose();
      this.webviewRegistration = undefined;
    }
    if (this.webviewProvider !== undefined) {
      this.webviewProvider = undefined;
    }
  }
}
