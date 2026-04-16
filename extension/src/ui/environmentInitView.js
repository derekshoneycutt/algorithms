const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const vscode = require("vscode");
const { VIEW_IDS } = require("../runtime/viewConstants");
const {
  realpathSafe,
  resolveEligibilityState,
} = require("../runtime/pathResolver");
const {
  buildWebviewErrorHtmlDocument,
  makeTemplateLoader,
  readTextFileSafe,
  renderSectionHeader,
  renderTemplate,
  renderWebviewHtmlWithFallback,
  resolveSidebarWebviewView,
  serializeForScript,
} = require("./webviewHostUtils");
const {
  getSupportedLanguageKeys,
  LANGUAGE_ICON_FILE_BY_KEY,
} = require("../runtime/languageMetadata");

const ENVIRONMENT_MEDIA_PATH_SEGMENTS = ["src", "ui", "media"];
const ENVIRONMENT_INIT_CSS_FILE_NAME = "environmentInit.css";
const ENVIRONMENT_INIT_JS_FILE_NAME = "environmentInit.js";
const ENVIRONMENT_TEMPLATE_PATH_SEGMENTS = ["src", "ui", "templates"];
const ENVIRONMENT_SHELL_TEMPLATE_FILE_NAME = "environment-shell.html";
const ENVIRONMENT_PANEL_TEMPLATE_FILE_NAME = "environment-panel.html";
const ENVIRONMENT_PROFILE_SECTION_TEMPLATE_FILE_NAME =
  "environment-section-profile.html";
const ENVIRONMENT_CHECK_ENV_SECTION_TEMPLATE_FILE_NAME =
  "environment-section-check-env.html";
const ENVIRONMENT_COPY_ICONS_SECTION_TEMPLATE_FILE_NAME =
  "environment-section-copy-icons.html";
const ENVIRONMENT_VARIABLES_SECTION_TEMPLATE_FILE_NAME =
  "environment-section-variables.html";
const ENVIRONMENT_ROUTING_SECTION_TEMPLATE_FILE_NAME =
  "environment-section-routing.html";
const ENVIRONMENT_BATCH_SECTION_TEMPLATE_FILE_NAME =
  "environment-section-batch.html";
const ENVIRONMENT_VARIABLE_CARD_TEMPLATE_FILE_NAME =
  "environment-item-variable-card.html";
const ENVIRONMENT_LANGUAGE_ROW_TEMPLATE_FILE_NAME =
  "environment-item-language-row.html";
const ENVIRONMENT_REQUIRED_TEMPLATE_NAMES = [
  ENVIRONMENT_SHELL_TEMPLATE_FILE_NAME,
  ENVIRONMENT_PANEL_TEMPLATE_FILE_NAME,
  ENVIRONMENT_PROFILE_SECTION_TEMPLATE_FILE_NAME,
  ENVIRONMENT_CHECK_ENV_SECTION_TEMPLATE_FILE_NAME,
  ENVIRONMENT_COPY_ICONS_SECTION_TEMPLATE_FILE_NAME,
  ENVIRONMENT_VARIABLES_SECTION_TEMPLATE_FILE_NAME,
  ENVIRONMENT_ROUTING_SECTION_TEMPLATE_FILE_NAME,
  ENVIRONMENT_BATCH_SECTION_TEMPLATE_FILE_NAME,
  ENVIRONMENT_VARIABLE_CARD_TEMPLATE_FILE_NAME,
  ENVIRONMENT_LANGUAGE_ROW_TEMPLATE_FILE_NAME,
];
// Relative directory containing packaged language icons.
const LANGUAGE_ICON_PATH_SEGMENT = "icons/languages";
// Relative fallback icon path used when a language icon is missing.
const FALLBACK_ICON_PATH_SEGMENT = "icons/play-sidebar.svg";
// init.sh export block marker start.
const PROFILE_BLOCK_START = "# >>> DEREKALGOS INIT >>>";
// init.sh export block marker end.
const PROFILE_BLOCK_END = "# <<< DEREKALGOS INIT <<<";

// Language-to-icon mapping aligned to other extension panels.
// Variable save controls displayed in the Environment pane.
const CORE_VARIABLE_DEFINITIONS = [
  {
    key: "timeout",
    label: "Timeout",
    optionName: "use-timeout",
    profileExportName: "DEREKALGOS_TIMEOUT",
  },
  {
    key: "eiffel",
    label: "Eiffel",
    optionName: "use-eiffel",
    profileExportName: "DEREKALGOS_EIFFEL",
  },
  {
    key: "gcc13Directory",
    label: "GCC13 Directory",
    optionName: "use-gcc13",
    profileExportName: "DEREKALGOS_GCC13",
  },
  {
    key: "gcc13Name",
    label: "GCC13 Name",
    optionName: "use-gcc13name",
    profileExportName: "DEREKALGOS_GCC13NAME",
  },
  {
    key: "gxx13Name",
    label: "GXX13 Name",
    optionName: "use-gxx13name",
    profileExportName: "DEREKALGOS_GXX13NAME",
  },
];

/**
 * Expands a leading home marker in a profile path.
 *
 * @param {string} profilePath Candidate profile path.
 * @returns {string} Expanded profile path.
 */
function expandHomePath(profilePath) {
  const rawValue = String(profilePath || "").trim();

  if (!rawValue) {
    return "";
  }

  if (rawValue === "~") {
    return os.homedir();
  }

  if (rawValue.startsWith("~/")) {
    return path.join(os.homedir(), rawValue.slice(2));
  }

  return rawValue;
}

/**
 * Returns workspace folders from VS Code API.
 *
 * @returns {import("vscode").WorkspaceFolder[]} Open workspace folders.
 */
function getWorkspaceFolders() {
  return vscode.workspace.workspaceFolders || [];
}

/**
 * Resolves the active supported repository root and init.sh path.
 *
 * @returns {{resolvedRootPath: string|null, initScriptPath: string|null}} Root resolution metadata.
 */
function resolveEnvironmentRootInfo() {
  const eligibilityState = resolveEligibilityState(getWorkspaceFolders());
  const resolvedRootPath = eligibilityState?.selected?.resolvedRoot || null;

  if (!resolvedRootPath) {
    return {
      resolvedRootPath: null,
      initScriptPath: null,
    };
  }

  const canonicalRootPath = realpathSafe(resolvedRootPath);
  const initScriptPath = path.join(canonicalRootPath, "init.sh");

  try {
    if (!fs.statSync(initScriptPath).isFile()) {
      return {
        resolvedRootPath: null,
        initScriptPath: null,
      };
    }
  } catch (_) {
    return {
      resolvedRootPath: null,
      initScriptPath: null,
    };
  }

  return {
    resolvedRootPath: canonicalRootPath,
    initScriptPath,
  };
}

/**
 * Returns the platform-specific placeholder profile path.
 *
 * @returns {string} Placeholder profile path.
 */
function getProfilePlaceholderForPlatform() {
  if (process.platform === "freebsd") {
    return "~/.profile";
  }

  if (process.platform === "darwin") {
    return "~/.zprofile";
  }

  return "~/.bash_profile";
}

/**
 * Returns the platform-specific default profile path used for state hydration.
 *
 * @returns {string} Default profile path.
 */
function getDefaultProfilePathForPlatform() {
  return expandHomePath(getProfilePlaceholderForPlatform());
}

/**
 * Extracts one shell assignment value from init.sh.
 *
 * @param {string} scriptText init.sh text.
 * @param {string} variableName Assignment variable name.
 * @returns {string|null} Extracted assignment value or null.
 */
function extractShellAssignment(scriptText, variableName) {
  const assignmentPattern = new RegExp(`^${variableName}=(.*)$`, "m");
  const match = String(scriptText || "").match(assignmentPattern);

  if (!match) {
    return null;
  }

  const rawValue = String(match[1] || "").trim();

  if (
    rawValue.startsWith('"')
    && rawValue.endsWith('"')
    && rawValue.length >= 2
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

/**
 * Extracts one managed export value from a profile file.
 *
 * @param {string} profileText Profile file text.
 * @param {string} exportName Export variable name.
 * @returns {{present: boolean, value: string}} Export presence and value.
 */
function extractManagedExportValue(profileText, exportName) {
  const text = String(profileText || "");
  const blockStartIndex = text.indexOf(PROFILE_BLOCK_START);
  const blockEndIndex = text.indexOf(PROFILE_BLOCK_END);
  const scopedText =
    blockStartIndex >= 0 && blockEndIndex > blockStartIndex
      ? text.slice(blockStartIndex, blockEndIndex)
      : text;
  const exportPattern = new RegExp(`^export ${exportName}=(.*)$`, "m");
  const match = scopedText.match(exportPattern);

  if (!match) {
    return {
      present: false,
      value: "",
    };
  }

  let rawValue = String(match[1] || "").trim();

  if (
    rawValue.startsWith('"')
    && rawValue.endsWith('"')
    && rawValue.length >= 2
  ) {
    rawValue = rawValue.slice(1, -1);
  }

  rawValue = rawValue.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

  return {
    present: true,
    value: rawValue,
  };
}

/**
 * Parses init.sh defaults used by the Environment pane.
 *
 * @param {string} initScriptText init.sh text.
 * @param {string|null} resolvedRootPath Canonical repository root path.
 * @returns {{copyIconsTo: string, timeout: string, eiffel: string, gcc13Directory: string, gcc13Name: string, gxx13Name: string, runOnDocker: string, runOnSsh: string, supportedLanguageKeys: string[]}} Parsed defaults.
 */
function parseInitDefaults(initScriptText, resolvedRootPath) {
  const fallbackLanguageKeys = resolvedRootPath
    ? [...getSupportedLanguageKeys(resolvedRootPath)].sort((left, right) =>
        left.localeCompare(right)
      )
    : [];
  const supportedLanguageKeysText =
    extractShellAssignment(initScriptText, "supportedLanguageKeys") || "";
  const parsedSupportedLanguageKeys = supportedLanguageKeysText
    ? supportedLanguageKeysText
        .split(/\s+/)
        .map((languageKey) => languageKey.trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
    : fallbackLanguageKeys;

  return {
    copyIconsTo:
      extractShellAssignment(initScriptText, "copyIconsTo")
      || "~/.vscode/extensions/icons/",
    timeout: extractShellAssignment(initScriptText, "useTimeout") || "-k 10s 2m",
    eiffel: extractShellAssignment(initScriptText, "useEiffel") || "eiffelstudio",
    gcc13Directory:
      extractShellAssignment(initScriptText, "useGcc13") || "/usr/bin/",
    gcc13Name:
      extractShellAssignment(initScriptText, "useGcc13Name") || "gcc-13",
    gxx13Name:
      extractShellAssignment(initScriptText, "useGxx13Name") || "g++-13",
    runOnDocker: extractShellAssignment(initScriptText, "useRunOnDocker") || "",
    runOnSsh: extractShellAssignment(initScriptText, "useRunOnSsh") || "",
    supportedLanguageKeys: parsedSupportedLanguageKeys,
  };
}

/**
 * Parses a whitespace-delimited init.sh route map into a Map.
 *
 * @param {string} mapText Raw route map text.
 * @returns {Map<string, string>} Parsed route map.
 */
function parseRouteMap(mapText) {
  const routeMap = new Map();
  const rawText = String(mapText || "").trim();

  if (!rawText) {
    return routeMap;
  }

  const tokens = rawText.split(/\s+/);

  for (const token of tokens) {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const languageKey = token.slice(0, separatorIndex).trim().toLowerCase();
    const value = token.slice(separatorIndex + 1).trim();

    if (!languageKey || !value) {
      continue;
    }

    routeMap.set(languageKey, value);
  }

  return routeMap;
}

/**
 * Builds webview-safe icon URIs keyed by language.
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
 * Returns a human-friendly label for one language key.
 *
 * @param {string} languageKey Canonical language key.
 * @returns {string} Display label.
 */
function formatLanguageLabel(languageKey) {
  const rawKey = String(languageKey || "");
  const labelOverrides = {
    arm64asm: "ARM64 ASM",
    asm: "ASM",
    cpp: "C++",
    csharp: "C#",
    fsharp: "F#",
    gcc13Directory: "GCC13 Directory",
    gxx13Name: "GXX13 Name",
    llvmir: "LLVM IR",
    mmixal: "MMIXAL",
    modula3: "Modula-3",
    objectivec: "Objective-C",
    visualbasic: "Visual Basic",
  };

  if (labelOverrides[rawKey]) {
    return labelOverrides[rawKey];
  }

  if (rawKey.length <= 3) {
    return rawKey.toUpperCase();
  }

  return rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
}

/**
 * Returns command arguments for an optional profile override.
 *
 * @param {string} profilePath Draft profile path.
 * @returns {string[]} Optional init.sh profile args.
 */
function buildProfileArgs(profilePath) {
  const trimmedPath = String(profilePath || "").trim();

  if (!trimmedPath) {
    return [];
  }

  return [`--update-profile=${trimmedPath}`];
}

/**
 * Filters check-env output down to error-like lines or useful trailing lines.
 *
 * @param {string} combinedOutput Combined stdout/stderr output.
 * @returns {string} Filtered output text.
 */
function filterCheckEnvOutput(combinedOutput) {
  const lines = String(combinedOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const errorLikeLines = lines.filter((line) =>
    /(error|invalid|failed|missing|unsupported)/i.test(line)
  );

  if (errorLikeLines.length > 0) {
    return errorLikeLines.join("\n");
  }

  return lines.slice(-40).join("\n");
}

/**
 * Runs init.sh non-interactively and captures output.
 *
 * @param {string} resolvedRootPath Canonical repository root path.
 * @param {string} initScriptPath Canonical init.sh path.
 * @param {string[]} args init.sh arguments.
 * @returns {Promise<{exitCode: number|null, stdout: string, stderr: string, combinedOutput: string}>} Command result.
 */
function runInitScriptCommand(resolvedRootPath, initScriptPath, args) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn("sh", [initScriptPath, ...args], {
      cwd: resolvedRootPath,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";

    childProcess.stdout.setEncoding("utf8");
    childProcess.stderr.setEncoding("utf8");

    childProcess.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    childProcess.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    childProcess.on("error", (error) => {
      reject(error);
    });

    childProcess.on("close", (exitCode) => {
      resolve({
        exitCode: typeof exitCode === "number" ? exitCode : null,
        stdout,
        stderr,
        combinedOutput: [stdout, stderr].filter(Boolean).join("\n").trim(),
      });
    });
  });
}

/**
 * Builds the merged Environment pane configuration from init defaults and profile exports.
 *
 * @param {string} initScriptText init.sh text.
 * @param {string} profileText Effective profile text.
 * @param {string|null} resolvedRootPath Canonical repository root path.
 * @returns {{defaults: object, values: object, routeMaps: {docker: Map<string, string>, ssh: Map<string, string>}}} Merged config.
 */
function buildMergedEnvironmentConfig(initScriptText, profileText, resolvedRootPath) {
  const defaults = parseInitDefaults(initScriptText, resolvedRootPath);
  const timeoutExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_TIMEOUT"
  );
  const eiffelExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_EIFFEL"
  );
  const gcc13Export = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GCC13"
  );
  const gcc13NameExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GCC13NAME"
  );
  const gxx13NameExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GXX13NAME"
  );
  const runOnDockerExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_RUNONDOCKER"
  );
  const runOnSshExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_RUNONSSH"
  );
  const dockerMapText = runOnDockerExport.present
    ? runOnDockerExport.value
    : defaults.runOnDocker;
  const sshMapText = runOnSshExport.present
    ? runOnSshExport.value
    : defaults.runOnSsh;

  return {
    defaults,
    values: {
      timeout: timeoutExport.present ? timeoutExport.value : defaults.timeout,
      eiffel: eiffelExport.present ? eiffelExport.value : defaults.eiffel,
      gcc13Directory: gcc13Export.present
        ? gcc13Export.value
        : defaults.gcc13Directory,
      gcc13Name: gcc13NameExport.present
        ? gcc13NameExport.value
        : defaults.gcc13Name,
      gxx13Name: gxx13NameExport.present
        ? gxx13NameExport.value
        : defaults.gxx13Name,
      dockerMapText,
      sshMapText,
    },
    routeMaps: {
      docker: parseRouteMap(dockerMapText),
      ssh: parseRouteMap(sshMapText),
    },
  };
}

/**
 * Builds static section header markup for the Environment pane.
 *
 * @returns {{profile: string, checkEnv: string, copyIcons: string, variables: string, batch: string, routing: string}} Header markup.
 */
function buildEnvironmentSectionHeaders() {
  return {
    profile: renderSectionHeader(
      "Profile",
      "profile",
      '<div class="buttonRow"><button class="button secondary" data-action="refreshState">Refresh</button></div>'
    ),
    checkEnv: renderSectionHeader(
      "Check Environment",
      "check",
      '<div class="buttonRow"><button class="button" data-action="runCheckEnv">Check Environment</button></div>'
    ),
    copyIcons: renderSectionHeader(
      "Copy Icons",
      "copy",
      '<div class="buttonRow"><button class="button" data-action="runCopyIcons">Copy Icons</button></div>'
    ),
    variables: renderSectionHeader("Use Environment Variables", "variables"),
    batch: renderSectionHeader("Batch All", "batch"),
    routing: renderSectionHeader("Language Routing", "routing"),
  };
}

/**
 * Builds the Environment pane snapshot sent to the webview.
 *
 * @param {EnvironmentInitViewProvider} provider Environment pane provider.
 * @param {import("vscode").Webview} webview Webview instance.
 * @returns {{profilePath: string, profilePlaceholder: string, effectiveProfilePath: string, copyIconsPath: string, copyIconsPlaceholder: string, sectionHeaders: {profile: string, checkEnv: string, copyIcons: string, variables: string, batch: string, routing: string}, checkEnv: object, copyIconsResult: object, variables: object[], batch: object, languages: object[]}} Current state snapshot.
 */
function buildEnvironmentStateSnapshot(provider, webview) {
  const rootInfo = resolveEnvironmentRootInfo();
  const profilePlaceholder = getProfilePlaceholderForPlatform();
  const draftProfilePath = String(provider._profilePath || "");
  const effectiveProfilePath = draftProfilePath
    ? expandHomePath(draftProfilePath)
    : getDefaultProfilePathForPlatform();
  const initScriptText = rootInfo.initScriptPath
    ? readTextFileSafe(rootInfo.initScriptPath)
    : "";
  const profileText = effectiveProfilePath
    ? readTextFileSafe(effectiveProfilePath)
    : "";
  const mergedConfig = buildMergedEnvironmentConfig(
    initScriptText,
    profileText,
    rootInfo.resolvedRootPath
  );
  const iconMetadata = buildLanguageIconUris(
    webview,
    provider._languageIconBaseUri,
    provider._fallbackIconUri
  );
  const variables = CORE_VARIABLE_DEFINITIONS.map((definition) => {
    const status = provider._variableStatusByKey.get(definition.key) || {
      kind: "idle",
      text: "",
    };

    return {
      key: definition.key,
      label: definition.label,
      value: mergedConfig.values[definition.key] || "",
      statusKind: status.kind,
      statusText: status.text,
    };
  });
  const languages = mergedConfig.defaults.supportedLanguageKeys.map((languageKey) => {
    const dockerValue = mergedConfig.routeMaps.docker.get(languageKey) || "";
    const sshValue = mergedConfig.routeMaps.ssh.get(languageKey) || "";
    const hasDocker = dockerValue.length > 0;
    const hasSsh = sshValue.length > 0;
    const status = provider._routingStatusByLanguageKey.get(languageKey) || {
      kind: "idle",
      text: "",
    };

    return {
      key: languageKey,
      label: formatLanguageLabel(languageKey),
      iconUri:
        iconMetadata.iconUriByLanguageKey.get(languageKey)
        || iconMetadata.fallbackIconUri,
      dockerEnabled: hasDocker,
      dockerValue,
      sshEnabled: hasSsh,
      sshValue,
      isConflict: hasDocker && hasSsh,
      statusKind: status.kind,
      statusText: status.text,
    };
  });

  return {
    profilePath: draftProfilePath,
    profilePlaceholder,
    effectiveProfilePath,
    copyIconsPath: String(provider._copyIconsPath || ""),
    copyIconsPlaceholder: mergedConfig.defaults.copyIconsTo,
    sectionHeaders: buildEnvironmentSectionHeaders(),
    checkEnv: provider._checkEnvResult,
    copyIconsResult: provider._copyIconsResult,
    variables,
    batch: {
      dockerEnabled: provider._batchDockerEnabled,
      dockerValue: provider._batchDockerValue,
      sshEnabled: provider._batchSshEnabled,
      sshValue: provider._batchSshValue,
      isConflict: provider._batchDockerEnabled && provider._batchSshEnabled,
      statusKind: provider._batchRoutingResult.kind,
      statusText: provider._batchRoutingResult.text,
    },
    languages,
  };
}

/**
 * Builds the Environment pane webview HTML.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {EnvironmentInitViewProvider} provider Environment pane provider.
 * @returns {string} Rendered HTML.
 */
function buildEnvironmentHtml(webview, provider) {
  const stateSnapshot = buildEnvironmentStateSnapshot(provider, webview);
  const cspSource = webview.cspSource;
  const serializedState = serializeForScript(stateSnapshot);
  const templates = provider.getTemplates();
  const serializedTemplates = serializeForScript(templates);
  const stylesheetUri = webview.asWebviewUri(
    vscode.Uri.joinPath(provider._mediaBaseUri, ENVIRONMENT_INIT_CSS_FILE_NAME)
  ).toString();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(provider._mediaBaseUri, ENVIRONMENT_INIT_JS_FILE_NAME)
  ).toString();

  return renderTemplate(templates.shell, {
    cspSource,
    stylesheetUri,
    scriptUri,
    serializedState,
    serializedTemplates,
  });
}

/**
 * Builds an explicit error document for Environment pane failures.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {string} errorMessage Visible failure text.
 * @returns {string} Error HTML.
 */
function buildEnvironmentErrorHtml(webview, errorMessage) {
  return buildWebviewErrorHtmlDocument(webview, errorMessage);
}

/**
 * Provides the webview UI for init.sh-backed environment controls.
 */
class EnvironmentInitViewProvider {
  /**
   * Creates an Environment pane provider.
   *
   * @param {import("vscode").Uri} extensionUri Extension installation URI.
   * @returns {void}
   */
  constructor(extensionUri) {
    this._view = null;
    this._profilePath = "";
    this._copyIconsPath = "";
    this._batchDockerEnabled = false;
    this._batchDockerValue = "";
    this._batchSshEnabled = false;
    this._batchSshValue = "";
    this._checkEnvResult = {
      kind: "idle",
      text: "",
      filteredOutput: "",
      rawOutput: "",
    };
    this._copyIconsResult = {
      kind: "idle",
      text: "",
    };
    this._batchRoutingResult = {
      kind: "idle",
      text: "",
    };
    this._variableStatusByKey = new Map();
    this._routingStatusByLanguageKey = new Map();
    this._mediaBaseUri = vscode.Uri.joinPath(
      extensionUri,
      ...ENVIRONMENT_MEDIA_PATH_SEGMENTS
    );
    this._templateBaseUri = vscode.Uri.joinPath(
      extensionUri,
      ...ENVIRONMENT_TEMPLATE_PATH_SEGMENTS
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
  }

  /**
   * Loads one Environment template file using shared process cache.
   *
   * @param {string} templateFileName Template file name.
   * @returns {string} Template contents.
   */
  getTemplate(templateFileName) {
    return this._loadTemplate(templateFileName, "Environment");
  }

  /**
   * Returns all Environment templates.
   *
   * @returns {{shell: string, panel: string, profileSection: string, checkEnvSection: string, copyIconsSection: string, variablesSection: string, routingSection: string, batchSection: string, variableCard: string, languageRow: string}} Template map.
   */
  getTemplates() {
    const templateByName = Object.fromEntries(
      ENVIRONMENT_REQUIRED_TEMPLATE_NAMES.map((templateFileName) => {
        return [templateFileName, this.getTemplate(templateFileName)];
      })
    );

    return {
      shell: templateByName[ENVIRONMENT_SHELL_TEMPLATE_FILE_NAME],
      panel: templateByName[ENVIRONMENT_PANEL_TEMPLATE_FILE_NAME],
      profileSection:
        templateByName[ENVIRONMENT_PROFILE_SECTION_TEMPLATE_FILE_NAME],
      checkEnvSection:
        templateByName[ENVIRONMENT_CHECK_ENV_SECTION_TEMPLATE_FILE_NAME],
      copyIconsSection:
        templateByName[ENVIRONMENT_COPY_ICONS_SECTION_TEMPLATE_FILE_NAME],
      variablesSection:
        templateByName[ENVIRONMENT_VARIABLES_SECTION_TEMPLATE_FILE_NAME],
      routingSection:
        templateByName[ENVIRONMENT_ROUTING_SECTION_TEMPLATE_FILE_NAME],
      batchSection:
        templateByName[ENVIRONMENT_BATCH_SECTION_TEMPLATE_FILE_NAME],
      variableCard:
        templateByName[ENVIRONMENT_VARIABLE_CARD_TEMPLATE_FILE_NAME],
      languageRow:
        templateByName[ENVIRONMENT_LANGUAGE_ROW_TEMPLATE_FILE_NAME],
    };
  }

  /**
   * Updates draft profile/copy/batch fields from an incoming webview message.
   *
   * @param {{profilePath?: string, copyIconsPath?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}|undefined} message Incoming webview message.
   * @returns {void}
   */
  applyDraftFields(message) {
    if (typeof message?.profilePath === "string") {
      this._profilePath = message.profilePath;
    }

    if (typeof message?.copyIconsPath === "string") {
      this._copyIconsPath = message.copyIconsPath;
    }

    if (typeof message?.dockerEnabled === "boolean") {
      this._batchDockerEnabled = message.dockerEnabled;
    }

    if (typeof message?.dockerValue === "string") {
      this._batchDockerValue = message.dockerValue;
    }

    if (typeof message?.sshEnabled === "boolean") {
      this._batchSshEnabled = message.sshEnabled;
    }

    if (typeof message?.sshValue === "string") {
      this._batchSshValue = message.sshValue;
    }
  }

  /**
   * Posts the latest Environment pane state to the active webview.
   *
   * @returns {void}
   */
  postStateUpdate() {
    if (!this._view) {
      return;
    }

    void this._view.webview.postMessage({
      type: "environmentState",
      state: buildEnvironmentStateSnapshot(this, this._view.webview),
    });
  }

  /**
   * Runs check-env and stores filtered/raw output in pane state.
   *
   * @returns {Promise<void>} Completion result.
   */
  async runCheckEnv() {
    const rootInfo = resolveEnvironmentRootInfo();

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this._checkEnvResult = {
        kind: "error",
        text: "Unable to resolve repository root or init.sh.",
        filteredOutput: "",
        rawOutput: "",
      };
      this.postStateUpdate();
      return;
    }

    this._checkEnvResult = {
      kind: "running",
      text: "Running check-env...",
      filteredOutput: "",
      rawOutput: "",
    };
    this.postStateUpdate();

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        [
          "--no-prompt",
          "--no-icons",
          ...buildProfileArgs(this._profilePath),
          "--check-env",
        ]
      );
      const filteredOutput = filterCheckEnvOutput(result.combinedOutput);

      this._checkEnvResult = {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? "Environment check succeeded."
            : "Environment check found issues.",
        filteredOutput,
        rawOutput: result.combinedOutput,
      };
    } catch (error) {
      this._checkEnvResult = {
        kind: "error",
        text: `Environment check failed: ${error.message}`,
        filteredOutput: error.message,
        rawOutput: error.message,
      };
    }

    this.postStateUpdate();
  }

  /**
   * Runs icon copy through init.sh with profile updates skipped.
   *
   * @returns {Promise<void>} Completion result.
   */
  async runCopyIcons() {
    const rootInfo = resolveEnvironmentRootInfo();

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this._copyIconsResult = {
        kind: "error",
        text: "Unable to resolve repository root or init.sh.",
      };
      this.postStateUpdate();
      return;
    }

    this._copyIconsResult = {
      kind: "running",
      text: "Copying icons...",
    };
    this.postStateUpdate();

    const args = [
      "--no-prompt",
      "--copy-icons",
      "--skip-environment",
      ...buildProfileArgs(this._profilePath),
    ];
    const trimmedCopyIconsPath = String(this._copyIconsPath || "").trim();

    if (trimmedCopyIconsPath) {
      args.push(`--icons-to=${trimmedCopyIconsPath}`);
    }

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        args
      );

      this._copyIconsResult = {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? "Icons copied successfully."
            : filterCheckEnvOutput(result.combinedOutput) || "Icon copy failed.",
      };
    } catch (error) {
      this._copyIconsResult = {
        kind: "error",
        text: `Icon copy failed: ${error.message}`,
      };
    }

    this.postStateUpdate();
  }

  /**
   * Saves one core environment variable through init.sh.
   *
   * @param {string} variableKey Core variable key.
   * @param {string} value Variable value.
   * @returns {Promise<void>} Completion result.
   */
  async saveVariable(variableKey, value) {
    const rootInfo = resolveEnvironmentRootInfo();
    const definition = CORE_VARIABLE_DEFINITIONS.find(
      (item) => item.key === variableKey
    );

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath || !definition) {
      this._variableStatusByKey.set(variableKey, {
        kind: "error",
        text: "Unable to resolve init.sh variable save context.",
      });
      this.postStateUpdate();
      return;
    }

    this._variableStatusByKey.set(variableKey, {
      kind: "running",
      text: `Saving ${definition.label}...`,
    });
    this.postStateUpdate();

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        [
          "--no-prompt",
          "--no-icons",
          ...buildProfileArgs(this._profilePath),
          "--set-use-only",
          `--${definition.optionName}=${value}`,
        ]
      );

      this._variableStatusByKey.set(variableKey, {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? `${definition.label} saved.`
            : filterCheckEnvOutput(result.combinedOutput) || `${definition.label} save failed.`,
      });
    } catch (error) {
      this._variableStatusByKey.set(variableKey, {
        kind: "error",
        text: `${definition.label} save failed: ${error.message}`,
      });
    }

    this.postStateUpdate();
  }

  /**
   * Saves one language routing row after conflict validation.
   *
   * @param {{languageKey?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}|undefined} message Language save payload.
   * @returns {Promise<void>} Completion result.
   */
  async saveLanguageRouting(message) {
    const rootInfo = resolveEnvironmentRootInfo();
    const languageKey = String(message?.languageKey || "").trim().toLowerCase();
    const dockerEnabled = Boolean(message?.dockerEnabled);
    const dockerValue = String(message?.dockerValue || "").trim();
    const sshEnabled = Boolean(message?.sshEnabled);
    const sshValue = String(message?.sshValue || "").trim();

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath || !languageKey) {
      this._routingStatusByLanguageKey.set(languageKey, {
        kind: "error",
        text: "Unable to resolve routing save context.",
      });
      this.postStateUpdate();
      return;
    }

    if (dockerEnabled && sshEnabled) {
      this._routingStatusByLanguageKey.set(languageKey, {
        kind: "error",
        text: "Cannot save with both docker and ssh enabled.",
      });
      this.postStateUpdate();
      return;
    }

    this._routingStatusByLanguageKey.set(languageKey, {
      kind: "running",
      text: `Saving ${formatLanguageLabel(languageKey)} routing...`,
    });
    this.postStateUpdate();

    const args = [
      "--no-prompt",
      "--no-icons",
      ...buildProfileArgs(this._profilePath),
      dockerEnabled
        ? `--runondocker-set=${languageKey}=${dockerValue}`
        : `--runondocker-remove=${languageKey}`,
      sshEnabled
        ? `--runonssh-set=${languageKey}=${sshValue}`
        : `--runonssh-remove=${languageKey}`,
    ];

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        args
      );

      this._routingStatusByLanguageKey.set(languageKey, {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? `${formatLanguageLabel(languageKey)} routing saved.`
            : filterCheckEnvOutput(result.combinedOutput) || `${formatLanguageLabel(languageKey)} routing save failed.`,
      });
    } catch (error) {
      this._routingStatusByLanguageKey.set(languageKey, {
        kind: "error",
        text: `${formatLanguageLabel(languageKey)} routing save failed: ${error.message}`,
      });
    }

    this.postStateUpdate();
  }

  /**
   * Saves one Batch All routing operation for every supported language.
   *
   * @returns {Promise<void>} Completion result.
   */
  async saveBatchRouting() {
    const rootInfo = resolveEnvironmentRootInfo();
    const initScriptText = rootInfo.initScriptPath
      ? readTextFileSafe(rootInfo.initScriptPath)
      : "";
    const defaults = parseInitDefaults(initScriptText, rootInfo.resolvedRootPath);

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this._batchRoutingResult = {
        kind: "error",
        text: "Unable to resolve batch routing save context.",
      };
      this.postStateUpdate();
      return;
    }

    if (this._batchDockerEnabled && this._batchSshEnabled) {
      this._batchRoutingResult = {
        kind: "error",
        text: "Cannot save Batch All with both docker and ssh enabled.",
      };
      this.postStateUpdate();
      return;
    }

    this._batchRoutingResult = {
      kind: "running",
      text: "Applying Batch All routing...",
    };
    this.postStateUpdate();

    const args = [
      "--no-prompt",
      "--no-icons",
      ...buildProfileArgs(this._profilePath),
    ];

    for (const languageKey of defaults.supportedLanguageKeys) {
      args.push(
        this._batchDockerEnabled
          ? `--runondocker-set=${languageKey}=${this._batchDockerValue}`
          : `--runondocker-remove=${languageKey}`
      );
      args.push(
        this._batchSshEnabled
          ? `--runonssh-set=${languageKey}=${this._batchSshValue}`
          : `--runonssh-remove=${languageKey}`
      );
    }

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        args
      );

      this._batchRoutingResult = {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? "Batch All routing saved."
            : filterCheckEnvOutput(result.combinedOutput) || "Batch All routing save failed.",
      };
    } catch (error) {
      this._batchRoutingResult = {
        kind: "error",
        text: `Batch All routing save failed: ${error.message}`,
      };
    }

    this.postStateUpdate();
  }

  /**
   * Returns message handlers keyed by message type.
   *
   * @returns {Object.<string, (message: {variableKey?: string, value?: string, languageKey?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}) => void>} Message handlers.
   */
  getMessageHandlers() {
    if (this._messageHandlers) {
      return this._messageHandlers;
    }

    this._messageHandlers = {
      refreshState: () => {
        this.postStateUpdate();
      },
      runCheckEnv: () => {
        void this.runCheckEnv();
      },
      runCopyIcons: () => {
        void this.runCopyIcons();
      },
      saveVariable: (message) => {
        void this.saveVariable(
          String(message.variableKey || ""),
          String(message.value || "")
        );
      },
      saveLanguageRouting: (message) => {
        void this.saveLanguageRouting(message);
      },
      saveBatchRouting: () => {
        void this.saveBatchRouting();
      },
    };

    return this._messageHandlers;
  }

  /**
   * Handles one webview message from the Environment pane UI.
   *
   * @param {{type?: string, profilePath?: string, copyIconsPath?: string, variableKey?: string, value?: string, languageKey?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}|undefined} message Incoming webview message.
   * @returns {void}
   */
  handleMessage(message) {
    this.applyDraftFields(message);
    const messageType = String(message?.type || "");
    const messageHandler = this.getMessageHandlers()[messageType];

    if (messageHandler) {
      messageHandler(message || {});
    }
  }

  /**
   * Resolves one Environment pane webview instance.
   *
   * @param {import("vscode").WebviewView} webviewView Webview view instance.
   * @returns {void}
   */
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    resolveSidebarWebviewView({
      webviewView,
      localResourceRoots: [
        this._languageIconBaseUri,
        this._iconRootUri,
        this._mediaBaseUri,
        this._templateBaseUri,
      ],
      buildHtml: (webview) => {
        return buildEnvironmentHtml(webview, this);
      },
      buildErrorHtml: (webview, error) => {
        const failureText = String(
          error?.message || "Environment pane failed to load templates."
        );
        return buildEnvironmentErrorHtml(webview, failureText);
      },
      handleMessage: (message) => {
        this.handleMessage(message);
      },
      handleDispose: (disposedWebviewView) => {
        if (this._view === disposedWebviewView) {
          this._view = null;
        }
      },
    });
  }

  /**
   * Refreshes the current Environment pane webview document.
   *
   * @returns {void}
   */
  refresh() {
    if (!this._view) {
      return;
    }

    renderWebviewHtmlWithFallback({
      webview: this._view.webview,
      buildHtml: (webview) => {
        return buildEnvironmentHtml(webview, this);
      },
      buildErrorHtml: (webview, error) => {
        const failureText = String(
          error?.message || "Environment pane failed to refresh templates."
        );
        return buildEnvironmentErrorHtml(webview, failureText);
      },
    });
  }
}

/**
 * Registers the Environment pane webview provider.
 *
 * @param {import("vscode").Uri} extensionUri Extension installation URI.
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerEnvironmentInitView(extensionUri) {
  const provider = new EnvironmentInitViewProvider(extensionUri);
  const registration = vscode.window.registerWebviewViewProvider(
    VIEW_IDS.ENVIRONMENT,
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

// Public API for the Environment init pane.
module.exports = {
  registerEnvironmentInitView,
};