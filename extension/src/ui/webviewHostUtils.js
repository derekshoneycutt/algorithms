const fs = require("fs");
const path = require("path");

const templateTextCache = new Map();
const ENVIRONMENT_SECTION_ICON_SVG_BY_NAME = Object.freeze({
  profile:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
    + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '</svg>',
  check:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>',
  copy:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M6 3H11.5C12.33 3 13 3.67 13 4.5V10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<rect x="3" y="6" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
    + '</svg>',
  variables:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 4.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M4 8H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M4 11.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>'
    + '<circle cx="10" cy="8" r="1.2" fill="currentColor"/>'
    + '<circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/>'
    + '</svg>',
  routing:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<circle cx="4" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<circle cx="12" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<circle cx="8" cy="12" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5.2 4.8L6.9 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M10.8 4.8L9.1 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M5.5 4H10.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '</svg>',
  batch:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
    + '<rect x="6" y="6" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
    + '</svg>',
});

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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Reads a text file safely and returns an empty string on failure.
 *
 * @param {string} filePath Text file path.
 * @returns {string} File contents or empty string.
 */
function readTextFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`[algorithms-runner] readTextFileSafe failed for "${filePath}": ${err.message}`);
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
 * Returns the canonical source code for escapeHtml.
 *
 * @returns {string} Function source text.
 */
function getEscapeHtmlSource() {
  return String(escapeHtml);
}

/**
 * Returns the canonical source code for renderTemplate.
 *
 * @returns {string} Function source text.
 */
function getRenderTemplateSource() {
  return String(renderTemplate);
}

/**
 * Serializes JSON for safe inline-script embedding.
 *
 * @param {unknown} value JSON-serializable value.
 * @returns {string} Safe JSON string.
 */
function serializeForScript(value) {
  const serializedValue = JSON.stringify(value);
  const safeSerializedValue =
    typeof serializedValue === "string" ? serializedValue : "null";

  return safeSerializedValue
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Builds webview-safe icon URI map keyed by language id.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {typeof import("vscode")} vscodeApi VS Code API object.
 * @param {import("vscode").Uri} languageIconBaseUri Base icon directory URI.
 * @param {import("vscode").Uri} fallbackIconUri Fallback icon URI.
 * @param {Record<string, string>} languageIconFileByKey Language-to-icon filename map.
 * @returns {{fallbackIconUri: string, iconUriByLanguageKey: Map<string, string>}} Icon URI metadata.
 */
function buildLanguageIconUris(
  webview,
  vscodeApi,
  languageIconBaseUri,
  fallbackIconUri,
  languageIconFileByKey
) {
  const iconUriByLanguageKey = new Map();

  for (const [languageKey, iconFileName] of Object.entries(languageIconFileByKey)) {
    const iconUri = webview.asWebviewUri(
      vscodeApi.Uri.joinPath(languageIconBaseUri, iconFileName)
    );
    iconUriByLanguageKey.set(languageKey, iconUri.toString());
  }

  return {
    fallbackIconUri: webview.asWebviewUri(fallbackIconUri).toString(),
    iconUriByLanguageKey,
  };
}

/**
 * Returns inline SVG markup for a named section icon.
 *
 * @param {string} iconName Semantic icon key.
 * @param {Record<string, string>} [iconSvgByName] Icon map override.
 * @returns {string} Inline SVG markup.
 */
function getSectionIconSvg(iconName, iconSvgByName = ENVIRONMENT_SECTION_ICON_SVG_BY_NAME) {
  if (Object.prototype.hasOwnProperty.call(iconSvgByName, iconName)) {
    return iconSvgByName[iconName];
  }

  return "";
}

/**
 * Renders one section header with an icon and optional trusted actions.
 *
 * @param {string} title Section title.
 * @param {string} iconName Semantic icon key.
 * @param {string} [actionsHtml] Trusted pre-built HTML markup.
 * @param {Record<string, string>} [iconSvgByName] Icon map override.
 * @returns {string} Header markup.
 */
function renderSectionHeader(
  title,
  iconName,
  actionsHtml,
  iconSvgByName = ENVIRONMENT_SECTION_ICON_SVG_BY_NAME
) {
  return '<div class="sectionHeader">'
    + '<div class="sectionTitleGroup">'
    + getSectionIconSvg(iconName, iconSvgByName)
    + '<div class="sectionTitle">' + escapeHtml(title) + '</div>'
    + '</div>'
    + (actionsHtml || "")
    + '</div>';
}

/**
 * Creates a cached template loader rooted at one template directory.
 *
 * @param {string} basePath Absolute template directory path.
 * @returns {(templateFileName: string, templateOwnerName?: string) => string} Cached template loader.
 */
function makeTemplateLoader(basePath) {
  /**
   * Loads one template file from the configured base path.
   *
   * @param {string} templateFileName Template file name.
   * @param {string} [templateOwnerName] Human-readable template owner for error messages.
   * @returns {string} Template contents.
   */
  return function loadTemplate(templateFileName, templateOwnerName) {
    const templatePath = path.join(basePath, templateFileName);

    if (templateTextCache.has(templatePath)) {
      return templateTextCache.get(templatePath);
    }

    const templateText = readTextFileSafe(templatePath);

    if (!templateText.trim()) {
      const ownerName = String(templateOwnerName || "Template");
      const errorMessage =
        `${ownerName} template load failed: ${templateFileName}\n`
        + `Expected path: ${templatePath}`;
      console.error(`[algorithms-runner] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    templateTextCache.set(templatePath, templateText);
    return templateText;
  };
}

/**
 * Renders webview HTML with optional fallback rendering on failure.
 *
 * @param {{webview: import("vscode").Webview, buildHtml: (webview: import("vscode").Webview) => string, buildErrorHtml?: (webview: import("vscode").Webview, error: unknown) => string}} options Render options.
 * @returns {boolean} True when primary render succeeded.
 */
function renderWebviewHtmlWithFallback(options) {
  const webview = options.webview;
  const buildHtml = options.buildHtml;
  const buildErrorHtml = options.buildErrorHtml;

  try {
    webview.html = buildHtml(webview);
    return true;
  } catch (error) {
    if (typeof buildErrorHtml === "function") {
      webview.html = buildErrorHtml(webview, error);
      return false;
    }

    throw error;
  }
}

/**
 * Applies common resolve lifecycle behavior for sidebar webviews.
 *
 * @param {{webviewView: import("vscode").WebviewView, localResourceRoots: import("vscode").Uri[], buildHtml: (webview: import("vscode").Webview) => string, buildErrorHtml?: (webview: import("vscode").Webview, error: unknown) => string, handleMessage?: (message: unknown) => void, handleDispose?: (webviewView: import("vscode").WebviewView) => void}} options Resolve options.
 * @returns {void}
 */
function resolveSidebarWebviewView(options) {
  const webviewView = options.webviewView;

  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: options.localResourceRoots,
  };

  renderWebviewHtmlWithFallback({
    webview: webviewView.webview,
    buildHtml: options.buildHtml,
    buildErrorHtml: options.buildErrorHtml,
  });

  webviewView.webview.onDidReceiveMessage((message) => {
    if (typeof options.handleMessage === "function") {
      options.handleMessage(message);
    }
  });

  webviewView.onDidDispose(() => {
    if (typeof options.handleDispose === "function") {
      options.handleDispose(webviewView);
    }
  });
}

/**
 * Creates a reusable sidebar webview lifecycle controller.
 *
 * @param {{localResourceRoots: import("vscode").Uri[], buildHtml: (webview: import("vscode").Webview) => string, buildErrorHtml?: (webview: import("vscode").Webview, error: unknown) => string, handleMessage?: (message: unknown) => void, handleDispose?: (webviewView: import("vscode").WebviewView) => void}} options Lifecycle options.
 * @returns {{resolveWebviewView: (webviewView: import("vscode").WebviewView) => void, refresh: () => boolean, getActiveWebviewView: () => import("vscode").WebviewView|null}} Lifecycle controller.
 */
function createSidebarWebviewLifecycle(options) {
  let activeWebviewView = null;

  /**
   * Resolves one sidebar webview view and stores it as active.
   *
   * @param {import("vscode").WebviewView} webviewView Webview view instance.
   * @returns {void}
   */
  function resolveWebviewView(webviewView) {
    activeWebviewView = webviewView;
    resolveSidebarWebviewView({
      webviewView,
      localResourceRoots: options.localResourceRoots,
      buildHtml: options.buildHtml,
      buildErrorHtml: options.buildErrorHtml,
      handleMessage: options.handleMessage,
      handleDispose: (disposedWebviewView) => {
        if (activeWebviewView === disposedWebviewView) {
          activeWebviewView = null;
        }

        if (typeof options.handleDispose === "function") {
          options.handleDispose(disposedWebviewView);
        }
      },
    });
  }

  /**
   * Re-renders the active webview document when available.
   *
   * @returns {boolean} True when an active view was refreshed.
   */
  function refresh() {
    if (!activeWebviewView) {
      return false;
    }

    renderWebviewHtmlWithFallback({
      webview: activeWebviewView.webview,
      buildHtml: options.buildHtml,
      buildErrorHtml: options.buildErrorHtml,
    });

    return true;
  }

  /**
   * Returns the currently active sidebar webview view.
   *
   * @returns {import("vscode").WebviewView|null} Active webview view or null.
   */
  function getActiveWebviewView() {
    return activeWebviewView;
  }

  return {
    resolveWebviewView,
    refresh,
    getActiveWebviewView,
  };
}

/**
 * Creates a reusable template-backed sidebar provider core.
 *
 * @param {{vscodeApi: typeof import("vscode"), extensionUri: import("vscode").Uri, mediaPathSegments: string[], templatePathSegments: string[], templateOwnerName: string, requiredTemplateNames: string[], buildTemplateMap: (templateByName: Record<string, string>) => Record<string, string>, assetFileNameByKey?: Record<string, string>, localResourceRoots: import("vscode").Uri[]|((core: {mediaBaseUri: import("vscode").Uri, templateBaseUri: import("vscode").Uri}) => import("vscode").Uri[]), buildHtml: (webview: import("vscode").Webview, context: {templates: Record<string, string>, assetUris: Record<string, string>}) => string, buildErrorHtml?: (webview: import("vscode").Webview, error: unknown) => string, handleMessage?: (message: unknown) => void, handleDispose?: (webviewView: import("vscode").WebviewView) => void}} options Provider core options.
 * @returns {{mediaBaseUri: import("vscode").Uri, templateBaseUri: import("vscode").Uri, getTemplate: (templateFileName: string) => string, getTemplates: () => Record<string, string>, getAssetUris: (webview: import("vscode").Webview) => Record<string, string>, lifecycle: {resolveWebviewView: (webviewView: import("vscode").WebviewView) => void, refresh: () => boolean, getActiveWebviewView: () => import("vscode").WebviewView|null}}} Provider core.
 */
function createTemplateWebviewProvider(options) {
  const mediaBaseUri = options.vscodeApi.Uri.joinPath(
    options.extensionUri,
    ...options.mediaPathSegments
  );
  const templateBaseUri = options.vscodeApi.Uri.joinPath(
    options.extensionUri,
    ...options.templatePathSegments
  );
  const loadTemplate = makeTemplateLoader(templateBaseUri.fsPath);

  /**
   * Loads one template file from the provider template root.
   *
   * @param {string} templateFileName Template file name.
   * @returns {string} Template contents.
   */
  function getTemplate(templateFileName) {
    return loadTemplate(templateFileName, options.templateOwnerName);
  }

  /**
   * Resolves all required templates into the provider template map.
   *
   * @returns {Record<string, string>} Provider template map.
   */
  function getTemplates() {
    const templateByName = Object.fromEntries(
      options.requiredTemplateNames.map((templateFileName) => {
        return [templateFileName, getTemplate(templateFileName)];
      })
    );

    return options.buildTemplateMap(templateByName);
  }

  /**
   * Resolves webview-safe asset URIs keyed by asset role.
   *
   * @param {import("vscode").Webview} webview Webview instance.
   * @returns {Record<string, string>} Asset URI map.
   */
  function getAssetUris(webview) {
    const assetFileNameByKey = options.assetFileNameByKey || {};

    return Object.fromEntries(
      Object.entries(assetFileNameByKey).map(([assetKey, assetFileName]) => {
        const assetUri = webview.asWebviewUri(
          options.vscodeApi.Uri.joinPath(mediaBaseUri, assetFileName)
        ).toString();

        return [assetKey, assetUri];
      })
    );
  }

  const localResourceRoots =
    typeof options.localResourceRoots === "function"
      ? options.localResourceRoots({ mediaBaseUri, templateBaseUri })
      : options.localResourceRoots;

  const lifecycle = createSidebarWebviewLifecycle({
    localResourceRoots,
    buildHtml: (webview) => {
      return options.buildHtml(webview, {
        templates: getTemplates(),
        assetUris: getAssetUris(webview),
      });
    },
    buildErrorHtml: options.buildErrorHtml,
    handleMessage: options.handleMessage,
    handleDispose: options.handleDispose,
  });

  return {
    mediaBaseUri,
    templateBaseUri,
    getTemplate,
    getTemplates,
    getAssetUris,
    lifecycle,
  };
}

/**
 * Builds a CSP-safe fallback error document without inline styles.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {string} errorMessage Visible failure text.
 * @returns {string} Error HTML.
 */
function buildWebviewErrorHtmlDocument(webview, errorMessage) {
  const cspSource = webview.cspSource;
  const escapedMessage = escapeHtml(errorMessage);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; style-src ${cspSource};"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <pre>${escapedMessage}</pre>
  </body>
</html>`;
}

// Shared host-side helpers used by sidebar webview providers.
module.exports = {
  buildLanguageIconUris,
  buildWebviewErrorHtmlDocument,
  createTemplateWebviewProvider,
  createSidebarWebviewLifecycle,
  escapeHtml,
  getEscapeHtmlSource,
  getRenderTemplateSource,
  getSectionIconSvg,
  makeTemplateLoader,
  readTextFileSafe,
  renderWebviewHtmlWithFallback,
  resolveSidebarWebviewView,
  renderSectionHeader,
  renderTemplate,
  serializeForScript,
};
