import * as path from "node:path";

import * as vscode from "vscode";

import type { IConductor } from "../conductor";
import type { ConductorRunActionKind } from "../conductor";
import type { IFilesystem } from "../filesystem";
import type { ILanguages } from "../languages";
import type { INotificationRouter } from "../notifications";
import type { IStateMachine } from "../state";
import type { IFilterModeService } from "../state/filterMode";
import type { IViewModeService } from "../state/viewMode";
import type { WorkspaceTreeNode } from "../views";
import type { IFlaggedLanguagesService, IRootPathResolver } from "../algorithms";
import { getOwningWorkspaceFolderPath, getWorkspaceFolderPaths } from "./workspaceFolders";

/**
 * Dependencies for Algorithms tree action commands.
 */
export interface AlgorithmTreeActionDependencies {
  conductor?: IConductor;
  filesystem: IFilesystem;
  flaggedLanguages?: IFlaggedLanguagesService;
  hostState?: IStateMachine;
  languages: ILanguages;
  notificationRouter: INotificationRouter;
  refreshAlgorithmsTree: () => void;
  rootPathResolver?: IRootPathResolver;
}

type CheckOnlyRoute = "native" | "docker" | "ssh";

/**
 * Resolves the algorithms root path for the current workspace context.
 *
 * @param {IFilesystem} filesystem Filesystem dependency.
 * @param {IRootPathResolver | undefined} rootPathResolver Root path resolver.
 * @returns {Promise<string | null>} Canonical algorithms root path.
 */
async function getAlgorithmsRootPathForCurrentWorkspace(
  filesystem: IFilesystem,
  rootPathResolver: IRootPathResolver | undefined
): Promise<string | null> {
  if (rootPathResolver === undefined) {
    return null;
  }

  return await rootPathResolver.resolveAlgorithmsRoot({
    filesystem,
    workspaceFolderPaths: getWorkspaceFolderPaths(),
  });
}

/**
 * Returns true when one node kind can represent an algorithm language row.
 *
 * @param {WorkspaceTreeNode["kind"]} nodeKind Candidate node kind.
 * @returns {boolean} True when supported by flag/unflag actions.
 */
function isFlaggableNodeKind(nodeKind: WorkspaceTreeNode["kind"]): boolean {
  return nodeKind === "file" || nodeKind === "mainFile" || nodeKind === "languageSummary";
}

/**
 * Resolves the algorithm directory path for one tree node.
 *
 * @param {WorkspaceTreeNode} treeNode Source node.
 * @returns {string} Algorithm directory path.
 */
function resolveAlgorithmDirectoryPath(treeNode: WorkspaceTreeNode): string {
  if (treeNode.parentAlgorithmPath !== undefined) {
    return treeNode.parentAlgorithmPath;
  }

  if (treeNode.kind === "languageSummary" || treeNode.kind === "algorithmDir") {
    return treeNode.filePath;
  }

  return path.dirname(treeNode.filePath);
}

/**
 * Resolves a language key from one tree node.
 *
 * @param {WorkspaceTreeNode} treeNode Source node.
 * @param {ILanguages} languages Languages dependency.
 * @returns {string | null} Normalized language key or null when unavailable.
 */
function resolveLanguageKeyFromNode(
  treeNode: WorkspaceTreeNode,
  languages: ILanguages
): string | null {
  if (treeNode.languageKey !== undefined && treeNode.languageKey.trim().length > 0) {
    return treeNode.languageKey.trim().toLowerCase();
  }

  const resolvedLanguageKey = languages.normalizeFileExtension(treeNode.filePath);
  if (resolvedLanguageKey === undefined) {
    return null;
  }

  return resolvedLanguageKey.trim().toLowerCase();
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

  if (treeNode.kind === "directory" || treeNode.kind === "algorithmDir") {
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
      dependencies.filesystem,
      dependencies.rootPathResolver
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
      dependencies.filesystem,
      dependencies.rootPathResolver
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
      dependencies.filesystem,
      dependencies.rootPathResolver
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
      dependencies.filesystem,
      dependencies.rootPathResolver
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

    const inputLanguageKey = dependencies.languages.normalizeFileExtension(trimmedInput);

    if (inputLanguageKey !== languageKey) {
      const expectedExtensions = dependencies.languages.getByKey(languageKey)
        ?.aliases.fileExtensions
        .join(", ");
      const expectedExtensionsText = expectedExtensions === undefined || expectedExtensions.length === 0
        ? `for language ${languageKey}`
        : `one of: ${expectedExtensions}`;
      await dependencies.notificationRouter.warn(
        `Include file extension must be ${expectedExtensionsText}.`
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
      dependencies.filesystem,
      dependencies.rootPathResolver
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
 * Creates one command that creates a documentation file in an algorithm docs folder.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsDocsCreateFileCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    if (treeNode === undefined || treeNode.kind !== "docsFolder") {
      await dependencies.notificationRouter.warn(
        "Select a documentation folder to create a file in."
      );
      return;
    }

    const targetDirectoryPath = treeNode.filePath;

    const inputName = await promptForRelativeName(
      "Create documentation file",
      "notes.md"
    );

    if (inputName === undefined) {
      return;
    }

    const trimmedInput = inputName.trim();

    if (trimmedInput.length === 0) {
      await dependencies.notificationRouter.warn("File name cannot be empty.");
      return;
    }

    if (path.isAbsolute(trimmedInput) || trimmedInput.includes(path.sep)) {
      await dependencies.notificationRouter.warn(
        "Use a simple file name without path separators."
      );
      return;
    }

    const candidatePath = path.join(targetDirectoryPath, trimmedInput);

    const targetExists =
      (await dependencies.filesystem.isFile(candidatePath))
      || (await dependencies.filesystem.isDirectory(candidatePath));

    if (targetExists) {
      await dependencies.notificationRouter.warn(
        "A file with that name already exists."
      );
      return;
    }

    const ext = path.extname(trimmedInput).toLowerCase();
    const willShow = ext === ".md" || ext === ".txt";

    if (!willShow) {
      const confirmation = await vscode.window.showWarningMessage(
        `"${trimmedInput}" won't appear under the docs folder in this extension (only .md and .txt files are shown). Create it anyway?`,
        { modal: true },
        "Create Anyway"
      );
      if (confirmation !== "Create Anyway") {
        return;
      }
    }

    try {
      await dependencies.filesystem.writeText(candidatePath, "");
      await vscode.window.showTextDocument(vscode.Uri.file(candidatePath));
      dependencies.refreshAlgorithmsTree();
      await dependencies.notificationRouter.info(
        `Created documentation file: ${path.basename(candidatePath)}`
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
 * Creates one command that deletes a documentation file from an algorithm docs folder.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsDocsDeleteFileCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    if (treeNode === undefined || treeNode.kind !== "docsFile") {
      await dependencies.notificationRouter.warn(
        "Select a documentation file to delete."
      );
      return;
    }

    const targetPath = treeNode.filePath;
    const basename = path.basename(targetPath);

    const targetExists = await dependencies.filesystem.isFile(targetPath);

    if (!targetExists) {
      await dependencies.notificationRouter.warn("File no longer exists.");
      dependencies.refreshAlgorithmsTree();
      return;
    }

    const confirmation = await vscode.window.showWarningMessage(
      `Delete file ${basename}?`,
      { modal: true, detail: targetPath },
      "Delete"
    );

    if (confirmation !== "Delete") {
      return;
    }

    try {
      await vscode.workspace.fs.delete(vscode.Uri.file(targetPath), {
        useTrash: true,
      });
      dependencies.refreshAlgorithmsTree();
      await dependencies.notificationRouter.info(`Moved to trash: ${basename}`);
      return;
    } catch {
      // Fall through to permanent deletion.
    }

    try {
      await dependencies.filesystem.deletePath(targetPath, { recursive: false });
      dependencies.refreshAlgorithmsTree();
      await dependencies.notificationRouter.info(`Deleted permanently: ${basename}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(
        `Failed to delete file: ${errorMessage}`
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

/**
 * Creates one command to switch to all-rows filter mode in the algorithms sidebar.
 *
 * @param {IFilterModeService} filterModeService Filter mode service dependency.
 * @returns {() => Promise<void>} Command handler.
 */
export function createAlgorithmsSidebarShowAllRowsCommand(
  filterModeService: IFilterModeService
): () => Promise<void> {
  return async (): Promise<void> => {
    await filterModeService.setFilterMode("all");
  };
}

/**
 * Creates one command to switch to problems-only filter mode in the algorithms sidebar.
 *
 * @param {IFilterModeService} filterModeService Filter mode service dependency.
 * @returns {() => Promise<void>} Command handler.
 */
export function createAlgorithmsSidebarShowProblemRowsCommand(
  filterModeService: IFilterModeService
): () => Promise<void> {
  return async (): Promise<void> => {
    await filterModeService.setFilterMode("problems");
  };
}

/**
 * Creates one command to flag the hovered language row in the algorithms tree.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsFlagLanguageCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    const flaggedLanguages = dependencies.flaggedLanguages;
    if (flaggedLanguages === undefined) {
      await dependencies.notificationRouter.error(
        "Flagged-language service is not configured."
      );
      return;
    }

    if (treeNode === undefined || !isFlaggableNodeKind(treeNode.kind)) {
      await dependencies.notificationRouter.warn("Select an algorithm language row to flag.");
      return;
    }

    const algorithmDirectoryPath = resolveAlgorithmDirectoryPath(treeNode);
    const languageKey = resolveLanguageKeyFromNode(treeNode, dependencies.languages);
    if (languageKey === null) {
      await dependencies.notificationRouter.warn("Language could not be determined.");
      return;
    }

    const flaggedLanguageKeys = await flaggedLanguages.readFlaggedLanguageKeys(
      algorithmDirectoryPath
    );
    flaggedLanguageKeys.add(languageKey);

    try {
      await flaggedLanguages.writeFlaggedLanguageKeys(
        algorithmDirectoryPath,
        flaggedLanguageKeys
      );
      dependencies.refreshAlgorithmsTree();
      await dependencies.notificationRouter.info(`Flagged language: ${languageKey}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(`Failed to flag language: ${errorMessage}`);
    }
  };
}

/**
 * Creates one command to clear a language flag for the hovered algorithms row.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsUnflagLanguageCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    const flaggedLanguages = dependencies.flaggedLanguages;
    if (flaggedLanguages === undefined) {
      await dependencies.notificationRouter.error(
        "Flagged-language service is not configured."
      );
      return;
    }

    if (treeNode === undefined || !isFlaggableNodeKind(treeNode.kind)) {
      await dependencies.notificationRouter.warn("Select an algorithm language row to unflag.");
      return;
    }

    const algorithmDirectoryPath = resolveAlgorithmDirectoryPath(treeNode);
    const languageKey = resolveLanguageKeyFromNode(treeNode, dependencies.languages);
    if (languageKey === null) {
      await dependencies.notificationRouter.warn("Language could not be determined.");
      return;
    }

    const flaggedLanguageKeys = await flaggedLanguages.readFlaggedLanguageKeys(
      algorithmDirectoryPath
    );
    flaggedLanguageKeys.delete(languageKey);

    try {
      await flaggedLanguages.writeFlaggedLanguageKeys(
        algorithmDirectoryPath,
        flaggedLanguageKeys
      );
      dependencies.refreshAlgorithmsTree();
      await dependencies.notificationRouter.info(`Unflagged language: ${languageKey}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await dependencies.notificationRouter.error(`Failed to unflag language: ${errorMessage}`);
    }
  };
}

/**
 * Creates one command to run the hovered Algorithms file/language target.
 *
 * This implementation runs `run.sh [options] <target> [args]` inside the resolved
 * algorithm directory using an extension-owned terminal.
 *
 * Target argument mapping:
 * - LANGUAGE view (`languageSummary`): language key (for example, `cpp`).
 * - FILES view (`file`/`mainFile`): selected filename.
 *
 * Argument order:
 * - run-control option flags first,
 * - then target,
 * - then passthrough run args.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsRunFileCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsRunCommandForAction(dependencies, "run-file");
}

/**
 * Creates one command to compile-only the hovered Algorithms target.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsCompileOnlyCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsRunCommandForAction(dependencies, "compile-only");
}

/**
 * Creates one command to check-only the hovered Algorithms target for one route.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @param {CheckOnlyRoute} route Requested check-only route.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsCheckOnlyCommand(
  dependencies: AlgorithmTreeActionDependencies,
  route: CheckOnlyRoute
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsRunCommandForAction(dependencies, "check-only", route);
}

/**
 * Creates one command to check-only (native route) the hovered Algorithms target.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsCheckOnlyNativeCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsCheckOnlyCommand(dependencies, "native");
}

/**
 * Creates one command to check-only (docker route) the hovered Algorithms target.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsCheckOnlyDockerCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsCheckOnlyCommand(dependencies, "docker");
}

/**
 * Creates one command to check-only (ssh route) the hovered Algorithms target.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsCheckOnlySshCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsCheckOnlyCommand(dependencies, "ssh");
}

/**
 * Creates one command to clean hovered Algorithms target outputs.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsCleanCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsRunCommandForAction(dependencies, "clean");
}

/**
 * Creates one command to local-clean hovered Algorithms target outputs.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsLocalCleanCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsRunCommandForAction(dependencies, "localclean");
}

/**
 * Creates one command to run smoke tests for the hovered algorithm directory.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsSmokeTestCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return createAlgorithmsRunCommandForAction(dependencies, "smoke-test");
}

/**
 * Creates one command to stop smoke tests for the hovered algorithm directory.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsStopSmokeTestCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    if (dependencies.conductor === undefined || dependencies.hostState === undefined) {
      await dependencies.notificationRouter.error("Run File orchestration is not configured.");
      return;
    }

    if (treeNode === undefined || treeNode.kind !== "algorithmDir") {
      await dependencies.notificationRouter.warn("Select an algorithm directory row to stop smoke testing.");
      return;
    }

    const algorithmPath = resolveAlgorithmDirectoryPath(treeNode);
    const stopped = await dependencies.conductor.stopSmokeTest({
      algorithmPath,
    });

    if (!stopped) {
      await dependencies.notificationRouter.warn("Smoke test is not currently running.");
      return;
    }

    dependencies.refreshAlgorithmsTree();
    await dependencies.notificationRouter.info(`Stopping smoke test for ${path.basename(algorithmPath)}.`);
  };
}

/**
 * Creates one command to clear retained smoke results for the hovered algorithm directory.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsClearSmokeResultsCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    if (dependencies.conductor === undefined || dependencies.hostState === undefined) {
      await dependencies.notificationRouter.error("Run File orchestration is not configured.");
      return;
    }

    if (treeNode === undefined || treeNode.kind !== "algorithmDir") {
      await dependencies.notificationRouter.warn("Select an algorithm directory row to clear smoke results.");
      return;
    }

    const algorithmPath = resolveAlgorithmDirectoryPath(treeNode);
    const cleared = dependencies.conductor.clearSmokeResults({
      algorithmPath,
      hostState: dependencies.hostState,
      refreshAlgorithmsTree: dependencies.refreshAlgorithmsTree,
    });

    if (!cleared) {
      await dependencies.notificationRouter.warn("Smoke results are not available to clear.");
      return;
    }

    await dependencies.notificationRouter.info(`Cleared smoke results for ${path.basename(algorithmPath)}.`);
  };
}

/**
 * Creates one command to clear retained run results for one hovered run target.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
export function createAlgorithmsClearRunResultsCommand(
  dependencies: AlgorithmTreeActionDependencies
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    if (dependencies.conductor === undefined) {
      await dependencies.notificationRouter.error("Run File orchestration is not configured.");
      return;
    }

    if (
      treeNode === undefined
      || (
        treeNode.kind !== "file"
        && treeNode.kind !== "mainFile"
        && treeNode.kind !== "languageSummary"
        && treeNode.kind !== "algorithmDir"
      )
    ) {
      await dependencies.notificationRouter.warn("Select a run target row to clear retained run results.");
      return;
    }

    const cleared = dependencies.conductor.clearRunResults({
      target: {
        nodeKind: treeNode.kind,
        filePath: treeNode.filePath,
      },
      refreshAlgorithmsTree: dependencies.refreshAlgorithmsTree,
    });

    if (!cleared) {
      await dependencies.notificationRouter.warn("Run results are not available to clear.");
      return;
    }

    await dependencies.notificationRouter.info(`Cleared run results for ${path.basename(treeNode.filePath)}.`);
  };
}

/**
 * Creates one command that executes one action kind against the hovered target.
 *
 * @param {AlgorithmTreeActionDependencies} dependencies Action dependencies.
 * @param {ConductorRunActionKind} actionKind Requested action kind.
 * @returns {(treeNode?: WorkspaceTreeNode) => Promise<void>} Command handler.
 */
function createAlgorithmsRunCommandForAction(
  dependencies: AlgorithmTreeActionDependencies,
  actionKind: ConductorRunActionKind,
  checkOnlyRouteOverride?: CheckOnlyRoute
): (treeNode?: WorkspaceTreeNode) => Promise<void> {
  return async (treeNode?: WorkspaceTreeNode): Promise<void> => {
    if (dependencies.conductor === undefined) {
      await dependencies.notificationRouter.error("Run File orchestration is not configured.");
      return;
    }

    // Use full conductor orchestration for all actions so run status tracking is preserved.
    if (dependencies.hostState === undefined) {
      await dependencies.notificationRouter.error("Run File orchestration is not configured.");
      return;
    }

    const workspaceFolderPaths = getWorkspaceFolderPaths();

    await dependencies.conductor.runFile({
      actionKind,
      checkOnlyRouteOverride,
      filesystem: dependencies.filesystem,
      hostState: dependencies.hostState,
      languages: dependencies.languages,
      notificationRouter: dependencies.notificationRouter,
      owningWorkspaceFolderPath: getOwningWorkspaceFolderPath(treeNode?.filePath),
      refreshAlgorithmsTree: dependencies.refreshAlgorithmsTree,
      treeNode,
      workspaceFolderPaths,
    });
  };
}
