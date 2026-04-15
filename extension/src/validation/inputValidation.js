// Filesystem helpers are used to load canonical language support metadata.
const fs = require("fs");
const path = require("path");

// Known VS Code languageId aliases mapped to canonical run-language keys.
const LANGUAGE_ID_ALIASES = {
  "asm-intel-x86-generic": "asm",
  fortranfreeform: "fortran",
  llvm: "llvmir",
  m3: "modula3",
  mmix: "mmixal",
  "objective-c": "objectivec",
  "objective-cpp": "objectivec",
  objectpascal: "pascal",
  unicon: "icon",
  vb: "visualbasic",
  x86asm: "asm",
};

// File-extension fallback map aligned to the run.sh language catalog.
const FILE_EXTENSION_LANGUAGE_ALIASES = {
  ".adb": "ada",
  ".asm": "asm",
  ".bal": "ballerina",
  ".bas": "freebasic",
  ".c": "c",
  ".clj": "clojure",
  ".cob": "cobol",
  ".cpp": "cpp",
  ".cs": "csharp",
  ".d": "d",
  ".dart": "dart",
  ".e": "eiffel",
  ".erl": "erlang",
  ".exs": "elixir",
  ".f90": "fortran",
  ".factor": "factor",
  ".fs": "fsharp",
  ".fth": "forth",
  ".gleam": "gleam",
  ".go": "go",
  ".hs": "haskell",
  ".hx": "haxe",
  ".icn": "icon",
  ".idr": "idris",
  ".java": "java",
  ".jl": "julia",
  ".js": "javascript",
  ".kit": "kit",
  ".kt": "kotlin",
  ".ll": "llvmir",
  ".lua": "lua",
  ".m": "objectivec",
  ".m3": "modula3",
  ".mat": "octave",
  ".ml": "ocaml",
  ".mms": "mmixal",
  ".mod": "oberon",
  ".mojo": "mojo",
  ".moo": "mercury",
  ".nasm": "nasm",
  ".nim": "nim",
  ".pas": "pascal",
  ".php": "php",
  ".pl": "prolog",
  ".plx": "perl",
  ".py": "python",
  ".r": "r",
  ".rb": "ruby",
  ".rkt": "racket",
  ".rs": "rust",
  ".s": "arm64asm",
  ".scala": "scala",
  ".scm": "scheme",
  ".sim": "simula",
  ".st": "smalltalk",
  ".swift": "swift",
  ".tcl": "tcl",
  ".ts": "typescript",
  ".v": "v",
  ".vb": "visualbasic",
  ".wat": "wat",
  ".zig": "zig",
};

/**
 * Reads canonical supported language keys from run-language modules.
 *
 * @param {string} resolvedRoot Resolved repository root path.
 * @returns {Set<string>} Supported language keys.
 */
function getSupportedLanguageKeys(resolvedRoot) {
  const moduleDir = path.join(resolvedRoot, "shlib", "run-languages");

  try {
    const names = fs.readdirSync(moduleDir);
    const keys = names
      .filter((name) => name.endsWith(".sh"))
      .map((name) => name.slice(0, -3).toLowerCase());
    return new Set(keys);
  } catch (_) {
    return new Set();
  }
}

/**
 * Normalizes VS Code languageId into canonical run-language key space.
 *
 * @param {string} languageId VS Code document language id.
 * @returns {string} Canonical language key candidate.
 */
function normalizeLanguageId(languageId) {
  const normalized = String(languageId || "").toLowerCase();

  if (LANGUAGE_ID_ALIASES[normalized]) {
    return LANGUAGE_ID_ALIASES[normalized];
  }

  return normalized;
}

/**
 * Normalizes file extension into canonical run-language key space.
 *
 * @param {string} filePath Active file path.
 * @returns {string|null} Canonical language key candidate or null.
 */
function normalizeExtensionToLanguageKey(filePath) {
  const extension = path.extname(String(filePath || "")).toLowerCase();

  if (!extension) {
    return null;
  }

  if (FILE_EXTENSION_LANGUAGE_ALIASES[extension]) {
    return FILE_EXTENSION_LANGUAGE_ALIASES[extension];
  }

  return null;
}

/**
 * Validates whether command execution is allowed for the current eligibility state.
 *
 * @param {{status?: string, reason?: string, guidance?: string}|null|undefined} eligibilityState Aggregated eligibility state.
 * @returns {{allowed: boolean, reason: string, guidance: string}} Validation outcome.
 */
function validateEligibilityForExecution(eligibilityState) {
  if (!eligibilityState) {
    return {
      allowed: false,
      reason: "missing-eligibility-state",
      guidance: "Eligibility state is unavailable. Reopen the workspace and try again.",
    };
  }

  if (eligibilityState.status === "eligible") {
    return {
      allowed: true,
      reason: "eligible",
      guidance: "Workspace is eligible.",
    };
  }

  return {
    allowed: false,
    reason: eligibilityState.reason || "ineligible-workspace",
    guidance:
      eligibilityState.guidance ||
      "Workspace is not eligible for command execution.",
  };
}

/**
 * Builds a user-facing blocked-execution message from validation and eligibility context.
 *
 * @param {{reason: string, guidance?: string}} validation Validation outcome.
 * @param {{selected?: {resolvedRoot?: string, missingMarkers?: string[], canary?: {exitCode?: number|null}}}|null|undefined} eligibilityState Aggregated eligibility state.
 * @returns {string} Actionable warning text.
 */
function buildEligibilityBlockMessage(validation, eligibilityState) {
  const selected = eligibilityState?.selected;
  const rootPath = selected?.resolvedRoot;
  const missingMarkers = selected?.missingMarkers || [];
  const canaryExit = selected?.canary?.exitCode;

  const details = [];
  details.push(`Reason: ${validation.reason}.`);

  if (rootPath) {
    details.push(`Resolved root: ${rootPath}.`);
  }

  if (missingMarkers.length > 0) {
    details.push(`Missing markers: ${missingMarkers.join(", ")}.`);
  }

  if (canaryExit !== null && canaryExit !== undefined) {
    details.push(`Canary exit code: ${canaryExit}.`);
  }

  if (validation.guidance) {
    details.push(`Guidance: ${validation.guidance}`);
  }

  return `Run Active File blocked by workspace eligibility preflight. ${details.join(" ")}`;
}

/**
 * Validates whether there is a usable active editor and saved file document.
 *
 * @param {import("vscode").TextEditor|undefined} editor Active VS Code editor.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error"}} Validation result.
 */
function validateActiveEditorContext(editor) {
  if (!editor || !editor.document) {
    return {
      ok: false,
      reason: "no-active-editor",
      guidance: "Open a saved source file and try again.",
      severity: "info",
    };
  }

  if (editor.document.isUntitled) {
    return {
      ok: false,
      reason: "untitled-document",
      guidance: "Save the file before running it.",
      severity: "info",
    };
  }

  if (editor.document.isDirty) {
    return {
      ok: false,
      reason: "unsaved-document",
      guidance: "Save the file before running it.",
      severity: "info",
    };
  }

  if (!editor.document.uri || !editor.document.uri.fsPath) {
    return {
      ok: false,
      reason: "missing-file-path",
      guidance: "The active editor does not have a filesystem path.",
      severity: "info",
    };
  }

  return {
    ok: true,
    reason: null,
    guidance: "Active editor context is valid.",
    severity: "info",
  };
}

/**
 * Validates whether the active editor language maps to a supported run-language key.
 *
 * @param {import("vscode").TextEditor|undefined} editor Active VS Code editor.
 * @param {{selected?: {resolvedRoot?: string}}|null|undefined} eligibilityState Aggregated eligibility state.
 * @param {string} [filePath] Active file path fallback when languageId is generic/unsupported.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error"}} Validation result.
 */
function validateSupportedLanguage(editor, eligibilityState, filePath) {
  const resolvedRoot = eligibilityState?.selected?.resolvedRoot;

  if (!resolvedRoot) {
    return {
      ok: false,
      reason: "missing-eligible-root",
      guidance: "Unable to resolve supported language catalog without an eligible workspace root.",
      severity: "error",
    };
  }

  const languageId = editor?.document?.languageId;
  const editorFilePath =
    filePath || editor?.document?.uri?.fsPath || "";

  const supportedLanguageKeys = getSupportedLanguageKeys(resolvedRoot);
  const normalizedLanguage = normalizeLanguageId(languageId || "");
  const normalizedExtensionLanguage =
    normalizeExtensionToLanguageKey(editorFilePath);

  if (normalizedLanguage && supportedLanguageKeys.has(normalizedLanguage)) {
    return {
      ok: true,
      reason: null,
      guidance: "Active editor language is supported.",
      severity: "info",
    };
  }

  if (
    normalizedExtensionLanguage &&
    supportedLanguageKeys.has(normalizedExtensionLanguage)
  ) {
    return {
      ok: true,
      reason: null,
      guidance:
        "Active file extension maps to a supported language key.",
      severity: "info",
    };
  }

  if (!languageId) {
    return {
      ok: false,
      reason: "missing-language-id",
      guidance:
        "Unable to determine the active editor language and file extension did not map to a supported language key.",
      severity: "info",
    };
  }

  return {
    ok: false,
    reason: "unsupported-language",
    guidance:
      `Active editor language '${languageId}' is not supported for Run Active File in FEAT-205.`,
    severity: "info",
  };
}

/**
 * Builds a standardized user-facing message for active-file validation failures.
 *
 * @param {{reason: string|null, guidance: string}} validation Validation payload.
 * @returns {string} User-facing actionable message.
 */
function buildActiveFileValidationMessage(validation) {
  return `Run Active File aborted. Reason: ${validation.reason}. Guidance: ${validation.guidance}`;
}

// Public validation and normalization helpers used by command handlers.
module.exports = {
  LANGUAGE_ID_ALIASES,
  validateEligibilityForExecution,
  buildEligibilityBlockMessage,
  validateActiveEditorContext,
  validateSupportedLanguage,
  buildActiveFileValidationMessage,
  getSupportedLanguageKeys,
  normalizeLanguageId,
  normalizeExtensionToLanguageKey,
  FILE_EXTENSION_LANGUAGE_ALIASES,
};
