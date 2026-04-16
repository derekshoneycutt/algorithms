// VS Code extension API for command registration, workspace access, and UI messages.
const vscode = require("vscode");
// Eligibility and summary helpers used to gate command execution.
const {
  resolveEligibilityState,
  summarizeEligibilityState,
} = require("./runtime/pathResolver");
// Validation helpers for converting eligibility state into user-facing outcomes.
const {
  validateEligibilityForExecution,
  validateSupportedLanguage,
} = require("./validation/inputValidation");
const {
  showNotificationBySeverity,
  buildEligibilityPreflightMessage,
} = require("./ui/notifications");
// Primary FEAT-205 command handler implementation.
const {
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
} = require("./commands/fileCommands");
// FEAT-207 centralized command registration.
const { registerCommands } = require("./commands/registerCommands");
// FEAT-207 launcher quick-pick flow.
const { openRunMenuFlow } = require("./ui/quickPickFlows");
// FEAT-212 workspace status sidebar registration.
const {
  registerWorkspaceAlgorithmsRunView,
} = require("./ui/workspaceAlgorithmsRunView");
const {
  registerSidebarRunControlsView,
} = require("./ui/sidebarRunControlsView");
const {
  registerSidebarSmokeControlsView,
} = require("./ui/sidebarSmokeControlsView");
const {
  registerStandardLibraryView,
} = require("./ui/standardLibraryView");

// Cached preflight snapshot used by visibility event handlers.
let cachedPreflightState = null;

/**
 * Returns the currently open workspace folders.
 *
 * @returns {import('vscode').WorkspaceFolder[]} Open workspace folders.
 */
function getWorkspaceFolders() {
  return vscode.workspace.workspaceFolders || [];
}

/**
 * Logs a compact eligibility summary for diagnostics.
 *
 * @param {string} stage Activation stage label.
 * @param {object} eligibilityState Resolver output.
 * @returns {void}
 */
function logEligibility(stage, eligibilityState) {
  console.log(
    `[algorithms-runner] ${stage} ${summarizeEligibilityState(eligibilityState)}`
  );
}

/**
 * Resolves and logs preflight eligibility state.
 *
 * @returns {object} Eligibility state for current workspace context.
 */
function resolvePreflightState() {
  const preflightState = resolveEligibilityState(getWorkspaceFolders());
  logEligibility("preflight", preflightState);
  return preflightState;
}

/**
 * Wraps command handlers with FEAT-202 eligibility preflight behavior.
 *
 * @param {(eligibilityState: object, ...args: unknown[]) => Promise<unknown>} handler Guarded command handler.
 * @returns {(...args: unknown[]) => Promise<void>} Wrapped command callback.
 */
function runWithPreflightGuard(handler) {
  return async (...args) => {
    const preflightState = resolvePreflightState();
    const validation = validateEligibilityForExecution(preflightState);

    if (!validation.allowed) {
      showNotificationBySeverity(
        vscode,
        validation.severity,
        buildEligibilityPreflightMessage(validation, preflightState)
      );
      return;
    }

    await handler(preflightState, ...args);
  };
}

/**
 * Returns whether the active editor is eligible for Run File visibility.
 *
 * @param {import('vscode').TextEditor|undefined} editor Active editor candidate.
 * @param {object} preflightState Current workspace preflight state.
 * @returns {boolean} True when command should be shown in editor title.
 */
function canRunInActiveEditor(editor, preflightState) {
  const eligibilityValidation = validateEligibilityForExecution(preflightState);

  if (!eligibilityValidation.allowed) {
    return false;
  }

  const activeFilePath = editor?.document?.uri?.fsPath;

  if (!activeFilePath) {
    return false;
  }

  const contextResolution = resolveActiveFileRunContext(
    activeFilePath,
    preflightState
  );

  if (!contextResolution.ok) {
    return false;
  }

  const languageValidation = validateSupportedLanguage(
    editor,
    preflightState,
    activeFilePath
  );

  return languageValidation.ok;
}

/**
 * Updates editor title visibility context for the Run File command.
 *
 * @param {import('vscode').TextEditor|undefined} editor Active editor candidate.
 * @param {object} preflightState Current workspace preflight state.
 * @returns {Promise<void>} Resolves after context key update.
 */
async function updateRunActiveFileContext(editor, preflightState) {
  const canRun = canRunInActiveEditor(editor, preflightState);
  await vscode.commands.executeCommand(
    "setContext",
    "algos.canRunActiveFile",
    canRun
  );
}

/**
 * Stores preflight state for subsequent visibility checks.
 *
 * @param {object} preflightState Current workspace preflight state.
 * @returns {object} Stored preflight state.
 */
function setCachedPreflightState(preflightState) {
  cachedPreflightState = preflightState;
  return cachedPreflightState;
}

/**
 * Returns cached preflight state or resolves it on demand.
 *
 * @returns {object} Preflight state snapshot.
 */
function getCachedPreflightState() {
  if (cachedPreflightState) {
    return cachedPreflightState;
  }

  return setCachedPreflightState(resolvePreflightState());
}

/**
 * Handles active editor changes for title-button visibility updates.
 *
 * @param {import('vscode').TextEditor|undefined} editor Active editor candidate.
 * @returns {Promise<void>} Resolves after context key update.
 */
async function handleActiveEditorChange(editor) {
  const nextPreflightState = setCachedPreflightState(resolvePreflightState());
  await updateRunActiveFileContext(editor, nextPreflightState);
}

/**
 * Handles workspace folder changes and refreshes visibility context.
 *
 * @returns {Promise<void>} Resolves after preflight refresh and context update.
 */
async function handleWorkspaceFolderChange() {
  const nextPreflightState = setCachedPreflightState(resolvePreflightState());
  await updateRunActiveFileContext(
    vscode.window.activeTextEditor,
    nextPreflightState
  );
}

/**
 * Handles document lifecycle changes that may affect title-button visibility.
 *
 * @returns {Promise<void>} Resolves after preflight refresh and context update.
 */
async function handleDocumentStateChange() {
  const nextPreflightState = setCachedPreflightState(resolvePreflightState());
  await updateRunActiveFileContext(
    vscode.window.activeTextEditor,
    nextPreflightState
  );
}

/**
 * Activates the extension and registers FEAT-202 guarded command behavior.
 *
 * @param {import('vscode').ExtensionContext} context VS Code extension context.
 * @returns {Promise<void>}
 */
async function activate(context) {
  const activationState = resolveEligibilityState(getWorkspaceFolders());
  logEligibility("activation", activationState);
  setCachedPreflightState(activationState);

  await updateRunActiveFileContext(
    vscode.window.activeTextEditor,
    getCachedPreflightState()
  );

  const workspaceAlgorithmsRunViewRegistration =
    registerWorkspaceAlgorithmsRunView();
  const sidebarRunControlsViewRegistration =
    registerSidebarRunControlsView();
  const sidebarSmokeControlsViewRegistration =
    registerSidebarSmokeControlsView(context.extensionUri);
  const standardLibraryViewRegistration =
    registerStandardLibraryView();

  await vscode.commands.executeCommand(
    "setContext",
    "algos.sidebarViewMode",
    "files"
  );

  await vscode.commands.executeCommand(
    "setContext",
    "algos.sidebarFilterMode",
    "all"
  );

  const commandDisposables = registerCommands({
    vscodeApi: vscode,
    runWithPreflightGuard,
    runActiveFileHandler,
    runFileHandler,
    runLanguageHandler,
    runSmokeTestHandler: async (vscodeApi, eligibilityState, item) => {
      return workspaceAlgorithmsRunViewRegistration.runSmokeTest(
        vscodeApi,
        eligibilityState,
        item
      );
    },
    runSmokeTestStopHandler: async (vscodeApi, eligibilityState, item) => {
      return workspaceAlgorithmsRunViewRegistration.stopSmokeTest(
        vscodeApi,
        eligibilityState,
        item
      );
    },
    runSmokeTestClearResultsHandler: async (vscodeApi, eligibilityState, item) => {
      return workspaceAlgorithmsRunViewRegistration.clearSmokeResults(
        vscodeApi,
        eligibilityState,
        item
      );
    },
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
    openRunMenuFlow,
    showSidebarFileView: async () => {
      await workspaceAlgorithmsRunViewRegistration.setViewMode("files");
    },
    showSidebarLanguageView: async () => {
      await workspaceAlgorithmsRunViewRegistration.setViewMode("language");
    },
    showSidebarAllFilter: async () => {
      await workspaceAlgorithmsRunViewRegistration.setFilterMode("all");
    },
    showSidebarProblemsFilter: async () => {
      await workspaceAlgorithmsRunViewRegistration.setFilterMode("problems");
    },
    refreshSidebarView: async () => {
      workspaceAlgorithmsRunViewRegistration.refresh();
    },
    createLanguageFilePlaceholder: async (item) => {
      await workspaceAlgorithmsRunViewRegistration.openMissingLanguageFile(item);
    },
  });

  const visibilityDisposables = [
    vscode.window.onDidChangeActiveTextEditor(handleActiveEditorChange),
    vscode.workspace.onDidChangeWorkspaceFolders(handleWorkspaceFolderChange),
    vscode.workspace.onDidOpenTextDocument(handleDocumentStateChange),
    vscode.workspace.onDidSaveTextDocument(handleDocumentStateChange),
  ];

  context.subscriptions.push(
    ...commandDisposables,
    ...visibilityDisposables,
    ...sidebarRunControlsViewRegistration.disposables,
    ...sidebarSmokeControlsViewRegistration.disposables,
    ...standardLibraryViewRegistration.disposables,
    ...workspaceAlgorithmsRunViewRegistration.disposables
  );
}

/**
 * Deactivates the extension.
 *
 * @returns {void}
 */
function deactivate() {}

// Public VS Code extension lifecycle exports.
module.exports = {
  activate,
  deactivate,
};
