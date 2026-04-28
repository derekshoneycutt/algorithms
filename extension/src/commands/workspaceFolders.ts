import * as vscode from "vscode";

/**
 * Returns currently opened workspace folder paths.
 *
 * @returns {readonly string[]} Workspace folder fs paths.
 */
export function getWorkspaceFolderPaths(): readonly string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((workspaceFolder) => {
    return workspaceFolder.uri.fsPath;
  });
}

/**
 * Resolves the workspace folder that owns one file path.
 *
 * @param {string | undefined} filePath File path to resolve.
 * @returns {string | undefined} Owning workspace folder path when available.
 */
export function getOwningWorkspaceFolderPath(
  filePath: string | undefined
): string | undefined {
  if (filePath === undefined || filePath.trim().length === 0) {
    return undefined;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
  return workspaceFolder?.uri.fsPath;
}