const vscode = require("vscode");
const {
  escapeHtml,
  readTextFileSafe,
  renderTemplate,
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

const SMOKE_CONTROLS_VIEW_ID = "algosWorkspaceSmokeControlsView";
const LANGUAGE_ICON_PATH_SEGMENT = "icons/languages";
const FALLBACK_ICON_PATH_SEGMENT = "icons/play-sidebar.svg";
const SMOKE_CONTROLS_MEDIA_PATH_SEGMENTS = ["src", "ui", "media"];
const SMOKE_CONTROLS_CSS_FILE_NAME = "smokeControls.css";
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
const smokeControlsTemplateCache = new Map();

const LANGUAGE_ICON_FILE_BY_KEY = {
  ada: "ada.svg",
  arm64asm: "assembly.svg",
  asm: "assembly.svg",
  ballerina: "ballerina.svg",
  c: "c.svg",
  clojure: "clojure.svg",
  cobol: "cobol.svg",
  cpp: "cpp.svg",
  csharp: "csharp.svg",
  d: "d.svg",
  dart: "dart.svg",
  eiffel: "eiffel.svg",
  elixir: "elixir.svg",
  erlang: "erlang.svg",
  factor: "factor.svg",
  forth: "forth.svg",
  fortran: "fortran.svg",
  freebasic: "freebasic.svg",
  fsharp: "fsharp.svg",
  gleam: "gleam.svg",
  go: "go.svg",
  haskell: "haskell.svg",
  haxe: "haxe.svg",
  icon: "icon.svg",
  idris: "idris.svg",
  java: "java.svg",
  javascript: "javascript.svg",
  julia: "julia.svg",
  kit: "kit.svg",
  kotlin: "kotlin.svg",
  llvmir: "llvm.png",
  lua: "lua.svg",
  mercury: "mercury.svg",
  mmixal: "assembly.svg",
  modula3: "modula3.svg",
  mojo: "mojo.svg",
  nasm: "assembly.svg",
  nim: "nim.svg",
  oberon: "oberon.svg",
  objectivec: "objective-c.svg",
  ocaml: "ocaml.svg",
  octave: "octave.svg",
  pascal: "pascal.svg",
  perl: "perl.svg",
  php: "php.svg",
  prolog: "prolog.svg",
  python: "python.svg",
  r: "r.svg",
  racket: "racket.svg",
  ruby: "ruby.svg",
  rust: "rust.svg",
  scala: "scala.svg",
  scheme: "scheme.svg",
  simula: "simula.svg",
  smalltalk: "smalltalk.svg",
  swift: "swift.svg",
  tcl: "tcl.svg",
  typescript: "typescript.svg",
  v: "vlang.svg",
  visualbasic: "visualstudio.svg",
  wat: "webassembly.svg",
  zig: "zig.svg",
};

/**
 * Returns the inline SVG used for one Smoke Controls section header.
 *
 * @param {string} iconName Semantic section icon key.
 * @returns {string} Inline SVG markup.
 */
function getSectionIconSvg(iconName) {
  if (iconName === "report") {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M4 2H10L12 4V13C12 13.55 11.55 14 11 14H4C3.45 14 3 13.55 3 13V3C3 2.45 3.45 2 4 2Z" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M10 2V4H12" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M5 7H11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
      + '<path d="M5 9.5H9" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
      + '</svg>';
  }

  if (iconName === "timeout") {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1"/>'
      + '<path d="M8 5V8L10 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
  }

  if (iconName === "languages") {
    return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<path d="M5 5L2 8L5 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M11 5L14 8L11 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M9 3L7 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
      + '</svg>';
  }

  return "";
}

/**
 * Renders one Smoke Controls section header with an icon and optional actions.
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
 * Builds webview-safe icon URI map keyed by language id.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {import("vscode").Uri} languageIconBaseUri Base icon directory URI.
 * @param {import("vscode").Uri} fallbackIconUri Fallback icon URI.
 * @returns {{fallbackIconUri: string, iconUriByLanguageKey: Map<string, string>}} Icon URI metadata.
 */
function buildLanguageIconUris(webview, languageIconBaseUri, fallbackIconUri) {
  const iconUriByLanguageKey = new Map();

  for (const [languageKey, iconFileName] of Object.entries(LANGUAGE_ICON_FILE_BY_KEY)) {
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(languageIconBaseUri, iconFileName)
    );
    iconUriByLanguageKey.set(languageKey, iconUri.toString());
  }

  return {
    fallbackIconUri: webview.asWebviewUri(fallbackIconUri).toString(),
    iconUriByLanguageKey,
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
    reportGenerationHeader: renderSectionHeader("Report Generation", "report"),
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
    timeoutsHeader: renderSectionHeader("Timeouts", "timeout"),
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
      '<div class="buttonRow"><button id="smokeSelectAll" class="button secondary" type="button">Select All</button><button id="smokeDeselectAll" class="button secondary" type="button">Deselect All</button></div>'
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
 * @param {string} stylesheetUri Webview stylesheet URI.
 * @param {string} scriptUri Webview script URI.
 * @param {{shell: string, reportGeneration: string, timeouts: string, languages: string}} templates Smoke-controls templates.
 * @param {{fallbackIconUri: string, iconUriByLanguageKey: Map<string, string>}} languageIconUris Webview-safe icon URI metadata.
 * @returns {string} Rendered HTML.
 */
function buildSmokeControlsHtml(webview, stylesheetUri, scriptUri, templates, languageIconUris) {
  const stateSnapshot = getSmokeControlsSnapshot();

  return renderTemplate(templates.shell, {
    cspSource: webview.cspSource,
    stylesheetUri,
    scriptUri,
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
    this._view = null;
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
  }

  /**
   * Loads one smoke-controls template file using shared process cache.
   *
   * @param {string} templateFileName Template file name.
   * @returns {string} Template contents.
   */
  getTemplate(templateFileName) {
    const templateUri = vscode.Uri.joinPath(this._templateBaseUri, templateFileName);
    const templatePath = templateUri.fsPath;

    if (smokeControlsTemplateCache.has(templatePath)) {
      return smokeControlsTemplateCache.get(templatePath);
    }

    const templateText = readTextFileSafe(templatePath);

    if (!templateText.trim()) {
      const errorMessage =
        `Smoke Controls template load failed: ${templateFileName}\n`
        + `Expected path: ${templatePath}`;
      console.error(`[algorithms-runner] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    smokeControlsTemplateCache.set(templatePath, templateText);
    return templateText;
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
   * @returns {{stylesheetUri: string, scriptUri: string}} Resource URI map.
   */
  getAssetUris(webview) {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._mediaBaseUri, SMOKE_CONTROLS_CSS_FILE_NAME)
    ).toString();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._mediaBaseUri, SMOKE_CONTROLS_JS_FILE_NAME)
    ).toString();

    return {
      stylesheetUri,
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
    const templates = this.getTemplates();
    const assetUris = this.getAssetUris(webviewView.webview);
    const languageIconUris = buildLanguageIconUris(
      webviewView.webview,
      this._languageIconBaseUri,
      this._fallbackIconUri
    );

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._languageIconBaseUri,
        this._iconRootUri,
        this._mediaBaseUri,
        this._templateBaseUri,
      ],
    };
    webviewView.webview.html = buildSmokeControlsHtml(
      webviewView.webview,
      assetUris.stylesheetUri,
      assetUris.scriptUri,
      templates,
      languageIconUris
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
   * Refreshes the currently visible smoke-controls webview.
   *
   * @returns {void}
   */
  refresh() {
    if (!this._view) {
      return;
    }

    const templates = this.getTemplates();
    const assetUris = this.getAssetUris(this._view.webview);
    const languageIconUris = buildLanguageIconUris(
      this._view.webview,
      this._languageIconBaseUri,
      this._fallbackIconUri
    );

    this._view.webview.html = buildSmokeControlsHtml(
      this._view.webview,
      assetUris.stylesheetUri,
      assetUris.scriptUri,
      templates,
      languageIconUris
    );
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
