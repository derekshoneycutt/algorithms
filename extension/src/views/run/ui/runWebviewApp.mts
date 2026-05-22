/// <reference lib="dom" />

import { render } from "lit";

import { Debouncer } from "../../shared/ui/debouncer.mjs";
import { RunControlsPanelComponent } from "./components/runControlsPanelComponent.mjs";
import type { RunControlsViewState } from "./components/types.mjs";

const appRootId = "run-webview-app";
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscodeApi = acquireVsCodeApi();
const postUpdateDebouncer = new Debouncer(300);

interface RunOptionsUpdateMessage {
  type: "run-options-update";
  state: RunControlsViewState;
}

interface RunWebviewReadyMessage {
  type: "run-webview-ready";
}

interface RunOptionsStateMessage {
  type: "run-options-state";
  state: RunControlsViewState;
}

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
      postUpdateDebouncer.schedule(() => {
        const message: RunOptionsUpdateMessage = {
          type: "run-options-update",
          state: { ...this.runControlsViewState },
        };

        vscodeApi.postMessage(message);
      });
      this.render();
    });

    window.addEventListener("message", (event: MessageEvent<RunOptionsStateMessage>) => {
      const message = event.data;
      if (message.type !== "run-options-state") {
        return;
      }

      Object.assign(this.runControlsViewState, message.state);
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
    const readyMessage: RunWebviewReadyMessage = {
      type: "run-webview-ready",
    };
    vscodeApi.postMessage(readyMessage);
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
