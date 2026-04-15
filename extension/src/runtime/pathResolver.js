// Global constants for this module.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// Global constants for this module.
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
 * Executes run.sh canary command at the resolved root.
 *
 * @param {string} rootPath Resolved repository root path.
 * @returns {{attempted: boolean, command: string, exitCode: number|null, success: boolean, error: string|null}} Canary result details.
 */
function runCanary(rootPath) {
  const scriptPath = path.join(rootPath, "run.sh");

  try {
    const result = spawnSync(scriptPath, ["--help-all"], {
      cwd: rootPath,
      encoding: "utf8",
      timeout: 15000,
    });

    if (result.error) {
      return {
        attempted: true,
        command: `${scriptPath} --help-all`,
        exitCode: null,
        success: false,
        error: result.error.message,
      };
    }

    return {
      attempted: true,
      command: `${scriptPath} --help-all`,
      exitCode: typeof result.status === "number" ? result.status : null,
      success: result.status === 0,
      error: null,
    };
  } catch (error) {
    return {
      attempted: true,
      command: `${scriptPath} --help-all`,
      exitCode: null,
      success: false,
      error: error.message,
    };
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

// Module exports.
module.exports = {
  HARD_MARKERS,
  resolveEligibilityState,
  summarizeEligibilityState,
};
