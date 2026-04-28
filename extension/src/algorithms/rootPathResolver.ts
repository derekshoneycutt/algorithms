/**
 * Implementation of IRootPathResolver using the root resolver functions
 * exported from algorithms/index.ts.
 *
 * This module provides a provider contract facade for algorithms root resolution,
 * allowing conductor and other modules to request these helpers via dependency
 * injection rather than direct imports.
 */

import type { IFilesystem } from "../filesystem";
import * as path from "node:path";
import type { IRootPathResolver, RootResolverDependencies } from "./IRootPathResolver";

/**
 * Returns the workspace-folder resolution order with the owning workspace first.
 *
 * @param {readonly string[]} workspaceFolderPaths Open workspace folder paths.
 * @param {string | undefined} owningWorkspaceFolderPath Preferred workspace folder path.
 * @returns {readonly string[]} Resolution order for root discovery.
 */
function getWorkspaceFolderResolutionOrder(
  workspaceFolderPaths: readonly string[],
  owningWorkspaceFolderPath: string | undefined
): readonly string[] {
  if (owningWorkspaceFolderPath === undefined || owningWorkspaceFolderPath.trim().length === 0) {
    return workspaceFolderPaths;
  }

  const remainingWorkspaceFolderPaths = workspaceFolderPaths.filter((workspaceFolderPath) => {
    return workspaceFolderPath !== owningWorkspaceFolderPath;
  });

  return [owningWorkspaceFolderPath, ...remainingWorkspaceFolderPaths];
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
 * Creates a root path resolver provider.
 *
 * @returns {IRootPathResolver} Resolver instance.
 */
export function createRootPathResolver(): IRootPathResolver {
  return {
    async resolveAlgorithmsRoot(
      dependencies: RootResolverDependencies
    ): Promise<string | null> {
      const { filesystem, owningWorkspaceFolderPath, workspaceFolderPaths } = dependencies;
      const fs = filesystem as IFilesystem;
      const resolutionOrder = getWorkspaceFolderResolutionOrder(
        workspaceFolderPaths,
        owningWorkspaceFolderPath
      );

      for (const workspaceFolderPath of resolutionOrder) {
        const canonicalPath = await fs.realpath(workspaceFolderPath);
        const srcPath = path.join(canonicalPath, "src");
        if (await fs.isDirectory(srcPath)) {
          return await fs.realpath(srcPath);
        }

        if (hasSourceSegment(canonicalPath)) {
          return canonicalPath;
        }
      }
      return null;
    },

    async resolveStdlibRoot(
      dependencies: RootResolverDependencies
    ): Promise<string | null> {
      const { filesystem, owningWorkspaceFolderPath, workspaceFolderPaths } = dependencies;
      const fs = filesystem as IFilesystem;
      const resolutionOrder = getWorkspaceFolderResolutionOrder(
        workspaceFolderPaths,
        owningWorkspaceFolderPath
      );

      for (const workspaceFolderPath of resolutionOrder) {
        const canonicalPath = await fs.realpath(workspaceFolderPath);
        const stdlibPath = path.join(canonicalPath, "stdlib");
        if (await fs.isDirectory(stdlibPath)) {
          return await fs.realpath(stdlibPath);
        }

        if (!hasSourceSegment(canonicalPath)) {
          continue;
        }

        const repoRoot = resolveRepositoryRootFromSourcePath(canonicalPath);
        if (repoRoot === null) {
          continue;
        }

        const repoStdlibPath = path.join(repoRoot, "stdlib");
        if (await fs.isDirectory(repoStdlibPath)) {
          return await fs.realpath(repoStdlibPath);
        }
      }
      return null;
    },
  };
}
