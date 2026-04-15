// Path helpers are used to validate src hierarchy and derive execution context.
const path = require("path");
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
    showBySeverity(
      vscodeApi,
      languageValidation.severity,
      buildActiveFileValidationMessage(languageValidation)
    );
    return {
      ok: false,
      status: "blocked",
      reason: languageValidation.reason,
    };
  }

  const contextResolution = resolveActiveFileRunContext(filePath, eligibilityState);

  if (!contextResolution.ok) {
    showBySeverity(
      vscodeApi,
      contextResolution.severity,
      buildActiveFileValidationMessage(contextResolution)
    );
    return {
      ok: false,
      status: "blocked",
      reason: contextResolution.reason,
    };
  }

  const build = buildRunCommand({
    scriptPath: contextResolution.scriptPath,
    displayScriptPath: contextResolution.displayScriptPath,
    cwd: contextResolution.algorithmDir,
    commandFamily,
    args: [path.basename(contextResolution.filename)],
  });

  if (!build.ok) {
    showBySeverity(
      vscodeApi,
      "error",
      `Run File aborted. Reason: ${build.reason}. Guidance: Unable to assemble command for execution.`
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
      `Run File failed to start. Reason: ${runResult.reason}.`
    );
    return {
      ok: false,
      status: runResult.status,
      reason: runResult.reason,
    };
  }

  vscodeApi.window.showInformationMessage(successMessage);

  return {
    ok: true,
    status: runResult.status,
    reason: null,
  };
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
    showBySeverity(
      vscodeApi,
      editorValidation.severity,
      buildActiveFileValidationMessage(editorValidation)
    );
    return {
      ok: false,
      status: "blocked",
      reason: editorValidation.reason,
    };
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

  return runFileAtPath(
    vscodeApi,
    eligibilityState,
    filePath,
    "run-file",
    `Run File started in ${"Algorithms Runner"}.`
  );
}

// Public command handlers consumed by extension activation and tests.
module.exports = {
  runActiveFileHandler,
  runFileHandler,
  resolveActiveFileRunContext,
};
