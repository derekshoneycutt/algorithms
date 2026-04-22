const { resolveEligibilityState } = require("../runtime/pathResolver");
const {
  deleteWithTrashFallback: deleteWithTrashFallbackInternal,
  isPathWithinRoot: isPathWithinRootInternal,
  realpathSafe,
} = require("../runtime/workspaceFilesystem");

/**
 * Returns workspace folders from VS Code API.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @returns {import("vscode").WorkspaceFolder[]} Open workspace folders.
 */
function getWorkspaceFolders(vscodeApi) {
  return vscodeApi.workspace.workspaceFolders || [];
}

/**
 * Resolves the first eligible repository root from workspace folders.
 *
 * @param {import("vscode").WorkspaceFolder[]} workspaceFolders Open workspace folders.
 * @returns {string|null} Canonical resolved root path, or null when none are eligible.
 */
function resolveFirstEligibleRootPath(workspaceFolders) {
  if (!Array.isArray(workspaceFolders) || workspaceFolders.length === 0) {
    return null;
  }

  for (const workspaceFolder of workspaceFolders) {
    const statusState = resolveEligibilityState([workspaceFolder]);
    const resolvedRootPath = statusState.selected?.resolvedRoot || null;

    if (statusState.status !== "eligible" || !resolvedRootPath) {
      continue;
    }

    return realpathSafe(resolvedRootPath);
  }

  return null;
}

/**
 * Checks whether a path stays within the given root directory.
 *
 * @param {string} rootPath Canonical root directory path.
 * @param {string} candidatePath Candidate path to validate.
 * @returns {boolean} True when candidatePath is inside rootPath.
 */
function isPathWithinRoot(rootPath, candidatePath) {
  return isPathWithinRootInternal(rootPath, candidatePath);
}

/**
 * Deletes one target URI by trying OS trash first and falling back to direct delete.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {import("vscode").Uri} targetUri Target URI to delete.
 * @param {boolean} recursive Whether deletion should recurse for directories.
 * @returns {Promise<{usedTrash: boolean}>} Delete result metadata.
 */
async function deleteWithTrashFallback(vscodeApi, targetUri, recursive) {
  return deleteWithTrashFallbackInternal(vscodeApi, targetUri, recursive);
}

module.exports = {
  deleteWithTrashFallback,
  getWorkspaceFolders,
  isPathWithinRoot,
  resolveFirstEligibleRootPath,
};
