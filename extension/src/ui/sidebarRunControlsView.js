const fs = require("fs");
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
  parseSidebarRunArgsText,
} = require("../runtime/sidebarRunArgsState");

const RUN_CONTROLS_VIEW_ID = "algosWorkspaceRunControlsView";
const RUN_CONTROLS_MEDIA_PATH_SEGMENTS = ["src", "ui", "media"];
const RUN_CONTROLS_CSS_FILE_NAME = "runControls.css";
const RUN_CONTROLS_JS_FILE_NAME = "runControls.js";
const RUN_CONTROLS_TEMPLATE_PATH_SEGMENTS = ["src", "ui", "templates"];
const RUN_CONTROLS_SHELL_TEMPLATE_FILE_NAME = "run-controls-shell.html";
const RUN_CONTROLS_COMMAND_ARGUMENTS_TEMPLATE_FILE_NAME =
  "run-controls-command-arguments.html";
const RUN_CONTROLS_RUN_CHECKS_TEMPLATE_FILE_NAME = "run-controls-run-checks.html";
const RUN_CONTROLS_SOURCE_PROFILE_TEMPLATE_FILE_NAME =
  "run-controls-source-profile.html";
const RUN_CONTROLS_CLEAN_OPTIONS_TEMPLATE_FILE_NAME =
  "run-controls-clean-options.html";
const runControlsTemplateCache = new Map();

/**
 * Reads a text file safely and returns an empty string on failure.
 *
 * @param {string} filePath Text file path.
 * @returns {string} File contents or empty string.
 */
function readTextFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (_) {
    return "";
  }
}

/**
 * Renders one tokenized HTML template with replacement values.
 *
 * @param {string} template Raw template source.
 * @param {Record<string, string>} replacements Placeholder replacements.
 * @returns {string} Rendered HTML.
 */
function renderTemplate(template, replacements) {
  return String(template || "").replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return String(replacements[key]);
    }

    return "";
  });
}

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
 * Returns the inline SVG used for one Run Controls section header.
 *
 * @param {string} iconName Semantic section icon key.
 * @returns {string} Inline SVG markup.
 */
function getSectionIconSvg(iconName) {
  if (iconName === "terminal") {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M2 3.5C2 2.67 2.67 2 3.5 2H12.5C13.33 2 14 2.67 14 3.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M4.5 6L6.75 8L4.5 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M8.5 10H11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
      + '</svg>';
  }

  if (iconName === "check") {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
  }

  if (iconName === "profile") {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
      + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      + '<path d="M11.75 4.25L12.5 5L14 3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
  }

  if (iconName === "clean") {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M4 4.5C4 3.67 4.67 3 5.5 3H10.5C11.33 3 12 3.67 12 4.5V5.5H4V4.5Z" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M3.5 5.5H12.5" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M5 5.5V12C5 12.55 5.45 13 6 13H10C10.55 13 11 12.55 11 12V5.5" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M7 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
      + '<path d="M9 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
      + '</svg>';
  }

  return "";
}

/**
 * Renders one Run Controls section header with an icon and optional actions.
 *
 * @param {string} title Section title.
 * @param {string} iconName Semantic section icon key.
 * @param {string} actionsHtml Optional action markup.
 * @returns {string} Header markup.
 */
function renderSectionHeader(title, iconName, actionsHtml) {
  return '<div class="sectionHeader">'
    + '<div class="sectionTitleGroup">'
    + getSectionIconSvg(iconName)
    + '<div class="sectionTitle">' + escapeHtml(title) + '</div>'
    + '</div>'
    + (actionsHtml || "")
    + '</div>';
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
 * Returns the render snapshot used by the run-controls UI.
 *
 * @returns {{enabled: boolean, text: string, statusText: string, statusClassName: string, sourceProfileEnabled: boolean, sourceProfileText: string, sourceProfileStatusText: string, sourceProfileStatusClassName: string, runChecksMode: "none"|"check-only"|"compile-only", runChecksRoute: "native"|"docker"|"ssh", runChecksStatusText: string, runChecksStatusClassName: string, cleanStdlib: boolean, cleanArchives: boolean, cleanOptionsStatusText: string, cleanOptionsStatusClassName: string}} Current UI state snapshot.
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
  };
}

/**
 * Renders the command-arguments section.
 *
 * @param {ReturnType<typeof getRunControlsSnapshot>} stateSnapshot Current UI state snapshot.
 * @param {{commandArguments: string}} templates Run-controls templates.
 * @returns {string} Section HTML.
 */
function buildCommandArgumentsSectionHtml(stateSnapshot, templates) {
  return renderTemplate(templates.commandArguments, {
    commandArgumentsHeader: renderSectionHeader("Command Arguments", "terminal"),
    runArgsEnabledChecked: stateSnapshot.enabled ? "checked" : "",
    runArgsValue: escapeHtml(stateSnapshot.text),
    runArgsDisabledAttr: stateSnapshot.enabled ? "" : "disabled",
    runArgsStatusClassName: escapeHtml(stateSnapshot.statusClassName),
    runArgsStatusText: escapeHtml(stateSnapshot.statusText),
  });
}

/**
 * Renders the run-checks section.
 *
 * @param {ReturnType<typeof getRunControlsSnapshot>} stateSnapshot Current UI state snapshot.
 * @param {{runChecks: string}} templates Run-controls templates.
 * @returns {string} Section HTML.
 */
function buildRunChecksSectionHtml(stateSnapshot, templates) {
  return renderTemplate(templates.runChecks, {
    runChecksHeader: renderSectionHeader("Run Checks", "check"),
    runChecksModeNoneChecked:
      stateSnapshot.runChecksMode === "none" ? "checked" : "",
    runChecksModeCompileOnlyChecked:
      stateSnapshot.runChecksMode === "compile-only" ? "checked" : "",
    runChecksModeCheckOnlyChecked:
      stateSnapshot.runChecksMode === "check-only" ? "checked" : "",
    runChecksRouteDisabledAttr:
      stateSnapshot.runChecksMode === "check-only" ? "" : "disabled",
    runChecksRouteNativeSelected:
      stateSnapshot.runChecksRoute === "native" ? "selected" : "",
    runChecksRouteDockerSelected:
      stateSnapshot.runChecksRoute === "docker" ? "selected" : "",
    runChecksRouteSshSelected:
      stateSnapshot.runChecksRoute === "ssh" ? "selected" : "",
    runChecksStatusClassName: escapeHtml(stateSnapshot.runChecksStatusClassName),
    runChecksStatusText: escapeHtml(stateSnapshot.runChecksStatusText),
  });
}

/**
 * Renders the profile-sourcing section.
 *
 * @param {ReturnType<typeof getRunControlsSnapshot>} stateSnapshot Current UI state snapshot.
 * @param {{sourceProfile: string}} templates Run-controls templates.
 * @returns {string} Section HTML.
 */
function buildSourceProfileSectionHtml(stateSnapshot, templates) {
  return renderTemplate(templates.sourceProfile, {
    sourceProfileHeader: renderSectionHeader("Profile Sourcing", "profile"),
    sourceProfileEnabledChecked: stateSnapshot.sourceProfileEnabled
      ? "checked"
      : "",
    sourceProfileValue: escapeHtml(stateSnapshot.sourceProfileText),
    sourceProfileDisabledAttr: stateSnapshot.sourceProfileEnabled
      ? ""
      : "disabled",
    sourceProfileStatusClassName: escapeHtml(
      stateSnapshot.sourceProfileStatusClassName
    ),
    sourceProfileStatusText: escapeHtml(stateSnapshot.sourceProfileStatusText),
  });
}

/**
 * Renders the clean-options section.
 *
 * @param {ReturnType<typeof getRunControlsSnapshot>} stateSnapshot Current UI state snapshot.
 * @param {{cleanOptions: string}} templates Run-controls templates.
 * @returns {string} Section HTML.
 */
function buildCleanOptionsSectionHtml(stateSnapshot, templates) {
  return renderTemplate(templates.cleanOptions, {
    cleanOptionsHeader: renderSectionHeader("Clean Options", "clean"),
    cleanStdlibChecked: stateSnapshot.cleanStdlib ? "checked" : "",
    cleanArchivesChecked: stateSnapshot.cleanArchives ? "checked" : "",
    cleanOptionsStatusClassName: escapeHtml(
      stateSnapshot.cleanOptionsStatusClassName
    ),
    cleanOptionsStatusText: escapeHtml(stateSnapshot.cleanOptionsStatusText),
  });
}

/**
 * Builds webview HTML for the run-controls panel.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {string} stylesheetUri Webview stylesheet URI.
 * @param {string} scriptUri Webview script URI.
 * @param {{shell: string, commandArguments: string, runChecks: string, sourceProfile: string, cleanOptions: string}} templates Run-controls templates.
 * @returns {string} Rendered HTML.
 */
function buildRunControlsHtml(webview, stylesheetUri, scriptUri, templates) {
  const stateSnapshot = getRunControlsSnapshot();
  const cspSource = webview.cspSource;

  return renderTemplate(templates.shell, {
    cspSource,
    stylesheetUri,
    scriptUri,
    commandArgumentsSection: buildCommandArgumentsSectionHtml(
      stateSnapshot,
      templates
    ),
    runChecksSection: buildRunChecksSectionHtml(stateSnapshot, templates),
    sourceProfileSection: buildSourceProfileSectionHtml(stateSnapshot, templates),
    cleanOptionsSection: buildCleanOptionsSectionHtml(stateSnapshot, templates),
  });
}

/**
 * Provides the webview UI for sidebar run controls.
 */
class SidebarRunControlsViewProvider {
  /**
   * Creates a run-controls view provider.
   *
   * @param {import("vscode").Uri} extensionUri Extension installation URI.
   */
  constructor(extensionUri) {
    this._view = null;
    this._mediaRootUri = vscode.Uri.joinPath(
      extensionUri,
      ...RUN_CONTROLS_MEDIA_PATH_SEGMENTS
    );
    this._templateRootUri = vscode.Uri.joinPath(
      extensionUri,
      ...RUN_CONTROLS_TEMPLATE_PATH_SEGMENTS
    );
  }

  /**
   * Loads one run-controls template file using shared process cache.
   *
   * @param {string} templateFileName Template file name.
   * @returns {string} Template contents.
   */
  getTemplate(templateFileName) {
    const templateUri = vscode.Uri.joinPath(this._templateRootUri, templateFileName);
    const templatePath = templateUri.fsPath;

    if (runControlsTemplateCache.has(templatePath)) {
      return runControlsTemplateCache.get(templatePath);
    }

    const templateText = readTextFileSafe(templatePath);
    runControlsTemplateCache.set(templatePath, templateText);
    return templateText;
  }

  /**
   * Returns all run-controls templates.
   *
   * @returns {{shell: string, commandArguments: string, runChecks: string, sourceProfile: string, cleanOptions: string}} Template map.
   */
  getTemplates() {
    return {
      shell: this.getTemplate(RUN_CONTROLS_SHELL_TEMPLATE_FILE_NAME),
      commandArguments: this.getTemplate(
        RUN_CONTROLS_COMMAND_ARGUMENTS_TEMPLATE_FILE_NAME
      ),
      runChecks: this.getTemplate(RUN_CONTROLS_RUN_CHECKS_TEMPLATE_FILE_NAME),
      sourceProfile: this.getTemplate(
        RUN_CONTROLS_SOURCE_PROFILE_TEMPLATE_FILE_NAME
      ),
      cleanOptions: this.getTemplate(RUN_CONTROLS_CLEAN_OPTIONS_TEMPLATE_FILE_NAME),
    };
  }

  /**
   * Returns webview resource URIs for run-controls assets.
   *
   * @param {import("vscode").Webview} webview Webview instance.
   * @returns {{stylesheetUri: string, scriptUri: string}} Resource URI map.
   */
  getAssetUris(webview) {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._mediaRootUri, RUN_CONTROLS_CSS_FILE_NAME)
    ).toString();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._mediaRootUri, RUN_CONTROLS_JS_FILE_NAME)
    ).toString();

    return {
      stylesheetUri,
      scriptUri,
    };
  }

  /**
   * Returns message handlers keyed by message type.
   *
   * @returns {Object.<string, (message: {enabled?: boolean, text?: string, mode?: string, route?: string}) => void>} Message handlers.
   */
  getMessageHandlers() {
    return {
      setEnabled: (message) => {
        setSidebarRunArgsEnabled(Boolean(message.enabled));
        this.postStateUpdate();
      },
      setText: (message) => {
        setSidebarRunArgsText(String(message.text || ""));
        this.postStateUpdate();
      },
      setSourceProfileEnabled: (message) => {
        setSidebarSourceProfileEnabled(Boolean(message.enabled));
        this.postStateUpdate();
      },
      setSourceProfileText: (message) => {
        setSidebarSourceProfileText(String(message.text || ""));
        this.postStateUpdate();
      },
      setRunChecksMode: (message) => {
        setSidebarRunChecksMode(String(message.mode || "none"));
        this.postStateUpdate();
      },
      setRunChecksRoute: (message) => {
        setSidebarRunChecksRoute(String(message.route || "native"));
        this.postStateUpdate();
      },
      setCleanStdlibEnabled: (message) => {
        setSidebarCleanStdlibEnabled(Boolean(message.enabled));
        this.postStateUpdate();
      },
      setCleanArchivesEnabled: (message) => {
        setSidebarCleanArchivesEnabled(Boolean(message.enabled));
        this.postStateUpdate();
      },
    };
  }

  /**
   * Handles one webview message from the run-controls UI.
   *
    * @param {{type?: string, enabled?: boolean, text?: string, mode?: string, route?: string, languageKey?: string}} message Incoming webview message.
   * @returns {void}
   */
  handleMessage(message) {
    const messageType = String(message?.type || "");
    const messageHandler = this.getMessageHandlers()[messageType];

    if (messageHandler) {
      messageHandler(message || {});
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
      localResourceRoots: [this._mediaRootUri],
    };
    const assets = this.getAssetUris(webviewView.webview);
    const templates = this.getTemplates();
    webviewView.webview.html = buildRunControlsHtml(
      webviewView.webview,
      assets.stylesheetUri,
      assets.scriptUri,
      templates
    );

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

    const assets = this.getAssetUris(this._view.webview);
    const templates = this.getTemplates();
    this._view.webview.html = buildRunControlsHtml(
      this._view.webview,
      assets.stylesheetUri,
      assets.scriptUri,
      templates
    );
  }
}

/**
 * Registers the sidebar run-controls webview.
 *
 * @param {import("vscode").Uri} extensionUri Extension installation URI.
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerSidebarRunControlsView(extensionUri) {
  const provider = new SidebarRunControlsViewProvider(extensionUri);
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
