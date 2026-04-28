/**
 * Root path resolver provider contract for algorithms module.
 *
 * Exposes root resolution helpers as an injected dependency, allowing conductor
 * and other modules to discover algorithms and stdlib roots without direct imports.
 */

import type { IFilesystem } from "../filesystem";

/**
 * Dependencies for resolving root paths.
 */
export interface RootResolverDependencies {
  filesystem: IFilesystem;
  owningWorkspaceFolderPath?: string;
  workspaceFolderPaths: readonly string[];
}

/**
 * Contract for root path resolution services.
 */
export interface IRootPathResolver {
  /**
   * Resolves the algorithms source root (src/) location.
   *
   * @param {RootResolverDependencies} dependencies Resolver dependencies.
   * @returns {Promise<string | null>} Canonical root path or null when unsupported.
   */
  resolveAlgorithmsRoot(
    dependencies: RootResolverDependencies
  ): Promise<string | null>;

  /**
   * Resolves the standard library root (stdlib/) location.
   *
   * @param {RootResolverDependencies} dependencies Resolver dependencies.
   * @returns {Promise<string | null>} Canonical stdlib root path or null when unsupported.
   */
  resolveStdlibRoot(
    dependencies: RootResolverDependencies
  ): Promise<string | null>;
}
