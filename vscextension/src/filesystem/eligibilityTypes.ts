/**
 * Workspace eligibility classification result.
 */
export type EligibilityStatus = "eligible" | "partial" | "ineligible" | "ambiguous";

/**
 * Marker check result keyed by marker name.
 */
export type MarkerPresenceMap = Record<string, boolean>;

/**
 * Canary execution result.
 */
export interface CanaryResult {
  attempted: boolean;
  command: string;
  exitCode: number | null;
  success: boolean;
  error: string | null;
}

/**
 * Per-folder eligibility evaluation result.
 */
export interface WorkspaceEligibilityEvaluation {
  workspaceFolderPath: string;
  resolvedRoot: string;
  markers: MarkerPresenceMap;
  canary: CanaryResult;
  status: EligibilityStatus;
  missingMarkers: string[];
  reason: string;
  guidance: string;
}

/**
 * Aggregated workspace eligibility state across all open workspace folders.
 */
export interface WorkspaceEligibilityState {
  status: EligibilityStatus;
  reason: string;
  guidance: string;
  /** True when the sidebar should be shown. */
  supported: boolean;
  selected: WorkspaceEligibilityEvaluation | null;
  evaluations: WorkspaceEligibilityEvaluation[];
}
