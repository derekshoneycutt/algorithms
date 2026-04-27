/**
 * Synchronous workspace eligibility resolver.
 *
 * Mirrors the parity behavior of the old extension's eligibilityResolver.js
 * and the isSupportedSidebarFolder / resolveSidebarWorkspaceState logic in
 * algorithmsRunView.js.
 *
 * Gating rules:
 *   - Workspace folder must resolve to a root that contains all HARD_MARKERS.
 *   - run.sh --help-all canary must exit 0 (cached with 30 s TTL).
 *   - The opened workspace folder must be at most repo-root, src,
 *     src/<category>, or src/<category>/<algorithm> depth.
 *   - If multiple distinct eligible roots are open the state is "ambiguous" and
 *     the sidebar is hidden.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

import type {
  CanaryResult,
  EligibilityStatus,
  MarkerPresenceMap,
  WorkspaceEligibilityEvaluation,
  WorkspaceEligibilityState,
} from "./eligibilityTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const CANARY_CACHE_TTL_MS = 30_000;

const HARD_MARKERS: Array<{ name: string; type: "file" | "directory" }> = [
  { name: "run.sh", type: "file" },
  { name: "init.sh", type: "file" },
  { name: "src", type: "directory" },
  { name: "shlib", type: "directory" },
  { name: "stdlib", type: "directory" },
  { name: "templates", type: "directory" },
];

// ─── Internal canary TTL cache ─────────────────────────────────────────────

interface CanaryCacheEntry {
  timestamp: number;
  result: CanaryResult;
}

const canaryResultCache = new Map<string, CanaryCacheEntry>();

// ─── Sync path helpers ─────────────────────────────────────────────────────

/**
 * Returns the canonical real path for one path, falling back to the original.
 *
 * @param {string} targetPath Path to resolve.
 * @returns {string} Canonical real path.
 */
function realpathSafe(targetPath: string): string {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return targetPath;
  }
}

/**
 * Returns true when a path resolves to a regular file.
 *
 * @param {string} targetPath Path to test.
 * @returns {boolean} True when a regular file exists.
 */
function isFilePath(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

/**
 * Returns true when a path resolves to a directory.
 *
 * @param {string} targetPath Path to test.
 * @returns {boolean} True when a directory exists.
 */
function isDirectoryPath(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

// ─── Marker checks ────────────────────────────────────────────────────────────

/**
 * Returns true when one hard marker exists at the expected path and type.
 *
 * @param {string} rootPath Candidate repository root.
 * @param {{ name: string; type: "file" | "directory" }} marker Marker descriptor.
 * @returns {boolean} True when the marker is present.
 */
function markerExists(
  rootPath: string,
  marker: { name: string; type: "file" | "directory" }
): boolean {
  const markerPath = path.join(rootPath, marker.name);
  return marker.type === "directory" ? isDirectoryPath(markerPath) : isFilePath(markerPath);
}

/**
 * Builds a marker presence map for one candidate root.
 *
 * @param {string} rootPath Candidate repository root.
 * @returns {MarkerPresenceMap} Marker name → present boolean map.
 */
function evaluateMarkers(rootPath: string): MarkerPresenceMap {
  const markers: MarkerPresenceMap = {};
  for (const marker of HARD_MARKERS) {
    markers[marker.name] = markerExists(rootPath, marker);
  }

  return markers;
}

/**
 * Counts present markers in a marker map.
 *
 * @param {MarkerPresenceMap} markers Marker presence map.
 * @returns {number} Count of markers set to true.
 */
function countPresentMarkers(markers: MarkerPresenceMap): number {
  return Object.values(markers).filter(Boolean).length;
}

// ─── Root resolution ──────────────────────────────────────────────────────────

/**
 * Walks ancestor directories from startPath and returns the path with the
 * highest hard-marker count.
 *
 * @param {string} startPath Starting path.
 * @returns {string} Best candidate repository root.
 */
function findCandidateRoot(startPath: string): string {
  let currentPath = realpathSafe(startPath);
  let bestCandidate: string | null = null;
  let bestMarkerCount = -1;

  while (true) {
    const markers = evaluateMarkers(currentPath);
    const markerCount = countPresentMarkers(markers);

    if (markerCount > bestMarkerCount) {
      bestMarkerCount = markerCount;
      bestCandidate = currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }

    currentPath = parentPath;
  }

  return bestCandidate ?? realpathSafe(startPath);
}

// ─── Canary ───────────────────────────────────────────────────────────────────

/**
 * Returns a cached canary result when still within TTL.
 *
 * @param {string} rootPath Canonical root path.
 * @returns {CanaryResult | null} Cached result or null when stale/absent.
 */
function getCachedCanaryResult(rootPath: string): CanaryResult | null {
  const entry = canaryResultCache.get(rootPath);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > CANARY_CACHE_TTL_MS) {
    canaryResultCache.delete(rootPath);
    return null;
  }

  return entry.result;
}

/**
 * Stores one canary result in the TTL cache.
 *
 * @param {string} rootPath Canonical root path.
 * @param {CanaryResult} result Canary execution result.
 * @returns {void}
 */
function setCachedCanaryResult(rootPath: string, result: CanaryResult): void {
  canaryResultCache.set(rootPath, { timestamp: Date.now(), result });
}

/**
 * Invalidates the canary cache for one root, or all roots when no argument.
 *
 * @param {string} [rootPath] Root path to invalidate.
 * @returns {void}
 */
export function invalidateCanaryCache(rootPath?: string): void {
  if (typeof rootPath === "string" && rootPath.trim()) {
    canaryResultCache.delete(realpathSafe(rootPath));
    return;
  }

  canaryResultCache.clear();
}

/**
 * Executes run.sh --help-all synchronously to confirm workspace eligibility.
 *
 * @param {string} rootPath Resolved canonical repository root.
 * @param {{ skipCanary?: boolean }} [options] Options.
 * @returns {CanaryResult} Result of the canary execution.
 */
function runCanary(rootPath: string, options?: { skipCanary?: boolean }): CanaryResult {
  const scriptPath = path.join(rootPath, "run.sh");
  const command = `${scriptPath} --help-all`;

  if (options?.skipCanary === true) {
    return { attempted: false, command, exitCode: null, success: true, error: null };
  }

  const cached = getCachedCanaryResult(rootPath);
  if (cached) {
    return cached;
  }

  try {
    const result = spawnSync(scriptPath, ["--help-all"], {
      cwd: rootPath,
      timeout: 15_000,
      encoding: "utf8",
    });

    const exitCode = result.status ?? null;
    const success = exitCode === 0 && !result.error;
    const error = result.error ? String(result.error) : null;
    const canaryResult: CanaryResult = { attempted: true, command, exitCode, success, error };
    setCachedCanaryResult(rootPath, canaryResult);
    return canaryResult;
  } catch (err) {
    const canaryResult: CanaryResult = {
      attempted: true,
      command,
      exitCode: null,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
    setCachedCanaryResult(rootPath, canaryResult);
    return canaryResult;
  }
}

// ─── Classification ───────────────────────────────────────────────────────────

/**
 * Classifies eligibility status from marker and canary outcomes.
 *
 * @param {MarkerPresenceMap} markers Marker presence map.
 * @param {CanaryResult} canary Canary result.
 * @returns {{ status: EligibilityStatus; missingMarkers: string[]; reason: string; guidance: string }} Classification.
 */
function classifyEligibility(
  markers: MarkerPresenceMap,
  canary: CanaryResult
): { status: EligibilityStatus; missingMarkers: string[]; reason: string; guidance: string } {
  const missingMarkers = Object.entries(markers)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  const hasRunScript = Boolean(markers["run.sh"]);
  const hasSrcDirectory = Boolean(markers["src"]);

  if (missingMarkers.length === 0 && !canary.attempted) {
    return {
      status: "eligible",
      missingMarkers,
      reason: "markers-passed-canary-skipped",
      guidance: "Workspace marker checks passed. Canary execution is deferred.",
    };
  }

  if (missingMarkers.length === 0 && canary.success) {
    return {
      status: "eligible",
      missingMarkers,
      reason: "markers-and-canary-passed",
      guidance: "Workspace is eligible.",
    };
  }

  if (missingMarkers.length === 0 && !canary.success) {
    return {
      status: "partial",
      missingMarkers,
      reason: "canary-failed",
      guidance:
        "Workspace markers are present but canary failed. Confirm run.sh execution and prerequisites.",
    };
  }

  if (!hasRunScript || !hasSrcDirectory) {
    return {
      status: "ineligible",
      missingMarkers,
      reason: "core-markers-missing",
      guidance:
        "Workspace is missing core markers (run.sh and/or src). Open the repository root or correct workspace selection.",
    };
  }

  return {
    status: "partial",
    missingMarkers,
    reason: "markers-missing",
    guidance:
      "Workspace is partially configured. Restore missing hard markers before running commands.",
  };
}

// ─── Folder evaluation ────────────────────────────────────────────────────────

/**
 * Evaluates one workspace folder and returns its full eligibility result.
 *
 * @param {string} folderPath Workspace folder path.
 * @param {{ skipCanary?: boolean }} [options] Evaluation options.
 * @returns {WorkspaceEligibilityEvaluation} Full evaluation result.
 */
function evaluateWorkspaceFolder(
  folderPath: string,
  options?: { skipCanary?: boolean }
): WorkspaceEligibilityEvaluation {
  const folderRealPath = realpathSafe(folderPath);
  const resolvedRoot = realpathSafe(findCandidateRoot(folderRealPath));
  const markers = evaluateMarkers(resolvedRoot);
  const canary = runCanary(resolvedRoot, options);
  const classification = classifyEligibility(markers, canary);

  return {
    workspaceFolderPath: folderRealPath,
    resolvedRoot,
    markers,
    canary,
    ...classification,
  };
}

// ─── Aggregated state ─────────────────────────────────────────────────────────

/**
 * Resolves overall eligibility across all open workspace folders.
 *
 * Deduplicates by resolved root so multiple entries pointing to the same
 * repository root are treated as one.
 *
 * @param {string[]} workspaceFolderPaths Workspace folder fs paths.
 * @param {{ skipCanary?: boolean }} [options] Evaluation options.
 * @returns {WorkspaceEligibilityState} Aggregated eligibility state.
 */
export function resolveEligibilityState(
  workspaceFolderPaths: readonly string[],
  options?: { skipCanary?: boolean }
): WorkspaceEligibilityState {
  if (!Array.isArray(workspaceFolderPaths) || workspaceFolderPaths.length === 0) {
    return {
      status: "ineligible",
      reason: "no-workspace-folders",
      guidance: "No workspace folders are open.",
      supported: false,
      selected: null,
      evaluations: [],
    };
  }

  const rawEvaluations = workspaceFolderPaths.map((folderPath) =>
    evaluateWorkspaceFolder(folderPath, options)
  );

  // Deduplicate by resolved root.
  const dedupMap = new Map<string, WorkspaceEligibilityEvaluation>();
  for (const evaluation of rawEvaluations) {
    if (!dedupMap.has(evaluation.resolvedRoot)) {
      dedupMap.set(evaluation.resolvedRoot, evaluation);
    }
  }

  const evaluations = Array.from(dedupMap.values());
  const eligibleEvaluations = evaluations.filter((ev) => ev.status === "eligible");

  if (eligibleEvaluations.length > 1) {
    return {
      status: "ambiguous",
      reason: "multiple-distinct-eligible-roots",
      guidance:
        "Multiple distinct eligible repository roots are open. Close extra roots or select one explicit root before running commands.",
      supported: false,
      selected: null,
      evaluations,
    };
  }

  if (eligibleEvaluations.length === 1) {
    return {
      status: "eligible",
      reason: "single-eligible-root",
      guidance: "Workspace eligibility checks passed.",
      supported: true,
      selected: eligibleEvaluations[0],
      evaluations,
    };
  }

  const partialEvaluation = evaluations.find((ev) => ev.status === "partial");
  if (partialEvaluation) {
    return {
      status: "partial",
      reason: partialEvaluation.reason,
      guidance: partialEvaluation.guidance,
      supported: false,
      selected: partialEvaluation,
      evaluations,
    };
  }

  return {
    status: "ineligible",
    reason: evaluations[0]?.reason ?? "no-eligible-root",
    guidance:
      evaluations[0]?.guidance ??
      "Workspace is ineligible. Open a repository root that contains required markers.",
    supported: false,
    selected: evaluations[0] ?? null,
    evaluations,
  };
}

// ─── Supported sidebar folder check ──────────────────────────────────────────

/**
 * Returns whether a workspace folder path is a supported sidebar entry point.
 *
 * Supported entry points are: repo root, src, src/<category>, and
 * src/<category>/<algorithm> only.
 *
 * @param {string} workspaceFolderPath Canonical workspace folder path.
 * @param {string} resolvedRoot Canonical repository root path.
 * @returns {boolean} True when the folder is a valid sidebar entry point.
 */
export function isSupportedSidebarFolder(
  workspaceFolderPath: string,
  resolvedRoot: string
): boolean {
  const canonicalWorkspaceFolderPath = realpathSafe(workspaceFolderPath);
  const canonicalResolvedRoot = realpathSafe(resolvedRoot);
  const relativePath = path.relative(canonicalResolvedRoot, canonicalWorkspaceFolderPath);

  if (!relativePath) {
    return true;
  }

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return false;
  }

  const parts = relativePath.split(path.sep).filter(Boolean);

  if (parts[0] !== "src") {
    return false;
  }

  // src alone, src/<category>, or src/<category>/<algorithm> are valid.
  return parts.length >= 1 && parts.length <= 3;
}

// ─── Sidebar state computation ────────────────────────────────────────────────

/**
 * Resolves the final sidebar supported state by combining eligibility with the
 * supported-folder-depth check.
 *
 * @param {string[]} workspaceFolderPaths Workspace folder fs paths.
 * @param {{ skipCanary?: boolean }} [options] Evaluation options.
 * @returns {WorkspaceEligibilityState} State with supported flag set.
 */
export function resolveSidebarState(
  workspaceFolderPaths: readonly string[],
  options?: { skipCanary?: boolean }
): WorkspaceEligibilityState {
  if (!Array.isArray(workspaceFolderPaths) || workspaceFolderPaths.length === 0) {
    return {
      status: "ineligible",
      reason: "no-workspace-folders",
      guidance: "No workspace folders are open.",
      supported: false,
      selected: null,
      evaluations: [],
    };
  }

  for (const folderPath of workspaceFolderPaths) {
    const folderState = resolveEligibilityState([folderPath], options);
    const selected = folderState.selected;
    const workspaceFolderPath = selected?.workspaceFolderPath;
    const resolvedRoot = selected?.resolvedRoot;

    if (
      folderState.status === "eligible" &&
      workspaceFolderPath &&
      resolvedRoot &&
      isSupportedSidebarFolder(workspaceFolderPath, resolvedRoot)
    ) {
      return { ...folderState, supported: true };
    }
  }

  // Fall back to aggregate state with supported = false.
  return { ...resolveEligibilityState(workspaceFolderPaths, options), supported: false };
}
