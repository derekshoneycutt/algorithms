import * as vscode from "vscode";
import { TemplateLoader } from "../shared/templateLoader";

export const smokeViewId = "algos.smokeView";

const smokeWebviewName = "smoke";
const smokeWebviewHtml = "smokeWebview.html";
const smokeWebviewCss = "smokeWebview.css";
const smokeWebviewScript = "smokeWebviewApp.js";
const smokeWebviewUiPathSegments = ["src", "views", smokeWebviewName, "ui"] as const;
const smokeWebviewCssPathSegments = [...smokeWebviewUiPathSegments, smokeWebviewCss] as const;
const smokeWebviewDistUiPathSegments = ["dist", "views", smokeWebviewName, "ui"] as const;
const smokeWebviewScriptPathSegments =
  [...smokeWebviewDistUiPathSegments, smokeWebviewScript] as const;
const commonWebviewUiPathSegments = ["src", "views", "shared", "ui"] as const;
const commonWebviewCssPathSegments =
  [...commonWebviewUiPathSegments, "webviewCommon.css"] as const;

/**
 * Minimal webview provider for the smoke sidebar view.
 */
export class SmokeWebviewProvider implements vscode.WebviewViewProvider {
  private readonly extensionUri: vscode.Uri;

  /**
   * Creates a provider for the smoke webview.
   *
   * @param {vscode.Uri} extensionUri Extension installation URI.
   */
  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  /**
   * Resolves the smoke webview when VS Code reveals the view.
   *
   * @param {vscode.WebviewView} webviewView The webview container provided by VS Code.
   * @returns {Promise<void>} Resolves after loading HTML content.
   */
  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, ...smokeWebviewUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...smokeWebviewDistUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...commonWebviewUiPathSegments),
      ],
    };

    webviewView.webview.html = await this.getHtmlFromFile(webviewView.webview);
  }

  /**
   * Loads static HTML shown in the smoke view from disk.
   *
   * @returns {string} Webview HTML.
   */
  private async getHtmlFromFile(webview: vscode.Webview): Promise<string> {
    const commonCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...commonWebviewCssPathSegments)
    ).toString();

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...smokeWebviewCssPathSegments)
    ).toString();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...smokeWebviewScriptPathSegments)
    ).toString();
  
    const loader = new TemplateLoader({
      COMMON_CSS_URI: commonCssUri,
      CSS_URI: cssUri,
      SCRIPT_URI: scriptUri,
    });

    return await loader.loadFile(this.extensionUri,
      smokeWebviewName, smokeWebviewHtml);
  }
}

export class SmokeView implements vscode.Disposable {
  private webviewProvider : SmokeWebviewProvider | undefined = undefined;
  private webviewRegistration : vscode.Disposable | undefined = undefined;

  public register(extensionUri: vscode.Uri) {
    if (this.webviewRegistration !== undefined) {
      return;
    }

    this.webviewProvider = new SmokeWebviewProvider(extensionUri);
    this.webviewRegistration = vscode.window.registerWebviewViewProvider(
      smokeViewId,
      this.webviewProvider,
    );
  }

  public isRegistered(): boolean {
    return (this.webviewRegistration !== undefined);
  }

  public getProvider(): SmokeWebviewProvider | undefined {
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
