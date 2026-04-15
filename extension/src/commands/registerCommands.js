// Global constants for this module.
const vscode = require("vscode");

/**
 * Registers scaffold command handlers.
 *
 * @returns {import('vscode').Disposable[]} Command disposables.
 */
function registerCommands() {
  const runActiveFileCommand = vscode.commands.registerCommand(
    "algos.runActiveFile",
    () => {
      vscode.window.showInformationMessage(
        "algos.runActiveFile is registered. FEAT-201 scaffold baseline only."
      );
    }
  );

  return [runActiveFileCommand];
}

// Module exports.
module.exports = {
  registerCommands,
};
