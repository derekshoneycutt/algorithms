// Run actions shown by FEAT-207 launcher quick-pick.
const RUN_MENU_ITEMS = [
  {
    commandId: "algos.runActiveFile",
    label: "Run File",
    description: "Run the active file",
  },
  {
    commandId: "algos.runClean",
    label: "Clean",
    description: "Run clean --defaults=y in algorithm context",
  },
  {
    commandId: "algos.runLocalClean",
    label: "Local Clean",
    description: "Run local clean in algorithm context",
  },
  {
    commandId: "algos.runActiveFileCompileOnly",
    label: "Compile Only",
    description: "Run --compile-only for the active target",
  },
  {
    commandId: "algos.runActiveFileCheckOnlyNative",
    label: "Check Only (Native)",
    description: "Run --check-only=native for the active target",
  },
  {
    commandId: "algos.runActiveFileCheckOnlyDocker",
    label: "Check Only (Docker)",
    description: "Run --check-only=docker for the active target",
  },
  {
    commandId: "algos.runActiveFileCheckOnlySsh",
    label: "Check Only (SSH)",
    description: "Run --check-only=ssh for the active target",
  },
];

/**
 * Shows the run menu and returns selected command ID.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @returns {Promise<string|null>} Selected command ID, or null when canceled.
 */
async function openRunMenuFlow(vscodeApi) {
  const items = RUN_MENU_ITEMS.map((item) => ({
    label: item.label,
    description: item.description,
    commandId: item.commandId,
  }));

  const picked = await vscodeApi.window.showQuickPick(items, {
    title: "Derek's Algorithms",
    placeHolder: "Choose a run action",
    ignoreFocusOut: true,
  });

  return picked?.commandId || null;
}

// Public quick-pick helpers for launcher command flow.
module.exports = {
  RUN_MENU_ITEMS,
  openRunMenuFlow,
};
