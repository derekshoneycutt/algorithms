import * as vscode from "vscode";
import { TemplateLoader } from "../shared/templateLoader";
import { IEnvironment, type EnvironmentControlsPatch, type EnvironmentControlsState } from "../../environment";

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
  private readonly environment: IEnvironment;
  private webviewView: vscode.WebviewView | undefined;

  /**
   * Converts an inbound webview state payload into a safe actor patch.
   *
   * The Environment actor remains authoritative for language metadata
   * (`languageKey`, `label`, `iconUri`) while the webview can only mutate
   * editable routing values.
   *
   * @param {unknown} statePayload Raw state payload from the webview.
   * @returns {EnvironmentControlsPatch | undefined} Sanitized patch, when valid.
   */
  private toEnvironmentControlsPatch(statePayload: unknown): EnvironmentControlsPatch | undefined {
    if (!statePayload || typeof statePayload !== "object") {
      return undefined;
    }

    const inboundState = statePayload as Partial<EnvironmentControlsState>;
    const currentState = this.environment.getEnvironmentControlsState();
    const inboundRoutingByKey = new Map(
      (inboundState.routingEntries ?? []).map((entry) => [entry.languageKey, entry]),
    );

    const routingEntries = currentState.routingEntries.map((entry) => {
      const inboundEntry = inboundRoutingByKey.get(entry.languageKey);
      const dockerEnabled = inboundEntry?.dockerEnabled ?? entry.dockerEnabled;
      const dockerValue = inboundEntry?.dockerValue ?? entry.dockerValue;
      const sshEnabled = inboundEntry?.sshEnabled ?? entry.sshEnabled;
      const sshValue = inboundEntry?.sshValue ?? entry.sshValue;

      return {
        ...entry,
        dockerEnabled,
        dockerValue,
        sshEnabled,
        sshValue,
        isConflict: dockerEnabled && sshEnabled,
      };
    });

    const batchRoutingDockerEnabled = inboundState.batchRouting?.dockerEnabled ?? currentState.batchRouting.dockerEnabled;
    const batchRoutingSshEnabled = inboundState.batchRouting?.sshEnabled ?? currentState.batchRouting.sshEnabled;

    return {
      persistSessionEnabled: inboundState.persistSessionEnabled ?? currentState.persistSessionEnabled,
      profilePath: inboundState.profilePath ?? currentState.profilePath,
      profilePlaceholder: inboundState.profilePlaceholder ?? currentState.profilePlaceholder,
      effectiveProfilePath: inboundState.effectiveProfilePath ?? currentState.effectiveProfilePath,
      checkEnvFilteredOutput: inboundState.checkEnvFilteredOutput ?? currentState.checkEnvFilteredOutput,
      checkEnvRawOutput: inboundState.checkEnvRawOutput ?? currentState.checkEnvRawOutput,
      copyIconsPath: inboundState.copyIconsPath ?? currentState.copyIconsPath,
      variables: inboundState.variables ?? currentState.variables,
      batchRouting: {
        dockerEnabled: batchRoutingDockerEnabled,
        dockerValue: inboundState.batchRouting?.dockerValue ?? currentState.batchRouting.dockerValue,
        sshEnabled: batchRoutingSshEnabled,
        sshValue: inboundState.batchRouting?.sshValue ?? currentState.batchRouting.sshValue,
        isConflict: batchRoutingDockerEnabled && batchRoutingSshEnabled,
      },
      routingEntries,
    };
  }

  /**
   * Creates a provider for the environment webview.
   *
   * @param {vscode.Uri} extensionUri Extension installation URI.
   */
  constructor(extensionUri: vscode.Uri, environment: IEnvironment) {
    this.extensionUri = extensionUri;
    this.environment = environment;
    this.webviewView = undefined;
  }

  /**
   * Resolves the environment webview when VS Code reveals the view.
   *
   * @param {vscode.WebviewView} webviewView The webview container provided by VS Code.
   * @returns {Promise<void>} Resolves after loading HTML content.
   */
  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, ...environmentWebviewUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...environmentWebviewDistUiPathSegments),
        vscode.Uri.joinPath(this.extensionUri, ...commonWebviewUiPathSegments),
      ],
    };

    webviewView.webview.onDidReceiveMessage((message: { type?: string; state?: unknown }) => {
      if (message.type === "environment-webview-ready") {
        webviewView.webview.postMessage({
          type: "environment-controls-state",
          state: this.environment.getEnvironmentControlsState(),
        });
        return;
      }

      if (message.type !== "environment-controls-update" || !message.state) {
        return;
      }

      const patch = this.toEnvironmentControlsPatch(message.state);
      if (!patch) {
        return;
      }

      this.environment.patchEnvironmentControls(patch);
    });

    webviewView.onDidDispose(() => {
      if (this.webviewView === webviewView) {
        this.webviewView = undefined;
      }
    });

    webviewView.webview.html = await this.getHtmlFromFile(webviewView.webview);
  }

  /**
   * Pushes one environment-controls state snapshot into the open webview, if available.
   *
   * @param {EnvironmentControlsState} state Current environment-controls state.
   * @returns {void} No return value.
   */
  public postEnvironmentControlsState(state: EnvironmentControlsState): void {
    if (!this.webviewView) {
      return;
    }

    void this.webviewView.webview.postMessage({
      type: "environment-controls-state",
      state,
    });
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
  private readonly environment: IEnvironment;
  private webviewProvider : EnvironmentWebviewProvider | undefined = undefined;
  private webviewRegistration : vscode.Disposable | undefined = undefined;
  private stateSubscription: vscode.Disposable | undefined = undefined;

  /**
   * Creates the environment view manager.
   *
   * @param {IEnvironment} environment Environment state service.
   */
  public constructor(environment: IEnvironment) {
    this.environment = environment;
  }

  public register(extensionUri: vscode.Uri) {
    if (this.webviewRegistration !== undefined) {
      return;
    }

    this.webviewProvider = new EnvironmentWebviewProvider(extensionUri, this.environment);
    this.webviewRegistration = vscode.window.registerWebviewViewProvider(
      environmentViewId,
      this.webviewProvider,
    );

    this.stateSubscription = this.environment.subscribeToStateChanges((state) => {
      this.webviewProvider?.postEnvironmentControlsState(state);
    });
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
