const vscode = require("vscode");
const { VIEW_IDS } = require("../runtime/viewConstants");
const {
  buildLanguageIconUris,
  buildWebviewErrorHtmlDocument,
  createTemplateWebviewProvider,
  createSidebarWebviewLifecycle,
  renderSectionHeader,
  renderTemplate,
  serializeForScript,
} = require("./webviewHostUtils");
const {
  getLanguageDisplayLabel,
  LANGUAGE_ICON_FILE_BY_KEY,
} = require("../runtime/languageMetadata");
const {
  createEnvironmentProfileAdapter,
} = require("../runtime/commandline/adapters/environmentProfileAdapter");
const {
  INIT_OPERATION_CHECK_ENV,
  INIT_OPERATION_COPY_ICONS,
  INIT_OPERATION_SAVE_VARIABLE,
  INIT_OPERATION_SAVE_LANGUAGE_ROUTING,
  INIT_OPERATION_SAVE_BATCH_ROUTING,
  executeInitOperation,
  buildBatchConflictResult,
  buildBatchMissingContextResult,
  buildBatchRunningResult,
  buildCheckEnvMissingContextResult,
  buildCheckEnvRunningResult,
  buildCopyIconsMissingContextResult,
  buildCopyIconsRunningResult,
  buildRoutingConflictStatus,
  buildRoutingMissingContextStatus,
  buildRoutingRunningStatus,
  buildVariableMissingContextStatus,
  buildVariableRunningStatus,
} = require("../runtime/commandline/adapters/initCommandAdapter");
const {
  extensionStateStore,
  actionCreators,
  selectEnvironmentCheckEnvResult,
  selectEnvironmentCopyIconsResult,
  selectEnvironmentBatchRoutingResult,
  selectEnvironmentDraftValues,
  selectEnvironmentParsedConfig,
  selectEnvironmentVariableStatus,
  selectEnvironmentRoutingStatus,
} = require("../runtime/extensionStateStore");

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
const environmentProfileAdapter = createEnvironmentProfileAdapter();

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
  const draftValues = selectEnvironmentDraftValues();
  const profileSnapshot = environmentProfileAdapter.hydrateParsedConfig(vscode);
  const mergedConfig = profileSnapshot.parsedConfig;
  const iconMetadata = buildLanguageIconUris(
    webview,
    vscode,
    provider._languageIconBaseUri,
    provider._fallbackIconUri,
    LANGUAGE_ICON_FILE_BY_KEY
  );
  const variables = CORE_VARIABLE_DEFINITIONS.map((definition) => {
    const status = provider.getVariableStatus(definition.key) || {
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
    const status = provider.getRoutingStatus(languageKey) || {
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
    profilePath: draftValues.profilePath,
    profilePlaceholder: profileSnapshot.profilePlaceholder,
    effectiveProfilePath: profileSnapshot.effectiveProfilePath,
    copyIconsPath: draftValues.copyIconsPath,
    copyIconsPlaceholder: mergedConfig.defaults.copyIconsTo,
    sectionHeaders: buildEnvironmentSectionHeaders(),
    checkEnv: provider.getCheckEnvResult(),
    copyIconsResult: provider.getCopyIconsResult(),
    variables,
    batch: {
      dockerEnabled: draftValues.batchDockerEnabled,
      dockerValue: draftValues.batchDockerValue,
      sshEnabled: draftValues.batchSshEnabled,
      sshValue: draftValues.batchSshValue,
      isConflict: draftValues.batchDockerEnabled && draftValues.batchSshEnabled,
      statusKind: provider.getBatchRoutingResult().kind,
      statusText: provider.getBatchRoutingResult().text,
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

class EnvironmentInitViewProvider {
  /**
   * Creates an Environment pane provider.
   *
   * @param {import("vscode").Uri} extensionUri Extension installation URI.
   * @returns {void}
   */
  constructor(extensionUri) {
    extensionStateStore.dispatch(actionCreators.resetEnvironmentStatus());
    extensionStateStore.dispatch(actionCreators.resetEnvironmentDraftValues());
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
    environmentProfileAdapter.applyDraftFields(message);
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
   * Returns the latest check-env result from central store.
   *
   * @returns {{kind: string, text: string, filteredOutput: string, rawOutput: string}} Check-env result state.
   */
  getCheckEnvResult() {
    return selectEnvironmentCheckEnvResult();
  }

  /**
   * Stores one check-env result snapshot in central store.
   *
   * @param {{kind: string, text: string, filteredOutput: string, rawOutput: string}} result Check-env result state.
   * @returns {void}
   */
  setCheckEnvResult(result) {
    extensionStateStore.dispatch(actionCreators.setEnvironmentCheckEnvResult(result));
  }

  /**
   * Returns the latest copy-icons result from central store.
   *
   * @returns {{kind: string, text: string}} Copy-icons result state.
   */
  getCopyIconsResult() {
    return selectEnvironmentCopyIconsResult();
  }

  /**
   * Stores one copy-icons result snapshot in central store.
   *
   * @param {{kind: string, text: string}} result Copy-icons result state.
   * @returns {void}
   */
  setCopyIconsResult(result) {
    extensionStateStore.dispatch(actionCreators.setEnvironmentCopyIconsResult(result));
  }

  /**
   * Returns the latest batch-routing result from central store.
   *
   * @returns {{kind: string, text: string}} Batch-routing result state.
   */
  getBatchRoutingResult() {
    return selectEnvironmentBatchRoutingResult();
  }

  /**
   * Stores one batch-routing result snapshot in central store.
   *
   * @param {{kind: string, text: string}} result Batch-routing result state.
   * @returns {void}
   */
  setBatchRoutingResult(result) {
    extensionStateStore.dispatch(actionCreators.setEnvironmentBatchRoutingResult(result));
  }

  /**
   * Returns one variable status snapshot by key.
   *
   * @param {string} variableKey Variable identifier.
   * @returns {object|null} Variable status entry.
   */
  getVariableStatus(variableKey) {
    return selectEnvironmentVariableStatus(variableKey);
  }

  /**
   * Stores one variable status snapshot by key.
   *
   * @param {string} variableKey Variable identifier.
   * @param {object|null} statusEntry Variable status entry.
   * @returns {void}
   */
  setVariableStatus(variableKey, statusEntry) {
    extensionStateStore.dispatch(
      actionCreators.setEnvironmentVariableStatus(variableKey, statusEntry)
    );
  }

  /**
   * Returns one routing status snapshot by language key.
   *
   * @param {string} languageKey Language identifier.
   * @returns {object|null} Routing status entry.
   */
  getRoutingStatus(languageKey) {
    return selectEnvironmentRoutingStatus(languageKey);
  }

  /**
   * Stores one routing status snapshot by language key.
   *
   * @param {string} languageKey Language identifier.
   * @param {object|null} statusEntry Routing status entry.
   * @returns {void}
   */
  setRoutingStatus(languageKey, statusEntry) {
    extensionStateStore.dispatch(
      actionCreators.setEnvironmentRoutingStatus(languageKey, statusEntry)
    );
  }

  /**
   * Runs check-env and stores filtered/raw output in pane state.
   *
   * @returns {Promise<void>} Completion result.
   */
  async runCheckEnv() {
    const draftValues = selectEnvironmentDraftValues();
    const profileSnapshot = environmentProfileAdapter.hydrateParsedConfig(vscode);
    const rootInfo = profileSnapshot.rootInfo;

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this.setCheckEnvResult(buildCheckEnvMissingContextResult());
      this.postStateUpdate();
      return;
    }

    this.setCheckEnvResult(buildCheckEnvRunningResult());
    this.postStateUpdate();

    const status = await executeInitOperation({
      operation: INIT_OPERATION_CHECK_ENV,
      resolvedRootPath: rootInfo.resolvedRootPath,
      initScriptPath: rootInfo.initScriptPath,
      profilePath: draftValues.profilePath,
    });

    this.setCheckEnvResult(status);

    this.postStateUpdate();
  }

  /**
   * Runs icon copy through init.sh with profile updates skipped.
   *
   * @returns {Promise<void>} Completion result.
   */
  async runCopyIcons() {
    const draftValues = selectEnvironmentDraftValues();
    const profileSnapshot = environmentProfileAdapter.hydrateParsedConfig(vscode);
    const rootInfo = profileSnapshot.rootInfo;

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this.setCopyIconsResult(buildCopyIconsMissingContextResult());
      this.postStateUpdate();
      return;
    }

    this.setCopyIconsResult(buildCopyIconsRunningResult());
    this.postStateUpdate();

    const status = await executeInitOperation({
      operation: INIT_OPERATION_COPY_ICONS,
      resolvedRootPath: rootInfo.resolvedRootPath,
      initScriptPath: rootInfo.initScriptPath,
      profilePath: draftValues.profilePath,
      copyIconsPath: draftValues.copyIconsPath,
    });

    this.setCopyIconsResult(status);

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
    const draftValues = selectEnvironmentDraftValues();
    const profileSnapshot = environmentProfileAdapter.hydrateParsedConfig(vscode);
    const rootInfo = profileSnapshot.rootInfo;
    const definition = CORE_VARIABLE_DEFINITIONS.find(
      (item) => item.key === variableKey
    );

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath || !definition) {
      this.setVariableStatus(variableKey, buildVariableMissingContextStatus());
      this.postStateUpdate();
      return;
    }

    this.setVariableStatus(variableKey, buildVariableRunningStatus(definition.label));
    this.postStateUpdate();

    const status = await executeInitOperation({
      operation: INIT_OPERATION_SAVE_VARIABLE,
      resolvedRootPath: rootInfo.resolvedRootPath,
      initScriptPath: rootInfo.initScriptPath,
      profilePath: draftValues.profilePath,
      variable: {
        optionName: definition.optionName,
        value,
        label: definition.label,
      },
    });

    this.setVariableStatus(variableKey, status);

    this.postStateUpdate();
  }

  /**
   * Saves one language routing row after conflict validation.
   *
   * @param {{languageKey?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}|undefined} message Language save payload.
   * @returns {Promise<void>} Completion result.
   */
  async saveLanguageRouting(message) {
    const draftValues = selectEnvironmentDraftValues();
    const profileSnapshot = environmentProfileAdapter.hydrateParsedConfig(vscode);
    const rootInfo = profileSnapshot.rootInfo;
    const languageKey = String(message?.languageKey || "").trim().toLowerCase();
    const dockerEnabled = Boolean(message?.dockerEnabled);
    const dockerValue = String(message?.dockerValue || "").trim();
    const sshEnabled = Boolean(message?.sshEnabled);
    const sshValue = String(message?.sshValue || "").trim();

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath || !languageKey) {
      this.setRoutingStatus(languageKey, buildRoutingMissingContextStatus());
      this.postStateUpdate();
      return;
    }

    if (dockerEnabled && sshEnabled) {
      this.setRoutingStatus(languageKey, buildRoutingConflictStatus());
      this.postStateUpdate();
      return;
    }

    const languageLabel = getLanguageDisplayLabel(languageKey);

    this.setRoutingStatus(languageKey, buildRoutingRunningStatus(languageLabel));
    this.postStateUpdate();

    const status = await executeInitOperation({
      operation: INIT_OPERATION_SAVE_LANGUAGE_ROUTING,
      resolvedRootPath: rootInfo.resolvedRootPath,
      initScriptPath: rootInfo.initScriptPath,
      profilePath: draftValues.profilePath,
      routing: {
        languageKey,
        dockerEnabled,
        dockerValue,
        sshEnabled,
        sshValue,
        languageLabel,
      },
    });

    this.setRoutingStatus(languageKey, status);

    this.postStateUpdate();
  }

  /**
   * Saves one Batch All routing operation for every supported language.
   *
   * @returns {Promise<void>} Completion result.
   */
  async saveBatchRouting() {
    const draftValues = selectEnvironmentDraftValues();
    const profileSnapshot = environmentProfileAdapter.hydrateParsedConfig(vscode);
    const rootInfo = profileSnapshot.rootInfo;
    const parsedConfig = selectEnvironmentParsedConfig();

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this.setBatchRoutingResult(buildBatchMissingContextResult());
      this.postStateUpdate();
      return;
    }

    if (draftValues.batchDockerEnabled && draftValues.batchSshEnabled) {
      this.setBatchRoutingResult(buildBatchConflictResult());
      this.postStateUpdate();
      return;
    }

    this.setBatchRoutingResult(buildBatchRunningResult());
    this.postStateUpdate();

    const status = await executeInitOperation({
      operation: INIT_OPERATION_SAVE_BATCH_ROUTING,
      resolvedRootPath: rootInfo.resolvedRootPath,
      initScriptPath: rootInfo.initScriptPath,
      profilePath: draftValues.profilePath,
      batch: {
        supportedLanguageKeys: parsedConfig.defaults.supportedLanguageKeys,
        batchDockerEnabled: draftValues.batchDockerEnabled,
        batchDockerValue: draftValues.batchDockerValue,
        batchSshEnabled: draftValues.batchSshEnabled,
        batchSshValue: draftValues.batchSshValue,
      },
    });

    this.setBatchRoutingResult(status);

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