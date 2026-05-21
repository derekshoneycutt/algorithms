/// <reference lib="dom" />

import { html, render, type TemplateResult } from "lit";
import { Debouncer } from "../../shared/ui/debouncer.mjs";
import { SmokeControlsPanelComponent } from "./components/smokeControlsPanelComponent.mjs";
import type { SmokeControlsViewState } from "./components/types.mjs";

const appRootId = "smoke-webview-app";
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscodeApi = acquireVsCodeApi();
const postUpdateDebouncer = new Debouncer(300);

interface SmokeControlsUpdateMessage {
  type: "smoke-controls-update";
  state: SmokeControlsViewState;
}

interface SmokeWebviewReadyMessage {
  type: "smoke-webview-ready";
}

interface SmokeControlsStateMessage {
  type: "smoke-controls-state";
  state: SmokeControlsViewState;
}

const initialSmokeControlsViewState: SmokeControlsViewState = {
  reportEnabled: false,
  markdownPath: "",
  timeoutSeconds: "8m",
  slowTimeoutSeconds: "20m",
  languages: [],
};


class SmokeControlsWebviewApp {
  private readonly smokeControlsViewState: SmokeControlsViewState;

  private readonly smokeControlsPanelComponent: SmokeControlsPanelComponent;

  private appRootElement: HTMLElement | null;

  /**
   * Creates the smoke webview app.
   *
   * @returns {void}
   */
  public constructor() {
    this.smokeControlsViewState = {
      ...initialSmokeControlsViewState,
      languages: [...initialSmokeControlsViewState.languages],
    };

    this.smokeControlsPanelComponent = new SmokeControlsPanelComponent(
      this.smokeControlsViewState,
      () => {
        postUpdateDebouncer.schedule(() => {
          const message: SmokeControlsUpdateMessage = {
            type: "smoke-controls-update",
            state: {
              ...this.smokeControlsViewState,
              languages: [...this.smokeControlsViewState.languages],
            },
          };

          vscodeApi.postMessage(message);
        });
        this.renderSmokeControlsView();
      },
    );

    window.addEventListener("message", (event: MessageEvent<SmokeControlsStateMessage>) => {
      const message = event.data;
      if (message.type !== "smoke-controls-state") {
        return;
      }

      this.smokeControlsViewState.reportEnabled = message.state.reportEnabled;
      this.smokeControlsViewState.markdownPath = message.state.markdownPath;
      this.smokeControlsViewState.timeoutSeconds = message.state.timeoutSeconds;
      this.smokeControlsViewState.slowTimeoutSeconds = message.state.slowTimeoutSeconds;
      this.smokeControlsViewState.languages = [...message.state.languages];
      this.renderSmokeControlsView();
    });

    this.appRootElement = null;
  }

  /**
   * Mounts and renders the app into the smoke webview root.
   *
   * @returns {void}
   */
  public mount(): void {
    this.appRootElement = document.getElementById(appRootId);
    const readyMessage: SmokeWebviewReadyMessage = {
      type: "smoke-webview-ready",
    };
    vscodeApi.postMessage(readyMessage);
    this.renderSmokeControlsView();
  }

  /**
   * Renders smoke controls into the mounted app root.
   *
   * @returns {void}
   */
  private renderSmokeControlsView(): void {
    if (this.appRootElement === null) {
      return;
    }

    render(this.renderSmokeControlsTemplate(), this.appRootElement);
  }

  /**
   * Renders the smoke controls template.
   *
   * @returns {TemplateResult} Smoke controls template.
   */
  private renderSmokeControlsTemplate(): TemplateResult {
    return html`${this.smokeControlsPanelComponent.render()}`;
  }
}

new SmokeControlsWebviewApp().mount();
