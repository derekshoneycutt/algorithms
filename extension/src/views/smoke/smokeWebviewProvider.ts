import * as vscode from "vscode";
import { TemplateLoader } from "../shared/templateLoader";
import { ISmoker, type SmokeControlsPatch, type SmokeControlsState } from "../../smoker";

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
const languageIconsPathSegments = ["icons", "languages"] as const;

/**
 * Minimal webview provider for the smoke sidebar view.
 */
export class SmokeWebviewProvider implements vscode.WebviewViewProvider {
    /**
     * Maps smoke-controls state into a webview-safe shape.
     *
     * @param {vscode.Webview} webview Target webview for URI conversion.
     * @param {SmokeControlsState} state Smoke-controls state from Smoker.
     * @returns {SmokeControlsState} State with icon URIs converted for webview rendering.
     */
    private toWebviewState(webview: vscode.Webview, state: SmokeControlsState): SmokeControlsState {
      return {
        ...state,
        languages: state.languages.map((language) => ({
          ...language,
          iconUri: language.iconUri.length > 0
            ? webview.asWebviewUri(
              vscode.Uri.joinPath(this.extensionUri, ...languageIconsPathSegments, language.iconUri),
            ).toString()
            : "",
        })),
      };
    }

    /**
     * Builds a smoke-controls patch from one inbound webview state payload.
     *
     * @param {unknown} statePayload Raw state payload received from webview.
     * @returns {SmokeControlsPatch | undefined} Patch safe to persist in Smoker.
     */
    private toSmokeControlsPatch(statePayload: unknown): SmokeControlsPatch | undefined {
      if (!statePayload || typeof statePayload !== "object") {
        return undefined;
      }

      const state = statePayload as SmokeControlsState;
      const currentState = this.smoker.getSmokeControlsState();
      const selectedByLanguageKey = new Map(
        (state.languages ?? []).map((language) => [language.languageKey, language.selected]),
      );

      return {
        reportEnabled: state.reportEnabled,
        markdownPath: state.markdownPath,
        timeoutSeconds: state.timeoutSeconds,
        slowTimeoutSeconds: state.slowTimeoutSeconds,
        languages: currentState.languages.map((language) => ({
          ...language,
          selected: selectedByLanguageKey.has(language.languageKey)
            ? !!selectedByLanguageKey.get(language.languageKey)
            : language.selected,
        })),
      };
    }

  private readonly extensionUri: vscode.Uri;
  private readonly smoker: ISmoker;
  private webviewView: vscode.WebviewView | undefined;

  /**
   * Creates a provider for the smoke webview.
   *
   * @param {vscode.Uri} extensionUri Extension installation URI.
   */
  constructor(extensionUri: vscode.Uri, smoker: ISmoker) {
    this.extensionUri = extensionUri;
    this.smoker = smoker;
  }

  /**
   * Resolves the smoke webview when VS Code reveals the view.
   *
   * @param {vscode.WebviewView} webviewView The webview container provided by VS Code.
   * @returns {Promise<void>} Resolves after loading HTML content.
   */
  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, ...smokeWebviewUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...smokeWebviewDistUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...commonWebviewUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...languageIconsPathSegments),
      ],
    };

    webviewView.webview.onDidReceiveMessage((message: { type?: string; state?: unknown }) => {
      if (message.type === "smoke-webview-ready") {
        webviewView.webview.postMessage({
          type: "smoke-controls-state",
          state: this.toWebviewState(webviewView.webview, this.smoker.getSmokeControlsState()),
        });
        return;
      }

      if (message.type !== "smoke-controls-update" || !message.state) {
        return;
      }

      const patch = this.toSmokeControlsPatch(message.state);
      if (!patch) {
        return;
      }

      this.smoker.patchSmokeControls(patch);
    });

    webviewView.onDidDispose(() => {
      if (this.webviewView === webviewView) {
        this.webviewView = undefined;
      }
    });

    webviewView.webview.html = await this.getHtmlFromFile(webviewView.webview);
  }

  /**
   * Pushes one smoke-controls state snapshot into the open webview, if available.
   *
   * @param {unknown} state Current smoke-controls state.
   * @returns {void} No return value.
   */
  public postSmokeControlsState(state: unknown): void {
    if (!this.webviewView) {
      return;
    }

    const typedState = state as SmokeControlsState;

    void this.webviewView.webview.postMessage({
      type: "smoke-controls-state",
      state: this.toWebviewState(this.webviewView.webview, typedState),
    });
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
  private readonly smoker : ISmoker;
  private webviewProvider : SmokeWebviewProvider | undefined = undefined;
  private webviewRegistration : vscode.Disposable | undefined = undefined;
  private stateSubscription : vscode.Disposable | undefined = undefined;

  /**
   * Creates the smoke view manager.
   *
   * @param {ISmoker} smoker Smoker state service.
   */
  public constructor(smoker: ISmoker) {
    this.smoker = smoker;
  }

  public register(extensionUri: vscode.Uri) {
    if (this.webviewRegistration !== undefined) {
      return;
    }

    this.webviewProvider = new SmokeWebviewProvider(extensionUri, this.smoker);
    this.webviewRegistration = vscode.window.registerWebviewViewProvider(
      smokeViewId,
      this.webviewProvider,
    );

    this.stateSubscription = this.smoker.subscribeToStateChanges((state) => {
      this.webviewProvider?.postSmokeControlsState(state);
    });
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
    this.stateSubscription?.dispose();
    this.stateSubscription = undefined;

    if (this.webviewRegistration !== undefined) {
      this.webviewRegistration.dispose();
      this.webviewRegistration = undefined;
    }
    if (this.webviewProvider !== undefined) {
      this.webviewProvider = undefined;
    }
  }
}
