/**
 * Workspace eligibility resolver provider contract for filesystem module.
 *
 * Exposes eligibility determination helpers as an injected dependency, allowing
 * conductor and other modules to check workspace support without direct imports.
 */

import type { WorkspaceEligibilityState } from "./eligibilityTypes";

/**
 * Contract for workspace eligibility resolution services.
 */
export interface IEligibilityResolver {
  /**
   * Synchronously resolves workspace sidebar eligibility state.
   *
   * Determines whether the sidebar should show and which workspace folder(s)
   * are eligible based on marker presence and canary command availability.
   *
   * @param {readonly string[]} workspaceFolderPaths Open workspace folder paths.
   * @param {object} options Optional resolver options.
   * @param {boolean} options.skipCanary Skip canary command validation (testing).
   * @returns {WorkspaceEligibilityState} State with supported flag set.
   */
  resolveSidebarState(
    workspaceFolderPaths: readonly string[],
    options?: { skipCanary?: boolean }
  ): WorkspaceEligibilityState;

  /**
   * Invalidates cached canary results.
   *
   * @param {string} [rootPath] Optional root path to invalidate.
   * @returns {void}
   */
  invalidateCanaryCache(rootPath?: string): void;
}
