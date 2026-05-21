/// <reference lib="dom" />

import { html, render, type TemplateResult } from "lit";
import { EnvironmentControlsPanelComponent } from "./components/environmentControlsPanelComponent.mjs";
import type { EnvironmentControlsViewState } from "./components/types.mjs";

const appRootId = "environment-webview-app";

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
  routingEntries: [
    {
      languageKey: "python",
      label: "Python",
      iconUri: "",
      dockerEnabled: false,
      dockerValue: "",
      sshEnabled: false,
      sshValue: "",
      isConflict: false,
    },
    {
      languageKey: "javascript",
      label: "JavaScript",
      iconUri: "",
      dockerEnabled: false,
      dockerValue: "",
      sshEnabled: false,
      sshValue: "",
      isConflict: false,
    },
    {
      languageKey: "go",
      label: "Go",
      iconUri: "",
      dockerEnabled: false,
      dockerValue: "",
      sshEnabled: false,
      sshValue: "",
      isConflict: false,
    },
  ],
};

class EnvironmentWebviewApp {
  private readonly environmentControlsViewState: EnvironmentControlsViewState;

  private readonly environmentControlsPanelComponent: EnvironmentControlsPanelComponent;

  private appRootElement: HTMLElement | null;

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
        this.renderEnvironmentControlsView();
      },
    );

    this.appRootElement = null;
  }

  /**
   * Mounts and renders the app into the environment webview root.
   *
   * @returns {void}
   */
  public mount(): void {
    this.appRootElement = document.getElementById(appRootId);
    this.renderEnvironmentControlsView();
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
