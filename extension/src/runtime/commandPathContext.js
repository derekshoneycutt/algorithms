const path = require("path");
const { statPath } = require("./workspaceFilesystem");

/**
 * Derives the display script path for command terminal output.
 *
 * @param {string} algorithmDir Resolved algorithm directory.
 * @param {string} scriptPath Absolute run.sh path.
 * @returns {string} Relative display script path when possible.
 */
function deriveDisplayScriptPath(algorithmDir, scriptPath) {
  const relativeScriptPath = path.relative(algorithmDir, scriptPath);
  return relativeScriptPath || scriptPath;
}

/**
 * Resolves algorithm execution context from an active file path.
 *
 * Valid active target contract: immediate child file under
 * `src/<category>/<algorithm>/`.
 *
 * @param {string} filePath Absolute path to the active file.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "warning"|"error", algorithmDir: string|null, filename: string|null, scriptPath: string|null, displayScriptPath: string|null}} Resolution result.
 */
function resolveActiveFileRunContext(filePath, eligibilityState) {
  const selected = eligibilityState?.selected;
  const resolvedRoot = selected?.resolvedRoot;
  const scriptPath = selected?.scriptPath;

  if (!resolvedRoot || !scriptPath) {
    return {
      ok: false,
      reason: "missing-eligible-root",
      guidance:
        "Eligible repository root or run script path is unavailable. Reopen workspace and retry.",
      severity: "error",
      algorithmDir: null,
      filename: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const srcRoot = path.join(resolvedRoot, "src");
  const relativeToSrc = path.relative(srcRoot, filePath);

  if (relativeToSrc.startsWith("..") || path.isAbsolute(relativeToSrc)) {
    return {
      ok: false,
      reason: "not-under-src",
      guidance:
        "Active file must be located under src/<category>/<algorithm>/.",
      severity: "warning",
      algorithmDir: null,
      filename: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const parts = relativeToSrc.split(path.sep);

  if (parts.length < 3) {
    return {
      ok: false,
      reason: "not-in-algorithm-dir",
      guidance:
        "Active file must be an immediate child under src/<category>/<algorithm>/.",
      severity: "warning",
      algorithmDir: null,
      filename: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  if (parts.length > 3) {
    return {
      ok: false,
      reason: "nested-descendant",
      guidance:
        "Nested descendants are not valid run targets. Use a file directly under src/<category>/<algorithm>/.",
      severity: "warning",
      algorithmDir: null,
      filename: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const algorithmDir = path.join(srcRoot, parts[0], parts[1]);
  const filename = parts[2];

  return {
    ok: true,
    reason: null,
    guidance: "Active file run context resolved.",
    severity: "warning",
    algorithmDir,
    filename,
    scriptPath,
    displayScriptPath: deriveDisplayScriptPath(algorithmDir, scriptPath),
  };
}

/**
 * Resolves algorithm-directory context from Explorer selection for cleanup modes.
 *
 * Valid Explorer targets:
 * - `src/<category>/<algorithm>/` directory
 * - immediate child file under `src/<category>/<algorithm>/`
 * - immediate child directory under `src/<category>/<algorithm>/`
 *
 * @param {string} targetPath Absolute selected Explorer path.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @param {{outsideSrcGuidance: string, scopeGuidance: string, nestedGuidance: string, resolvedGuidance: string}} messages Command-specific guidance text.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error", algorithmDir: string|null, scriptPath: string|null, displayScriptPath: string|null}} Resolution result.
 */
function resolveAlgorithmScopeFromExplorerTarget(targetPath, eligibilityState, messages) {
  const selected = eligibilityState?.selected;
  const resolvedRoot = selected?.resolvedRoot;
  const scriptPath = selected?.scriptPath;

  if (!resolvedRoot || !scriptPath) {
    return {
      ok: false,
      reason: "missing-eligible-root",
      guidance:
        "Eligible repository root or run script path is unavailable. Reopen workspace and retry.",
      severity: "error",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  if (!targetPath) {
    return {
      ok: false,
      reason: "missing-selected-path",
      guidance:
        "Select an algorithm directory or an immediate child file/directory and try again.",
      severity: "info",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const srcRoot = path.join(resolvedRoot, "src");
  const relativeToSrc = path.relative(srcRoot, targetPath);

  if (relativeToSrc.startsWith("..") || path.isAbsolute(relativeToSrc)) {
    return {
      ok: false,
      reason: "not-under-src",
      guidance: messages.outsideSrcGuidance,
      severity: "warning",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const parts = relativeToSrc.split(path.sep);

  if (parts.length < 2) {
    return {
      ok: false,
      reason: "not-in-algorithm-scope",
      guidance: messages.scopeGuidance,
      severity: "warning",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  if (parts.length > 3) {
    return {
      ok: false,
      reason: "nested-descendant",
      guidance: messages.nestedGuidance,
      severity: "warning",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  const stats = statPath(targetPath, { useCache: false });

  if (!stats) {
    return {
      ok: false,
      reason: "missing-selected-path",
      guidance: "Selected path is unavailable. Refresh Explorer and retry.",
      severity: "warning",
      algorithmDir: null,
      scriptPath: null,
      displayScriptPath: null,
    };
  }

  let algorithmDir = null;

  if (parts.length === 2) {
    if (!stats.isDirectory()) {
      return {
        ok: false,
        reason: "algorithm-dir-required",
        guidance: messages.scopeGuidance,
        severity: "warning",
        algorithmDir: null,
        scriptPath: null,
        displayScriptPath: null,
      };
    }

    algorithmDir = targetPath;
  } else if (parts.length === 3) {
    if (!stats.isDirectory() && !stats.isFile()) {
      return {
        ok: false,
        reason: "unsupported-target-type",
        guidance: messages.scopeGuidance,
        severity: "warning",
        algorithmDir: null,
        scriptPath: null,
        displayScriptPath: null,
      };
    }

    algorithmDir = path.join(srcRoot, parts[0], parts[1]);
  }

  return {
    ok: true,
    reason: null,
    guidance: messages.resolvedGuidance,
    severity: "warning",
    algorithmDir,
    scriptPath,
    displayScriptPath: deriveDisplayScriptPath(algorithmDir, scriptPath),
  };
}

/**
 * Resolves algorithm execution context for localclean from an Explorer target.
 *
 * @param {string} targetPath Absolute selected Explorer path.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error", algorithmDir: string|null, scriptPath: string|null, displayScriptPath: string|null}} Resolution result.
 */
function resolveLocalCleanContextFromExplorer(targetPath, eligibilityState) {
  return resolveAlgorithmScopeFromExplorerTarget(targetPath, eligibilityState, {
    outsideSrcGuidance:
      "Local Clean requires a target under src/<category>/<algorithm>/.",
    scopeGuidance:
      "Select src/<category>/<algorithm>/ or an immediate child file/directory.",
    nestedGuidance:
      "Nested descendants are not valid local clean targets. Select the algorithm directory or an immediate child.",
    resolvedGuidance: "Local Clean context resolved.",
  });
}

/**
 * Resolves algorithm execution context for clean from an Explorer target.
 *
 * @param {string} targetPath Absolute selected Explorer path.
 * @param {{selected?: {resolvedRoot?: string, scriptPath?: string}}|null|undefined} eligibilityState Eligible workspace state.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error", algorithmDir: string|null, scriptPath: string|null, displayScriptPath: string|null}} Resolution result.
 */
function resolveCleanContextFromExplorer(targetPath, eligibilityState) {
  return resolveAlgorithmScopeFromExplorerTarget(targetPath, eligibilityState, {
    outsideSrcGuidance: "Clean requires a target under src/<category>/<algorithm>/.",
    scopeGuidance:
      "Select src/<category>/<algorithm>/ or an immediate child file/directory.",
    nestedGuidance:
      "Nested descendants are not valid clean targets. Select the algorithm directory or an immediate child.",
    resolvedGuidance: "Clean context resolved.",
  });
}

module.exports = {
  resolveActiveFileRunContext,
  resolveAlgorithmScopeFromExplorerTarget,
  resolveCleanContextFromExplorer,
  resolveLocalCleanContextFromExplorer,
};