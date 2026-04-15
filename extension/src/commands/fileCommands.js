// Path helpers are used to validate src hierarchy and derive execution context.
const path = require("path");
const fs = require("fs");
// Runtime command assembly and terminal runner used by the Run Active File handler.
const { buildRunCommand } = require("../runtime/argumentBuilder");
const { runCommand } = require("../runtime/runScriptRunner");
// Validation and message helpers for active editor and language checks.
const {
  validateActiveEditorContext,
  validateSupportedLanguage,
  buildActiveFileValidationMessage,
} = require("../validation/inputValidation");

/**
 * Shows a message using the requested severity level.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {"info"|"warning"|"error"} severity Message severity.
 * @param {string} message User-facing message.
 * @returns {void}
 */
function showBySeverity(vscodeApi, severity, message) {
  if (severity === "error") {
    vscodeApi.window.showErrorMessage(message);
    return;
  }

  if (severity === "warning") {
    vscodeApi.window.showWarningMessage(message);
    return;
  }

  vscodeApi.window.showInformationMessage(message);
}

/**
 * Shows a validation block message and returns a blocked handler result.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{reason: string, guidance: string, severity: "info"|"warning"|"error"}} validation Validation payload.
 * @returns {{ok: false, status: "blocked", reason: string}} Blocked execution result.
 */
function blockWithValidation(vscodeApi, validation) {
  showBySeverity(
    vscodeApi,
    validation.severity,
    buildActiveFileValidationMessage(validation)
  );
  return {
    ok: false,
    status: "blocked",
    reason: validation.reason,
  };
}

/**
 * Executes one assembled script command from a resolved algorithm context.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{algorithmDir: string, scriptPath: string, displayScriptPath: string}} contextResolution Resolved execution context.
 * @param {{commandFamily: string, args: string[], commandLabel: string, successMessage: string}} execution Execution metadata.
 * @returns {{ok: boolean, status: string, reason: string|null}} Handler execution summary.
 */
function executeContextCommand(vscodeApi, contextResolution, execution) {
  const build = buildRunCommand({
    scriptPath: contextResolution.scriptPath,
    displayScriptPath: contextResolution.displayScriptPath,
    cwd: contextResolution.algorithmDir,
    commandFamily: execution.commandFamily,
    args: execution.args,
  });

  if (!build.ok) {
    showBySeverity(
      vscodeApi,
      "error",
      `${execution.commandLabel} aborted. Reason: ${build.reason}. Guidance: Unable to assemble command for execution.`
    );
    return {
      ok: false,
      status: "blocked",
      reason: build.reason,
    };
  }

  const runResult = runCommand({
    build,
    vscodeApi,
    reuseTerminal: true,
  });

  if (!runResult.ok) {
    showBySeverity(
      vscodeApi,
      "error",
      `${execution.commandLabel} failed to start. Reason: ${runResult.reason}.`
    );
    return {
      ok: false,
      status: runResult.status,
      reason: runResult.reason,
    };
  }

  vscodeApi.window.showInformationMessage(execution.successMessage);

  return {
    ok: true,
    status: runResult.status,
    reason: null,
  };
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
    editor.document.languageId,
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
 * Resolves algorithm execution context from an active file path.
 *
 * Valid active target contract: immediate child file under
 * `src/<category>/<algorithm>/`.
 *
 * @param {string} filePath Absolute path to the active file.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "warning"|"error", algorithmDir: string|null, filename: string|null, scriptPath: string|null, displayScriptPath: string|null}} Resolution result.
 */
function resolveActiveFileRunContext(filePath, eligibilityState) {
  const selected = eligibilityState?.selected;
  const resolvedRoot = selected?.resolvedRoot;
  const scriptPath = selected?.scriptPath;

  if (!resolvedRoot || !scriptPath) {
    return {
      ok: false,
      reason: "missing-eligible-root",
      guidance:
        "Eligible repository root or run script path is unavailable. Reopen workspace and retry.",
      severity: "error",
      algorithmDir: null,
      filename: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const srcRoot = path.join(resolvedRoot, "src");
  const relativeToSrc = path.relative(srcRoot, filePath);

  if (relativeToSrc.startsWith("..") || path.isAbsolute(relativeToSrc)) {
    return {
      ok: false,
      reason: "not-under-src",
      guidance:
        "Active file must be located under src/<category>/<algorithm>/.",
      severity: "warning",
      algorithmDir: null,
      filename: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const parts = relativeToSrc.split(path.sep);

  if (parts.length < 3) {
    return {
      ok: false,
      reason: "not-in-algorithm-dir",
      guidance:
        "Active file must be an immediate child under src/<category>/<algorithm>/.",
      severity: "warning",
      algorithmDir: null,
      filename: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  if (parts.length > 3) {
    return {
      ok: false,
      reason: "nested-descendant",
      guidance:
        "Nested descendants are not valid run targets. Use a file directly under src/<category>/<algorithm>/.",
      severity: "warning",
      algorithmDir: null,
      filename: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const algorithmDir = path.join(srcRoot, parts[0], parts[1]);
  const filename = parts[2];
  const relativeScriptPath = path.relative(algorithmDir, scriptPath);
  const displayScriptPath = relativeScriptPath || scriptPath;

  return {
    ok: true,
    reason: null,
    guidance: "Active file run context resolved.",
    severity: "warning",
    algorithmDir,
    filename,
    scriptPath,
    displayScriptPath,
  };
}

/**
 * Resolves algorithm-directory context from Explorer selection for cleanup modes.
 *
 * Valid Explorer targets:
 * - `src/<category>/<algorithm>/` directory
 * - immediate child file under `src/<category>/<algorithm>/`
 * - immediate child directory under `src/<category>/<algorithm>/`
 *
 * @param {string} targetPath Absolute selected Explorer path.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{outsideSrcGuidance: string, scopeGuidance: string, nestedGuidance: string, resolvedGuidance: string}} messages Command-specific guidance text.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error", algorithmDir: string|null, scriptPath: string|null, displayScriptPath: string|null}} Resolution result.
 */
function resolveAlgorithmScopeFromExplorerTarget(
  targetPath,
  eligibilityState,
  messages
) {
  const selected = eligibilityState?.selected;
  const resolvedRoot = selected?.resolvedRoot;
  const scriptPath = selected?.scriptPath;

  if (!resolvedRoot || !scriptPath) {
    return {
      ok: false,
      reason: "missing-eligible-root",
      guidance:
        "Eligible repository root or run script path is unavailable. Reopen workspace and retry.",
      severity: "error",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  if (!targetPath) {
    return {
      ok: false,
      reason: "missing-selected-path",
      guidance:
        "Select an algorithm directory or an immediate child file/directory and try again.",
      severity: "info",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const srcRoot = path.join(resolvedRoot, "src");
  const relativeToSrc = path.relative(srcRoot, targetPath);

  if (relativeToSrc.startsWith("..") || path.isAbsolute(relativeToSrc)) {
    return {
      ok: false,
      reason: "not-under-src",
      guidance: messages.outsideSrcGuidance,
      severity: "warning",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const parts = relativeToSrc.split(path.sep);

  if (parts.length < 2) {
    return {
      ok: false,
      reason: "not-in-algorithm-scope",
      guidance: messages.scopeGuidance,
      severity: "warning",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  if (parts.length > 3) {
    return {
      ok: false,
      reason: "nested-descendant",
      guidance: messages.nestedGuidance,
      severity: "warning",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  let stats = null;
  try {
    stats = fs.statSync(targetPath);
  } catch (_error) {
    return {
      ok: false,
      reason: "missing-selected-path",
      guidance: "Selected path is unavailable. Refresh Explorer and retry.",
      severity: "warning",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  let algorithmDir = null;

  if (parts.length === 2) {
    if (!stats.isDirectory()) {
      return {
        ok: false,
        reason: "algorithm-dir-required",
        guidance: messages.scopeGuidance,
        severity: "warning",
        algorithmDir: null,
        scriptPath: null,
        displayScriptPath: null,
      };
    }

    algorithmDir = targetPath;
  } else if (parts.length === 3) {
    if (!stats.isDirectory() && !stats.isFile()) {
      return {
        ok: false,
        reason: "unsupported-target-type",
        guidance: messages.scopeGuidance,
        severity: "warning",
        algorithmDir: null,
        scriptPath: null,
        displayScriptPath: null,
      };
    }

    algorithmDir = path.join(srcRoot, parts[0], parts[1]);
  }

  const relativeScriptPath = path.relative(algorithmDir, scriptPath);
  const displayScriptPath = relativeScriptPath || scriptPath;

  return {
    ok: true,
    reason: null,
    guidance: messages.resolvedGuidance,
    severity: "warning",
    algorithmDir,
    scriptPath,
    displayScriptPath,
  };
}

/**
 * Resolves algorithm execution context for localclean from an Explorer target.
 *
 * Valid Explorer targets:
 * - `src/<category>/<algorithm>/` directory
 * - immediate child file under `src/<category>/<algorithm>/`
 * - immediate child directory under `src/<category>/<algorithm>/`
 *
 * @param {string} targetPath Absolute selected Explorer path.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error", algorithmDir: string|null, scriptPath: string|null, displayScriptPath: string|null}} Resolution result.
 */
function resolveLocalCleanContextFromExplorer(targetPath, eligibilityState) {
  return resolveAlgorithmScopeFromExplorerTarget(targetPath, eligibilityState, {
    outsideSrcGuidance:
      "Localclean requires a target under src/<category>/<algorithm>/.",
    scopeGuidance:
      "Select src/<category>/<algorithm>/ or an immediate child file/directory.",
    nestedGuidance:
      "Nested descendants are not valid localclean targets. Select the algorithm directory or an immediate child.",
    resolvedGuidance: "Localclean context resolved.",
  });
}

/**
 * Executes run flow for one resolved file path after FEAT-202 preflight.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {string} filePath Absolute file path to execute.
 * @param {string} commandFamily Lifecycle command family label.
 * @param {string} successMessage User-facing success message.
 * @returns {Promise<{ok: boolean, status: string, reason: string|null}>} Handler execution summary.
 */
async function runFileAtPath(
  vscodeApi,
  eligibilityState,
  filePath,
  commandFamily,
  successMessage
) {
  const languageValidation = validateSupportedLanguage(
    undefined,
    eligibilityState,
    filePath
  );

  if (!languageValidation.ok) {
    return blockWithValidation(vscodeApi, languageValidation);
  }

  const contextResolution = resolveActiveFileRunContext(filePath, eligibilityState);

  if (!contextResolution.ok) {
    return blockWithValidation(vscodeApi, contextResolution);
  }

  return executeContextCommand(vscodeApi, contextResolution, {
    commandFamily,
    args: [path.basename(contextResolution.filename)],
    commandLabel: "Run File",
    successMessage,
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
    return blockWithValidation(vscodeApi, editorValidation);
  }

  return runFileAtPath(
    vscodeApi,
    eligibilityState,
    editor.document.uri.fsPath,
    "run-active-file",
    `Run Active File started in ${"Algorithms Runner"}.`
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
    return blockWithValidation(vscodeApi, validation);
  }

  return runFileAtPath(
    vscodeApi,
    eligibilityState,
    filePath,
    "run-file",
    `Run File started in ${"Algorithms Runner"}.`
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
      return blockWithValidation(vscodeApi, activeSource);
    }

    contextResolution = resolveActiveFileRunContext(
      activeSource.filePath,
      eligibilityState
    );
  }

  if (!contextResolution.ok) {
    return blockWithValidation(vscodeApi, contextResolution);
  }

  return executeContextCommand(vscodeApi, contextResolution, {
    commandFamily: "run-localclean",
    args: ["localclean"],
    commandLabel: "Localclean",
    successMessage: `Localclean started in ${"Algorithms Runner"}.`,
  });
}

// Public command handlers consumed by extension activation and tests.
module.exports = {
  runActiveFileHandler,
  runFileHandler,
  runLocalCleanHandler,
  resolveActiveFileRunContext,
  resolveLocalCleanContextFromExplorer,
};
