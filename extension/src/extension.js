// VS Code extension API for command registration, workspace access, and UI messages.
const vscode = require("vscode");
// Eligibility and summary helpers used to gate command execution.
const {
  invalidateCanaryCache,
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
// Primary command handler implementation.
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
// Centralized command registration.
const { registerCommands } = require("./commands/registerCommands");
// Launcher quick-pick flow.
const { openRunMenuFlow } = require("./ui/quickPickFlows");
// Workspace status sidebar registration.
const {
  registerWorkspaceAlgorithmsRunView,
} = require("./ui/algorithmsRunView");
const {
  registerSidebarRunControlsView,
} = require("./ui/runControlsView");
const {
  registerSidebarSmokeControlsView,
} = require("./ui/smokeControlsView");
const {
  registerStandardLibraryView,
} = require("./ui/standardLibraryView");
const {
  registerEnvironmentInitView,
} = require("./ui/environmentInitView");

// Cached preflight snapshot used by visibility event handlers.
let cachedPreflightState = null;
// Debounce delay for document lifecycle-driven preflight updates.
const DOCUMENT_PRECHECK_DEBOUNCE_MS = 250;
// Timer handle for coalescing document lifecycle preflight updates.
let documentPreflightTimer = null;

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
 * Wraps command handlers with eligibility preflight behavior.
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
 * Recomputes preflight state and updates editor-title visibility context.
 *
 * @param {import('vscode').TextEditor|undefined} editor Active editor candidate.
 * @returns {Promise<void>} Resolves after context key update.
 */
async function refreshPreflightAndContext(editor) {
  const nextPreflightState = setCachedPreflightState(resolvePreflightState());
  await updateRunActiveFileContext(editor, nextPreflightState);
}

/**
 * Schedules one debounced preflight/context refresh for document lifecycle events.
 *
 * @returns {void}
 */
function scheduleDocumentPreflightRefresh() {
  if (documentPreflightTimer) {
    clearTimeout(documentPreflightTimer);
  }

  documentPreflightTimer = setTimeout(() => {
    documentPreflightTimer = null;
    void refreshPreflightAndContext(vscode.window.activeTextEditor);
  }, DOCUMENT_PRECHECK_DEBOUNCE_MS);
}

/**
 * Handles active editor changes for title-button visibility updates.
 *
 * @param {import('vscode').TextEditor|undefined} editor Active editor candidate.
 * @returns {Promise<void>} Resolves after context key update.
 */
async function handleActiveEditorChange(editor) {
  if (documentPreflightTimer) {
    clearTimeout(documentPreflightTimer);
    documentPreflightTimer = null;
  }

  await refreshPreflightAndContext(editor);
}

/**
 * Handles workspace folder changes and refreshes visibility context.
 *
 * @param {{refresh: () => void}} sidebarRunControlsViewRegistration Run-controls sidebar registration.
 * @param {{refresh: () => void}} sidebarSmokeControlsViewRegistration Smoke-controls sidebar registration.
 * @param {{refresh: () => void}} environmentInitViewRegistration Environment sidebar registration.
 * @returns {Promise<void>} Resolves after refresh and context update.
 */
async function handleWorkspaceFolderChange(
  sidebarRunControlsViewRegistration,
  sidebarSmokeControlsViewRegistration,
  environmentInitViewRegistration
) {
  if (documentPreflightTimer) {
    clearTimeout(documentPreflightTimer);
    documentPreflightTimer = null;
  }

  invalidateCanaryCache();
  sidebarRunControlsViewRegistration.refresh();
  sidebarSmokeControlsViewRegistration.refresh();
  environmentInitViewRegistration.refresh();

  await refreshPreflightAndContext(vscode.window.activeTextEditor);
}

/**
 * Handles document lifecycle changes that may affect title-button visibility.
 *
 * @returns {Promise<void>} Resolves after preflight refresh and context update.
 */
async function handleDocumentStateChange() {
  scheduleDocumentPreflightRefresh();
}

/**
 * Builds smoke-test command adapters backed by the workspace view registration.
 *
 * @param {{runSmokeTest: Function, stopSmokeTest: Function, clearSmokeResults: Function}} workspaceViewRegistration Workspace algorithms view registration.
 * @returns {{runSmokeTestHandler: Function, runSmokeTestStopHandler: Function, runSmokeTestClearResultsHandler: Function}} Smoke command adapters.
 */
function buildSmokeCommandAdapters(workspaceViewRegistration) {
  return {
    runSmokeTestHandler: async (vscodeApi, eligibilityState, item) => {
      return workspaceViewRegistration.runSmokeTest(
        vscodeApi,
        eligibilityState,
        item
      );
    },
    runSmokeTestStopHandler: async (vscodeApi, eligibilityState, item) => {
      return workspaceViewRegistration.stopSmokeTest(
        vscodeApi,
        eligibilityState,
        item
      );
    },
    runSmokeTestClearResultsHandler: async (vscodeApi, eligibilityState, item) => {
      return workspaceViewRegistration.clearSmokeResults(
        vscodeApi,
        eligibilityState,
        item
      );
    },
  };
}

/**
 * Builds sidebar mode and refresh command adapters.
 *
 * @param {{setViewMode: Function, setFilterMode: Function, refresh: Function, openMissingLanguageFile: Function}} workspaceViewRegistration Workspace algorithms view registration.
 * @returns {{showSidebarFileView: Function, showSidebarLanguageView: Function, showSidebarAllFilter: Function, showSidebarProblemsFilter: Function, refreshSidebarView: Function, createLanguageFilePlaceholder: Function}} Sidebar command adapters.
 */
function buildSidebarCommandAdapters(workspaceViewRegistration) {
  return {
    showSidebarFileView: async () => {
      await workspaceViewRegistration.setViewMode("files");
    },
    showSidebarLanguageView: async () => {
      await workspaceViewRegistration.setViewMode("language");
    },
    showSidebarAllFilter: async () => {
      await workspaceViewRegistration.setFilterMode("all");
    },
    showSidebarProblemsFilter: async () => {
      await workspaceViewRegistration.setFilterMode("problems");
    },
    refreshSidebarView: async () => {
      workspaceViewRegistration.refresh();
    },
    createLanguageFilePlaceholder: async (item) => {
      await workspaceViewRegistration.openMissingLanguageFile(item);
    },
  };
}

/**
 * Builds algorithms tree mutation command adapters.
 *
 * @param {{createFolderAtSrcRoot: Function, createFolder: Function, createFile: Function, addIncludeFile: Function, deleteItem: Function}} workspaceViewRegistration Workspace algorithms view registration.
 * @returns {{algorithmsCreateFolderAtSrcRoot: Function, algorithmsCreateFolder: Function, algorithmsCreateFile: Function, algorithmsAddIncludeFile: Function, algorithmsDeleteItem: Function}} Algorithms tree command adapters.
 */
function buildAlgorithmsTreeCommandAdapters(workspaceViewRegistration) {
  return {
    algorithmsCreateFolderAtSrcRoot: async (vscodeApi, eligibilityState) => {
      await workspaceViewRegistration.createFolderAtSrcRoot(
        vscodeApi,
        eligibilityState
      );
    },
    algorithmsCreateFolder: async (vscodeApi, eligibilityState, item) => {
      await workspaceViewRegistration.createFolder(
        vscodeApi,
        eligibilityState,
        item
      );
    },
    algorithmsCreateFile: async (vscodeApi, eligibilityState, item) => {
      await workspaceViewRegistration.createFile(
        vscodeApi,
        eligibilityState,
        item
      );
    },
    algorithmsAddIncludeFile: async (vscodeApi, eligibilityState, item) => {
      await workspaceViewRegistration.addIncludeFile(
        vscodeApi,
        eligibilityState,
        item
      );
    },
    algorithmsDeleteItem: async (vscodeApi, eligibilityState, item) => {
      await workspaceViewRegistration.deleteItem(
        vscodeApi,
        eligibilityState,
        item
      );
    },
  };
}

/**
 * Builds standard-library command adapters.
 *
 * @param {{createFile: Function, createFileAtRoot: Function, createFolder: Function, createFolderAtRoot: Function, deleteItem: Function}} standardLibraryRegistration Standard library view registration.
 * @returns {{standardLibraryCreateFile: Function, standardLibraryCreateFileAtRoot: Function, standardLibraryCreateFolder: Function, standardLibraryCreateFolderAtRoot: Function, standardLibraryDelete: Function}} Standard library command adapters.
 */
function buildStandardLibraryCommandAdapters(standardLibraryRegistration) {
  return {
    standardLibraryCreateFile: async (item) => {
      await standardLibraryRegistration.createFile(item);
    },
    standardLibraryCreateFileAtRoot: async () => {
      await standardLibraryRegistration.createFileAtRoot();
    },
    standardLibraryCreateFolder: async (item) => {
      await standardLibraryRegistration.createFolder(item);
    },
    standardLibraryCreateFolderAtRoot: async () => {
      await standardLibraryRegistration.createFolderAtRoot();
    },
    standardLibraryDelete: async (item) => {
      await standardLibraryRegistration.deleteItem(item);
    },
  };
}

/**
 * Activates the extension and registers guarded command behavior.
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
    registerSidebarRunControlsView(context.extensionUri);
  const sidebarSmokeControlsViewRegistration =
    registerSidebarSmokeControlsView(context.extensionUri);
  const environmentInitViewRegistration =
    registerEnvironmentInitView(context.extensionUri);
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
    ...buildSmokeCommandAdapters(workspaceAlgorithmsRunViewRegistration),
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
    ...buildSidebarCommandAdapters(workspaceAlgorithmsRunViewRegistration),
    ...buildAlgorithmsTreeCommandAdapters(workspaceAlgorithmsRunViewRegistration),
    ...buildStandardLibraryCommandAdapters(standardLibraryViewRegistration),
  });

  const visibilityDisposables = [
    vscode.window.onDidChangeActiveTextEditor(handleActiveEditorChange),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      return handleWorkspaceFolderChange(
        sidebarRunControlsViewRegistration,
        sidebarSmokeControlsViewRegistration,
        environmentInitViewRegistration
      );
    }),
    vscode.workspace.onDidOpenTextDocument(handleDocumentStateChange),
    vscode.workspace.onDidSaveTextDocument(handleDocumentStateChange),
  ];

  context.subscriptions.push(
    ...commandDisposables,
    ...visibilityDisposables,
    ...environmentInitViewRegistration.disposables,
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
function deactivate() {
  if (documentPreflightTimer) {
    clearTimeout(documentPreflightTimer);
    documentPreflightTimer = null;
  }
}

// Public VS Code extension lifecycle exports.
module.exports = {
  activate,
  deactivate,
};
