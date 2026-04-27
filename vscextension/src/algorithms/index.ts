import type { IFilesystem } from "../filesystem";
import * as path from "node:path";

export type { IAlgorithmsIndex, AlgorithmsIndexDependencies } from "./IAlgorithmsIndex";
export type {
  AlgorithmCategory,
  AlgorithmEntry,
  AlgorithmImplementation,
  StandardLibEntry,
} from "./types";
export { createAlgorithmsIndex } from "./algorithmsIndex";
export {
  FLAGGED_LANGUAGES_FILE_NAME,
  createFlaggedLanguagesService,
  readFlaggedLanguageKeys,
  resolveFlaggedLanguagesFilePath,
  writeFlaggedLanguageKeys,
} from "./flaggedLanguages";
export type { IFlaggedLanguagesService } from "./flaggedLanguages";

// ---------------------------------------------------------------------------
// Root path resolvers – helpers for command actions
// ---------------------------------------------------------------------------

/**
 * Dependencies for resolving root paths.
 */
export interface RootResolverDependencies {
  filesystem: IFilesystem;
  workspaceFolderPaths: readonly string[];
}

/**
 * Returns true when a path contains a `src` segment.
 */
function hasSourceSegment(inputPath: string): boolean {
  const parsedPath = path.parse(inputPath);
  const relativePath = inputPath.slice(parsedPath.root.length);
  return relativePath.split(path.sep).filter(Boolean).includes("src");
}

/**
 * Resolves the repository root from a path that may be inside `src`.
 */
function resolveRepositoryRootFromSourcePath(sourcePath: string): string | null {
  let cursor = path.resolve(sourcePath);
  while (true) {
    if (path.basename(cursor) === "src") {
      return path.dirname(cursor);
    }
    const parentPath = path.dirname(cursor);
    if (parentPath === cursor) {
      return null;
    }
    cursor = parentPath;
  }
}

/**
 * Resolves the algorithms source root (src/) location.
 *
 * @param {RootResolverDependencies} dependencies Resolver dependencies.
 * @returns {Promise<string | null>} Canonical root path or null when unsupported.
 */
export async function resolveAlgorithmsRootPath(
  dependencies: RootResolverDependencies
): Promise<string | null> {
  const { filesystem, workspaceFolderPaths } = dependencies;

  for (const workspaceFolderPath of workspaceFolderPaths) {
    const canonicalPath = await filesystem.realpath(workspaceFolderPath);
    const srcPath = path.join(canonicalPath, "src");
    if (await filesystem.isDirectory(srcPath)) {
      return await filesystem.realpath(srcPath);
    }

    if (hasSourceSegment(canonicalPath)) {
      return canonicalPath;
    }
  }
  return null;
}

/**
 * Resolves the standard library root (stdlib/) location.
 *
 * @param {RootResolverDependencies} dependencies Resolver dependencies.
 * @returns {Promise<string | null>} Canonical stdlib root path or null when unsupported.
 */
export async function resolveStdlibRootPath(
  dependencies: RootResolverDependencies
): Promise<string | null> {
  const { filesystem, workspaceFolderPaths } = dependencies;

  for (const workspaceFolderPath of workspaceFolderPaths) {
    const canonicalPath = await filesystem.realpath(workspaceFolderPath);
    const stdlibPath = path.join(canonicalPath, "stdlib");
    if (await filesystem.isDirectory(stdlibPath)) {
      return await filesystem.realpath(stdlibPath);
    }

    if (!hasSourceSegment(canonicalPath)) {
      continue;
    }

    const repoRoot = resolveRepositoryRootFromSourcePath(canonicalPath);
    if (repoRoot === null) {
      continue;
    }

    const repoStdlibPath = path.join(repoRoot, "stdlib");
    if (await filesystem.isDirectory(repoStdlibPath)) {
      return await filesystem.realpath(repoStdlibPath);
    }
  }
  return null;
}
