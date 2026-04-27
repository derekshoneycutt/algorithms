import * as path from "node:path";

import * as vscode from "vscode";

import type { IFilesystem } from "../filesystem";
import type { ILanguages } from "../languages";
import type { INotificationRouter } from "../notifications";
import type { IViewModeService } from "../state/viewMode";
import type { WorkspaceTreeNode } from "../views";
import { resolveAlgorithmsRootPath } from "../algorithms";

/**
 * Dependencies for Algorithms tree action commands.
 */
export interface AlgorithmTreeActionDependencies {
  filesystem: IFilesystem;
  languages: ILanguages;
  notificationRouter: INotificationRouter;
  refreshAlgorithmsTree: () => void;
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
 * Resolves the algorithms root path for the current workspace context.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @returns {Promise<string | null>} Canonical algorithms root path.
 */
async function getAlgorithmsRootPathForCurrentWorkspace(
  filesystem: IFilesystem
): Promise<string | null> {
  return await resolveAlgorithmsRootPath({
    filesystem,
    workspaceFolderPaths: getWorkspaceFolderPaths(),
  });
}

/**
 * Returns the target directory for one create action.
 *
 * @param {WorkspaceTreeNode | undefined} treeNode Optional hovered tree node.
 * @param {string} rootPath Canonical algorithms root path.
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
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @param {string} rootPath Algorithms root path.
 * @param {string} targetDirectoryPath Target directory path.
 * @param {string} inputName User-entered relative name.
 * @returns {Promise<string | null>} Validated target path.
 */
async function buildValidatedTargetPath(
  dependencies: AlgorithmTreeActionDependencies,
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
      "Use a relative name inside the Algorithms root."
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
      "Target must stay inside the Algorithms root."
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
 * Creates one command that creates a folder at the Algorithms root.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {() => Promise<void>} Command handler.
 */
export function createAlgorithmsCreateFolderAtRootCommand(
  dependencies: AlgorithmTreeActionDependencies
): () => Promise<void> {
  return async (): Promise<void> => {
    const algorithmsRootPath = await getAlgorithmsRootPathForCurrentWorkspace(
      dependencies.filesystem
    );

    if (algorithmsRootPath === null) {
      await dependencies.notificationRouter.warn(
        "Algorithms root is unavailable."
      );
      return;
    }

    const inputName = await promptForRelativeName(
      "Create folder at Algorithms root",
      "new-language"
    );

    if (inputName === undefined) {
      return;
    }

    const targetPath = await buildValidatedTargetPath(
      dependencies,
      algorithmsRootPath,
      algorithmsRootPath,
      inputName
    );

    if (targetPath === null) {
      return;
    }

    try {
      await dependencies.filesystem.ensureDirectory(targetPath);
      dependencies.refreshAlgorithmsTree();
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
 * Creates one command that creates a folder in a first-level Algorithms directory.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsCreateFolderCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    const algorithmsRootPath = await getAlgorithmsRootPathForCurrentWorkspace(
      dependencies.filesystem
    );

    if (algorithmsRootPath === null) {
      await dependencies.notificationRouter.warn(
        "Algorithms root is unavailable."
      );
      return;
    }

    const targetDirectoryPath = resolveCreateTargetDirectoryPath(
      treeNode,
      algorithmsRootPath
    );

    const inputName = await promptForRelativeName(
      "Create folder in Algorithms directory",
      "new-algorithm"
    );

    if (inputName === undefined) {
      return;
    }

    const targetPath = await buildValidatedTargetPath(
      dependencies,
      algorithmsRootPath,
      targetDirectoryPath,
      inputName
    );

    if (targetPath === null) {
      return;
    }

    try {
      await dependencies.filesystem.ensureDirectory(targetPath);
      dependencies.refreshAlgorithmsTree();
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
 * Creates one command that creates a file in a second-level Algorithms directory.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsCreateFileCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    const algorithmsRootPath = await getAlgorithmsRootPathForCurrentWorkspace(
      dependencies.filesystem
    );

    if (algorithmsRootPath === null) {
      await dependencies.notificationRouter.warn(
        "Algorithms root is unavailable."
      );
      return;
    }

    const targetDirectoryPath = resolveCreateTargetDirectoryPath(
      treeNode,
      algorithmsRootPath
    );

    const inputName = await promptForRelativeName(
      "Create file in Algorithms directory",
      "solution.py"
    );

    if (inputName === undefined) {
      return;
    }

    const targetPath = await buildValidatedTargetPath(
      dependencies,
      algorithmsRootPath,
      targetDirectoryPath,
      inputName
    );

    if (targetPath === null) {
      return;
    }

    try {
      await dependencies.filesystem.writeText(targetPath, "");
      await vscode.window.showTextDocument(vscode.Uri.file(targetPath));
      dependencies.refreshAlgorithmsTree();
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
 * Creates one command that deletes a file or folder in the Algorithms tree.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsAddIncludeFileCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    const acceptedKinds: ReadonlySet<WorkspaceTreeNode["kind"]> = new Set([
      "file",
      "mainFile",
      "languageSummary",
    ]);

    if (treeNode === undefined || !acceptedKinds.has(treeNode.kind)) {
      await dependencies.notificationRouter.warn(
        "Select an algorithm source file to add an include file."
      );
      return;
    }

    const algorithmsRootPath = await getAlgorithmsRootPathForCurrentWorkspace(
      dependencies.filesystem
    );

    if (algorithmsRootPath === null) {
      await dependencies.notificationRouter.warn(
        "Algorithms root is unavailable."
      );
      return;
    }

    // Determine language key from file extension
    const languageKey = dependencies.languages.normalizeFileExtension(treeNode.filePath);
    if (languageKey === undefined) {
      await dependencies.notificationRouter.warn(
        "File language could not be determined."
      );
      return;
    }

    // Verify this is a main algorithm file (basename matches parent directory)
    const algorithmDirectoryPath = path.dirname(treeNode.filePath);
    const algorithmDirectory = path.basename(algorithmDirectoryPath);
    const fileName = path.basename(treeNode.filePath);
    const fileBaseNameWithoutExtension = path.basename(fileName, path.extname(fileName));

    if (fileBaseNameWithoutExtension !== algorithmDirectory) {
      await dependencies.notificationRouter.warn(
        "Only add include files to main algorithm source files."
      );
      return;
    }

    // Prompt for include file name with language-specific extension hint
    const prompt = `Add include file for ${languageKey}`;
    const fileExtension = path.extname(treeNode.filePath);
    const placeHolder = `helper${fileExtension}`;

    const inputName = await promptForRelativeName(prompt, placeHolder);

    if (inputName === undefined) {
      return;
    }

    // Validate extension matches language
    const trimmedInput = inputName.trim();
    if (trimmedInput.length === 0) {
      await dependencies.notificationRouter.warn("File name cannot be empty.");
      return;
    }

    const inputExtension = path.extname(trimmedInput);
    const expectedExtension = path.extname(treeNode.filePath);

    if (inputExtension !== expectedExtension) {
      await dependencies.notificationRouter.warn(
        `Include file must have extension ${expectedExtension}.`
      );
      return;
    }

    // Ensure include directory exists
    const includeDirectoryName = `${languageKey}_include`;
    const includeDirectoryPath = path.join(algorithmDirectoryPath, includeDirectoryName);

    try {
      await dependencies.filesystem.ensureDirectory(includeDirectoryPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(
        `Failed to create include folder: ${errorMessage}`
      );
      return;
    }

    // Create the include file
    const includeFilePath = path.join(includeDirectoryPath, trimmedInput);
    const targetExists =
      (await dependencies.filesystem.isFile(includeFilePath))
      || (await dependencies.filesystem.isDirectory(includeFilePath));

    if (targetExists) {
      await dependencies.notificationRouter.warn(
        "An include file with that name already exists."
      );
      return;
    }

    try {
      await dependencies.filesystem.writeText(includeFilePath, "");
      await vscode.window.showTextDocument(vscode.Uri.file(includeFilePath));
      dependencies.refreshAlgorithmsTree();
      await dependencies.notificationRouter.info(
        `Created include file: ${trimmedInput}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(
        `Failed to create include file: ${errorMessage}`
      );
    }
  };
}

/**
 * Creates one command that deletes a file or folder in the Algorithms tree.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsDeleteCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    if (treeNode === undefined) {
      await dependencies.notificationRouter.warn("Select a file or folder to delete.");
      return;
    }

    const algorithmsRootPath = await getAlgorithmsRootPathForCurrentWorkspace(
      dependencies.filesystem
    );

    if (algorithmsRootPath === null) {
      await dependencies.notificationRouter.warn(
        "Algorithms root is unavailable."
      );
      return;
    }

    const canonicalRootPath = await dependencies.filesystem.realpath(
      algorithmsRootPath
    );
    const targetPath = treeNode.filePath;
    const canonicalTargetPath = await dependencies.filesystem.realpath(targetPath);
    const targetExists =
      (await dependencies.filesystem.isFile(targetPath))
      || (await dependencies.filesystem.isDirectory(targetPath));

    if (!targetExists) {
      await dependencies.notificationRouter.warn("Target no longer exists.");
      dependencies.refreshAlgorithmsTree();
      return;
    }

    const isWithinRoot = await dependencies.filesystem.isPathWithinRoot(
      canonicalRootPath,
      canonicalTargetPath
    );

    if (!isWithinRoot) {
      await dependencies.notificationRouter.warn(
        "Delete target must stay inside the Algorithms root."
      );
      return;
    }

    if (canonicalTargetPath === canonicalRootPath) {
      await dependencies.notificationRouter.warn(
        "Cannot delete the Algorithms root folder."
      );
      return;
    }

    const basename = path.basename(canonicalTargetPath);

    // Check if this is a main algorithm file that has include files
    const relevantIncludeDirectories: string[] = [];
    if (treeNode.kind === "file") {
      const parentDirectory = path.dirname(canonicalTargetPath);
      const parentDirectoryBaseName = path.basename(parentDirectory);
      const fileName = path.basename(canonicalTargetPath);
      const fileBaseName = path.basename(fileName, path.extname(fileName));

      // Check if this is a main algorithm file
      if (fileBaseName === parentDirectoryBaseName) {
        // Find all language-specific include directories
        const dirEntries = await dependencies.filesystem.listDirectory(parentDirectory);
        if (dirEntries !== null) {
          for (const entry of Object.values(dirEntries)) {
            if (entry.isDirectory() && entry.name.endsWith("_include")) {
              relevantIncludeDirectories.push(path.join(parentDirectory, entry.name));
            }
          }
        }
      }
    }

    const deletePrompt = treeNode.kind === "directory"
      ? `Delete folder ${basename} and all of its contents?`
      : `Delete file ${basename}?`;

    const detail = relevantIncludeDirectories.length > 0
      ? `${canonicalTargetPath}\n\nNote: Associated include folder(s) will also be deleted.`
      : canonicalTargetPath;

    const confirmation = await vscode.window.showWarningMessage(
      deletePrompt,
      {
        modal: true,
        detail,
      },
      "Delete"
    );

    if (confirmation !== "Delete") {
      return;
    }

    try {
      // Delete the main target
      await vscode.workspace.fs.delete(vscode.Uri.file(canonicalTargetPath), {
        recursive: true,
        useTrash: true,
      });

      // Delete associated include directories
      for (const includeDir of relevantIncludeDirectories) {
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(includeDir), {
            recursive: true,
            useTrash: true,
          });
        } catch {
          // Continue with other includes if one fails
        }
      }

      dependencies.refreshAlgorithmsTree();
      await dependencies.notificationRouter.info(`Moved to trash: ${basename}`);
      return;
    } catch {
      // Fall through to permanent deletion.
    }

    try {
      // Delete the main target
      await dependencies.filesystem.deletePath(canonicalTargetPath, {
        recursive: true,
      });

      // Delete associated include directories
      for (const includeDir of relevantIncludeDirectories) {
        try {
          await dependencies.filesystem.deletePath(includeDir, {
            recursive: true,
          });
        } catch {
          // Continue with other includes if one fails
        }
      }

      dependencies.refreshAlgorithmsTree();
      await dependencies.notificationRouter.info(`Deleted permanently: ${basename}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(
        `Failed to delete: ${errorMessage}`
      );
    }
  };
}

/**
 * Creates one command to switch to file view in the algorithms sidebar.
 *
 * @param {IViewModeService} viewModeService View mode service dependency.
 * @returns {() => Promise<void>} Command handler.
 */
export function createAlgorithmsSidebarShowFileViewCommand(
  viewModeService: IViewModeService
): () => Promise<void> {
  return async (): Promise<void> => {
    await viewModeService.setViewMode("files");
  };
}

/**
 * Creates one command to switch to language view in the algorithms sidebar.
 *
 * @param {IViewModeService} viewModeService View mode service dependency.
 * @returns {() => Promise<void>} Command handler.
 */
export function createAlgorithmsSidebarShowLanguageViewCommand(
  viewModeService: IViewModeService
): () => Promise<void> {
  return async (): Promise<void> => {
    await viewModeService.setViewMode("language");
  };
}
