import * as vscode from "vscode";
import { TemplateLoader } from "../shared/templateLoader";

export const runViewId = "algos.runView";

const runWebviewName = "run";
const runWebviewHtml = "runWebview.html";
const runWebviewCss = "runWebview.css";
const runWebviewScript = "runWebviewApp.js";
const runWebviewUiPathSegments = ["src", "views", runWebviewName, "ui"] as const;
const runWebviewCssPathSegments = [...runWebviewUiPathSegments, runWebviewCss] as const;
const runWebviewDistUiPathSegments = ["dist", "views", runWebviewName, "ui"] as const;
const runWebviewScriptPathSegments =
  [...runWebviewDistUiPathSegments, runWebviewScript] as const;
const commonWebviewUiPathSegments = ["src", "views", "shared", "ui"] as const;
const commonWebviewCssPathSegments =
  [...commonWebviewUiPathSegments, "webviewCommon.css"] as const;

/**
 * Minimal webview provider for the run sidebar view.
 */
export class RunWebviewProvider implements vscode.WebviewViewProvider {
  private readonly extensionUri: vscode.Uri;

  /**
   * Creates a provider for the run webview.
   *
   * @param {vscode.Uri} extensionUri Extension installation URI.
   */
  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  /**
   * Resolves the run webview when VS Code reveals the view.
   *
   * @param {vscode.WebviewView} webviewView The webview container provided by VS Code.
   * @returns {Promise<void>} Resolves after loading HTML content.
   */
  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, ...runWebviewUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...runWebviewDistUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...commonWebviewUiPathSegments),
      ],
    };

    webviewView.webview.html = await this.getHtmlFromFile(webviewView.webview);
  }

  /**
   * Loads static HTML shown in the run view from disk.
   *
   * @returns {string} Webview HTML.
   */
  private async getHtmlFromFile(webview: vscode.Webview): Promise<string> {
    const commonCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...commonWebviewCssPathSegments)
    ).toString();

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...runWebviewCssPathSegments)
    ).toString();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...runWebviewScriptPathSegments)
    ).toString();
    
    const loader = new TemplateLoader({
      COMMON_CSS_URI: commonCssUri,
      CSS_URI: cssUri,
      SCRIPT_URI: scriptUri,
    });

    return await loader.loadFile(this.extensionUri,
      runWebviewName, runWebviewHtml);
  }
}

export class RunView implements vscode.Disposable {
  private webviewProvider : RunWebviewProvider | undefined = undefined;
  private webviewRegistration : vscode.Disposable | undefined = undefined;

  public register(extensionUri: vscode.Uri) {
    if (this.webviewRegistration !== undefined) {
      return;
    }

    this.webviewProvider = new RunWebviewProvider(extensionUri);
    this.webviewRegistration = vscode.window.registerWebviewViewProvider(
      runViewId,
      this.webviewProvider,
    );
  }

  public isRegistered(): boolean {
    return (this.webviewRegistration !== undefined);
  }

  public getProvider(): RunWebviewProvider | undefined {
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
