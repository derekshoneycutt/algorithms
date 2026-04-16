const vscode = require("vscode");
const { VIEW_IDS } = require("../runtime/viewConstants");
const {
  buildLanguageIconUris,
  buildWebviewErrorHtmlDocument,
  createSidebarWebviewLifecycle,
  escapeHtml,
  makeTemplateLoader,
  renderSectionHeader,
  renderTemplate,
  serializeForScript,
} = require("./webviewHostUtils");
const {
  getSidebarSmokeControlsState,
  setSidebarSmokeMarkdownEnabled,
  setSidebarSmokeMarkdownPath,
  setSidebarSmokeTimeout,
  setSidebarSmokeSlowTimeout,
  setSidebarSmokeLanguageEnabled,
  setSidebarSmokeAllLanguagesEnabled,
} = require("../runtime/sidebarRunArgsState");

const LANGUAGE_ICON_PATH_SEGMENT = "icons/languages";
const FALLBACK_ICON_PATH_SEGMENT = "icons/play-sidebar.svg";
const SMOKE_CONTROLS_MEDIA_PATH_SEGMENTS = ["src", "ui", "media"];
const { LANGUAGE_ICON_FILE_BY_KEY } = require("../runtime/languageMetadata");

const SMOKE_CONTROLS_SHARED_CSS_FILE_NAME = "panelShared.css";
const SMOKE_CONTROLS_CSS_FILE_NAME = "smokeControls.css";
const SMOKE_CONTROLS_WEBVIEW_CLIENT_UTILS_JS_FILE_NAME =
  "webviewClientUtils.js";
const SMOKE_CONTROLS_JS_FILE_NAME = "smokeControls.js";
const SMOKE_CONTROLS_TEMPLATE_PATH_SEGMENTS = ["src", "ui", "templates"];
const SMOKE_CONTROLS_SHELL_TEMPLATE_FILE_NAME = "smoke-controls-shell.html";
const SMOKE_CONTROLS_REPORT_GENERATION_TEMPLATE_FILE_NAME =
  "smoke-controls-report-generation.html";
const SMOKE_CONTROLS_TIMEOUTS_TEMPLATE_FILE_NAME =
  "smoke-controls-timeouts.html";
const SMOKE_CONTROLS_LANGUAGES_TEMPLATE_FILE_NAME =
  "smoke-controls-languages.html";
const SMOKE_CONTROLS_REQUIRED_TEMPLATE_NAMES = [
  SMOKE_CONTROLS_SHELL_TEMPLATE_FILE_NAME,
  SMOKE_CONTROLS_REPORT_GENERATION_TEMPLATE_FILE_NAME,
  SMOKE_CONTROLS_TIMEOUTS_TEMPLATE_FILE_NAME,
  SMOKE_CONTROLS_LANGUAGES_TEMPLATE_FILE_NAME,
];
const SMOKE_CONTROLS_SECTION_ICON_SVG_BY_NAME = Object.freeze({
  report:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 2H10L12 4V13C12 13.55 11.55 14 11 14H4C3.45 14 3 13.55 3 13V3C3 2.45 3.45 2 4 2Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M10 2V4H12" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 7H11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<path d="M5 9.5H9" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '</svg>',
  timeout:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M8 5V8L10 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>',
  languages:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M5 5L2 8L5 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M11 5L14 8L11 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M9 3L7 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    + '</svg>',
});

/**
 * Builds an explicit error document for smoke-controls webview failures.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {string} errorMessage Visible failure text.
 * @returns {string} Error HTML.
 */
function buildSmokeControlsErrorHtml(webview, errorMessage) {
  return buildWebviewErrorHtmlDocument(webview, errorMessage);
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
 * Builds status metadata for report-generation settings.
 *
 * @param {{markdownEnabled: boolean, markdownPath: string}} smokeControlsState Current smoke-controls state.
 * @returns {{statusText: string, statusClassName: string}} Status display metadata.
 */
function buildReportGenerationStatus(smokeControlsState) {
  const reportPath = String(smokeControlsState.markdownPath || "").trim();

  if (!smokeControlsState.markdownEnabled) {
    return {
      statusText: "No report generated.",
      statusClassName: "status-muted",
    };
  }

  if (!reportPath) {
    return {
      statusText: "Report generated at default smoke-test path.",
      statusClassName: "status-ok",
    };
  }

  return {
    statusText: `Report generated at: ${reportPath}`,
    statusClassName: "status-ok",
  };
}

/**
 * Returns the render snapshot used by the smoke-controls UI.
 *
 * @returns {{markdownEnabled: boolean, markdownPath: string, timeout: string, slowTimeout: string, languages: {key: string, enabled: boolean}[], reportStatusText: string, reportStatusClassName: string, smokeStatusText: string, smokeStatusClassName: string}} Current UI state snapshot.
 */
function getSmokeControlsSnapshot() {
  const smokeControlsState = getSidebarSmokeControlsState();
  const reportStatus = buildReportGenerationStatus(smokeControlsState);
  const smokeControlsStatus = buildSmokeControlsStatus(smokeControlsState);

  return {
    markdownEnabled: smokeControlsState.markdownEnabled,
    markdownPath: smokeControlsState.markdownPath,
    timeout: smokeControlsState.timeout,
    slowTimeout: smokeControlsState.slowTimeout,
    languages: smokeControlsState.languages,
    reportStatusText: reportStatus.statusText,
    reportStatusClassName: reportStatus.statusClassName,
    smokeStatusText: smokeControlsStatus.statusText,
    smokeStatusClassName: smokeControlsStatus.statusClassName,
  };
}

/**
 * Builds language checkbox grid markup.
 *
 * @param {ReturnType<typeof getSmokeControlsSnapshot>} stateSnapshot Current UI state snapshot.
 * @param {{fallbackIconUri: string, iconUriByLanguageKey: Map<string, string>}} languageIconUris Webview-safe icon URI metadata.
 * @returns {string} Language checkbox grid markup.
 */
function buildLanguagesGridHtml(stateSnapshot, languageIconUris) {
  const { fallbackIconUri: resolvedFallbackIconUri, iconUriByLanguageKey } = languageIconUris;

  const languagesGridHtml = stateSnapshot.languages
    .map((language) => {
      const iconUri =
        iconUriByLanguageKey.get(language.key) || resolvedFallbackIconUri;

      return `<label class="smokeLanguageOption" for="smokeLang_${language.key}">
        <img class="languageIcon" src="${escapeHtml(iconUri)}" alt="" aria-hidden="true" />
        <input id="smokeLang_${language.key}" type="checkbox" data-smoke-lang="${language.key}" ${
          language.enabled ? "checked" : ""
        } />
        <span>${escapeHtml(language.key)}</span>
      </label>`;
    })
    .join("");

  return languagesGridHtml;
}

/**
 * Renders the report-generation section.
 *
 * @param {ReturnType<typeof getSmokeControlsSnapshot>} stateSnapshot Current UI state snapshot.
 * @param {{reportGeneration: string}} templates Smoke-controls templates.
 * @returns {string} Section HTML.
 */
function buildReportGenerationSectionHtml(stateSnapshot, templates) {
  return renderTemplate(templates.reportGeneration, {
    reportGenerationHeader: renderSectionHeader(
      "Report Generation",
      "report",
      "",
      SMOKE_CONTROLS_SECTION_ICON_SVG_BY_NAME
    ),
    smokeMarkdownEnabledChecked: stateSnapshot.markdownEnabled ? "checked" : "",
    smokeMarkdownPathValue: escapeHtml(stateSnapshot.markdownPath),
    smokeMarkdownPathDisabledAttr: stateSnapshot.markdownEnabled ? "" : "disabled",
    reportStatusClassName: escapeHtml(stateSnapshot.reportStatusClassName),
    reportStatusText: escapeHtml(stateSnapshot.reportStatusText),
  });
}

/**
 * Renders the timeouts section.
 *
 * @param {ReturnType<typeof getSmokeControlsSnapshot>} stateSnapshot Current UI state snapshot.
 * @param {{timeouts: string}} templates Smoke-controls templates.
 * @returns {string} Section HTML.
 */
function buildTimeoutsSectionHtml(stateSnapshot, templates) {
  return renderTemplate(templates.timeouts, {
    timeoutsHeader: renderSectionHeader(
      "Timeouts",
      "timeout",
      "",
      SMOKE_CONTROLS_SECTION_ICON_SVG_BY_NAME
    ),
    smokeTimeoutValue: escapeHtml(stateSnapshot.timeout),
    smokeSlowTimeoutValue: escapeHtml(stateSnapshot.slowTimeout),
  });
}

/**
 * Renders the languages section.
 *
 * @param {ReturnType<typeof getSmokeControlsSnapshot>} stateSnapshot Current UI state snapshot.
 * @param {{languages: string}} templates Smoke-controls templates.
 * @param {{fallbackIconUri: string, iconUriByLanguageKey: Map<string, string>}} languageIconUris Webview-safe icon URI metadata.
 * @returns {string} Section HTML.
 */
function buildLanguagesSectionHtml(stateSnapshot, templates, languageIconUris) {
  return renderTemplate(templates.languages, {
    languagesHeader: renderSectionHeader(
      "Languages",
      "languages",
      '<div class="buttonRow"><button id="smokeSelectAll" class="button secondary" type="button">Select All</button><button id="smokeDeselectAll" class="button secondary" type="button">Deselect All</button></div>',
      SMOKE_CONTROLS_SECTION_ICON_SVG_BY_NAME
    ),
    languageGridOptions: buildLanguagesGridHtml(stateSnapshot, languageIconUris),
    smokeStatusClassName: escapeHtml(stateSnapshot.smokeStatusClassName),
    smokeStatusText: escapeHtml(stateSnapshot.smokeStatusText),
  });
}

/**
 * Builds webview HTML for the smoke-controls panel.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {string} sharedStylesheetUri Webview shared stylesheet URI.
 * @param {string} stylesheetUri Webview stylesheet URI.
 * @param {string} clientUtilsScriptUri Webview shared client-utils script URI.
 * @param {string} scriptUri Webview script URI.
 * @param {{shell: string, reportGeneration: string, timeouts: string, languages: string}} templates Smoke-controls templates.
 * @param {{fallbackIconUri: string, iconUriByLanguageKey: Map<string, string>}} languageIconUris Webview-safe icon URI metadata.
 * @returns {string} Rendered HTML.
 */
function buildSmokeControlsHtml(
  webview,
  sharedStylesheetUri,
  stylesheetUri,
  clientUtilsScriptUri,
  scriptUri,
  templates,
  languageIconUris
) {
  const stateSnapshot = getSmokeControlsSnapshot();
  const serializedState = serializeForScript(stateSnapshot);

  return renderTemplate(templates.shell, {
    cspSource: webview.cspSource,
    sharedStylesheetUri,
    stylesheetUri,
    clientUtilsScriptUri,
    scriptUri,
    serializedState,
    reportGenerationSection: buildReportGenerationSectionHtml(
      stateSnapshot,
      templates
    ),
    timeoutsSection: buildTimeoutsSectionHtml(stateSnapshot, templates),
    languagesSection: buildLanguagesSectionHtml(
      stateSnapshot,
      templates,
      languageIconUris
    ),
  });
}

/**
 * Provides the webview UI for sidebar smoke controls.
 */
class SidebarSmokeControlsViewProvider {
  /**
   * Creates a smoke-controls view provider.
   */
  constructor(extensionUri) {
    this._mediaBaseUri = vscode.Uri.joinPath(
      extensionUri,
      ...SMOKE_CONTROLS_MEDIA_PATH_SEGMENTS
    );
    this._templateBaseUri = vscode.Uri.joinPath(
      extensionUri,
      ...SMOKE_CONTROLS_TEMPLATE_PATH_SEGMENTS
    );
    this._languageIconBaseUri = vscode.Uri.joinPath(
      extensionUri,
      ...LANGUAGE_ICON_PATH_SEGMENT.split("/")
    );
    this._iconRootUri = vscode.Uri.joinPath(extensionUri, "icons");
    this._fallbackIconUri = vscode.Uri.joinPath(
      extensionUri,
      ...FALLBACK_ICON_PATH_SEGMENT.split("/")
    );
    this._loadTemplate = makeTemplateLoader(this._templateBaseUri.fsPath);
    this._lifecycle = createSidebarWebviewLifecycle({
      localResourceRoots: [
        this._languageIconBaseUri,
        this._iconRootUri,
        this._mediaBaseUri,
        this._templateBaseUri,
      ],
      buildHtml: (webview) => {
        const templates = this.getTemplates();
        const assetUris = this.getAssetUris(webview);
        const languageIconUris = buildLanguageIconUris(
          webview,
          vscode,
          this._languageIconBaseUri,
          this._fallbackIconUri,
          LANGUAGE_ICON_FILE_BY_KEY
        );

        return buildSmokeControlsHtml(
          webview,
          assetUris.sharedStylesheetUri,
          assetUris.stylesheetUri,
          assetUris.clientUtilsScriptUri,
          assetUris.scriptUri,
          templates,
          languageIconUris
        );
      },
      buildErrorHtml: (webview, error) => {
        const failureText = String(
          error?.message || "Smoke Controls failed to render templates."
        );
        return buildSmokeControlsErrorHtml(webview, failureText);
      },
      handleMessage: (message) => {
        this.handleMessage(message);
      },
    });
  }

  /**
   * Loads one smoke-controls template file using shared process cache.
   *
   * @param {string} templateFileName Template file name.
   * @returns {string} Template contents.
   */
  getTemplate(templateFileName) {
    return this._loadTemplate(templateFileName, "Smoke Controls");
  }

  /**
   * Returns all smoke-controls templates.
   *
   * @returns {{shell: string, reportGeneration: string, timeouts: string, languages: string}} Template map.
   */
  getTemplates() {
    const templateByName = Object.fromEntries(
      SMOKE_CONTROLS_REQUIRED_TEMPLATE_NAMES.map((templateFileName) => {
        return [templateFileName, this.getTemplate(templateFileName)];
      })
    );

    return {
      shell: templateByName[SMOKE_CONTROLS_SHELL_TEMPLATE_FILE_NAME],
      reportGeneration:
        templateByName[SMOKE_CONTROLS_REPORT_GENERATION_TEMPLATE_FILE_NAME],
      timeouts: templateByName[SMOKE_CONTROLS_TIMEOUTS_TEMPLATE_FILE_NAME],
      languages: templateByName[SMOKE_CONTROLS_LANGUAGES_TEMPLATE_FILE_NAME],
    };
  }

  /**
   * Returns webview resource URIs for smoke-controls assets.
   *
   * @param {import("vscode").Webview} webview Webview instance.
   * @returns {{sharedStylesheetUri: string, stylesheetUri: string, clientUtilsScriptUri: string, scriptUri: string}} Resource URI map.
   */
  getAssetUris(webview) {
    const sharedStylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._mediaBaseUri,
        SMOKE_CONTROLS_SHARED_CSS_FILE_NAME
      )
    ).toString();
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._mediaBaseUri, SMOKE_CONTROLS_CSS_FILE_NAME)
    ).toString();
    const clientUtilsScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._mediaBaseUri,
        SMOKE_CONTROLS_WEBVIEW_CLIENT_UTILS_JS_FILE_NAME
      )
    ).toString();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._mediaBaseUri, SMOKE_CONTROLS_JS_FILE_NAME)
    ).toString();

    return {
      sharedStylesheetUri,
      stylesheetUri,
      clientUtilsScriptUri,
      scriptUri,
    };
  }

  /**
   * Returns message handlers keyed by message type.
   *
   * @returns {Object.<string, (message: {enabled?: boolean, text?: string, languageKey?: string}) => void>} Message handlers.
   */
  getMessageHandlers() {
    if (this._messageHandlers) {
      return this._messageHandlers;
    }

    this._messageHandlers = {
      setSmokeMarkdownEnabled: (message) => {
        setSidebarSmokeMarkdownEnabled(Boolean(message.enabled));
        this.postStateUpdate();
      },
      setSmokeMarkdownPath: (message) => {
        setSidebarSmokeMarkdownPath(String(message.text || ""));
        this.postStateUpdate();
      },
      setSmokeTimeout: (message) => {
        setSidebarSmokeTimeout(String(message.text || ""));
        this.postStateUpdate();
      },
      setSmokeSlowTimeout: (message) => {
        setSidebarSmokeSlowTimeout(String(message.text || ""));
        this.postStateUpdate();
      },
      setSmokeLanguageEnabled: (message) => {
        setSidebarSmokeLanguageEnabled(
          String(message.languageKey || ""),
          Boolean(message.enabled)
        );
        this.postStateUpdate();
      },
      setSmokeAllLanguagesEnabled: (message) => {
        setSidebarSmokeAllLanguagesEnabled(Boolean(message.enabled));
        this.postStateUpdate();
      },
    };

    return this._messageHandlers;
  }

  /**
   * Handles one webview message from the smoke-controls UI.
   *
   * @param {{type?: string, enabled?: boolean, text?: string, languageKey?: string}} message Incoming webview message.
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
   * Posts the latest smoke-controls state to the active webview without rerendering the document.
   *
   * @returns {void}
   */
  postStateUpdate() {
    const activeWebviewView = this._lifecycle.getActiveWebviewView();

    if (!activeWebviewView) {
      return;
    }

    void activeWebviewView.webview.postMessage({
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
    this._lifecycle.resolveWebviewView(webviewView);
  }

  /**
   * Refreshes the currently visible smoke-controls webview.
   *
   * @returns {void}
   */
  refresh() {
    this._lifecycle.refresh();
  }
}

/**
 * Registers the sidebar smoke-controls webview.
 *
 * @param {import("vscode").Uri} extensionUri Extension installation URI.
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerSidebarSmokeControlsView(extensionUri) {
  const provider = new SidebarSmokeControlsViewProvider(extensionUri);
  const registration = vscode.window.registerWebviewViewProvider(
    VIEW_IDS.SMOKE_CONTROLS,
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
    SidebarSmokeControlsViewProvider,
  },
  registerSidebarSmokeControlsView,
};
