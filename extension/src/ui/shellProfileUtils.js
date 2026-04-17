"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { realpathSafe, resolveEligibilityState } = require("../runtime/pathResolver");
const { getSupportedLanguageKeys } = require("../runtime/languageMetadata");
const { getWorkspaceFolders } = require("./uiWorkspaceFsUtils");

// init.sh export block marker start.
const PROFILE_BLOCK_START = "# >>> DEREKALGOS INIT >>>";
// init.sh export block marker end.
const PROFILE_BLOCK_END = "# <<< DEREKALGOS INIT <<<";

/**
 * Expands a leading home marker in a profile path.
 *
 * @param {string} profilePath Candidate profile path.
 * @returns {string} Expanded profile path.
 */
function expandHomePath(profilePath) {
  const rawValue = String(profilePath || "").trim();

  if (!rawValue) {
    return "";
  }

  if (rawValue === "~") {
    return os.homedir();
  }

  if (rawValue.startsWith("~/")) {
    return path.join(os.homedir(), rawValue.slice(2));
  }

  return rawValue;
}

/**
 * Resolves the active supported repository root and init.sh path.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @returns {{resolvedRootPath: string|null, initScriptPath: string|null}} Root resolution metadata.
 */
function resolveEnvironmentRootInfo(vscodeApi) {
  const eligibilityState = resolveEligibilityState(getWorkspaceFolders(vscodeApi));
  const resolvedRootPath = eligibilityState?.selected?.resolvedRoot || null;

  if (!resolvedRootPath) {
    return {
      resolvedRootPath: null,
      initScriptPath: null,
    };
  }

  const canonicalRootPath = realpathSafe(resolvedRootPath);
  const initScriptPath = path.join(canonicalRootPath, "init.sh");

  try {
    if (!fs.statSync(initScriptPath).isFile()) {
      return {
        resolvedRootPath: null,
        initScriptPath: null,
      };
    }
  } catch (_) {
    return {
      resolvedRootPath: null,
      initScriptPath: null,
    };
  }

  return {
    resolvedRootPath: canonicalRootPath,
    initScriptPath,
  };
}

/**
 * Returns the platform-specific placeholder profile path.
 *
 * @param {string} [platformOverride] Platform string override for testing (defaults to process.platform).
 * @returns {string} Placeholder profile path.
 */
function getProfilePlaceholderForPlatform(platformOverride) {
  const platform = platformOverride !== undefined ? platformOverride : process.platform;

  if (platform === "freebsd") {
    return "~/.profile";
  }

  if (platform === "darwin") {
    return "~/.zprofile";
  }

  return "~/.bash_profile";
}

/**
 * Returns the platform-specific default profile path used for state hydration.
 *
 * @param {string} [platformOverride] Platform string override for testing (defaults to process.platform).
 * @returns {string} Default profile path.
 */
function getDefaultProfilePathForPlatform(platformOverride) {
  return expandHomePath(getProfilePlaceholderForPlatform(platformOverride));
}

/**
 * Extracts one shell assignment value from init.sh.
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
 * Returns command arguments for an optional profile override.
 *
 * @param {string} profilePath Draft profile path.
 * @returns {string[]} Optional init.sh profile args.
 */
function buildProfileArgs(profilePath) {
  const trimmedPath = String(profilePath || "").trim();

  if (!trimmedPath) {
    return [];
  }

  return [`--update-profile=${trimmedPath}`];
}

/**
 * Filters check-env output down to error-like lines or useful trailing lines.
 *
 * @param {string} combinedOutput Combined stdout/stderr output.
 * @returns {string} Filtered output text.
 */
function filterCheckEnvOutput(combinedOutput) {
  const lines = String(combinedOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const errorLikeLines = lines.filter((line) =>
    /(error|invalid|failed|missing|unsupported)/i.test(line)
  );

  if (errorLikeLines.length > 0) {
    return errorLikeLines.join("\n");
  }

  return lines.slice(-40).join("\n");
}

/**
 * Runs init.sh non-interactively and captures output.
 *
 * @param {string} resolvedRootPath Canonical repository root path.
 * @param {string} initScriptPath Canonical init.sh path.
 * @param {string[]} args init.sh arguments.
 * @param {Function} [spawnFn] Spawn function override for testing (defaults to child_process.spawn).
 * @returns {Promise<{exitCode: number|null, stdout: string, stderr: string, combinedOutput: string}>} Command result.
 */
function runInitScriptCommand(resolvedRootPath, initScriptPath, args, spawnFn) {
  const resolvedSpawn = spawnFn || spawn;

  return new Promise((resolve, reject) => {
    const childProcess = resolvedSpawn("sh", [initScriptPath, ...args], {
      cwd: resolvedRootPath,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";

    childProcess.stdout.setEncoding("utf8");
    childProcess.stderr.setEncoding("utf8");

    childProcess.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    childProcess.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    childProcess.on("error", (error) => {
      reject(error);
    });

    childProcess.on("close", (exitCode) => {
      resolve({
        exitCode: typeof exitCode === "number" ? exitCode : null,
        stdout,
        stderr,
        combinedOutput: [stdout, stderr].filter(Boolean).join("\n").trim(),
      });
    });
  });
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
  expandHomePath,
  resolveEnvironmentRootInfo,
  getProfilePlaceholderForPlatform,
  getDefaultProfilePathForPlatform,
  extractShellAssignment,
  extractManagedExportValue,
  parseInitDefaults,
  parseRouteMap,
  buildProfileArgs,
  filterCheckEnvOutput,
  runInitScriptCommand,
  buildMergedEnvironmentConfig,
};
