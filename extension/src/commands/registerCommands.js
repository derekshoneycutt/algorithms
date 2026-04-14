const vscode = require("vscode");

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

module.exports = {
  registerCommands,
};
