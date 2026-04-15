// Non-Play launcher menu actions for FEAT-207 quick-pick flow.
const { RUN_MENU_ITEMS } = require("../ui/quickPickFlows");

/**
 * Builds a placeholder message for non-Play commands pending FEAT-208+.
 *
 * @param {string} commandId Command identifier.
 * @returns {string} User-facing placeholder guidance.
 */
function buildNotImplementedMessage(commandId) {
  return `${commandId} is not implemented yet. Planned in FEAT-208 through FEAT-211.`;
}

/**
 * Registers extension commands and routes handlers through shared wrappers.
 *
 * @param {{
 *   vscodeApi: import("vscode"),
 *   runWithPreflightGuard: (handler: (...args: unknown[]) => Promise<unknown>) => (...args: unknown[]) => Promise<unknown>,
 *   runActiveFileHandler: (vscodeApi: import("vscode"), eligibilityState: object) => Promise<unknown>,
 *   runFileHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   runLocalCleanHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   openRunMenuFlow: (vscodeApi: import("vscode")) => Promise<string|null>
 * }} deps Command registration dependencies.
 * @returns {import("vscode").Disposable[]} Command disposables.
 */
function registerCommands(deps) {
  const vscodeApi = deps.vscodeApi;

  const runActiveFileCommand = vscodeApi.commands.registerCommand(
    "algos.runActiveFile",
    deps.runWithPreflightGuard(async (eligibilityState) =>
      deps.runActiveFileHandler(vscodeApi, eligibilityState)
    )
  );

  const runFileCommand = vscodeApi.commands.registerCommand(
    "algos.runFile",
    deps.runWithPreflightGuard(async (eligibilityState, targetUri) =>
      deps.runFileHandler(vscodeApi, eligibilityState, targetUri)
    )
  );

  const openRunMenuCommand = vscodeApi.commands.registerCommand(
    "algos.openRunMenu",
    async () => {
      const commandId = await deps.openRunMenuFlow(vscodeApi);

      if (!commandId) {
        return;
      }

      await vscodeApi.commands.executeCommand(commandId);
    }
  );

  const runLocalCleanCommand = vscodeApi.commands.registerCommand(
    "algos.runLocalClean",
    deps.runWithPreflightGuard(async (eligibilityState, targetUri) =>
      deps.runLocalCleanHandler(vscodeApi, eligibilityState, targetUri)
    )
  );

  const placeholderCommands = RUN_MENU_ITEMS.filter(
    (item) => item.commandId !== "algos.runLocalClean"
  ).map((item) =>
    vscodeApi.commands.registerCommand(item.commandId, () => {
      vscodeApi.window.showInformationMessage(
        buildNotImplementedMessage(item.commandId)
      );
    })
  );

  return [
    runActiveFileCommand,
    runFileCommand,
    openRunMenuCommand,
    runLocalCleanCommand,
    ...placeholderCommands,
  ];
}

// Public registration API used by extension entry points.
module.exports = {
  buildNotImplementedMessage,
  registerCommands,
};
