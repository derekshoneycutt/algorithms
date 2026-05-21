/// <reference lib="dom" />

import { render } from "lit";

import { RunControlsPanelComponent } from "./components/runControlsPanelComponent.mjs";
import type { RunControlsViewState } from "./components/types.mjs";

const appRootId = "run-webview-app";

const initialRunControlsViewState: RunControlsViewState = {
  runArgsEnabled: false,
  runArgsText: "",
  sourceProfileEnabled: false,
  sourceProfileText: "",
  runChecksMode: "none",
  runChecksRoute: "native",
  cleanStdlibEnabled: true,
  cleanArchivesEnabled: true,
};

/**
 * Main run-controls app component that mounts and renders composed sections.
 */
class RunControlsWebviewApp {
  private readonly runControlsViewState: RunControlsViewState;

  private readonly panelComponent: RunControlsPanelComponent;

  private appRootElement: HTMLElement | null = null;

  constructor() {
    this.runControlsViewState = { ...initialRunControlsViewState };
    this.panelComponent = new RunControlsPanelComponent(this.runControlsViewState, () => {
      this.render();
    });
  }

  /**
   * Mounts the run controls app into the webview root element.
   *
   * @returns {void}
   */
  public mount(): void {
    this.appRootElement = document.getElementById(appRootId);
    this.render();
  }

  /**
   * Renders the composed run-controls panel into the mounted root.
   *
   * @returns {void}
   */
  private render(): void {
    if (this.appRootElement === null) {
      return;
    }

    render(this.panelComponent.render(), this.appRootElement);
  }
}

new RunControlsWebviewApp().mount();
