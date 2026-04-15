const vscode = require("vscode");
const {
  getSidebarRunArgsState,
  setSidebarRunArgsEnabled,
  setSidebarRunArgsText,
  getSidebarSourceProfileState,
  setSidebarSourceProfileEnabled,
  setSidebarSourceProfileText,
  getSidebarRunChecksState,
  setSidebarRunChecksMode,
  setSidebarRunChecksRoute,
  getSidebarCleanOptionsState,
  setSidebarCleanStdlibEnabled,
  setSidebarCleanArchivesEnabled,
  getSidebarSmokeControlsState,
  setSidebarSmokeMarkdownEnabled,
  setSidebarSmokeMarkdownPath,
  setSidebarSmokeTimeout,
  setSidebarSmokeSlowTimeout,
  setSidebarSmokeLanguageEnabled,
  setSidebarSmokeAllLanguagesEnabled,
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
 * Builds status metadata for the source-profile input.
 *
 * @param {{enabled: boolean, text: string}} sourceProfileState Current source-profile state.
 * @returns {{statusText: string, statusClassName: string}} Status display metadata.
 */
function buildSourceProfileStatus(sourceProfileState) {
  if (!sourceProfileState.enabled) {
    return {
      statusText: "Source Profile Unchecked",
      statusClassName: "status-muted",
    };
  }

  if (!String(sourceProfileState.text || "").trim()) {
    return {
      statusText: "Checked and empty: emits --source-profile=",
      statusClassName: "status-ok",
    };
  }

  return {
    statusText: "Source Profile Enabled",
    statusClassName: "status-ok",
  };
}

/**
 * Builds status metadata for the run-checks controls.
 *
 * @param {{mode: "none"|"check-only"|"compile-only", route: "native"|"docker"|"ssh"}} runChecksState Current run-checks state.
 * @returns {{statusText: string, statusClassName: string}} Status display metadata.
 */
function buildRunChecksStatus(runChecksState) {
  if (runChecksState.mode === "compile-only") {
    return {
      statusText: "Compile Only Enabled",
      statusClassName: "status-ok",
    };
  }

  if (runChecksState.mode === "check-only") {
    return {
      statusText: `Check Only (${runChecksState.route}) Enabled`,
      statusClassName: "status-ok",
    };
  }

  return {
    statusText: "No Run Check Override",
    statusClassName: "status-muted",
  };
}

/**
 * Builds status metadata for clean-options controls.
 *
 * @param {{cleanStdlib: boolean, cleanArchives: boolean}} cleanOptionsState Current clean-options state.
 * @returns {{statusText: string, statusClassName: string}} Status display metadata.
 */
function buildCleanOptionsStatus(cleanOptionsState) {
  const stdlibDefault = cleanOptionsState.cleanStdlib ? "y" : "n";
  const archiveDefault = cleanOptionsState.cleanArchives ? "y" : "n";

  return {
    statusText: `Defaults: ${stdlibDefault}|${archiveDefault} (stdlib|archive)`,
    statusClassName: "status-muted",
  };
}

/**
 * Builds status metadata for smoke-controls settings.
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
 * Returns the render snapshot used by the run-controls UI.
 *
 * @returns {{enabled: boolean, text: string, statusText: string, statusClassName: string, sourceProfileEnabled: boolean, sourceProfileText: string, sourceProfileStatusText: string, sourceProfileStatusClassName: string, runChecksMode: "none"|"check-only"|"compile-only", runChecksRoute: "native"|"docker"|"ssh", runChecksStatusText: string, runChecksStatusClassName: string, cleanStdlib: boolean, cleanArchives: boolean, cleanOptionsStatusText: string, cleanOptionsStatusClassName: string, smokeMarkdownEnabled: boolean, smokeMarkdownPath: string, smokeTimeout: string, smokeSlowTimeout: string, smokeLanguages: {key: string, enabled: boolean}[], smokeStatusText: string, smokeStatusClassName: string}} Current UI state snapshot.
 */
function getRunControlsSnapshot() {
  const runArgsState = getSidebarRunArgsState();
  const runArgsStatus = buildRunArgsStatus(runArgsState);
  const sourceProfileState = getSidebarSourceProfileState();
  const sourceProfileStatus = buildSourceProfileStatus(sourceProfileState);
  const runChecksState = getSidebarRunChecksState();
  const runChecksStatus = buildRunChecksStatus(runChecksState);
  const cleanOptionsState = getSidebarCleanOptionsState();
  const cleanOptionsStatus = buildCleanOptionsStatus(cleanOptionsState);
  const smokeControlsState = getSidebarSmokeControlsState();
  const smokeControlsStatus = buildSmokeControlsStatus(smokeControlsState);

  return {
    enabled: runArgsState.enabled,
    text: runArgsState.text,
    statusText: runArgsStatus.statusText,
    statusClassName: runArgsStatus.statusClassName,
    sourceProfileEnabled: sourceProfileState.enabled,
    sourceProfileText: sourceProfileState.text,
    sourceProfileStatusText: sourceProfileStatus.statusText,
    sourceProfileStatusClassName: sourceProfileStatus.statusClassName,
    runChecksMode: runChecksState.mode,
    runChecksRoute: runChecksState.route,
    runChecksStatusText: runChecksStatus.statusText,
    runChecksStatusClassName: runChecksStatus.statusClassName,
    cleanStdlib: cleanOptionsState.cleanStdlib,
    cleanArchives: cleanOptionsState.cleanArchives,
    cleanOptionsStatusText: cleanOptionsStatus.statusText,
    cleanOptionsStatusClassName: cleanOptionsStatus.statusClassName,
    smokeMarkdownEnabled: smokeControlsState.markdownEnabled,
    smokeMarkdownPath: smokeControlsState.markdownPath,
    smokeTimeout: smokeControlsState.timeout,
    smokeSlowTimeout: smokeControlsState.slowTimeout,
    smokeLanguages: smokeControlsState.languages,
    smokeStatusText: smokeControlsStatus.statusText,
    smokeStatusClassName: smokeControlsStatus.statusClassName,
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
  const escapedSourceProfileText = escapeHtml(stateSnapshot.sourceProfileText);
  const escapedStatusText = escapeHtml(stateSnapshot.statusText);
  const escapedSourceProfileStatusText = escapeHtml(
    stateSnapshot.sourceProfileStatusText
  );
  const escapedRunChecksStatusText = escapeHtml(stateSnapshot.runChecksStatusText);
  const escapedCleanOptionsStatusText = escapeHtml(
    stateSnapshot.cleanOptionsStatusText
  );
  const escapedSmokeMarkdownPath = escapeHtml(stateSnapshot.smokeMarkdownPath);
  const escapedSmokeTimeout = escapeHtml(stateSnapshot.smokeTimeout);
  const escapedSmokeSlowTimeout = escapeHtml(stateSnapshot.smokeSlowTimeout);
  const escapedSmokeStatusText = escapeHtml(stateSnapshot.smokeStatusText);
  const smokeLanguagesGridHtml = stateSnapshot.smokeLanguages
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

      .inputRow {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 6px;
      }

      .toggleRow {
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
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

      .helperText {
        margin-left: 2px;
        color: var(--vscode-descriptionForeground);
        font-size: 10px;
        line-height: 1.2;
      }

      .runChecksRow {
        margin-left: 2px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .runChecksOption {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 10px;
        color: var(--vscode-foreground);
      }

      .runChecksSelect {
        min-height: 22px;
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        padding: 1px 4px;
        font-size: 10px;
      }

      .runChecksSelect:disabled {
        opacity: 0.65;
      }

      .cleanOptionsRow {
        margin-left: 2px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
      }

      .smokeMarkdownRow {
        margin-left: 2px;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px;
        align-items: center;
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
      <span class="sectionHeader">
        <svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Terminal">
          <path d="M2 3.5C2 2.67 2.67 2 3.5 2H12.5C13.33 2 14 2.67 14 3.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>
          <path d="M4.5 6L6.75 8L4.5 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8.5 10H11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        <span>Command Arguments</span>
      </span>

      <div class="inputRow">
        <label class="toggleRow" for="runArgsEnabled">
          <input id="runArgsEnabled" type="checkbox" aria-label="Enable command arguments" ${
            stateSnapshot.enabled ? "checked" : ""
          } />
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

      <span class="sectionHeader">
        <svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Run Checks">
          <path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>
          <path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Run Checks</span>
      </span>

      <div class="runChecksRow">
        <label class="runChecksOption" for="runChecksModeNone">
          <input id="runChecksModeNone" name="runChecksMode" type="radio" value="none" ${
            stateSnapshot.runChecksMode === "none" ? "checked" : ""
          } />
          <span>None</span>
        </label>
        <label class="runChecksOption" for="runChecksModeCompileOnly">
          <input id="runChecksModeCompileOnly" name="runChecksMode" type="radio" value="compile-only" ${
            stateSnapshot.runChecksMode === "compile-only" ? "checked" : ""
          } />
          <span>Compile Only</span>
        </label>
        <label class="runChecksOption" for="runChecksModeCheckOnly">
          <input id="runChecksModeCheckOnly" name="runChecksMode" type="radio" value="check-only" ${
            stateSnapshot.runChecksMode === "check-only" ? "checked" : ""
          } />
          <span>Check Only</span>
        </label>
        <select id="runChecksRoute" class="runChecksSelect" aria-label="Check-only route" ${
          stateSnapshot.runChecksMode === "check-only" ? "" : "disabled"
        }>
          <option value="native" ${
            stateSnapshot.runChecksRoute === "native" ? "selected" : ""
          }>Native</option>
          <option value="docker" ${
            stateSnapshot.runChecksRoute === "docker" ? "selected" : ""
          }>Docker</option>
          <option value="ssh" ${
            stateSnapshot.runChecksRoute === "ssh" ? "selected" : ""
          }>SSH</option>
        </select>
      </div>
      <span id="runChecksStatus" class="status ${
        stateSnapshot.runChecksStatusClassName
      }">${escapedRunChecksStatusText}</span>

      <span class="sectionHeader">
        <svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Profile Sourcing">
          <path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>
          <path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
          <path d="M11.75 4.25L12.5 5L14 3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Profile Sourcing</span>
      </span>

      <div class="inputRow">
        <label class="toggleRow" for="sourceProfileEnabled">
          <input id="sourceProfileEnabled" type="checkbox" aria-label="Enable profile sourcing override" ${
            stateSnapshot.sourceProfileEnabled ? "checked" : ""
          } />
        </label>

        <div class="inputWithClear">
          <input
            id="sourceProfileText"
            class="argsInput"
            type="text"
            placeholder="profile/path/or/name"
            value="${escapedSourceProfileText}"
            ${stateSnapshot.sourceProfileEnabled ? "" : "disabled"}
          />
          <button id="clearSourceProfile" class="clearInlineButton" type="button" aria-label="Clear source profile" title="Clear">×</button>
        </div>
      </div>

      <span id="sourceProfileStatus" class="status ${
        stateSnapshot.sourceProfileStatusClassName
      }">${escapedSourceProfileStatusText}</span>
      <span class="helperText">If checked and empty, profile sourcing is disabled entirely. If unchecked, system default profile sourcing behavior is used.</span>

      <span class="sectionHeader">
        <svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Clean Options">
          <path d="M4 4.5C4 3.67 4.67 3 5.5 3H10.5C11.33 3 12 3.67 12 4.5V5.5H4V4.5Z" stroke="currentColor" stroke-width="1"/>
          <path d="M3.5 5.5H12.5" stroke="currentColor" stroke-width="1"/>
          <path d="M5 5.5V12C5 12.55 5.45 13 6 13H10C10.55 13 11 12.55 11 12V5.5" stroke="currentColor" stroke-width="1"/>
          <path d="M7 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          <path d="M9 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        <span>Clean Options</span>
      </span>

      <label class="cleanOptionsRow" for="cleanStdlibEnabled">
        <input id="cleanStdlibEnabled" type="checkbox" ${
          stateSnapshot.cleanStdlib ? "checked" : ""
        } />
        <span>Clean Standard Library</span>
      </label>

      <label class="cleanOptionsRow" for="cleanArchivesEnabled">
        <input id="cleanArchivesEnabled" type="checkbox" ${
          stateSnapshot.cleanArchives ? "checked" : ""
        } />
        <span>Clean Archives</span>
      </label>

      <span id="cleanOptionsStatus" class="status ${
        stateSnapshot.cleanOptionsStatusClassName
      }">${escapedCleanOptionsStatusText}</span>

      <span class="sectionHeader">
        <svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Smoke Controls">
          <path d="M8 2.5C9.38 2.5 10.5 3.62 10.5 5C10.5 5.76 10.16 6.45 9.63 6.91L12 9.28V10H4V9.28L6.37 6.91C5.84 6.45 5.5 5.76 5.5 5C5.5 3.62 6.62 2.5 8 2.5Z" stroke="currentColor" stroke-width="1"/>
          <path d="M5 10V12.5C5 13.05 5.45 13.5 6 13.5H10C10.55 13.5 11 13.05 11 12.5V10" stroke="currentColor" stroke-width="1"/>
        </svg>
        <span>Smoke Controls</span>
      </span>

      <div class="smokeMarkdownRow">
        <label class="cleanOptionsRow" for="smokeMarkdownEnabled">
          <input id="smokeMarkdownEnabled" type="checkbox" ${
            stateSnapshot.smokeMarkdownEnabled ? "checked" : ""
          } />
          <span>Markdown</span>
        </label>
        <input id="smokeMarkdownPath" class="argsInput" type="text" placeholder="Optional report path" value="${escapedSmokeMarkdownPath}" ${
          stateSnapshot.smokeMarkdownEnabled ? "" : "disabled"
        } />
      </div>

      <div class="smokeTimeoutRow">
        <label class="smokeTimeoutField" for="smokeTimeout">
          <span>Timeout</span>
          <input id="smokeTimeout" class="argsInput" type="text" placeholder="8m" value="${escapedSmokeTimeout}" />
        </label>
        <label class="smokeTimeoutField" for="smokeSlowTimeout">
          <span>Slow Timeout</span>
          <input id="smokeSlowTimeout" class="argsInput" type="text" placeholder="20m" value="${escapedSmokeSlowTimeout}" />
        </label>
      </div>

      <div class="smokeLangActions">
        <button id="smokeSelectAll" class="smokeLangButton" type="button">Select All</button>
        <button id="smokeDeselectAll" class="smokeLangButton" type="button">Deselect All</button>
      </div>

      <div id="smokeLanguageGrid" class="smokeLanguageGrid">${smokeLanguagesGridHtml}</div>
      <span id="smokeStatus" class="status ${
        stateSnapshot.smokeStatusClassName
      }">${escapedSmokeStatusText}</span>
    </div>

    <script nonce="${nonce}">
      const vscodeApi = acquireVsCodeApi();
      const runArgsEnabled = document.getElementById("runArgsEnabled");
      const runArgsText = document.getElementById("runArgsText");
      const runArgsStatus = document.getElementById("runArgsStatus");
      const clearRunArgs = document.getElementById("clearRunArgs");
      const sourceProfileEnabled = document.getElementById("sourceProfileEnabled");
      const sourceProfileText = document.getElementById("sourceProfileText");
      const sourceProfileStatus = document.getElementById("sourceProfileStatus");
      const clearSourceProfile = document.getElementById("clearSourceProfile");
      const runChecksModeNone = document.getElementById("runChecksModeNone");
      const runChecksModeCheckOnly = document.getElementById("runChecksModeCheckOnly");
      const runChecksModeCompileOnly = document.getElementById("runChecksModeCompileOnly");
      const runChecksRoute = document.getElementById("runChecksRoute");
      const runChecksStatus = document.getElementById("runChecksStatus");
      const cleanStdlibEnabled = document.getElementById("cleanStdlibEnabled");
      const cleanArchivesEnabled = document.getElementById("cleanArchivesEnabled");
      const cleanOptionsStatus = document.getElementById("cleanOptionsStatus");
      const smokeMarkdownEnabled = document.getElementById("smokeMarkdownEnabled");
      const smokeMarkdownPath = document.getElementById("smokeMarkdownPath");
      const smokeTimeout = document.getElementById("smokeTimeout");
      const smokeSlowTimeout = document.getElementById("smokeSlowTimeout");
      const smokeSelectAll = document.getElementById("smokeSelectAll");
      const smokeDeselectAll = document.getElementById("smokeDeselectAll");
      const smokeStatus = document.getElementById("smokeStatus");
      const smokeLanguageCheckboxes = Array.from(document.querySelectorAll("input[data-smoke-lang]"));
      const statusClasses = ["status-muted", "status-ok", "status-error"];

      function getSelectedRunChecksMode() {
        if (runChecksModeCheckOnly.checked) {
          return "check-only";
        }

        if (runChecksModeCompileOnly.checked) {
          return "compile-only";
        }

        return "none";
      }

      function updateRunChecksRouteInteractivity() {
        runChecksRoute.disabled = getSelectedRunChecksMode() !== "check-only";
      }

      function updateRunArgsClearButtonVisibility() {
        const shouldShow = !runArgsText.disabled && runArgsText.value.length > 0;
        clearRunArgs.classList.toggle("hidden", !shouldShow);
      }

      function updateSourceProfileClearButtonVisibility() {
        const shouldShow = !sourceProfileText.disabled && sourceProfileText.value.length > 0;
        clearSourceProfile.classList.toggle("hidden", !shouldShow);
      }

      function updateSmokeMarkdownInteractivity() {
        smokeMarkdownPath.disabled = !smokeMarkdownEnabled.checked;
      }

      function applyState(state) {
        const nextState = state || {};
        const activeElement = document.activeElement;
        const isRunArgsFocused = activeElement === runArgsText;
        const isSourceProfileFocused = activeElement === sourceProfileText;
        runArgsEnabled.checked = Boolean(nextState.enabled);
        runArgsText.disabled = !Boolean(nextState.enabled);
        sourceProfileEnabled.checked = Boolean(nextState.sourceProfileEnabled);
        sourceProfileText.disabled = !Boolean(nextState.sourceProfileEnabled);
        cleanStdlibEnabled.checked = Boolean(nextState.cleanStdlib);
        cleanArchivesEnabled.checked = Boolean(nextState.cleanArchives);
        smokeMarkdownEnabled.checked = Boolean(nextState.smokeMarkdownEnabled);
        updateSmokeMarkdownInteractivity();

        if (typeof nextState.smokeMarkdownPath === "string" && document.activeElement !== smokeMarkdownPath) {
          smokeMarkdownPath.value = nextState.smokeMarkdownPath;
        }

        if (typeof nextState.smokeTimeout === "string" && document.activeElement !== smokeTimeout) {
          smokeTimeout.value = nextState.smokeTimeout;
        }

        if (typeof nextState.smokeSlowTimeout === "string" && document.activeElement !== smokeSlowTimeout) {
          smokeSlowTimeout.value = nextState.smokeSlowTimeout;
        }

        if (Array.isArray(nextState.smokeLanguages)) {
          const nextEnabledByKey = new Map(
            nextState.smokeLanguages.map((language) => [String(language.key || ""), Boolean(language.enabled)])
          );

          for (const checkbox of smokeLanguageCheckboxes) {
            const languageKey = checkbox.getAttribute("data-smoke-lang") || "";
            checkbox.checked = nextEnabledByKey.get(languageKey) === true;
          }
        }

        const nextRunChecksMode = String(nextState.runChecksMode || "none");
        runChecksModeNone.checked = nextRunChecksMode === "none";
        runChecksModeCheckOnly.checked = nextRunChecksMode === "check-only";
        runChecksModeCompileOnly.checked = nextRunChecksMode === "compile-only";

        if (typeof nextState.runChecksRoute === "string") {
          runChecksRoute.value = nextState.runChecksRoute;
        }

        updateRunChecksRouteInteractivity();

        if (!isRunArgsFocused && typeof nextState.text === "string") {
          runArgsText.value = nextState.text;
        }

        if (!isSourceProfileFocused && typeof nextState.sourceProfileText === "string") {
          sourceProfileText.value = nextState.sourceProfileText;
        }

        runArgsStatus.textContent = String(nextState.statusText || "");
        runArgsStatus.classList.remove(...statusClasses);

        if (statusClasses.includes(nextState.statusClassName)) {
          runArgsStatus.classList.add(nextState.statusClassName);
        }

        sourceProfileStatus.textContent = String(nextState.sourceProfileStatusText || "");
        sourceProfileStatus.classList.remove(...statusClasses);

        if (statusClasses.includes(nextState.sourceProfileStatusClassName)) {
          sourceProfileStatus.classList.add(nextState.sourceProfileStatusClassName);
        }

        runChecksStatus.textContent = String(nextState.runChecksStatusText || "");
        runChecksStatus.classList.remove(...statusClasses);

        if (statusClasses.includes(nextState.runChecksStatusClassName)) {
          runChecksStatus.classList.add(nextState.runChecksStatusClassName);
        }

        cleanOptionsStatus.textContent = String(nextState.cleanOptionsStatusText || "");
        cleanOptionsStatus.classList.remove(...statusClasses);

        if (statusClasses.includes(nextState.cleanOptionsStatusClassName)) {
          cleanOptionsStatus.classList.add(nextState.cleanOptionsStatusClassName);
        }

        smokeStatus.textContent = String(nextState.smokeStatusText || "");
        smokeStatus.classList.remove(...statusClasses);

        if (statusClasses.includes(nextState.smokeStatusClassName)) {
          smokeStatus.classList.add(nextState.smokeStatusClassName);
        }

        updateRunArgsClearButtonVisibility();
        updateSourceProfileClearButtonVisibility();
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
        updateRunArgsClearButtonVisibility();
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

        updateRunArgsClearButtonVisibility();
      });

      sourceProfileEnabled.addEventListener("change", () => {
        const enabled = sourceProfileEnabled.checked;
        sourceProfileText.disabled = !enabled;
        vscodeApi.postMessage({
          type: "setSourceProfileEnabled",
          enabled,
        });
      });

      sourceProfileText.addEventListener("input", () => {
        updateSourceProfileClearButtonVisibility();
        vscodeApi.postMessage({
          type: "setSourceProfileText",
          text: sourceProfileText.value,
        });
      });

      clearSourceProfile.addEventListener("click", () => {
        sourceProfileText.value = "";
        vscodeApi.postMessage({
          type: "setSourceProfileText",
          text: "",
        });

        if (!sourceProfileText.disabled) {
          sourceProfileText.focus();
        }

        updateSourceProfileClearButtonVisibility();
      });

      runChecksModeNone.addEventListener("change", () => {
        if (!runChecksModeNone.checked) {
          return;
        }

        updateRunChecksRouteInteractivity();
        vscodeApi.postMessage({
          type: "setRunChecksMode",
          mode: "none",
        });
      });

      runChecksModeCheckOnly.addEventListener("change", () => {
        if (!runChecksModeCheckOnly.checked) {
          return;
        }

        updateRunChecksRouteInteractivity();
        vscodeApi.postMessage({
          type: "setRunChecksMode",
          mode: "check-only",
        });
      });

      runChecksModeCompileOnly.addEventListener("change", () => {
        if (!runChecksModeCompileOnly.checked) {
          return;
        }

        updateRunChecksRouteInteractivity();
        vscodeApi.postMessage({
          type: "setRunChecksMode",
          mode: "compile-only",
        });
      });

      runChecksRoute.addEventListener("change", () => {
        vscodeApi.postMessage({
          type: "setRunChecksRoute",
          route: runChecksRoute.value,
        });
      });

      cleanStdlibEnabled.addEventListener("change", () => {
        vscodeApi.postMessage({
          type: "setCleanStdlibEnabled",
          enabled: cleanStdlibEnabled.checked,
        });
      });

      cleanArchivesEnabled.addEventListener("change", () => {
        vscodeApi.postMessage({
          type: "setCleanArchivesEnabled",
          enabled: cleanArchivesEnabled.checked,
        });
      });

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

        if (message?.type !== "runArgsState") {
          return;
        }

        applyState(message.state);
      });

      updateRunArgsClearButtonVisibility();
      updateSourceProfileClearButtonVisibility();
      updateRunChecksRouteInteractivity();
      updateSmokeMarkdownInteractivity();
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
    * @param {{type?: string, enabled?: boolean, text?: string, mode?: string, route?: string, languageKey?: string}} message Incoming webview message.
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
      return;
    }

    if (message?.type === "setSourceProfileEnabled") {
      setSidebarSourceProfileEnabled(Boolean(message.enabled));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setSourceProfileText") {
      setSidebarSourceProfileText(String(message.text || ""));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setRunChecksMode") {
      setSidebarRunChecksMode(String(message.mode || "none"));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setRunChecksRoute") {
      setSidebarRunChecksRoute(String(message.route || "native"));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setCleanStdlibEnabled") {
      setSidebarCleanStdlibEnabled(Boolean(message.enabled));
      this.postStateUpdate();
      return;
    }

    if (message?.type === "setCleanArchivesEnabled") {
      setSidebarCleanArchivesEnabled(Boolean(message.enabled));
      this.postStateUpdate();
      return;
    }

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
