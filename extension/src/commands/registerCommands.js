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
 * Registers one command through the shared preflight guard wrapper.
 *
 * @param {{vscodeApi: import("vscode"), runWithPreflightGuard: (handler: (...args: unknown[]) => Promise<unknown>) => (...args: unknown[]) => Promise<unknown>}} deps Registration dependencies.
 * @param {string} commandId Command identifier.
 * @param {(vscodeApi: import("vscode"), eligibilityState: object, ...args: unknown[]) => Promise<unknown>} handler Command handler.
 * @returns {import("vscode").Disposable} Command disposable.
 */
function registerGuardedCommand(deps, commandId, handler) {
  return deps.vscodeApi.commands.registerCommand(
    commandId,
    deps.runWithPreflightGuard(async (eligibilityState, ...args) =>
      handler(deps.vscodeApi, eligibilityState, ...args)
    )
  );
}

/**
 * Registers launcher command that opens the run-menu quick pick.
 *
 * @param {{vscodeApi: import("vscode"), openRunMenuFlow: (vscodeApi: import("vscode")) => Promise<string|null>}} deps Registration dependencies.
 * @returns {import("vscode").Disposable} Command disposable.
 */
function registerRunMenuCommand(deps) {
  const vscodeApi = deps.vscodeApi;

  return vscodeApi.commands.registerCommand("algos.openRunMenu", async () => {
    const commandId = await deps.openRunMenuFlow(vscodeApi);

    if (!commandId) {
      return;
    }

    await vscodeApi.commands.executeCommand(commandId);
  });
}

/**
 * Registers sidebar view-mode toggle commands used by the tree-view title toolbar.
 *
 * @param {{vscodeApi: import("vscode"), showSidebarFileView: () => Promise<void>, showSidebarLanguageView: () => Promise<void>, showSidebarAllFilter: () => Promise<void>, showSidebarProblemsFilter: () => Promise<void>, refreshSidebarView: () => Promise<void>, createLanguageFilePlaceholder: (item?: unknown) => Promise<void>}} deps Registration dependencies.
 * @returns {import("vscode").Disposable[]} Sidebar mode command disposables.
 */
function registerSidebarModeCommands(deps) {
  const showFileView = deps.vscodeApi.commands.registerCommand(
    "algos.sidebarShowFileView",
    async () => {
      await deps.showSidebarFileView();
    }
  );

  const showLanguageView = deps.vscodeApi.commands.registerCommand(
    "algos.sidebarShowLanguageView",
    async () => {
      await deps.showSidebarLanguageView();
    }
  );

  const showAllFilter = deps.vscodeApi.commands.registerCommand(
    "algos.sidebarShowAllFilter",
    async () => {
      await deps.showSidebarAllFilter();
    }
  );

  const showProblemsFilter = deps.vscodeApi.commands.registerCommand(
    "algos.sidebarShowProblemsFilter",
    async () => {
      await deps.showSidebarProblemsFilter();
    }
  );

  const refreshSidebarView = deps.vscodeApi.commands.registerCommand(
    "algos.sidebar.refresh",
    async () => {
      await deps.refreshSidebarView();
    }
  );

  const createLanguageFilePlaceholder = deps.vscodeApi.commands.registerCommand(
    "algos.createLanguageFilePlaceholder",
    async (item) => {
      await deps.createLanguageFilePlaceholder(item);
    }
  );

  return [
    showFileView,
    showLanguageView,
    showAllFilter,
    showProblemsFilter,
    refreshSidebarView,
    createLanguageFilePlaceholder,
  ];
}

/**
 * Registers all guarded command handlers declared in command definitions.
 *
 * @param {{vscodeApi: import("vscode"), runWithPreflightGuard: (handler: (...args: unknown[]) => Promise<unknown>) => (...args: unknown[]) => Promise<unknown>}} deps Registration dependencies.
 * @param {{commandId: string, handler: (vscodeApi: import("vscode"), eligibilityState: object, ...args: unknown[]) => Promise<unknown>}[]} commandDefs Guarded command definitions.
 * @returns {import("vscode").Disposable[]} Command disposables.
 */
function registerGuardedCommands(deps, commandDefs) {
  return commandDefs.map((commandDef) =>
    registerGuardedCommand(deps, commandDef.commandId, commandDef.handler)
  );
}

/**
 * Registers placeholder handlers for menu items that are not implemented yet.
 *
 * @param {{vscodeApi: import("vscode")}} deps Registration dependencies.
 * @param {Set<string>} implementedCommandIds Commands that should not get placeholder handlers.
 * @returns {import("vscode").Disposable[]} Placeholder command disposables.
 */
function registerPlaceholderMenuCommands(deps, implementedCommandIds) {
  return RUN_MENU_ITEMS.filter(
    (item) => !implementedCommandIds.has(item.commandId)
  ).map((item) =>
    deps.vscodeApi.commands.registerCommand(item.commandId, () => {
      deps.vscodeApi.window.showInformationMessage(
        buildNotImplementedMessage(item.commandId)
      );
    })
  );
}

/**
 * Returns command IDs that appear in the launcher run menu.
 *
 * @returns {Set<string>} Launcher run-menu command IDs.
 */
function getRunMenuCommandIdSet() {
  return new Set(RUN_MENU_ITEMS.map((item) => item.commandId));
}

/**
 * Derives implemented run-menu command IDs from guarded command definitions.
 *
 * @param {{commandId: string, handler: Function}[]} guardedCommandDefs Guarded command definitions.
 * @returns {Set<string>} Implemented run-menu command IDs.
 */
function deriveImplementedRunMenuCommandIds(guardedCommandDefs) {
  const runMenuCommandIds = getRunMenuCommandIdSet();
  return new Set(
    guardedCommandDefs
      .map((commandDef) => commandDef.commandId)
      .filter((commandId) => runMenuCommandIds.has(commandId))
  );
}

/**
 * Registers extension commands and routes handlers through shared wrappers.
 *
 * @param {{
 *   vscodeApi: import("vscode"),
 *   runWithPreflightGuard: (handler: (...args: unknown[]) => Promise<unknown>) => (...args: unknown[]) => Promise<unknown>,
 *   runActiveFileHandler: (vscodeApi: import("vscode"), eligibilityState: object) => Promise<unknown>,
 *   runFileHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   runLanguageHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   runSmokeTestHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   runSmokeTestStopHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   runSmokeTestClearResultsHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   flagLanguageHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   unflagLanguageHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   runLocalCleanHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   runCleanHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   runActiveFileCompileOnlyHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   runLanguageCompileOnlyHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   runActiveFileCheckOnlyNativeHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   runActiveFileCheckOnlyDockerHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   runActiveFileCheckOnlySshHandler: (vscodeApi: import("vscode"), eligibilityState: object, targetUri?: import("vscode").Uri) => Promise<unknown>,
 *   runLanguageCheckOnlyNativeHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   runLanguageCheckOnlyDockerHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   runLanguageCheckOnlySshHandler: (vscodeApi: import("vscode"), eligibilityState: object, item?: unknown) => Promise<unknown>,
 *   openRunMenuFlow: (vscodeApi: import("vscode")) => Promise<string|null>,
 *   showSidebarFileView: () => Promise<void>,
 *   showSidebarLanguageView: () => Promise<void>,
 *   showSidebarAllFilter: () => Promise<void>,
 *   showSidebarProblemsFilter: () => Promise<void>,
 *   refreshSidebarView: () => Promise<void>,
 *   createLanguageFilePlaceholder: (item?: unknown) => Promise<void>,
 *   standardLibraryCreateFile: (item?: unknown) => Promise<void>,
 *   standardLibraryCreateFileAtRoot: () => Promise<void>,
 *   standardLibraryCreateFolder: (item?: unknown) => Promise<void>,
 *   standardLibraryCreateFolderAtRoot: () => Promise<void>,
 *   standardLibraryDelete: (item?: unknown) => Promise<void>
 * }} deps Command registration dependencies.
 * @returns {import("vscode").Disposable[]} Command disposables.
 */
function registerCommands(deps) {
  const guardedCommandDefs = [
    {
      commandId: "algos.runActiveFile",
      handler: deps.runActiveFileHandler,
    },
    {
      commandId: "algos.runFile",
      handler: deps.runFileHandler,
    },
    {
      commandId: "algos.runLanguage",
      handler: deps.runLanguageHandler,
    },
    {
      commandId: "algos.runSmokeTest",
      handler: deps.runSmokeTestHandler,
    },
    {
      commandId: "algos.runSmokeTestStop",
      handler: deps.runSmokeTestStopHandler,
    },
    {
      commandId: "algos.runSmokeTestClearResults",
      handler: deps.runSmokeTestClearResultsHandler,
    },
    {
      commandId: "algos.flagLanguage",
      handler: deps.flagLanguageHandler,
    },
    {
      commandId: "algos.unflagLanguage",
      handler: deps.unflagLanguageHandler,
    },
    {
      commandId: "algos.runLocalClean",
      handler: deps.runLocalCleanHandler,
    },
    {
      commandId: "algos.runClean",
      handler: deps.runCleanHandler,
    },
    {
      commandId: "algos.runActiveFileCompileOnly",
      handler: deps.runActiveFileCompileOnlyHandler,
    },
    {
      commandId: "algos.runLanguageCompileOnly",
      handler: deps.runLanguageCompileOnlyHandler,
    },
    {
      commandId: "algos.runActiveFileCheckOnlyNative",
      handler: deps.runActiveFileCheckOnlyNativeHandler,
    },
    {
      commandId: "algos.runLanguageCheckOnlyNative",
      handler: deps.runLanguageCheckOnlyNativeHandler,
    },
    {
      commandId: "algos.runActiveFileCheckOnlyDocker",
      handler: deps.runActiveFileCheckOnlyDockerHandler,
    },
    {
      commandId: "algos.runLanguageCheckOnlyDocker",
      handler: deps.runLanguageCheckOnlyDockerHandler,
    },
    {
      commandId: "algos.runActiveFileCheckOnlySsh",
      handler: deps.runActiveFileCheckOnlySshHandler,
    },
    {
      commandId: "algos.runLanguageCheckOnlySsh",
      handler: deps.runLanguageCheckOnlySshHandler,
    },
    {
      commandId: "algos.runMenuClean",
      handler: deps.runCleanHandler,
    },
    {
      commandId: "algos.runMenuLocalclean",
      handler: deps.runLocalCleanHandler,
    },
    {
      commandId: "algos.runMenuCompileOnly",
      handler: deps.runActiveFileCompileOnlyHandler,
    },
    {
      commandId: "algos.runMenuCheckOnly",
      handler: deps.runActiveFileCheckOnlyNativeHandler,
    },
    {
      commandId: "algos.standardLibraryCreateFile",
      handler: async (_vscodeApi, _eligibilityState, item) => {
        await deps.standardLibraryCreateFile(item);
      },
    },
    {
      commandId: "algos.standardLibraryCreateFileAtRoot",
      handler: async () => {
        await deps.standardLibraryCreateFileAtRoot();
      },
    },
    {
      commandId: "algos.standardLibraryCreateFolder",
      handler: async (_vscodeApi, _eligibilityState, item) => {
        await deps.standardLibraryCreateFolder(item);
      },
    },
    {
      commandId: "algos.standardLibraryCreateFolderAtRoot",
      handler: async () => {
        await deps.standardLibraryCreateFolderAtRoot();
      },
    },
    {
      commandId: "algos.standardLibraryDelete",
      handler: async (_vscodeApi, _eligibilityState, item) => {
        await deps.standardLibraryDelete(item);
      },
    },
  ];
  const implementedMenuCommandIds = deriveImplementedRunMenuCommandIds(
    guardedCommandDefs
  );

  const guardedCommands = registerGuardedCommands(deps, guardedCommandDefs);
  const openRunMenuCommand = registerRunMenuCommand(deps);
  const sidebarModeCommands = registerSidebarModeCommands(deps);
  const placeholderCommands = registerPlaceholderMenuCommands(
    deps,
    implementedMenuCommandIds
  );

  return [
    ...guardedCommands,
    openRunMenuCommand,
    ...sidebarModeCommands,
    ...placeholderCommands,
  ];
}

// Public registration API used by extension entry points.
module.exports = {
  buildNotImplementedMessage,
  registerCommands,
};
