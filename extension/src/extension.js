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
  buildEligibilityBlockMessage,
} = require("./validation/inputValidation");
// Primary FEAT-205 command handler implementation.
const {
  runActiveFileHandler,
  runFileHandler,
  runLocalCleanHandler,
  runCleanHandler,
  runActiveFileCompileOnlyHandler,
} = require("./commands/fileCommands");
// FEAT-207 centralized command registration.
const { registerCommands } = require("./commands/registerCommands");
// FEAT-207 launcher quick-pick flow.
const { openRunMenuFlow } = require("./ui/quickPickFlows");

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
      vscode.window.showWarningMessage(
        buildEligibilityBlockMessage(validation, preflightState)
      );
      return;
    }

    await handler(preflightState, ...args);
  };
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

  const commandDisposables = registerCommands({
    vscodeApi: vscode,
    runWithPreflightGuard,
    runActiveFileHandler,
    runFileHandler,
    runLocalCleanHandler,
    runCleanHandler,
    runActiveFileCompileOnlyHandler,
    openRunMenuFlow,
  });

  context.subscriptions.push(...commandDisposables);
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
