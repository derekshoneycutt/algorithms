const vscode = require("vscode");
const { VIEW_IDS } = require("../runtime/viewConstants");
const {
  buildLanguageIconUris,
  buildWebviewErrorHtmlDocument,
  createTemplateWebviewProvider,
  createSidebarWebviewLifecycle,
  readTextFileSafe,
  renderSectionHeader,
  renderTemplate,
  serializeForScript,
} = require("./webviewHostUtils");
const {
  getLanguageDisplayLabel,
  LANGUAGE_ICON_FILE_BY_KEY,
} = require("../runtime/languageMetadata");
const {
  expandHomePath,
  resolveEnvironmentRootInfo,
  getProfilePlaceholderForPlatform,
  getDefaultProfilePathForPlatform,
  extractManagedExportValue,
  parseInitDefaults,
  buildProfileArgs,
  filterCheckEnvOutput,
  runInitScriptCommand,
  buildMergedEnvironmentConfig,
} = require("./shellProfileUtils");

const ENVIRONMENT_MEDIA_PATH_SEGMENTS = ["src", "ui", "media"];
const ENVIRONMENT_SHARED_CSS_FILE_NAME = "panelShared.css";
const ENVIRONMENT_INIT_CSS_FILE_NAME = "environmentInit.css";
const ENVIRONMENT_INIT_JS_FILE_NAME = "environmentInit.js";
const ENVIRONMENT_SHARED_UTILS_JS_FILE_NAME = "webviewSharedUtils.js";
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
  const rootInfo = resolveEnvironmentRootInfo(vscode);
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
    vscode,
    provider._languageIconBaseUri,
    provider._fallbackIconUri,
    LANGUAGE_ICON_FILE_BY_KEY
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
      label: getLanguageDisplayLabel(languageKey),
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
  const sharedStylesheetUri = webview.asWebviewUri(
    vscode.Uri.joinPath(provider._mediaBaseUri, ENVIRONMENT_SHARED_CSS_FILE_NAME)
  ).toString();
  const stylesheetUri = webview.asWebviewUri(
    vscode.Uri.joinPath(provider._mediaBaseUri, ENVIRONMENT_INIT_CSS_FILE_NAME)
  ).toString();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(provider._mediaBaseUri, ENVIRONMENT_INIT_JS_FILE_NAME)
  ).toString();
  const sharedUtilsScriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(provider._mediaBaseUri, ENVIRONMENT_SHARED_UTILS_JS_FILE_NAME)
  ).toString();

  return renderTemplate(templates.shell, {
    cspSource,
    sharedStylesheetUri,
    stylesheetUri,
    scriptUri,
    sharedUtilsScriptUri,
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
    this._languageIconBaseUri = vscode.Uri.joinPath(
      extensionUri,
      ...LANGUAGE_ICON_PATH_SEGMENT.split("/")
    );
    this._iconRootUri = vscode.Uri.joinPath(extensionUri, "icons");
    this._fallbackIconUri = vscode.Uri.joinPath(
      extensionUri,
      ...FALLBACK_ICON_PATH_SEGMENT.split("/")
    );
    this._templateProvider = createTemplateWebviewProvider({
      vscodeApi: vscode,
      extensionUri,
      mediaPathSegments: ENVIRONMENT_MEDIA_PATH_SEGMENTS,
      templatePathSegments: ENVIRONMENT_TEMPLATE_PATH_SEGMENTS,
      templateOwnerName: "Environment",
      requiredTemplateNames: ENVIRONMENT_REQUIRED_TEMPLATE_NAMES,
      buildTemplateMap: (templateByName) => {
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
      },
      assetFileNameByKey: {},
      localResourceRoots: ({ mediaBaseUri, templateBaseUri }) => {
        return [
          this._languageIconBaseUri,
          this._iconRootUri,
          mediaBaseUri,
          templateBaseUri,
        ];
      },
      buildHtml: (webview) => {
        return buildEnvironmentHtml(webview, this);
      },
      buildErrorHtml: (webview, error) => {
        const failureText = String(
          error?.message || "Environment pane failed to render templates."
        );
        return buildEnvironmentErrorHtml(webview, failureText);
      },
      handleMessage: (message) => {
        this.handleMessage(message);
      },
    });
    this._mediaBaseUri = this._templateProvider.mediaBaseUri;
    this._templateBaseUri = this._templateProvider.templateBaseUri;
    this._lifecycle = this._templateProvider.lifecycle;
  }

  /**
   * Loads one Environment template file using shared process cache.
   *
   * @param {string} templateFileName Template file name.
   * @returns {string} Template contents.
   */
  getTemplate(templateFileName) {
    return this._templateProvider.getTemplate(templateFileName);
  }

  /**
   * Returns all Environment templates.
   *
   * @returns {{shell: string, panel: string, profileSection: string, checkEnvSection: string, copyIconsSection: string, variablesSection: string, routingSection: string, batchSection: string, variableCard: string, languageRow: string}} Template map.
   */
  getTemplates() {
    return this._templateProvider.getTemplates();
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
    const activeWebviewView = this._lifecycle.getActiveWebviewView();

    if (!activeWebviewView) {
      return;
    }

    void activeWebviewView.webview.postMessage({
      type: "environmentState",
      state: buildEnvironmentStateSnapshot(this, activeWebviewView.webview),
    });
  }

  /**
   * Runs check-env and stores filtered/raw output in pane state.
   *
   * @returns {Promise<void>} Completion result.
   */
  async runCheckEnv() {
    const rootInfo = resolveEnvironmentRootInfo(vscode);

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
    const rootInfo = resolveEnvironmentRootInfo(vscode);

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
    const rootInfo = resolveEnvironmentRootInfo(vscode);
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
    const rootInfo = resolveEnvironmentRootInfo(vscode);
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
      text: `Saving ${getLanguageDisplayLabel(languageKey)} routing...`,
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
            ? `${getLanguageDisplayLabel(languageKey)} routing saved.`
            : filterCheckEnvOutput(result.combinedOutput) || `${getLanguageDisplayLabel(languageKey)} routing save failed.`,
      });
    } catch (error) {
      this._routingStatusByLanguageKey.set(languageKey, {
        kind: "error",
        text: `${getLanguageDisplayLabel(languageKey)} routing save failed: ${error.message}`,
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
    const rootInfo = resolveEnvironmentRootInfo(vscode);
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
    this._lifecycle.resolveWebviewView(webviewView);
  }

  /**
   * Refreshes the current Environment pane webview document.
   *
   * @returns {void}
   */
  refresh() {
    this._lifecycle.refresh();
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
  _internal: {
    EnvironmentInitViewProvider,
  },
  registerEnvironmentInitView,
};