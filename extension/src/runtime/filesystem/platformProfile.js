const os = require("os");
const path = require("path");

/**
 * Expands a leading home marker in a profile path.
 *
 * @param {string} profilePath Candidate profile path.
 * @returns {string} Expanded profile path.
 */
function expandHomeFilesystemPath(profilePath) {
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
  return expandHomeFilesystemPath(getProfilePlaceholderForPlatform(platformOverride));
}

/**
 * Resolves active supported repository root and init.sh path.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @returns {{resolvedRootPath: string|null, initScriptPath: string|null}} Root resolution metadata.
 */
function resolveEnvironmentRootInfoForWorkspace(vscodeApi) {
  const workspaceFolders = Array.isArray(vscodeApi?.workspace?.workspaceFolders)
    ? vscodeApi.workspace.workspaceFolders
    : [];

  if (workspaceFolders.length === 0) {
    return {
      resolvedRootPath: null,
      initScriptPath: null,
    };
  }

  try {
    const { resolveEligibilityState, realpathSafe } = require("./eligibilityResolver");
    const { isFilePath } = require("./workspaceFilesystem");
    const eligibilityState = resolveEligibilityState(workspaceFolders);
    const resolvedRootPath = eligibilityState?.selected?.resolvedRoot || null;

    if (!resolvedRootPath) {
      return {
        resolvedRootPath: null,
        initScriptPath: null,
      };
    }

    const canonicalRootPath = realpathSafe(resolvedRootPath);
    const initScriptPath = path.join(canonicalRootPath, "init.sh");

    if (!isFilePath(initScriptPath)) {
      return {
        resolvedRootPath: null,
        initScriptPath: null,
      };
    }

    return {
      resolvedRootPath: canonicalRootPath,
      initScriptPath,
    };
  } catch (_) {
    return {
      resolvedRootPath: null,
      initScriptPath: null,
    };
  }
}

module.exports = {
  expandHomeFilesystemPath,
  getDefaultProfilePathForPlatform,
  getProfilePlaceholderForPlatform,
  resolveEnvironmentRootInfoForWorkspace,
};
