import * as path from "node:path";

import * as vscode from "vscode";

import type { IFilesystem } from "../filesystem";
import type { INotificationRouter } from "../notifications";
import type { WorkspaceTreeNode } from "../views";
import type { IRootPathResolver } from "../algorithms";

/**
 * Dependencies for Standard Library tree action commands.
 */
export interface StandardLibraryTreeActionDependencies {
  filesystem: IFilesystem;
  notificationRouter: INotificationRouter;
  refreshStandardLibraryTree: () => void;
  rootPathResolver: IRootPathResolver | undefined;
}

/**
 * Returns currently opened workspace folder paths.
 *
 * @returns {readonly string[]} Workspace folder paths.
 */
function getWorkspaceFolderPaths(): readonly string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((workspaceFolder) => {
    return workspaceFolder.uri.fsPath;
  });
}

/**
 * Resolves the standard-library root path for the current workspace context.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @param {IRootPathResolver | undefined} rootPathResolver Root path resolver.
 * @returns {Promise<string | null>} Canonical stdlib root path.
 */
async function getStdlibRootPathForCurrentWorkspace(
  filesystem: IFilesystem,
  rootPathResolver: IRootPathResolver | undefined
): Promise<string | null> {
  if (rootPathResolver === undefined) {
    return null;
  }
  return await rootPathResolver.resolveStdlibRoot({
    filesystem,
    workspaceFolderPaths: getWorkspaceFolderPaths(),
  });
}

/**
 * Returns the target directory for one create action.
 *
 * @param {WorkspaceTreeNode | undefined} treeNode Optional hovered tree node.
 * @param {string} rootPath Canonical standard-library root path.
 * @returns {string} Target directory path.
 */
function resolveCreateTargetDirectoryPath(
  treeNode: WorkspaceTreeNode | undefined,
  rootPath: string
): string {
  if (treeNode === undefined) {
    return rootPath;
  }

  if (treeNode.kind === "directory") {
    return treeNode.filePath;
  }

  return path.dirname(treeNode.filePath);
}

/**
 * Prompts the user for one relative file-system entry name.
 *
 * @param {string} prompt Prompt text.
 * @param {string} placeHolder Placeholder text.
 * @returns {Promise<string | undefined>} Entered relative name.
 */
async function promptForRelativeName(
  prompt: string,
  placeHolder: string
): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt,
    placeHolder,
    ignoreFocusOut: true,
  });
}

/**
 * Builds one target path from user input after basic validation.
 *
 * @param {StandardLibraryTreeActionDependencies} dependencies Action dependencies.
 * @param {string} rootPath Standard-library root path.
 * @param {string} targetDirectoryPath Target directory path.
 * @param {string} inputName User-entered relative name.
 * @returns {Promise<string | null>} Validated target path.
 */
async function buildValidatedTargetPath(
  dependencies: StandardLibraryTreeActionDependencies,
  rootPath: string,
  targetDirectoryPath: string,
  inputName: string
): Promise<string | null> {
  const trimmedInput = inputName.trim();

  if (trimmedInput.length === 0) {
    await dependencies.notificationRouter.warn("Name cannot be empty.");
    return null;
  }

  if (path.isAbsolute(trimmedInput)) {
    await dependencies.notificationRouter.warn(
      "Use a relative name inside the Standard Library root."
    );
    return null;
  }

  const candidatePath = path.join(targetDirectoryPath, trimmedInput);
  const isWithinRoot = await dependencies.filesystem.isPathWithinRoot(
    rootPath,
    candidatePath
  );

  if (!isWithinRoot) {
    await dependencies.notificationRouter.warn(
      "Target must stay inside the Standard Library root."
    );
    return null;
  }

  const targetExists =
    (await dependencies.filesystem.isFile(candidatePath))
    || (await dependencies.filesystem.isDirectory(candidatePath));

  if (targetExists) {
    await dependencies.notificationRouter.warn(
      "A file or folder with that name already exists."
    );
    return null;
  }

  return candidatePath;
}

/**
 * Creates one command that creates a file in the Standard Library tree.
 *
 * @param {StandardLibraryTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createStandardLibraryCreateFileCommand(
  dependencies: StandardLibraryTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    const standardLibraryRootPath = await getStdlibRootPathForCurrentWorkspace(
      dependencies.filesystem,
      dependencies.rootPathResolver
    );

    if (standardLibraryRootPath === null) {
      await dependencies.notificationRouter.warn(
        "Standard Library root is unavailable."
      );
      return;
    }

    const targetDirectoryPath = resolveCreateTargetDirectoryPath(
      treeNode,
      standardLibraryRootPath
    );

    const inputName = await promptForRelativeName(
      "Create file in Standard Library",
      "example.py"
    );

    if (inputName === undefined) {
      return;
    }

    const targetPath = await buildValidatedTargetPath(
      dependencies,
      standardLibraryRootPath,
      targetDirectoryPath,
      inputName
    );

    if (targetPath === null) {
      return;
    }

    try {
      await dependencies.filesystem.writeText(targetPath, "");
      await vscode.window.showTextDocument(vscode.Uri.file(targetPath));
      dependencies.refreshStandardLibraryTree();
      await dependencies.notificationRouter.info(
        `Created file: ${path.basename(targetPath)}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(
        `Failed to create file: ${errorMessage}`
      );
    }
  };
}

/**
 * Creates one command that creates a folder in the Standard Library tree.
 *
 * @param {StandardLibraryTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createStandardLibraryCreateFolderCommand(
  dependencies: StandardLibraryTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    const standardLibraryRootPath = await getStdlibRootPathForCurrentWorkspace(
      dependencies.filesystem,
      dependencies.rootPathResolver
    );

    if (standardLibraryRootPath === null) {
      await dependencies.notificationRouter.warn(
        "Standard Library root is unavailable."
      );
      return;
    }

    const targetDirectoryPath = resolveCreateTargetDirectoryPath(
      treeNode,
      standardLibraryRootPath
    );

    const inputName = await promptForRelativeName(
      "Create folder in Standard Library",
      "new-folder"
    );

    if (inputName === undefined) {
      return;
    }

    const targetPath = await buildValidatedTargetPath(
      dependencies,
      standardLibraryRootPath,
      targetDirectoryPath,
      inputName
    );

    if (targetPath === null) {
      return;
    }

    try {
      await dependencies.filesystem.ensureDirectory(targetPath);
      dependencies.refreshStandardLibraryTree();
      await dependencies.notificationRouter.info(
        `Created folder: ${path.basename(targetPath)}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(
        `Failed to create folder: ${errorMessage}`
      );
    }
  };
}

/**
 * Creates one command that deletes a file or folder in the Standard Library tree.
 *
 * @param {StandardLibraryTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createStandardLibraryDeleteCommand(
  dependencies: StandardLibraryTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    if (treeNode === undefined) {
      await dependencies.notificationRouter.warn("Select a file or folder to delete.");
      return;
    }

    const standardLibraryRootPath = await getStdlibRootPathForCurrentWorkspace(
      dependencies.filesystem,
      dependencies.rootPathResolver
    );

    if (standardLibraryRootPath === null) {
      await dependencies.notificationRouter.warn(
        "Standard Library root is unavailable."
      );
      return;
    }

    const canonicalRootPath = await dependencies.filesystem.realpath(
      standardLibraryRootPath
    );
    const targetPath = treeNode.filePath;
    const canonicalTargetPath = await dependencies.filesystem.realpath(targetPath);
    const targetExists =
      (await dependencies.filesystem.isFile(targetPath))
      || (await dependencies.filesystem.isDirectory(targetPath));

    if (!targetExists) {
      await dependencies.notificationRouter.warn("Target no longer exists.");
      dependencies.refreshStandardLibraryTree();
      return;
    }

    const isWithinRoot = await dependencies.filesystem.isPathWithinRoot(
      canonicalRootPath,
      canonicalTargetPath
    );

    if (!isWithinRoot) {
      await dependencies.notificationRouter.warn(
        "Delete target must stay inside the Standard Library root."
      );
      return;
    }

    if (canonicalTargetPath === canonicalRootPath) {
      await dependencies.notificationRouter.warn(
        "Cannot delete the Standard Library root folder."
      );
      return;
    }

    const basename = path.basename(canonicalTargetPath);
    const deletePrompt = treeNode.kind === "directory"
      ? `Delete folder ${basename} and all of its contents?`
      : `Delete file ${basename}?`;

    const confirmation = await vscode.window.showWarningMessage(
      deletePrompt,
      {
        modal: true,
        detail: canonicalTargetPath,
      },
      "Delete"
    );

    if (confirmation !== "Delete") {
      return;
    }

    try {
      await vscode.workspace.fs.delete(vscode.Uri.file(canonicalTargetPath), {
        recursive: true,
        useTrash: true,
      });
      dependencies.refreshStandardLibraryTree();
      await dependencies.notificationRouter.info(`Moved to trash: ${basename}`);
      return;
    } catch {
      // Fall through to permanent deletion.
    }

    try {
      await dependencies.filesystem.deletePath(canonicalTargetPath, {
        recursive: true,
      });
      dependencies.refreshStandardLibraryTree();
      await dependencies.notificationRouter.info(`Deleted permanently: ${basename}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(
        `Failed to delete target: ${errorMessage}`
      );
    }
  };
}
