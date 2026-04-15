// VS Code API for command registration in the extension host process.
const vscode = require("vscode");

/**
 * Registers scaffold command handlers used during extension bootstrapping.
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

// Public registration API used by extension entry points.
module.exports = {
  registerCommands,
};
