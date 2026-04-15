// Global constants for this module.
const vscode = require("vscode");
const {
  resolveEligibilityState,
  summarizeEligibilityState,
} = require("./runtime/pathResolver");
const {
  validateEligibilityForExecution,
  buildEligibilityBlockMessage,
} = require("./validation/inputValidation");

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
 * Activates the extension and registers FEAT-202 guarded command behavior.
 *
 * @param {import('vscode').ExtensionContext} context VS Code extension context.
 * @returns {Promise<void>}
 */
async function activate(context) {
  const activationState = resolveEligibilityState(getWorkspaceFolders());
  logEligibility("activation", activationState);

  const runActiveFileCommand = vscode.commands.registerCommand(
    "algos.runActiveFile",
    async () => {
      const preflightState = resolveEligibilityState(getWorkspaceFolders());
      logEligibility("preflight", preflightState);

      const validation = validateEligibilityForExecution(preflightState);

      if (!validation.allowed) {
        vscode.window.showWarningMessage(
          buildEligibilityBlockMessage(validation, preflightState)
        );
        return;
      }

      vscode.window.showInformationMessage(
        "Workspace eligibility checks passed. FEAT-202 guard is active; FEAT-205 run behavior is not implemented yet."
      );
    }
  );

  context.subscriptions.push(runActiveFileCommand);
}

/**
 * Deactivates the extension.
 *
 * @returns {void}
 */
function deactivate() {}

// Module exports.
module.exports = {
  activate,
  deactivate,
};
