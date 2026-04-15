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
const { runActiveFileHandler } = require("./commands/fileCommands");

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

      await runActiveFileHandler(vscode, preflightState);
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

// Public VS Code extension lifecycle exports.
module.exports = {
  activate,
  deactivate,
};
