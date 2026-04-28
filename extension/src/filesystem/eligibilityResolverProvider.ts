/**
 * Implementation of IEligibilityResolver using the eligibility resolver functions
 * exported from eligibilityResolver.ts.
 *
 * This module provides a provider contract facade for workspace eligibility checks,
 * allowing conductor and other modules to request these helpers via dependency
 * injection rather than direct imports.
 */

import type { IEligibilityResolver } from "./IEligibilityResolver";
import type { WorkspaceEligibilityState } from "./eligibilityTypes";
import { resolveSidebarState } from "./eligibilityResolver";

/**
 * Creates an eligibility resolver provider.
 *
 * @returns {IEligibilityResolver} Resolver instance.
 */
export function createEligibilityResolver(): IEligibilityResolver {
  return {
    resolveSidebarState(
      workspaceFolderPaths: readonly string[],
      options?: { skipCanary?: boolean }
    ): WorkspaceEligibilityState {
      return resolveSidebarState(workspaceFolderPaths, options);
    },
  };
}
