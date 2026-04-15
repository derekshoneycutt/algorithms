const vscode = require("vscode");
const {
  getSidebarRunArgsState,
  setSidebarRunArgsEnabled,
  setSidebarRunArgsText,
  parseSidebarRunArgsText,
} = require("../runtime/sidebarRunArgsState");

const RUN_CONTROLS_VIEW_ID = "algosWorkspaceRunControlsView";

/**
 * Escapes user-provided text for safe HTML interpolation.
 *
 * @param {string} text Raw text value.
 * @returns {string} Escaped HTML-safe text.
 */
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns a nonce for CSP-safe inline scripts.
 *
 * @returns {string} Nonce value.
 */
function createNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";

  for (let index = 0; index < 24; index += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return nonce;
}

/**
 * Builds status metadata for the run-args input.
 *
 * @param {{enabled: boolean, text: string}} runArgsState Current run-args state.
 * @returns {{statusText: string, statusClassName: string}} Status display metadata.
 */
function buildRunArgsStatus(runArgsState) {
  if (!runArgsState.enabled) {
    return {
      statusText: "Arguments Disabled",
      statusClassName: "status-muted",
    };
  }

  const parsedArgs = parseSidebarRunArgsText(runArgsState.text);

  if (!parsedArgs.ok) {
    return {
      statusText: parsedArgs.reason || "Invalid run args",
      statusClassName: "status-error",
    };
  }

  return {
    statusText: `${parsedArgs.tokens.length} Arguments`,
    statusClassName: "status-ok",
  };
}

/**
 * Returns the render snapshot used by the run-controls UI.
 *
 * @returns {{enabled: boolean, text: string, statusText: string, statusClassName: string}} Current UI state snapshot.
 */
function getRunControlsSnapshot() {
  const runArgsState = getSidebarRunArgsState();
  const status = buildRunArgsStatus(runArgsState);

  return {
    enabled: runArgsState.enabled,
    text: runArgsState.text,
    statusText: status.statusText,
    statusClassName: status.statusClassName,
  };
}

/**
 * Builds webview HTML for the run-controls panel.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @returns {string} Rendered HTML.
 */
function buildRunControlsHtml(webview) {
  const stateSnapshot = getRunControlsSnapshot();
  const escapedRunArgsText = escapeHtml(stateSnapshot.text);
  const escapedStatusText = escapeHtml(stateSnapshot.statusText);
  const nonce = createNonce();
  const cspSource = webview.cspSource;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: light dark;
      }

      body {
        margin: 0;
        padding: 6px 8px;
        font-family: var(--vscode-font-family);
        font-size: 11px;
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }

      .controls {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .inputRow {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 6px;
      }

      .toggleRow {
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }

      .toggleLabel {
        font-weight: 500;
      }

      .toggleIcon {
        width: 12px;
        height: 12px;
        display: inline-block;
        color: var(--vscode-foreground);
      }

      .argsInput {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        padding: 3px 6px;
        min-height: 22px;
        font-size: 11px;
      }

      .inputWithClear {
        position: relative;
        display: flex;
        align-items: center;
      }

      .inputWithClear .argsInput {
        padding-right: 22px;
      }

      .argsInput:disabled {
        opacity: 0.65;
      }

      .status {
        min-height: 14px;
        margin-left: 2px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: 10px;
      }

      .status-muted {
        color: var(--vscode-descriptionForeground);
      }

      .status-ok {
        color: var(--vscode-testing-iconPassed);
      }

      .status-error {
        color: var(--vscode-testing-iconFailed);
      }

      .clearInlineButton {
        position: absolute;
        right: 3px;
        width: 16px;
        height: 16px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        line-height: 1;
        padding: 0;
      }

      .clearInlineButton:hover {
        background: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
      }

      .clearInlineButton.hidden {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="controls">
      <div class="inputRow">
        <label class="toggleRow" for="runArgsEnabled">
          <input id="runArgsEnabled" type="checkbox" ${
            stateSnapshot.enabled ? "checked" : ""
          } />
          <span class="toggleLabel" aria-label="Run args enabled">
            <svg class="toggleIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Terminal">
              <path d="M2 3.5C2 2.67 2.67 2 3.5 2H12.5C13.33 2 14 2.67 14 3.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>
              <path d="M4.5 6L6.75 8L4.5 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8.5 10H11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </span>
        </label>

        <div class="inputWithClear">
          <input
            id="runArgsText"
            class="argsInput"
            type="text"
            placeholder="--foo=bar \"hello world\""
            value="${escapedRunArgsText}"
            ${stateSnapshot.enabled ? "" : "disabled"}
          />
          <button id="clearRunArgs" class="clearInlineButton" type="button" aria-label="Clear run args" title="Clear">×</button>
        </div>
      </div>

      <span id="runArgsStatus" class="status ${stateSnapshot.statusClassName}">${escapedStatusText}</span>
    </div>

    <script nonce="${nonce}">
      const vscodeApi = acquireVsCodeApi();
      const runArgsEnabled = document.getElementById("runArgsEnabled");
      const runArgsText = document.getElementById("runArgsText");
      const runArgsStatus = document.getElementById("runArgsStatus");
      const clearRunArgs = document.getElementById("clearRunArgs");
      const statusClasses = ["status-muted", "status-ok", "status-error"];

      function updateClearButtonVisibility() {
        const shouldShow = !runArgsText.disabled && runArgsText.value.length > 0;
        clearRunArgs.classList.toggle("hidden", !shouldShow);
      }

      function applyState(state) {
        const nextState = state || {};
        const isInputFocused = document.activeElement === runArgsText;
        runArgsEnabled.checked = Boolean(nextState.enabled);
        runArgsText.disabled = !Boolean(nextState.enabled);

        if (!isInputFocused && typeof nextState.text === "string") {
          runArgsText.value = nextState.text;
        }

        runArgsStatus.textContent = String(nextState.statusText || "");
        runArgsStatus.classList.remove(...statusClasses);

        if (statusClasses.includes(nextState.statusClassName)) {
          runArgsStatus.classList.add(nextState.statusClassName);
        }

        updateClearButtonVisibility();
      }

      runArgsEnabled.addEventListener("change", () => {
        const enabled = runArgsEnabled.checked;
        runArgsText.disabled = !enabled;
        vscodeApi.postMessage({
          type: "setEnabled",
          enabled,
        });
      });

      runArgsText.addEventListener("input", () => {
        updateClearButtonVisibility();
        vscodeApi.postMessage({
          type: "setText",
          text: runArgsText.value,
        });
      });

      clearRunArgs.addEventListener("click", () => {
        runArgsText.value = "";
        vscodeApi.postMessage({
          type: "setText",
          text: "",
        });

        if (!runArgsText.disabled) {
          runArgsText.focus();
        }

        updateClearButtonVisibility();
      });

      window.addEventListener("message", (event) => {
        const message = event.data;

        if (message?.type !== "runArgsState") {
          return;
        }

        applyState(message.state);
      });

      updateClearButtonVisibility();
    </script>
  </body>
</html>`;
}

/**
 * Provides the webview UI for sidebar run controls.
 */
class SidebarRunControlsViewProvider {
  /**
   * Creates a run-controls view provider.
   */
  constructor() {
    this._view = null;
  }

  /**
   * Handles one webview message from the run-controls UI.
   *
   * @param {{type?: string, enabled?: boolean, text?: string}} message Incoming webview message.
   * @returns {void}
   */
  handleMessage(message) {
    if (message?.type === "setEnabled") {
      setSidebarRunArgsEnabled(Boolean(message.enabled));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setText") {
      setSidebarRunArgsText(String(message.text || ""));
      this.postStateUpdate();
    }
  }

  /**
   * Posts the latest run-controls state to the active webview without rerendering the document.
   *
   * @returns {void}
   */
  postStateUpdate() {
    if (!this._view) {
      return;
    }

    void this._view.webview.postMessage({
      type: "runArgsState",
      state: getRunControlsSnapshot(),
    });
  }

  /**
   * Resolves one run-controls webview instance.
   *
   * @param {import("vscode").WebviewView} webviewView Webview view instance.
   * @returns {void}
   */
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = buildRunControlsHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });

    webviewView.onDidDispose(() => {
      if (this._view === webviewView) {
        this._view = null;
      }
    });
  }

  /**
   * Refreshes the currently visible run-controls webview.
   *
   * @returns {void}
   */
  refresh() {
    if (!this._view) {
      return;
    }

    this._view.webview.html = buildRunControlsHtml(this._view.webview);
  }
}

/**
 * Registers the sidebar run-controls webview.
 *
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerSidebarRunControlsView() {
  const provider = new SidebarRunControlsViewProvider();
  const registration = vscode.window.registerWebviewViewProvider(
    RUN_CONTROLS_VIEW_ID,
    provider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }
  );

  return {
    refresh: () => {
      provider.refresh();
    },
    disposables: [registration],
  };
}

module.exports = {
  registerSidebarRunControlsView,
};
