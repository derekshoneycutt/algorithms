// Node filesystem and process helpers for workspace/root eligibility checks.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// Cache lifetime for run.sh --help-all canary checks.
const CANARY_CACHE_TTL_MS = 30000;

// In-memory cache keyed by canonical root path.
const canaryResultCache = new Map();

// Hard eligibility markers expected at a valid repository root.
const HARD_MARKERS = [
  { name: "run.sh", type: "file" },
  { name: "init.sh", type: "file" },
  { name: "src", type: "directory" },
  { name: "shlib", type: "directory" },
  { name: "stdlib", type: "directory" },
  { name: "templates", type: "directory" },
];

/**
 * Resolves a canonical path and falls back to absolute normalization if needed.
 *
 * @param {string} targetPath Input path to normalize.
 * @returns {string} Canonical or normalized absolute path.
 */
function realpathSafe(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch (_) {
    return path.resolve(targetPath);
  }
}

/**
 * Checks whether a marker exists with the expected file-system type.
 *
 * @param {string} rootPath Candidate root path.
 * @param {{name: string, type: 'file'|'directory'}} marker Marker descriptor.
 * @returns {boolean} True when marker exists and has expected type.
 */
function markerExists(rootPath, marker) {
  const markerPath = path.join(rootPath, marker.name);

  try {
    const stat = fs.statSync(markerPath);
    return marker.type === "directory" ? stat.isDirectory() : stat.isFile();
  } catch (_) {
    return false;
  }
}

/**
 * Evaluates hard markers for a candidate root.
 *
 * @param {string} rootPath Candidate root path.
 * @returns {Record<string, boolean>} Marker presence map.
 */
function evaluateMarkers(rootPath) {
  const markers = {};

  for (const marker of HARD_MARKERS) {
    markers[marker.name] = markerExists(rootPath, marker);
  }

  return markers;
}

/**
 * Counts the number of present markers in a marker map.
 *
 * @param {Record<string, boolean>} markers Marker presence map.
 * @returns {number} Number of markers set to true.
 */
function countPresentMarkers(markers) {
  return Object.values(markers).filter(Boolean).length;
}

/**
 * Walks ancestors and selects the path with strongest marker match.
 *
 * @param {string} startPath Starting path for ancestor traversal.
 * @returns {string} Best candidate repository root.
 */
function findCandidateRoot(startPath) {
  let currentPath = realpathSafe(startPath);
  let bestCandidate = null;
  let bestMarkerCount = -1;
  let stepsFromStart = 0;

  while (true) {
    const markers = evaluateMarkers(currentPath);
    const markerCount = countPresentMarkers(markers);

    if (markerCount > bestMarkerCount) {
      bestMarkerCount = markerCount;
      bestCandidate = {
        rootPath: currentPath,
        markerCount,
        stepsFromStart,
      };
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }

    currentPath = parentPath;
    stepsFromStart += 1;
  }

  return bestCandidate ? bestCandidate.rootPath : realpathSafe(startPath);
}

/**
 * Returns a cached canary result when still fresh.
 *
 * @param {string} rootPath Canonical repository root path.
 * @returns {{attempted: boolean, command: string, exitCode: number|null, success: boolean, error: string|null}|null} Cached canary result or null.
 */
function getCachedCanaryResult(rootPath) {
  const cacheEntry = canaryResultCache.get(rootPath);

  if (!cacheEntry) {
    return null;
  }

  if (Date.now() - cacheEntry.timestamp > CANARY_CACHE_TTL_MS) {
    canaryResultCache.delete(rootPath);
    return null;
  }

  return {
    attempted: true,
    command: cacheEntry.result.command,
    exitCode: cacheEntry.result.exitCode,
    success: cacheEntry.result.success,
    error: cacheEntry.result.error,
  };
}

/**
 * Stores one canary result in the TTL cache.
 *
 * @param {string} rootPath Canonical repository root path.
 * @param {{attempted: boolean, command: string, exitCode: number|null, success: boolean, error: string|null}} result Canary execution result.
 * @returns {void}
 */
function setCachedCanaryResult(rootPath, result) {
  canaryResultCache.set(rootPath, {
    timestamp: Date.now(),
    result,
  });
}

/**
 * Executes run.sh canary command at the resolved root.
 *
 * @param {string} rootPath Resolved repository root path.
 * @returns {{attempted: boolean, command: string, exitCode: number|null, success: boolean, error: string|null}} Canary result details.
 */
function runCanary(rootPath) {
  const cachedResult = getCachedCanaryResult(rootPath);

  if (cachedResult) {
    return cachedResult;
  }

  const scriptPath = path.join(rootPath, "run.sh");

  try {
    const result = spawnSync(scriptPath, ["--help-all"], {
      cwd: rootPath,
      encoding: "utf8",
      timeout: 15000,
    });

    if (result.error) {
      const canaryResult = {
        attempted: true,
        command: `${scriptPath} --help-all`,
        exitCode: null,
        success: false,
        error: result.error.message,
      };

      setCachedCanaryResult(rootPath, canaryResult);
      return canaryResult;
    }

    const canaryResult = {
      attempted: true,
      command: `${scriptPath} --help-all`,
      exitCode: typeof result.status === "number" ? result.status : null,
      success: result.status === 0,
      error: null,
    };

    setCachedCanaryResult(rootPath, canaryResult);
    return canaryResult;
  } catch (error) {
    const canaryResult = {
      attempted: true,
      command: `${scriptPath} --help-all`,
      exitCode: null,
      success: false,
      error: error.message,
    };

    setCachedCanaryResult(rootPath, canaryResult);
    return canaryResult;
  }
}

/**
 * Classifies workspace eligibility based on marker and canary outcomes.
 *
 * @param {Record<string, boolean>} markers Marker presence map.
 * @param {{success: boolean}} canary Canary execution summary.
 * @returns {{status: string, missingMarkers: string[], reason: string, guidance: string}} Eligibility classification result.
 */
function classifyEligibility(markers, canary) {
  const missingMarkers = Object.entries(markers)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  const hasRunScript = Boolean(markers["run.sh"]);
  const hasSrcDirectory = Boolean(markers.src);

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
        "Workspace markers are present, but canary failed. Confirm run.sh execution and prerequisites.",
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

/**
 * Evaluates one workspace folder and returns eligibility details.
 *
 * @param {string} folderPath Workspace folder path.
 * @returns {{workspaceFolderPath: string, resolvedRoot: string, scriptPath: string, markers: Record<string, boolean>, canary: object, status: string, missingMarkers: string[], reason: string, guidance: string}} Evaluation result.
 */
function evaluateWorkspaceFolder(folderPath) {
  const folderRealPath = realpathSafe(folderPath);
  const resolvedRoot = findCandidateRoot(folderRealPath);
  const canonicalRoot = realpathSafe(resolvedRoot);
  const markers = evaluateMarkers(canonicalRoot);
  const canary = runCanary(canonicalRoot);
  const classification = classifyEligibility(markers, canary);

  return {
    workspaceFolderPath: folderRealPath,
    resolvedRoot: canonicalRoot,
    scriptPath: path.join(canonicalRoot, "run.sh"),
    markers,
    canary,
    ...classification,
  };
}

/**
 * Resolves overall workspace eligibility across open workspace folders.
 *
 * @param {{uri: {fsPath: string}}[]|undefined} workspaceFolders VS Code workspace folders.
 * @returns {{status: string, reason: string, guidance: string, selected: object|null, evaluations: object[]}} Aggregated eligibility state.
 */
function resolveEligibilityState(workspaceFolders) {
  if (!Array.isArray(workspaceFolders) || workspaceFolders.length === 0) {
    return {
      status: "ineligible",
      reason: "no-workspace-folders",
      guidance: "No workspace folders are open.",
      selected: null,
      evaluations: [],
    };
  }

  const rawEvaluations = workspaceFolders.map((workspaceFolder) =>
    evaluateWorkspaceFolder(workspaceFolder.uri.fsPath)
  );

  const dedupMap = new Map();
  for (const evaluation of rawEvaluations) {
    if (!dedupMap.has(evaluation.resolvedRoot)) {
      dedupMap.set(evaluation.resolvedRoot, evaluation);
    }
  }

  const evaluations = Array.from(dedupMap.values());
  const eligibleEvaluations = evaluations.filter(
    (evaluation) => evaluation.status === "eligible"
  );

  if (eligibleEvaluations.length > 1) {
    return {
      status: "ambiguous",
      reason: "multiple-distinct-eligible-roots",
      guidance:
        "Multiple distinct eligible repository roots are open. Close extra roots or select one explicit root before running commands.",
      selected: null,
      evaluations,
    };
  }

  if (eligibleEvaluations.length === 1) {
    return {
      status: "eligible",
      reason: "single-eligible-root",
      guidance: "Workspace eligibility checks passed.",
      selected: eligibleEvaluations[0],
      evaluations,
    };
  }

  const partialEvaluation = evaluations.find(
    (evaluation) => evaluation.status === "partial"
  );

  if (partialEvaluation) {
    return {
      status: "partial",
      reason: partialEvaluation.reason,
      guidance: partialEvaluation.guidance,
      selected: partialEvaluation,
      evaluations,
    };
  }

  return {
    status: "ineligible",
    reason: evaluations[0] ? evaluations[0].reason : "no-eligible-root",
    guidance:
      evaluations[0]?.guidance ||
      "Workspace is ineligible. Open a repository root that contains required markers.",
    selected: evaluations[0] || null,
    evaluations,
  };
}

/**
 * Builds a concise string summary of eligibility state for logs.
 *
 * @param {{status?: string, reason?: string, selected?: {resolvedRoot?: string, canary?: {exitCode?: number|null}}}} state Eligibility state.
 * @returns {string} Human-readable summary string.
 */
function summarizeEligibilityState(state) {
  if (!state) {
    return "eligibility=unknown";
  }

  const selectedRoot = state.selected?.resolvedRoot || "none";
  const canaryExit = state.selected?.canary?.exitCode;
  const canaryText = canaryExit === null || canaryExit === undefined ? "n/a" : canaryExit;

  return [
    `eligibility=${state.status}`,
    `reason=${state.reason}`,
    `root=${selectedRoot}`,
    `canaryExit=${canaryText}`,
  ].join(" ");
}

// Path and CWD resolution helpers.

/**
 * Result returned by resolveActiveFileCwd.
 *
 * @typedef {object} ActiveFileCwdResult
 * @property {boolean} ok Whether resolution succeeded.
 * @property {string|null} cwd Canonical absolute algorithm-directory CWD, or null on failure.
 * @property {string|null} scriptPath Canonical absolute run-script path, or null on failure.
 * @property {string|null} displayScriptPath User-facing script path for terminal display, or null on failure.
 * @property {string|null} reason Rejection reason key, or null on success.
 */

/**
 * Result returned by resolveExplorerTargetCwd.
 *
 * @typedef {object} ExplorerTargetCwdResult
 * @property {boolean} ok Whether resolution succeeded.
 * @property {string|null} cwd Canonical absolute algorithm-directory CWD, or null on failure.
 * @property {string|null} scriptPath Canonical absolute run-script path, or null on failure.
 * @property {string|null} displayScriptPath User-facing script path for terminal display, or null on failure.
 * @property {'algorithm-dir'|'immediate-child-file'|'immediate-child-dir'|null} selectionType Classification of the Explorer selection, or null on failure.
 * @property {string|null} reason Rejection reason key, or null on success.
 */

/**
 * Derives the user-facing script path for terminal display.
 *
 * Returns the relative path from the algorithm-directory CWD to the run script
 * (for example `../../../run.sh`) when safely derivable, otherwise returns the
 * absolute run-script path as a safe fallback.
 * `Path Policy: Internal Absolute, Display Relative With Safe Fallback`
 *
 * @param {string} algorithmDirCwd Canonical absolute algorithm-directory CWD.
 * @param {string} absoluteRunScriptPath Canonical absolute path to run.sh.
 * @returns {string} Relative display path when derivable, absolute path otherwise.
 */
function deriveDisplayScriptPath(algorithmDirCwd, absoluteRunScriptPath) {
  try {
    const relative = path.relative(algorithmDirCwd, absoluteRunScriptPath);
    return relative || absoluteRunScriptPath;
  } catch (_) {
    return absoluteRunScriptPath;
  }
}

/**
 * Resolves the canonical algorithm-directory CWD for an active editor file.
 *
 * Validates that the file is an immediate child under `src/<category>/<algorithm>/`
 * and returns the resolved CWD, internal absolute script path, and display script path.
 * The caller must supply the resolved repository root from eligibility state;
 * this function does not re-run eligibility resolution.
 * `Path Policy: Internal Absolute, Display Relative With Safe Fallback`
 *
 * @param {string} absoluteFilePath Absolute path to the active source file.
 * @param {string} resolvedRepoRoot Canonical absolute repository root from eligibility state.
 * @returns {ActiveFileCwdResult} Resolution result.
 */
function resolveActiveFileCwd(absoluteFilePath, resolvedRepoRoot) {
  const canonicalFilePath = realpathSafe(absoluteFilePath);
  const srcBase = path.join(resolvedRepoRoot, "src");
  const relative = path.relative(srcBase, canonicalFilePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { ok: false, cwd: null, scriptPath: null, displayScriptPath: null, reason: "out-of-src-tree" };
  }

  const parts = relative.split(path.sep);

  if (parts.length < 3) {
    return { ok: false, cwd: null, scriptPath: null, displayScriptPath: null, reason: "not-in-algorithm-dir" };
  }

  if (parts.length > 3) {
    return { ok: false, cwd: null, scriptPath: null, displayScriptPath: null, reason: "nested-descendant" };
  }

  const cwd = path.join(srcBase, parts[0], parts[1]);
  const scriptPath = path.join(resolvedRepoRoot, "run.sh");
  const displayScriptPath = deriveDisplayScriptPath(cwd, scriptPath);

  return { ok: true, cwd, scriptPath, displayScriptPath, reason: null };
}

/**
 * Resolves the canonical algorithm-directory CWD from an Explorer selection path.
 *
 * Accepts an algorithm-directory selection, an immediate-child file selection, or
 * an immediate-child directory selection and normalizes all three to one canonical
 * algorithm-directory CWD. Rejects deeper descendants and paths outside `src/`.
 * The caller must supply the resolved repository root from eligibility state;
 * this function does not re-run eligibility resolution.
 * `Path Policy: Internal Absolute, Display Relative With Safe Fallback`
 *
 * @param {string} selectedPath Absolute path of the Explorer-selected item.
 * @param {string} resolvedRepoRoot Canonical absolute repository root from eligibility state.
 * @returns {ExplorerTargetCwdResult} Resolution result.
 */
function resolveExplorerTargetCwd(selectedPath, resolvedRepoRoot) {
  const canonicalSelectedPath = realpathSafe(selectedPath);
  const srcBase = path.join(resolvedRepoRoot, "src");
  const relative = path.relative(srcBase, canonicalSelectedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { ok: false, cwd: null, scriptPath: null, displayScriptPath: null, selectionType: null, reason: "not-in-algorithm-dir" };
  }

  const parts = relative.split(path.sep);

  if (parts.length < 2) {
    return { ok: false, cwd: null, scriptPath: null, displayScriptPath: null, selectionType: null, reason: "not-in-algorithm-dir" };
  }

  if (parts.length === 2) {
    let isDir = false;
    try {
      isDir = fs.statSync(canonicalSelectedPath).isDirectory();
    } catch (_) {
      // Treat stat failures as non-directory so selection stays conservative.
    }
    if (!isDir) {
      return { ok: false, cwd: null, scriptPath: null, displayScriptPath: null, selectionType: null, reason: "not-in-algorithm-dir" };
    }
    const cwd = canonicalSelectedPath;
    const scriptPath = path.join(resolvedRepoRoot, "run.sh");
    const displayScriptPath = deriveDisplayScriptPath(cwd, scriptPath);
    return { ok: true, cwd, scriptPath, displayScriptPath, selectionType: "algorithm-dir", reason: null };
  }

  if (parts.length === 3) {
    let isDir = false;
    try {
      isDir = fs.statSync(canonicalSelectedPath).isDirectory();
    } catch (_) {
      // Treat stat failures as file-like to preserve immediate-child behavior.
    }
    const selectionType = isDir ? "immediate-child-dir" : "immediate-child-file";
    const cwd = path.join(srcBase, parts[0], parts[1]);
    const scriptPath = path.join(resolvedRepoRoot, "run.sh");
    const displayScriptPath = deriveDisplayScriptPath(cwd, scriptPath);
    return { ok: true, cwd, scriptPath, displayScriptPath, selectionType, reason: null };
  }

  return { ok: false, cwd: null, scriptPath: null, displayScriptPath: null, selectionType: null, reason: "deeper-descendant" };
}

// Public eligibility and path-resolution API consumed by extension entry points.
module.exports = {
  HARD_MARKERS,
  resolveEligibilityState,
  summarizeEligibilityState,
  resolveActiveFileCwd,
  resolveExplorerTargetCwd,
  deriveDisplayScriptPath,
};
