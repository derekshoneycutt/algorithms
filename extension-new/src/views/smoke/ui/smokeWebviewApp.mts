/// <reference lib="dom" />

import { html, render, type TemplateResult } from "lit";
import { SmokeControlsPanelComponent } from "./components/smokeControlsPanelComponent.mjs";
import type { SmokeControlsViewState } from "./components/types.mjs";

const appRootId = "smoke-webview-app";

const initialSmokeControlsViewState: SmokeControlsViewState = {
  reportEnabled: false,
  markdownPath: "",
  timeoutSeconds: "",
  slowTimeoutSeconds: "",
  languages: [
    {
      languageKey: "python",
      label: "Python",
      selected: true,
      disabled: false,
      disabledReason: "",
      iconUri: "",
    },
    {
      languageKey: "javascript",
      label: "JavaScript",
      selected: true,
      disabled: false,
      disabledReason: "",
      iconUri: "",
    },
    {
      languageKey: "typescript",
      label: "TypeScript",
      selected: true,
      disabled: false,
      disabledReason: "",
      iconUri: "",
    },
    {
      languageKey: "go",
      label: "Go",
      selected: false,
      disabled: false,
      disabledReason: "",
      iconUri: "",
    },
    {
      languageKey: "rust",
      label: "Rust",
      selected: false,
      disabled: false,
      disabledReason: "",
      iconUri: "",
    },
    {
      languageKey: "java",
      label: "Java",
      selected: false,
      disabled: false,
      disabledReason: "",
      iconUri: "",
    },
  ],
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
        this.renderSmokeControlsView();
      },
    );

    this.appRootElement = null;
  }

  /**
   * Mounts and renders the app into the smoke webview root.
   *
   * @returns {void}
   */
  public mount(): void {
    this.appRootElement = document.getElementById(appRootId);
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
