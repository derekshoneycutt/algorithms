/// <reference lib="dom" />

import { html, render, type TemplateResult } from "lit";
import { Debouncer } from "../../shared/ui/debouncer.mjs";
import { EnvironmentControlsPanelComponent } from "./components/environmentControlsPanelComponent.mjs";
import type { EnvironmentControlsViewState } from "./components/types.mjs";

const appRootId = "environment-webview-app";
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscodeApi = acquireVsCodeApi();
const postUpdateDebouncer = new Debouncer(300);

interface EnvironmentControlsUpdateMessage {
  type: "environment-controls-update";
  state: EnvironmentControlsViewState;
}

interface EnvironmentWebviewReadyMessage {
  type: "environment-webview-ready";
}

interface EnvironmentControlsStateMessage {
  type: "environment-controls-state";
  state: EnvironmentControlsViewState;
}

const initialEnvironmentControlsViewState: EnvironmentControlsViewState = {
  persistSessionEnabled: true,
  profilePath: "",
  profilePlaceholder: "~/.profile",
  effectiveProfilePath: "~/.profile",
  checkEnvFilteredOutput: "No check-environment output yet.",
  checkEnvRawOutput: "No raw output yet.",
  copyIconsPath: "",
  variables: [
    { key: "timeout", label: "TIMEOUT", value: "" },
    { key: "eiffel", label: "EIFFEL", value: "" },
    { key: "gcc13Directory", label: "GCC13_DIRECTORY", value: "" },
    { key: "gcc13Name", label: "GCC13_NAME", value: "" },
    { key: "gxx13Name", label: "GXX13_NAME", value: "" },
  ],
  batchRouting: {
    dockerEnabled: false,
    dockerValue: "",
    sshEnabled: false,
    sshValue: "",
    isConflict: false,
  },
  routingEntries: [],
};

class EnvironmentWebviewApp {
  private readonly environmentControlsViewState: EnvironmentControlsViewState;

  private readonly environmentControlsPanelComponent: EnvironmentControlsPanelComponent;

  private appRootElement: HTMLElement | null;
  private isApplyingStateFromExtension: boolean;

  /**
   * Creates the environment webview app.
   *
   * @returns {void}
   */
  public constructor() {
    this.environmentControlsViewState = {
      ...initialEnvironmentControlsViewState,
      variables: [...initialEnvironmentControlsViewState.variables],
      batchRouting: { ...initialEnvironmentControlsViewState.batchRouting },
      routingEntries: [...initialEnvironmentControlsViewState.routingEntries],
    };

    this.environmentControlsPanelComponent = new EnvironmentControlsPanelComponent(
      this.environmentControlsViewState,
      () => {
        if (!this.isApplyingStateFromExtension) {
          postUpdateDebouncer.schedule(() => {
            const message: EnvironmentControlsUpdateMessage = {
              type: "environment-controls-update",
              state: this.createStateSnapshot(),
            };

            vscodeApi.postMessage(message);
          });
        }

        this.renderEnvironmentControlsView();
      },
    );

    window.addEventListener("message", (event: MessageEvent<EnvironmentControlsStateMessage>) => {
      const message = event.data;
      if (message.type !== "environment-controls-state") {
        return;
      }

      this.applyStateFromExtension(message.state);
      this.renderEnvironmentControlsView();
    });

    this.appRootElement = null;
    this.isApplyingStateFromExtension = false;
  }

  /**
   * Mounts and renders the app into the environment webview root.
   *
   * @returns {void}
   */
  public mount(): void {
    this.appRootElement = document.getElementById(appRootId);
    const readyMessage: EnvironmentWebviewReadyMessage = {
      type: "environment-webview-ready",
    };
    vscodeApi.postMessage(readyMessage);
    this.renderEnvironmentControlsView();
  }

  /**
   * Creates a detached state snapshot safe to post to the extension host.
   *
   * @returns {EnvironmentControlsViewState} Snapshot of current UI state.
   */
  private createStateSnapshot(): EnvironmentControlsViewState {
    return {
      ...this.environmentControlsViewState,
      variables: this.environmentControlsViewState.variables.map((variable) => ({ ...variable })),
      batchRouting: { ...this.environmentControlsViewState.batchRouting },
      routingEntries: this.environmentControlsViewState.routingEntries.map((entry) => ({ ...entry })),
    };
  }

  /**
   * Applies an inbound state payload from the extension host.
   *
   * @param {EnvironmentControlsViewState} inboundState State payload from extension host.
   * @returns {void}
   */
  private applyStateFromExtension(inboundState: EnvironmentControlsViewState): void {
    this.isApplyingStateFromExtension = true;

    this.environmentControlsViewState.persistSessionEnabled = inboundState.persistSessionEnabled;
    this.environmentControlsViewState.profilePath = inboundState.profilePath;
    this.environmentControlsViewState.profilePlaceholder = inboundState.profilePlaceholder;
    this.environmentControlsViewState.effectiveProfilePath = inboundState.effectiveProfilePath;
    this.environmentControlsViewState.checkEnvFilteredOutput = inboundState.checkEnvFilteredOutput;
    this.environmentControlsViewState.checkEnvRawOutput = inboundState.checkEnvRawOutput;
    this.environmentControlsViewState.copyIconsPath = inboundState.copyIconsPath;
    this.environmentControlsViewState.variables = inboundState.variables.map((variable) => ({ ...variable }));
    this.environmentControlsViewState.batchRouting = { ...inboundState.batchRouting };
    this.environmentControlsViewState.routingEntries = inboundState.routingEntries.map((entry) => ({ ...entry }));

    this.isApplyingStateFromExtension = false;
  }

  /**
   * Renders environment controls into the mounted app root.
   *
   * @returns {void}
   */
  private renderEnvironmentControlsView(): void {
    if (this.appRootElement === null) {
      return;
    }

    render(this.renderEnvironmentControlsTemplate(), this.appRootElement);
  }

  /**
   * Renders the environment controls template.
   *
   * @returns {TemplateResult} Environment controls template.
   */
  private renderEnvironmentControlsTemplate(): TemplateResult {
    return html`${this.environmentControlsPanelComponent.render()}`;
  }
}

new EnvironmentWebviewApp().mount();
