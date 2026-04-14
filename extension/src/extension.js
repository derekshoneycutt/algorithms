const { registerCommands } = require("./commands/registerCommands");

function activate(context) {
  const disposables = registerCommands();
  context.subscriptions.push(...disposables);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
