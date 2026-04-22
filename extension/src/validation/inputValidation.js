const {
  FILE_EXTENSION_LANGUAGE_ALIASES,
  getSupportedLanguageKeys,
  LANGUAGE_ID_ALIASES,
  normalizeExtensionToLanguageKey,
  normalizeLanguageId,
} = require("../runtime/language/languageModule");

const SUPPORTED_CHECK_ONLY_ROUTES = new Set(["native", "docker", "ssh"]);

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
      severity: "error",
    };
  }

  if (eligibilityState.status === "eligible") {
    return {
      allowed: true,
      reason: "eligible",
      guidance: "Workspace is eligible.",
      severity: "info",
    };
  }

  return {
    allowed: false,
    reason: eligibilityState.reason || "ineligible-workspace",
    guidance:
      eligibilityState.guidance ||
      "Workspace is not eligible for command execution.",
    severity: "warning",
  };
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
      `Active editor language '${languageId}' is not supported for Run Active File.`,
    severity: "warning",
  };
}

/**
 * Validates that a check-only route value is one of the supported enums.
 *
 * @param {string} route Route candidate.
 * @returns {{ok: boolean, reason: string|null, guidance: string, severity: "info"|"warning"|"error"}} Validation result.
 */
function validateCheckOnlyRoute(route) {
  if (SUPPORTED_CHECK_ONLY_ROUTES.has(String(route || ""))) {
    return {
      ok: true,
      reason: null,
      guidance: "Check-only route is supported.",
      severity: "info",
    };
  }

  return {
    ok: false,
    reason: "unsupported-check-only-route",
    guidance:
      "Check-only route must be one of native, docker, or ssh.",
    severity: "error",
  };
}

// Public validation and normalization helpers used by command handlers.
module.exports = {
  FILE_EXTENSION_LANGUAGE_ALIASES,
  LANGUAGE_ID_ALIASES,
  validateEligibilityForExecution,
  validateActiveEditorContext,
  validateSupportedLanguage,
  validateCheckOnlyRoute,
  getSupportedLanguageKeys,
  normalizeLanguageId,
  normalizeExtensionToLanguageKey,
  SUPPORTED_CHECK_ONLY_ROUTES,
};
