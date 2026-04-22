// Path helpers are used to validate src hierarchy and derive execution context.
const path = require("path");
const { executeCommand } = require("../runtime/commandline/core/commandLineCore");
const { createRunCommandAdapter } = require("../runtime/commandline/adapters/runCommandAdapter");
const {
  createRuntimeProcessLifecycle,
} = require("../runtime/runtimeProcessLifecycle");
const {
  resolveActiveFileRunContext,
  resolveCleanContextFromExplorer,
  resolveLocalCleanContextFromExplorer,
} = require("../runtime/commandPathContext");
const {
  getEffectiveSidebarCleanDefaults,
  getEffectiveSidebarRunArgs,
  getEffectiveSidebarSourceProfile,
  getEffectiveSidebarRunChecks,
} = require("../runtime/sidebarRunArgsState");
// Validation and message helpers for active editor and language checks.
const {
  validateActiveEditorContext,
  validateSupportedLanguage,
  validateCheckOnlyRoute,
} = require("../validation/inputValidation");
const {
  showNotificationBySeverity,
  buildValidationBlockMessage,
  buildBuildFailureMessage,
  buildRuntimeFailureMessage,
  buildSuccessMessage,
} = require("../ui/notifications");
const runtimeProcessLifecycle = createRuntimeProcessLifecycle();

/**
 * Shows a validation block message and returns a blocked handler result.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{reason: string, guidance: string, severity: "info"|"warning"|"error"}} validation Validation payload.
 * @param {string} [commandLabel] Command label prefix for the message.
 * @returns {{ok: false, status: "blocked", reason: string}} Blocked execution result.
 */
function blockWithValidation(vscodeApi, validation, commandLabel) {
  showNotificationBySeverity(
    vscodeApi,
    validation.severity,
    buildValidationBlockMessage(validation, commandLabel)
  );
  return {
    ok: false,
    status: "blocked",
    reason: validation.reason,
  };
}

const runCommandAdapter = createRunCommandAdapter({
  runtimeProcessLifecycle,
  executeCommandFn: executeCommand,
  getEffectiveSidebarRunArgs,
  getEffectiveSidebarSourceProfile,
  getEffectiveSidebarRunChecks,
  blockWithValidation,
  showNotificationBySeverity,
  buildBuildFailureMessage,
  buildRuntimeFailureMessage,
  buildSuccessMessage,
});

/**
 * Executes one assembled script command from a resolved algorithm context.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{algorithmDir: string, scriptPath: string, displayScriptPath: string}} contextResolution Resolved execution context.
 * @param {{commandFamily: string, args: string[], commandLabel: string, successMessage: string, includeSidebarRunArgs?: boolean, includeSidebarSourceProfile?: boolean, includeSidebarRunChecks?: boolean}} execution Execution metadata.
 * @returns {{ok: boolean, status: string, reason: string|null}} Handler execution summary.
 */
function executeContextCommand(vscodeApi, contextResolution, execution) {
  return runCommandAdapter.executeContextCommand({
    vscodeApi,
    contextResolution,
    execution,
  });
}

/**
 * Resolves sidebar language metadata into algorithm/script execution context.
 *
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar item payload.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{missingItemGuidance: string, resolvedGuidance: string}} messages Guidance text for failure/success states.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error", algorithmDir: string|null, scriptPath: string|null, displayScriptPath: string|null, languageKey: string|null}} Resolution result.
 */
function resolveSidebarLanguageContext(item, eligibilityState, messages) {
  const selected = eligibilityState?.selected;
  const scriptPath = selected?.scriptPath;
  const algorithmDir = item?.algorithmPath;
  const languageKey = item?.languageKey;

  if (!scriptPath) {
    return {
      ok: false,
      reason: "missing-run-script-path",
      guidance: "Run script path is unavailable. Reopen the workspace and retry.",
      severity: "error",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
      languageKey: null,
    };
  }

  if (!algorithmDir || !languageKey) {
    return {
      ok: false,
      reason: "missing-language-sidebar-item",
      guidance: messages.missingItemGuidance,
      severity: "info",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
      languageKey: null,
    };
  }

  const relativeScriptPath = path.relative(algorithmDir, scriptPath);
  const displayScriptPath = relativeScriptPath || scriptPath;

  return {
    ok: true,
    reason: null,
    guidance: messages.resolvedGuidance,
    severity: "info",
    algorithmDir,
    scriptPath,
    displayScriptPath,
    languageKey,
  };
}

/**
 * Resolves one sidebar language item into algorithm/script execution context.
 *
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar language item.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error", algorithmDir: string|null, scriptPath: string|null, displayScriptPath: string|null, languageKey: string|null}} Resolution result.
 */
function resolveLanguageSidebarContext(item, eligibilityState) {
  return resolveSidebarLanguageContext(item, eligibilityState, {
    missingItemGuidance: "Select a language row in the sidebar and try again.",
    resolvedGuidance: "Language sidebar context resolved.",
  });
}

/**
 * Executes one language-targeted run.sh command from a sidebar language row.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar language item.
 * @param {{commandFamily: string, commandLabel: string, successMessage: string, buildArgs: (languageKey: string) => string[], includeSidebarRunChecks?: boolean}} execution Execution metadata.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runLanguageAtSidebarItem(vscodeApi, eligibilityState, item, execution) {
  const contextResolution = resolveLanguageSidebarContext(item, eligibilityState);

  if (!contextResolution.ok) {
    return blockWithValidation(vscodeApi, contextResolution, execution.commandLabel);
  }

  return executeContextCommand(vscodeApi, contextResolution, {
    commandFamily: execution.commandFamily,
    args: execution.buildArgs(contextResolution.languageKey),
    commandLabel: execution.commandLabel,
    successMessage: execution.successMessage,
    includeSidebarRunArgs: true,
    includeSidebarSourceProfile: true,
    includeSidebarRunChecks: Boolean(execution.includeSidebarRunChecks),
  });
}

/**
 * Resolves active editor to a compatible source-file path.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "warning"|"error", filePath: string|null}} Resolution result.
 */
function resolveActiveCompatibleSourceFile(vscodeApi, eligibilityState) {
  const editor = vscodeApi.window.activeTextEditor;
  const editorValidation = validateActiveEditorContext(editor);

  if (!editorValidation.ok) {
    return {
      ok: false,
      reason: editorValidation.reason,
      guidance: editorValidation.guidance,
      severity: editorValidation.severity,
      filePath: null,
    };
  }

  const filePath = editor.document.uri.fsPath;
  const languageValidation = validateSupportedLanguage(
    editor,
    eligibilityState,
    filePath
  );

  if (!languageValidation.ok) {
    return {
      ok: false,
      reason: languageValidation.reason,
      guidance: languageValidation.guidance,
      severity: languageValidation.severity,
      filePath: null,
    };
  }

  return {
    ok: true,
    reason: null,
    guidance: "Active compatible source file resolved.",
    severity: "warning",
    filePath,
  };
}

/**
 * Executes run flow for one resolved file path after preflight.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {string} filePath Absolute file path to execute.
 * @param {{commandFamily: string, commandLabel: string, successMessage: string, buildArgs: (filename: string) => string[], includeSidebarRunChecks?: boolean}} execution Execution metadata.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runFileAtPath(
  vscodeApi,
  eligibilityState,
  filePath,
  execution
) {
  const languageValidation = validateSupportedLanguage(
    undefined,
    eligibilityState,
    filePath
  );

  if (!languageValidation.ok) {
    return blockWithValidation(vscodeApi, languageValidation, execution.commandLabel);
  }

  const contextResolution = resolveActiveFileRunContext(filePath, eligibilityState);

  if (!contextResolution.ok) {
    return blockWithValidation(vscodeApi, contextResolution, execution.commandLabel);
  }

  return executeContextCommand(vscodeApi, contextResolution, {
    commandFamily: execution.commandFamily,
    args: execution.buildArgs(path.basename(contextResolution.filename)),
    commandLabel: execution.commandLabel,
    successMessage: execution.successMessage,
    includeSidebarRunArgs: true,
    includeSidebarSourceProfile: true,
    includeSidebarRunChecks: Boolean(execution.includeSidebarRunChecks),
  });
}

/**
 * Handles the Run Active File command end-to-end.
 *
 * The flow validates editor state, validates language support (with extension
 * fallback), resolves algorithm execution context, builds the run command, and
 * starts execution in the extension-owned terminal.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runActiveFileHandler(vscodeApi, eligibilityState) {
  const editor = vscodeApi.window.activeTextEditor;
  const editorValidation = validateActiveEditorContext(editor);

  if (!editorValidation.ok) {
    return blockWithValidation(vscodeApi, editorValidation, "Run Active File");
  }

  return runFileAtPath(
    vscodeApi,
    eligibilityState,
    editor.document.uri.fsPath,
    {
      commandFamily: "run-active-file",
      commandLabel: "Run Active File",
      successMessage: `Run Active File started in ${"Algorithms Runner"}.`,
      buildArgs: (filename) => [filename],
      includeSidebarRunChecks: true,
    }
  );
}

/**
 * Handles Run File invocation from Explorer context menu.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {import("vscode").Uri|undefined} targetUri Explorer-selected file URI.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runFileHandler(vscodeApi, eligibilityState, targetUri) {
  const filePath = targetUri?.fsPath;

  if (!filePath) {
    const validation = {
      reason: "missing-selected-file-path",
      guidance: "Select a file in Explorer and try again.",
      severity: "info",
    };
    return blockWithValidation(vscodeApi, validation, "Run File");
  }

  return runFileAtPath(
    vscodeApi,
    eligibilityState,
    filePath,
    {
      commandFamily: "run-file",
      commandLabel: "Run File",
      successMessage: `Run File started in ${"Algorithms Runner"}.`,
      buildArgs: (filename) => [filename],
      includeSidebarRunChecks: true,
    }
  );
}

/**
 * Handles localclean invocation from palette/editor-title/explorer contexts.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {import("vscode").Uri|undefined} targetUri Explorer-selected URI when invoked from Explorer.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runLocalCleanHandler(vscodeApi, eligibilityState, targetUri) {
  const explorerPath = targetUri?.fsPath;
  let contextResolution;

  if (explorerPath) {
    contextResolution = resolveLocalCleanContextFromExplorer(
      explorerPath,
      eligibilityState
    );
  } else {
    const activeSource = resolveActiveCompatibleSourceFile(
      vscodeApi,
      eligibilityState
    );

    if (!activeSource.ok) {
      return blockWithValidation(vscodeApi, activeSource, "Local Clean");
    }

    contextResolution = resolveActiveFileRunContext(
      activeSource.filePath,
      eligibilityState
    );
  }

  if (!contextResolution.ok) {
    return blockWithValidation(vscodeApi, contextResolution, "Local Clean");
  }

  return executeContextCommand(vscodeApi, contextResolution, {
    commandFamily: "run-localclean",
    args: ["localclean"],
    commandLabel: "Local Clean",
    successMessage: `Local Clean started in ${"Algorithms Runner"}.`,
  });
}

/**
 * Handles clean invocation from palette/editor-title/explorer contexts.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {import("vscode").Uri|undefined} targetUri Explorer-selected URI when invoked from Explorer.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runCleanHandler(vscodeApi, eligibilityState, targetUri) {
  const explorerPath = targetUri?.fsPath;
  let contextResolution;

  if (explorerPath) {
    contextResolution = resolveCleanContextFromExplorer(
      explorerPath,
      eligibilityState
    );
  } else {
    const activeSource = resolveActiveCompatibleSourceFile(
      vscodeApi,
      eligibilityState
    );

    if (!activeSource.ok) {
      return blockWithValidation(vscodeApi, activeSource, "Clean");
    }

    contextResolution = resolveActiveFileRunContext(
      activeSource.filePath,
      eligibilityState
    );
  }

  if (!contextResolution.ok) {
    return blockWithValidation(vscodeApi, contextResolution, "Clean");
  }

  const cleanDefaults = getEffectiveSidebarCleanDefaults();

  if (!cleanDefaults.ok) {
    const validation = {
      reason: "invalid-clean-defaults",
      guidance: cleanDefaults.reason || "Clean options are invalid.",
      severity: "warning",
    };

    return blockWithValidation(vscodeApi, validation, "Clean");
  }

  return executeContextCommand(vscodeApi, contextResolution, {
    commandFamily: "run-clean",
    args: ["clean", cleanDefaults.token],
    commandLabel: "Clean",
    successMessage: `Clean started in ${"Algorithms Runner"}.`,
  });
}

/**
 * Handles compile-only invocation from active-file or selected-file contexts.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {import("vscode").Uri|undefined} targetUri Explorer-selected URI when invoked from Explorer.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runActiveFileCompileOnlyHandler(
  vscodeApi,
  eligibilityState,
  targetUri
) {
  const selectedFilePath = targetUri?.fsPath;

  if (selectedFilePath) {
    return runFileAtPath(vscodeApi, eligibilityState, selectedFilePath, {
      commandFamily: "run-compile-only",
      commandLabel: "Compile Only",
      successMessage: `Compile Only started in ${"Algorithms Runner"}.`,
      buildArgs: (filename) => ["--compile-only", filename],
    });
  }

  const activeSource = resolveActiveCompatibleSourceFile(vscodeApi, eligibilityState);

  if (!activeSource.ok) {
    return blockWithValidation(vscodeApi, activeSource, "Compile Only");
  }

  return runFileAtPath(vscodeApi, eligibilityState, activeSource.filePath, {
    commandFamily: "run-compile-only",
    commandLabel: "Compile Only",
    successMessage: `Compile Only started in ${"Algorithms Runner"}.`,
    buildArgs: (filename) => ["--compile-only", filename],
  });
}

/**
 * Handles one route-specific check-only invocation from active-file or
 * selected-file contexts.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {import("vscode").Uri|undefined} targetUri Explorer-selected URI when invoked from Explorer.
 * @param {{route: "native"|"docker"|"ssh", commandLabel: string}} execution Route execution metadata.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runCheckOnlyRouteHandler(
  vscodeApi,
  eligibilityState,
  targetUri,
  execution
) {
  const routeValidation = validateCheckOnlyRoute(execution.route);

  if (!routeValidation.ok) {
    return blockWithValidation(vscodeApi, routeValidation, execution.commandLabel);
  }

  const selectedFilePath = targetUri?.fsPath;

  if (selectedFilePath) {
    return runFileAtPath(vscodeApi, eligibilityState, selectedFilePath, {
      commandFamily: "run-check-only",
      commandLabel: execution.commandLabel,
      successMessage: `${execution.commandLabel} started in ${"Algorithms Runner"}.`,
      buildArgs: (filename) => [`--check-only=${execution.route}`, filename],
    });
  }

  const activeSource = resolveActiveCompatibleSourceFile(vscodeApi, eligibilityState);

  if (!activeSource.ok) {
    return blockWithValidation(vscodeApi, activeSource, execution.commandLabel);
  }

  return runFileAtPath(vscodeApi, eligibilityState, activeSource.filePath, {
    commandFamily: "run-check-only",
    commandLabel: execution.commandLabel,
    successMessage: `${execution.commandLabel} started in ${"Algorithms Runner"}.`,
    buildArgs: (filename) => [`--check-only=${execution.route}`, filename],
  });
}

/**
 * Handles native check-only invocation from active-file or selected-file contexts.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {import("vscode").Uri|undefined} targetUri Explorer-selected URI when invoked from Explorer.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runActiveFileCheckOnlyNativeHandler(
  vscodeApi,
  eligibilityState,
  targetUri
) {
  return runCheckOnlyRouteHandler(vscodeApi, eligibilityState, targetUri, {
    route: "native",
    commandLabel: "Check Only (Native)",
  });
}

/**
 * Handles docker check-only invocation from active-file or selected-file contexts.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {import("vscode").Uri|undefined} targetUri Explorer-selected URI when invoked from Explorer.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runActiveFileCheckOnlyDockerHandler(
  vscodeApi,
  eligibilityState,
  targetUri
) {
  return runCheckOnlyRouteHandler(vscodeApi, eligibilityState, targetUri, {
    route: "docker",
    commandLabel: "Check Only (Docker)",
  });
}

/**
 * Handles ssh check-only invocation from active-file or selected-file contexts.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {import("vscode").Uri|undefined} targetUri Explorer-selected URI when invoked from Explorer.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runActiveFileCheckOnlySshHandler(
  vscodeApi,
  eligibilityState,
  targetUri
) {
  return runCheckOnlyRouteHandler(vscodeApi, eligibilityState, targetUri, {
    route: "ssh",
    commandLabel: "Check Only (SSH)",
  });
}

/**
 * Handles sidebar language-row Run invocation.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar language item.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runLanguageHandler(vscodeApi, eligibilityState, item) {
  return runLanguageAtSidebarItem(vscodeApi, eligibilityState, item, {
    commandFamily: "run-language",
    commandLabel: "Run Language",
    successMessage: `Run Language started in ${"Algorithms Runner"}.`,
    buildArgs: (languageKey) => [languageKey],
    includeSidebarRunChecks: true,
  });
}

/**
 * Handles sidebar language-row Compile Only invocation.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar language item.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runLanguageCompileOnlyHandler(vscodeApi, eligibilityState, item) {
  return runLanguageAtSidebarItem(vscodeApi, eligibilityState, item, {
    commandFamily: "run-language-compile-only",
    commandLabel: "Compile Only",
    successMessage: `Compile Only started in ${"Algorithms Runner"}.`,
    buildArgs: (languageKey) => ["--compile-only", languageKey],
  });
}

/**
 * Handles one route-specific sidebar language-row check-only invocation.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar language item.
 * @param {{route: "native"|"docker"|"ssh", commandLabel: string}} execution Route execution metadata.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runLanguageCheckOnlyHandler(vscodeApi, eligibilityState, item, execution) {
  const routeValidation = validateCheckOnlyRoute(execution.route);

  if (!routeValidation.ok) {
    return blockWithValidation(vscodeApi, routeValidation, execution.commandLabel);
  }

  return runLanguageAtSidebarItem(vscodeApi, eligibilityState, item, {
    commandFamily: "run-language-check-only",
    commandLabel: execution.commandLabel,
    successMessage: `${execution.commandLabel} started in ${"Algorithms Runner"}.`,
    buildArgs: (languageKey) => [`--check-only=${execution.route}`, languageKey],
  });
}

/**
 * Handles sidebar language-row Check Only (Native) invocation.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar language item.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runLanguageCheckOnlyNativeHandler(vscodeApi, eligibilityState, item) {
  return runLanguageCheckOnlyHandler(vscodeApi, eligibilityState, item, {
    route: "native",
    commandLabel: "Check Only (Native)",
  });
}

/**
 * Handles sidebar language-row Check Only (Docker) invocation.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar language item.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runLanguageCheckOnlyDockerHandler(vscodeApi, eligibilityState, item) {
  return runLanguageCheckOnlyHandler(vscodeApi, eligibilityState, item, {
    route: "docker",
    commandLabel: "Check Only (Docker)",
  });
}

/**
 * Handles sidebar language-row Check Only (SSH) invocation.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar language item.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runLanguageCheckOnlySshHandler(vscodeApi, eligibilityState, item) {
  return runLanguageCheckOnlyHandler(vscodeApi, eligibilityState, item, {
    route: "ssh",
    commandLabel: "Check Only (SSH)",
  });
}

/**
 * Resolves sidebar item metadata to a flaggable language context.
 *
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar item payload.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error", algorithmDir: string|null, scriptPath: string|null, displayScriptPath: string|null, languageKey: string|null}} Resolution result.
 */
function resolveFlaggableSidebarContext(item, eligibilityState) {
  return resolveSidebarLanguageContext(item, eligibilityState, {
    missingItemGuidance: "Select a language or file row in the sidebar and try again.",
    resolvedGuidance: "Flaggable sidebar context resolved.",
  });
}

/**
 * Executes one flag/unflag command for a sidebar row.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar item payload.
 * @param {{commandFamily: string, commandLabel: string, successMessage: string, buildArgs: (languageKey: string) => string[]}} execution Execution metadata.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runFlagLanguageCommand(vscodeApi, eligibilityState, item, execution) {
  const contextResolution = resolveFlaggableSidebarContext(item, eligibilityState);

  if (!contextResolution.ok) {
    return blockWithValidation(vscodeApi, contextResolution, execution.commandLabel);
  }

  const commandResult = executeContextCommand(vscodeApi, contextResolution, {
    commandFamily: execution.commandFamily,
    args: execution.buildArgs(contextResolution.languageKey),
    commandLabel: execution.commandLabel,
    successMessage: execution.successMessage,
  });

  if (commandResult.ok) {
    await vscodeApi.commands.executeCommand("algos.sidebar.refresh");
  }

  return commandResult;
}

/**
 * Handles one sidebar language/file flag command invocation.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar item payload.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function flagLanguageHandler(vscodeApi, eligibilityState, item) {
  return runFlagLanguageCommand(vscodeApi, eligibilityState, item, {
    commandFamily: "flag-language",
    commandLabel: "Flag Language",
    successMessage: `Flag Language completed in ${"Algorithms Runner"}.`,
    buildArgs: (languageKey) => [`--flag=${languageKey}`],
  });
}

/**
 * Handles one sidebar language/file unflag command invocation.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{algorithmPath?: string, languageKey?: string}|undefined} item Sidebar item payload.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function unflagLanguageHandler(vscodeApi, eligibilityState, item) {
  return runFlagLanguageCommand(vscodeApi, eligibilityState, item, {
    commandFamily: "unflag-language",
    commandLabel: "Unflag Language",
    successMessage: `Unflag Language completed in ${"Algorithms Runner"}.`,
    buildArgs: (languageKey) => [`--unflag=${languageKey}`],
  });
}

// Public command handlers consumed by extension activation and tests.
module.exports = {
  runActiveFileHandler,
  runFileHandler,
  runLanguageHandler,
  flagLanguageHandler,
  unflagLanguageHandler,
  runLocalCleanHandler,
  runCleanHandler,
  runActiveFileCompileOnlyHandler,
  runLanguageCompileOnlyHandler,
  runActiveFileCheckOnlyNativeHandler,
  runActiveFileCheckOnlyDockerHandler,
  runActiveFileCheckOnlySshHandler,
  runLanguageCheckOnlyNativeHandler,
  runLanguageCheckOnlyDockerHandler,
  runLanguageCheckOnlySshHandler,
  resolveActiveFileRunContext,
  resolveLocalCleanContextFromExplorer,
  resolveCleanContextFromExplorer,
};
