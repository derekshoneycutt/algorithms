const vscode = require("vscode");
const {
  getSidebarSmokeControlsState,
  setSidebarSmokeMarkdownEnabled,
  setSidebarSmokeMarkdownPath,
  setSidebarSmokeTimeout,
  setSidebarSmokeSlowTimeout,
  setSidebarSmokeLanguageEnabled,
  setSidebarSmokeAllLanguagesEnabled,
} = require("../runtime/sidebarRunArgsState");

const SMOKE_CONTROLS_VIEW_ID = "algosWorkspaceSmokeControlsView";

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
 * Builds status metadata for smoke-controls language selection.
 *
 * @param {{languages: {key: string, enabled: boolean}[]}} smokeControlsState Current smoke-controls state.
 * @returns {{statusText: string, statusClassName: string}} Status display metadata.
 */
function buildSmokeControlsStatus(smokeControlsState) {
  const selectedCount = smokeControlsState.languages.filter(
    (language) => language.enabled
  ).length;
  const allSelected = selectedCount === smokeControlsState.languages.length;

  if (selectedCount === 0) {
    return {
      statusText: "Select at least one language",
      statusClassName: "status-error",
    };
  }

  if (allSelected) {
    return {
      statusText: "All languages selected (omit --langs)",
      statusClassName: "status-muted",
    };
  }

  return {
    statusText: `${selectedCount} smoke languages selected`,
    statusClassName: "status-ok",
  };
}

/**
 * Returns the render snapshot used by the smoke-controls UI.
 *
 * @returns {{markdownEnabled: boolean, markdownPath: string, timeout: string, slowTimeout: string, languages: {key: string, enabled: boolean}[], smokeStatusText: string, smokeStatusClassName: string}} Current UI state snapshot.
 */
function getSmokeControlsSnapshot() {
  const smokeControlsState = getSidebarSmokeControlsState();
  const smokeControlsStatus = buildSmokeControlsStatus(smokeControlsState);

  return {
    markdownEnabled: smokeControlsState.markdownEnabled,
    markdownPath: smokeControlsState.markdownPath,
    timeout: smokeControlsState.timeout,
    slowTimeout: smokeControlsState.slowTimeout,
    languages: smokeControlsState.languages,
    smokeStatusText: smokeControlsStatus.statusText,
    smokeStatusClassName: smokeControlsStatus.statusClassName,
  };
}

/**
 * Builds webview HTML for the smoke-controls panel.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @returns {string} Rendered HTML.
 */
function buildSmokeControlsHtml(webview) {
  const stateSnapshot = getSmokeControlsSnapshot();
  const escapedMarkdownPath = escapeHtml(stateSnapshot.markdownPath);
  const escapedTimeout = escapeHtml(stateSnapshot.timeout);
  const escapedSlowTimeout = escapeHtml(stateSnapshot.slowTimeout);
  const escapedStatusText = escapeHtml(stateSnapshot.smokeStatusText);
  const languagesGridHtml = stateSnapshot.languages
    .map((language) => {
      return `<label class="smokeLanguageOption" for="smokeLang_${language.key}">
        <input id="smokeLang_${language.key}" type="checkbox" data-smoke-lang="${language.key}" ${
          language.enabled ? "checked" : ""
        } />
        <span>${escapeHtml(language.key)}</span>
      </label>`;
    })
    .join("");
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

      .sectionHeader {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
        margin-left: 2px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--vscode-descriptionForeground);
      }

      .sectionIcon {
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

      .smokeMarkdownRow {
        margin-left: 2px;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px;
        align-items: center;
      }

      .smokeMarkdownLabel {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        white-space: nowrap;
      }

      .smokeTimeoutRow {
        margin-left: 2px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .smokeTimeoutField {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 10px;
      }

      .smokeLangActions {
        margin-left: 2px;
        display: inline-flex;
        gap: 6px;
      }

      .smokeLangButton {
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border-radius: 4px;
        font-size: 10px;
        padding: 2px 6px;
        cursor: pointer;
      }

      .smokeLangButton:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }

      .smokeLanguageGrid {
        margin-left: 2px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 4px 6px;
      }

      .smokeLanguageOption {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <div class="controls">
      <span class="sectionHeader">
        <svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Markdown">
          <path d="M4 2H10L12 4V13C12 13.55 11.55 14 11 14H4C3.45 14 3 13.55 3 13V3C3 2.45 3.45 2 4 2Z" stroke="currentColor" stroke-width="1"/>
          <path d="M10 2V4H12" stroke="currentColor" stroke-width="1"/>
          <path d="M5 7H11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          <path d="M5 9.5H9" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        <span>Markdown</span>
      </span>

      <div class="smokeMarkdownRow">
        <label class="smokeMarkdownLabel" for="smokeMarkdownEnabled">
          <input id="smokeMarkdownEnabled" type="checkbox" ${
            stateSnapshot.markdownEnabled ? "checked" : ""
          } />
          <span>Enable</span>
        </label>
        <input id="smokeMarkdownPath" class="argsInput" type="text" placeholder="Optional report path" value="${escapedMarkdownPath}" ${
          stateSnapshot.markdownEnabled ? "" : "disabled"
        } />
      </div>

      <span class="sectionHeader">
        <svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeouts">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1"/>
          <path d="M8 5V8L10 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Timeouts</span>
      </span>

      <div class="smokeTimeoutRow">
        <label class="smokeTimeoutField" for="smokeTimeout">
          <span>Timeout</span>
          <input id="smokeTimeout" class="argsInput" type="text" placeholder="8m" value="${escapedTimeout}" />
        </label>
        <label class="smokeTimeoutField" for="smokeSlowTimeout">
          <span>Slow Timeout</span>
          <input id="smokeSlowTimeout" class="argsInput" type="text" placeholder="20m" value="${escapedSlowTimeout}" />
        </label>
      </div>

      <span class="sectionHeader">
        <svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Languages">
          <path d="M5 5L2 8L5 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M11 5L14 8L11 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 3L7 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        <span>Languages</span>
      </span>

      <div class="smokeLangActions">
        <button id="smokeSelectAll" class="smokeLangButton" type="button">Select All</button>
        <button id="smokeDeselectAll" class="smokeLangButton" type="button">Deselect All</button>
      </div>

      <div id="smokeLanguageGrid" class="smokeLanguageGrid">${languagesGridHtml}</div>
      <span id="smokeStatus" class="status ${
        stateSnapshot.smokeStatusClassName
      }">${escapedStatusText}</span>
    </div>

    <script nonce="${nonce}">
      const vscodeApi = acquireVsCodeApi();
      const smokeMarkdownEnabled = document.getElementById("smokeMarkdownEnabled");
      const smokeMarkdownPath = document.getElementById("smokeMarkdownPath");
      const smokeTimeout = document.getElementById("smokeTimeout");
      const smokeSlowTimeout = document.getElementById("smokeSlowTimeout");
      const smokeSelectAll = document.getElementById("smokeSelectAll");
      const smokeDeselectAll = document.getElementById("smokeDeselectAll");
      const smokeStatus = document.getElementById("smokeStatus");
      const smokeLanguageCheckboxes = Array.from(document.querySelectorAll("input[data-smoke-lang]"));
      const statusClasses = ["status-muted", "status-ok", "status-error"];

      function updateSmokeMarkdownInteractivity() {
        smokeMarkdownPath.disabled = !smokeMarkdownEnabled.checked;
      }

      function applyState(state) {
        const nextState = state || {};
        smokeMarkdownEnabled.checked = Boolean(nextState.markdownEnabled);
        updateSmokeMarkdownInteractivity();

        if (typeof nextState.markdownPath === "string" && document.activeElement !== smokeMarkdownPath) {
          smokeMarkdownPath.value = nextState.markdownPath;
        }

        if (typeof nextState.timeout === "string" && document.activeElement !== smokeTimeout) {
          smokeTimeout.value = nextState.timeout;
        }

        if (typeof nextState.slowTimeout === "string" && document.activeElement !== smokeSlowTimeout) {
          smokeSlowTimeout.value = nextState.slowTimeout;
        }

        if (Array.isArray(nextState.languages)) {
          const nextEnabledByKey = new Map(
            nextState.languages.map((language) => [String(language.key || ""), Boolean(language.enabled)])
          );

          for (const checkbox of smokeLanguageCheckboxes) {
            const languageKey = checkbox.getAttribute("data-smoke-lang") || "";
            checkbox.checked = nextEnabledByKey.get(languageKey) === true;
          }
        }

        smokeStatus.textContent = String(nextState.smokeStatusText || "");
        smokeStatus.classList.remove(...statusClasses);

        if (statusClasses.includes(nextState.smokeStatusClassName)) {
          smokeStatus.classList.add(nextState.smokeStatusClassName);
        }
      }

      smokeMarkdownEnabled.addEventListener("change", () => {
        updateSmokeMarkdownInteractivity();
        vscodeApi.postMessage({
          type: "setSmokeMarkdownEnabled",
          enabled: smokeMarkdownEnabled.checked,
        });
      });

      smokeMarkdownPath.addEventListener("input", () => {
        vscodeApi.postMessage({
          type: "setSmokeMarkdownPath",
          text: smokeMarkdownPath.value,
        });
      });

      smokeTimeout.addEventListener("input", () => {
        vscodeApi.postMessage({
          type: "setSmokeTimeout",
          text: smokeTimeout.value,
        });
      });

      smokeSlowTimeout.addEventListener("input", () => {
        vscodeApi.postMessage({
          type: "setSmokeSlowTimeout",
          text: smokeSlowTimeout.value,
        });
      });

      for (const checkbox of smokeLanguageCheckboxes) {
        checkbox.addEventListener("change", () => {
          vscodeApi.postMessage({
            type: "setSmokeLanguageEnabled",
            languageKey: checkbox.getAttribute("data-smoke-lang"),
            enabled: checkbox.checked,
          });
        });
      }

      smokeSelectAll.addEventListener("click", () => {
        vscodeApi.postMessage({
          type: "setSmokeAllLanguagesEnabled",
          enabled: true,
        });
      });

      smokeDeselectAll.addEventListener("click", () => {
        vscodeApi.postMessage({
          type: "setSmokeAllLanguagesEnabled",
          enabled: false,
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;

        if (message?.type !== "smokeControlsState") {
          return;
        }

        applyState(message.state);
      });

      updateSmokeMarkdownInteractivity();
    </script>
  </body>
</html>`;
}

/**
 * Provides the webview UI for sidebar smoke controls.
 */
class SidebarSmokeControlsViewProvider {
  /**
   * Creates a smoke-controls view provider.
   */
  constructor() {
    this._view = null;
  }

  /**
   * Handles one webview message from the smoke-controls UI.
   *
   * @param {{type?: string, enabled?: boolean, text?: string, languageKey?: string}} message Incoming webview message.
   * @returns {void}
   */
  handleMessage(message) {
    if (message?.type === "setSmokeMarkdownEnabled") {
      setSidebarSmokeMarkdownEnabled(Boolean(message.enabled));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setSmokeMarkdownPath") {
      setSidebarSmokeMarkdownPath(String(message.text || ""));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setSmokeTimeout") {
      setSidebarSmokeTimeout(String(message.text || ""));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setSmokeSlowTimeout") {
      setSidebarSmokeSlowTimeout(String(message.text || ""));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setSmokeLanguageEnabled") {
      setSidebarSmokeLanguageEnabled(String(message.languageKey || ""), Boolean(message.enabled));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setSmokeAllLanguagesEnabled") {
      setSidebarSmokeAllLanguagesEnabled(Boolean(message.enabled));
      this.postStateUpdate();
    }
  }

  /**
   * Posts the latest smoke-controls state to the active webview without rerendering the document.
   *
   * @returns {void}
   */
  postStateUpdate() {
    if (!this._view) {
      return;
    }

    void this._view.webview.postMessage({
      type: "smokeControlsState",
      state: getSmokeControlsSnapshot(),
    });
  }

  /**
   * Resolves one smoke-controls webview instance.
   *
   * @param {import("vscode").WebviewView} webviewView Webview view instance.
   * @returns {void}
   */
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = buildSmokeControlsHtml(webviewView.webview);

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
   * Refreshes the currently visible smoke-controls webview.
   *
   * @returns {void}
   */
  refresh() {
    if (!this._view) {
      return;
    }

    this._view.webview.html = buildSmokeControlsHtml(this._view.webview);
  }
}

/**
 * Registers the sidebar smoke-controls webview.
 *
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerSidebarSmokeControlsView() {
  const provider = new SidebarSmokeControlsViewProvider();
  const registration = vscode.window.registerWebviewViewProvider(
    SMOKE_CONTROLS_VIEW_ID,
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
  registerSidebarSmokeControlsView,
};
