const vscode = require("vscode");
const { VIEW_IDS } = require("../runtime/viewConstants");
const {
  buildWebviewErrorHtmlDocument,
  createTemplateWebviewProvider,
  escapeHtml,
  renderSectionHeader,
  renderTemplate,
  serializeForScript,
} = require("./templateModule");
const {
  actionCreators,
  extensionStateStore,
  selectSidebarCleanOptionsState,
  selectSidebarRunArgsState,
  selectSidebarRunChecksState,
  selectSidebarSourceProfileState,
} = require("../runtime/state/extensionStateStore");
const {
  parseSidebarRunArgsText,
} = require("../runtime/state/sidebarRunArgsState");

const RUN_CONTROLS_MEDIA_PATH_SEGMENTS = ["src", "ui", "media"];
const RUN_CONTROLS_SHARED_CSS_FILE_NAME = "panelShared.css";
const RUN_CONTROLS_CSS_FILE_NAME = "runControls.css";
const RUN_CONTROLS_WEBVIEW_CLIENT_UTILS_JS_FILE_NAME =
  "comms/webviewClientUtils.js";
const RUN_CONTROLS_COMMS_JS_FILE_NAME = "comms/runControlsComms.js";
const RUN_CONTROLS_JS_FILE_NAME = "ui/runControls.js";
const RUN_CONTROLS_TEMPLATE_PATH_SEGMENTS = ["src", "ui", "templates"];
const RUN_CONTROLS_SHELL_TEMPLATE_FILE_NAME = "run-controls-shell.html";
const RUN_CONTROLS_COMMAND_ARGUMENTS_TEMPLATE_FILE_NAME =
  "run-controls-command-arguments.html";
const RUN_CONTROLS_RUN_CHECKS_TEMPLATE_FILE_NAME = "run-controls-run-checks.html";
const RUN_CONTROLS_SOURCE_PROFILE_TEMPLATE_FILE_NAME =
  "run-controls-source-profile.html";
const RUN_CONTROLS_CLEAN_OPTIONS_TEMPLATE_FILE_NAME =
  "run-controls-clean-options.html";
const RUN_CONTROLS_REQUIRED_TEMPLATE_NAMES = [
  RUN_CONTROLS_SHELL_TEMPLATE_FILE_NAME,
  RUN_CONTROLS_COMMAND_ARGUMENTS_TEMPLATE_FILE_NAME,
  RUN_CONTROLS_RUN_CHECKS_TEMPLATE_FILE_NAME,
  RUN_CONTROLS_SOURCE_PROFILE_TEMPLATE_FILE_NAME,
  RUN_CONTROLS_CLEAN_OPTIONS_TEMPLATE_FILE_NAME,
];
const RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME = Object.freeze({
  terminal:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M2 3.5C2 2.67 2.67 2 3.5 2H12.5C13.33 2 14 2.67 14 3.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M4.5 6L6.75 8L4.5 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M8.5 10H11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    + '</svg>',
  check:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>',
  profile:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
    + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M11.75 4.25L12.5 5L14 3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>',
  clean:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 4.5C4 3.67 4.67 3 5.5 3H10.5C11.33 3 12 3.67 12 4.5V5.5H4V4.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M3.5 5.5H12.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 5.5V12C5 12.55 5.45 13 6 13H10C10.55 13 11 12.55 11 12V5.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M7 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<path d="M9 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '</svg>',
});

/**
 * Builds an explicit error document for run-controls webview failures.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {string} errorMessage Visible failure text.
 * @returns {string} Error HTML.
 */
function buildRunControlsErrorHtml(webview, errorMessage) {
  return buildWebviewErrorHtmlDocument(webview, errorMessage);
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
  const runArgsState = selectSidebarRunArgsState();
  const runArgsStatus = buildRunArgsStatus(runArgsState);
  const sourceProfileState = selectSidebarSourceProfileState();
  const sourceProfileStatus = buildSourceProfileStatus(sourceProfileState);
  const runChecksState = selectSidebarRunChecksState();
  const runChecksStatus = buildRunChecksStatus(runChecksState);
  const cleanOptionsState = selectSidebarCleanOptionsState();
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
    commandArgumentsHeader: renderSectionHeader(
      "Command Arguments",
      "terminal",
      "",
      RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME
    ),
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
    runChecksHeader: renderSectionHeader(
      "Run Checks",
      "check",
      "",
      RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME
    ),
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
    sourceProfileHeader: renderSectionHeader(
      "Profile Sourcing",
      "profile",
      "",
      RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME
    ),
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
    cleanOptionsHeader: renderSectionHeader(
      "Clean Options",
      "clean",
      "",
      RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME
    ),
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
 * @param {string} sharedStylesheetUri Webview shared stylesheet URI.
 * @param {string} stylesheetUri Webview stylesheet URI.
 * @param {string} clientUtilsScriptUri Webview shared client-utils script URI.
 * @param {string} commsScriptUri Webview comms script URI.
 * @param {string} scriptUri Webview script URI.
 * @param {{shell: string, commandArguments: string, runChecks: string, sourceProfile: string, cleanOptions: string}} templates Run-controls templates.
 * @returns {string} Rendered HTML.
 */
function buildRunControlsHtml(
  webview,
  sharedStylesheetUri,
  stylesheetUri,
  clientUtilsScriptUri,
  commsScriptUri,
  scriptUri,
  templates
) {
  const stateSnapshot = getRunControlsSnapshot();
  const cspSource = webview.cspSource;
  const serializedState = serializeForScript(stateSnapshot);

  return renderTemplate(templates.shell, {
    cspSource,
    sharedStylesheetUri,
    stylesheetUri,
    clientUtilsScriptUri,
    commsScriptUri,
    scriptUri,
    serializedState,
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
    this._templateProvider = createTemplateWebviewProvider({
      vscodeApi: vscode,
      extensionUri,
      mediaPathSegments: RUN_CONTROLS_MEDIA_PATH_SEGMENTS,
      templatePathSegments: RUN_CONTROLS_TEMPLATE_PATH_SEGMENTS,
      templateOwnerName: "Run Controls",
      requiredTemplateNames: RUN_CONTROLS_REQUIRED_TEMPLATE_NAMES,
      buildTemplateMap: (templateByName) => {
        return {
          shell: templateByName[RUN_CONTROLS_SHELL_TEMPLATE_FILE_NAME],
          commandArguments:
            templateByName[RUN_CONTROLS_COMMAND_ARGUMENTS_TEMPLATE_FILE_NAME],
          runChecks: templateByName[RUN_CONTROLS_RUN_CHECKS_TEMPLATE_FILE_NAME],
          sourceProfile:
            templateByName[RUN_CONTROLS_SOURCE_PROFILE_TEMPLATE_FILE_NAME],
          cleanOptions:
            templateByName[RUN_CONTROLS_CLEAN_OPTIONS_TEMPLATE_FILE_NAME],
        };
      },
      assetFileNameByKey: {
        sharedStylesheetUri: RUN_CONTROLS_SHARED_CSS_FILE_NAME,
        stylesheetUri: RUN_CONTROLS_CSS_FILE_NAME,
        clientUtilsScriptUri: RUN_CONTROLS_WEBVIEW_CLIENT_UTILS_JS_FILE_NAME,
        commsScriptUri: RUN_CONTROLS_COMMS_JS_FILE_NAME,
        scriptUri: RUN_CONTROLS_JS_FILE_NAME,
      },
      localResourceRoots: ({ mediaBaseUri }) => {
        return [mediaBaseUri];
      },
      buildHtml: (webview, context) => {
        return buildRunControlsHtml(
          webview,
          context.assetUris.sharedStylesheetUri,
          context.assetUris.stylesheetUri,
          context.assetUris.clientUtilsScriptUri,
          context.assetUris.commsScriptUri,
          context.assetUris.scriptUri,
          context.templates
        );
      },
      buildErrorHtml: (webview, error) => {
        const failureText = String(
          error?.message || "Run Controls failed to render templates."
        );
        return buildRunControlsErrorHtml(webview, failureText);
      },
      handleMessage: (message) => {
        this.handleMessage(message);
      },
    });
    this._lifecycle = this._templateProvider.lifecycle;
  }

  /**
   * Loads one run-controls template file using shared process cache.
   *
   * @param {string} templateFileName Template file name.
   * @returns {string} Template contents.
   */
  getTemplate(templateFileName) {
    return this._templateProvider.getTemplate(templateFileName);
  }

  /**
   * Returns all run-controls templates.
   *
   * @returns {{shell: string, commandArguments: string, runChecks: string, sourceProfile: string, cleanOptions: string}} Template map.
   */
  getTemplates() {
    return this._templateProvider.getTemplates();
  }

  /**
   * Returns webview resource URIs for run-controls assets.
   *
   * @param {import("vscode").Webview} webview Webview instance.
   * @returns {{sharedStylesheetUri: string, stylesheetUri: string, clientUtilsScriptUri: string, commsScriptUri: string, scriptUri: string}} Resource URI map.
   */
  getAssetUris(webview) {
    return this._templateProvider.getAssetUris(webview);
  }

  /**
   * Returns message handlers keyed by message type.
   *
   * @returns {Object.<string, (message: {enabled?: boolean, text?: string, mode?: string, route?: string}) => void>} Message handlers.
   */
  getMessageHandlers() {
    if (this._messageHandlers) {
      return this._messageHandlers;
    }

    this._messageHandlers = {
      setEnabled: (message) => {
        extensionStateStore.dispatch(
          actionCreators.setSidebarRunArgsEnabled(Boolean(message.enabled))
        );
        this.postStateUpdate();
      },
      setText: (message) => {
        extensionStateStore.dispatch(
          actionCreators.setSidebarRunArgsText(String(message.text || ""))
        );
        this.postStateUpdate();
      },
      setSourceProfileEnabled: (message) => {
        extensionStateStore.dispatch(
          actionCreators.setSidebarSourceProfileEnabled(Boolean(message.enabled))
        );
        this.postStateUpdate();
      },
      setSourceProfileText: (message) => {
        extensionStateStore.dispatch(
          actionCreators.setSidebarSourceProfileText(String(message.text || ""))
        );
        this.postStateUpdate();
      },
      setRunChecksMode: (message) => {
        extensionStateStore.dispatch(
          actionCreators.setSidebarRunChecksMode(String(message.mode || "none"))
        );
        this.postStateUpdate();
      },
      setRunChecksRoute: (message) => {
        extensionStateStore.dispatch(
          actionCreators.setSidebarRunChecksRoute(
            String(message.route || "native")
          )
        );
        this.postStateUpdate();
      },
      setCleanStdlibEnabled: (message) => {
        extensionStateStore.dispatch(
          actionCreators.setSidebarCleanStdlibEnabled(Boolean(message.enabled))
        );
        this.postStateUpdate();
      },
      setCleanArchivesEnabled: (message) => {
        extensionStateStore.dispatch(
          actionCreators.setSidebarCleanArchivesEnabled(Boolean(message.enabled))
        );
        this.postStateUpdate();
      },
    };

    return this._messageHandlers;
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
    const activeWebviewView = this._lifecycle.getActiveWebviewView();

    if (!activeWebviewView) {
      return;
    }

    void activeWebviewView.webview.postMessage({
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
    this._lifecycle.resolveWebviewView(webviewView);
  }

  /**
   * Refreshes the currently visible run-controls webview.
   *
   * @returns {void}
   */
  refresh() {
    this._lifecycle.refresh();
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
    VIEW_IDS.RUN_CONTROLS,
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
  _internal: {
    SidebarRunControlsViewProvider,
  },
  registerSidebarRunControlsView,
};
