"use strict";

const { getSupportedLanguageKeys } = require("../../language/languageModule");

// init.sh export block marker start.
const PROFILE_BLOCK_START = "# >>> DEREKALGOS INIT >>>";
// init.sh export block marker end.
const PROFILE_BLOCK_END = "# <<< DEREKALGOS INIT <<<";

/**
 * Extracts one shell assignment value from init.sh text.
 *
 * @param {string} scriptText init.sh text.
 * @param {string} variableName Assignment variable name.
 * @returns {string|null} Extracted assignment value or null.
 */
function extractShellAssignment(scriptText, variableName) {
  const assignmentPattern = new RegExp(`^${variableName}=(.*)$`, "m");
  const match = String(scriptText || "").match(assignmentPattern);

  if (!match) {
    return null;
  }

  const rawValue = String(match[1] || "").trim();

  if (
    rawValue.startsWith('"')
    && rawValue.endsWith('"')
    && rawValue.length >= 2
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

/**
 * Extracts one managed export value from a profile file.
 *
 * @param {string} profileText Profile file text.
 * @param {string} exportName Export variable name.
 * @returns {{present: boolean, value: string}} Export presence and value.
 */
function extractManagedExportValue(profileText, exportName) {
  const text = String(profileText || "");
  const blockStartIndex = text.indexOf(PROFILE_BLOCK_START);
  const blockEndIndex = text.indexOf(PROFILE_BLOCK_END);
  const scopedText =
    blockStartIndex >= 0 && blockEndIndex > blockStartIndex
      ? text.slice(blockStartIndex, blockEndIndex)
      : text;
  const exportPattern = new RegExp(`^export ${exportName}=(.*)$`, "m");
  const match = scopedText.match(exportPattern);

  if (!match) {
    return {
      present: false,
      value: "",
    };
  }

  let rawValue = String(match[1] || "").trim();

  if (
    rawValue.startsWith('"')
    && rawValue.endsWith('"')
    && rawValue.length >= 2
  ) {
    rawValue = rawValue.slice(1, -1);
  }

  rawValue = rawValue.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

  return {
    present: true,
    value: rawValue,
  };
}

/**
 * Parses a whitespace-delimited init.sh route map into a Map.
 *
 * @param {string} mapText Raw route map text.
 * @returns {Map<string, string>} Parsed route map.
 */
function parseRouteMap(mapText) {
  const routeMap = new Map();
  const rawText = String(mapText || "").trim();

  if (!rawText) {
    return routeMap;
  }

  const tokens = rawText.split(/\s+/);

  for (const token of tokens) {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const languageKey = token.slice(0, separatorIndex).trim().toLowerCase();
    const value = token.slice(separatorIndex + 1).trim();

    if (!languageKey || !value) {
      continue;
    }

    routeMap.set(languageKey, value);
  }

  return routeMap;
}

/**
 * Parses init.sh defaults used by the Environment pane.
 *
 * @param {string} initScriptText init.sh text.
 * @param {string|null} resolvedRootPath Canonical repository root path.
 * @returns {{copyIconsTo: string, timeout: string, eiffel: string, gcc13Directory: string, gcc13Name: string, gxx13Name: string, runOnDocker: string, runOnSsh: string, supportedLanguageKeys: string[]}} Parsed defaults.
 */
function parseInitDefaults(initScriptText, resolvedRootPath) {
  const fallbackLanguageKeys = resolvedRootPath
    ? [...getSupportedLanguageKeys(resolvedRootPath)].sort((left, right) =>
      left.localeCompare(right)
    )
    : [];
  const supportedLanguageKeysText =
    extractShellAssignment(initScriptText, "supportedLanguageKeys") || "";
  const looksLikeLiteralLanguageList =
    supportedLanguageKeysText.length > 0
    && !/[\$\(\)\|\'\"`]/.test(supportedLanguageKeysText);
  const parsedSupportedLanguageKeys = looksLikeLiteralLanguageList
    ? supportedLanguageKeysText
      .split(/\s+/)
      .map((languageKey) => languageKey.trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
    : fallbackLanguageKeys;

  return {
    copyIconsTo:
      extractShellAssignment(initScriptText, "copyIconsTo")
      || "~/.vscode/extensions/icons/",
    timeout: extractShellAssignment(initScriptText, "useTimeout") || "-k 10s 2m",
    eiffel: extractShellAssignment(initScriptText, "useEiffel") || "eiffelstudio",
    gcc13Directory:
      extractShellAssignment(initScriptText, "useGcc13") || "/usr/bin/",
    gcc13Name:
      extractShellAssignment(initScriptText, "useGcc13Name") || "gcc-13",
    gxx13Name:
      extractShellAssignment(initScriptText, "useGxx13Name") || "g++-13",
    runOnDocker: extractShellAssignment(initScriptText, "useRunOnDocker") || "",
    runOnSsh: extractShellAssignment(initScriptText, "useRunOnSsh") || "",
    supportedLanguageKeys: parsedSupportedLanguageKeys,
  };
}

/**
 * Builds the merged Environment pane configuration from init defaults and profile exports.
 *
 * @param {string} initScriptText init.sh text.
 * @param {string} profileText Effective profile text.
 * @param {string|null} resolvedRootPath Canonical repository root path.
 * @returns {{defaults: object, values: object, routeMaps: {docker: Map<string, string>, ssh: Map<string, string>}}} Merged config.
 */
function buildMergedEnvironmentConfig(initScriptText, profileText, resolvedRootPath) {
  const defaults = parseInitDefaults(initScriptText, resolvedRootPath);
  const timeoutExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_TIMEOUT"
  );
  const eiffelExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_EIFFEL"
  );
  const gcc13Export = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GCC13"
  );
  const gcc13NameExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GCC13NAME"
  );
  const gxx13NameExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GXX13NAME"
  );
  const runOnDockerExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_RUNONDOCKER"
  );
  const runOnSshExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_RUNONSSH"
  );
  const dockerMapText = runOnDockerExport.present
    ? runOnDockerExport.value
    : defaults.runOnDocker;
  const sshMapText = runOnSshExport.present
    ? runOnSshExport.value
    : defaults.runOnSsh;

  return {
    defaults,
    values: {
      timeout: timeoutExport.present ? timeoutExport.value : defaults.timeout,
      eiffel: eiffelExport.present ? eiffelExport.value : defaults.eiffel,
      gcc13Directory: gcc13Export.present
        ? gcc13Export.value
        : defaults.gcc13Directory,
      gcc13Name: gcc13NameExport.present
        ? gcc13NameExport.value
        : defaults.gcc13Name,
      gxx13Name: gxx13NameExport.present
        ? gxx13NameExport.value
        : defaults.gxx13Name,
      dockerMapText,
      sshMapText,
    },
    routeMaps: {
      docker: parseRouteMap(dockerMapText),
      ssh: parseRouteMap(sshMapText),
    },
  };
}

module.exports = {
  PROFILE_BLOCK_START,
  PROFILE_BLOCK_END,
  extractShellAssignment,
  extractManagedExportValue,
  parseRouteMap,
  parseInitDefaults,
  buildMergedEnvironmentConfig,
};