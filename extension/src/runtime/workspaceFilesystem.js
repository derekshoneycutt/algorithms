const fs = require("fs");
const os = require("os");
const path = require("path");

// Default short-lived cache duration for filesystem read metadata.
const DEFAULT_FILESYSTEM_CACHE_TTL_MS = 2000;

let filesystemCacheTtlMs = DEFAULT_FILESYSTEM_CACHE_TTL_MS;

const statCacheByPath = new Map();
const directoryCacheByPath = new Map();

let filesystemStoreDependencies = null;

/**
 * Loads filesystem-related store dependencies lazily to avoid hard coupling.
 *
 * @returns {{actionCreators?: object, extensionStateStore?: object, selectFilesystemCacheTtlMs?: () => number}|null} Store helpers when available.
 */
function getFilesystemStoreDependencies() {
  if (filesystemStoreDependencies !== null) {
    return filesystemStoreDependencies;
  }

  try {
    const storeModule = require("./extensionStateStore");

    filesystemStoreDependencies = {
      actionCreators: storeModule.actionCreators,
      extensionStateStore: storeModule.extensionStateStore,
      selectFilesystemCacheTtlMs: storeModule.selectFilesystemCacheTtlMs,
    };
  } catch (_) {
    filesystemStoreDependencies = null;
  }

  return filesystemStoreDependencies;
}

/**
 * Dispatches one filesystem action when store dependencies are available.
 *
 * @param {string} actionName Action creator function name.
 * @param {unknown[]} args Action creator arguments.
 * @returns {void}
 */
function dispatchFilesystemAction(actionName, ...args) {
  const dependencies = getFilesystemStoreDependencies();

  if (!dependencies?.actionCreators || !dependencies?.extensionStateStore) {
    return;
  }

  const actionBuilder = dependencies.actionCreators[actionName];

  if (typeof actionBuilder !== "function") {
    return;
  }

  dependencies.extensionStateStore.dispatch(actionBuilder(...args));
}

/**
 * Synchronizes local cache TTL with central filesystem store state.
 *
 * @returns {void}
 */
function syncFilesystemCacheTtlFromStore() {
  const dependencies = getFilesystemStoreDependencies();

  if (typeof dependencies?.selectFilesystemCacheTtlMs !== "function") {
    return;
  }

  const storeTtl = Number(dependencies.selectFilesystemCacheTtlMs());

  if (!Number.isFinite(storeTtl) || storeTtl < 0) {
    return;
  }

  filesystemCacheTtlMs = Math.floor(storeTtl);
}

/**
 * Builds one unique filesystem operation id.
 *
 * @param {string} prefix Operation prefix.
 * @param {string} targetPath Operation path.
 * @returns {string} Operation identifier.
 */
function createFilesystemOperationId(prefix, targetPath) {
  return `${prefix}:${targetPath}:${Date.now()}`;
}

/**
 * Returns the currently configured filesystem cache TTL.
 *
 * @returns {number} Cache TTL in milliseconds.
 */
function getFilesystemCacheTtlMs() {
  syncFilesystemCacheTtlFromStore();
  return filesystemCacheTtlMs;
}

/**
 * Sets the filesystem cache TTL used by stat and directory reads.
 *
 * @param {number} nextTtlMs Candidate cache TTL in milliseconds.
 * @returns {number} Effective cache TTL in milliseconds.
 */
function setFilesystemCacheTtlMs(nextTtlMs) {
  const numericTtl = Number(nextTtlMs);

  if (!Number.isFinite(numericTtl) || numericTtl < 0) {
    return filesystemCacheTtlMs;
  }

  filesystemCacheTtlMs = Math.floor(numericTtl);
  dispatchFilesystemAction("setFilesystemCacheTtlMs", filesystemCacheTtlMs);
  return filesystemCacheTtlMs;
}

/**
 * Clears cached filesystem metadata for one path or for all cached paths.
 *
 * @param {string} [targetPath] Canonical path to invalidate.
 * @returns {void}
 */
function clearFilesystemCache(targetPath) {
  if (typeof targetPath === "string" && targetPath.trim()) {
    const canonicalPath = path.resolve(targetPath);
    statCacheByPath.delete(canonicalPath);
    directoryCacheByPath.delete(canonicalPath);
    dispatchFilesystemAction("clearFilesystemCache", canonicalPath);
    return;
  }

  statCacheByPath.clear();
  directoryCacheByPath.clear();
  dispatchFilesystemAction("clearFilesystemCache");
}

/**
 * Returns one unexpired cache value.
 *
 * @param {Map<string, {timestamp: number, value: unknown}>} cache Cache map.
 * @param {string} cacheKey Canonical cache key.
 * @returns {unknown|null} Cached value or null when missing/expired.
 */
function readCache(cache, cacheKey) {
  syncFilesystemCacheTtlFromStore();

  const entry = cache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > filesystemCacheTtlMs) {
    cache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

/**
 * Stores one value in a cache map.
 *
 * @param {Map<string, {timestamp: number, value: unknown}>} cache Cache map.
 * @param {string} cacheKey Canonical cache key.
 * @param {unknown} value Cached value.
 * @returns {unknown} Stored value.
 */
function writeCache(cache, cacheKey, value) {
  cache.set(cacheKey, {
    timestamp: Date.now(),
    value,
  });

  return value;
}

/**
 * Resolves the real absolute path of a file or directory, following symlinks.
 * Returns the normalized absolute input path on failure.
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
 * Returns whether one path string is a non-empty absolute filesystem path.
 *
 * @param {string} targetPath Candidate filesystem path.
 * @returns {boolean} True when targetPath is absolute.
 */
function isAbsoluteFilesystemPath(targetPath) {
  if (typeof targetPath !== "string" || targetPath.length === 0) {
    return false;
  }

  return path.isAbsolute(targetPath);
}

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
    const { resolveEligibilityState } = require("./pathResolver");
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

/**
 * Returns filesystem stat metadata for one path.
 *
 * @param {string} targetPath Candidate path.
 * @param {{useCache?: boolean}} [options] Lookup options.
 * @returns {fs.Stats|null} Stat object when path exists, otherwise null.
 */
function statPath(targetPath, options = {}) {
  const useCache = options.useCache !== false;
  const canonicalPath = path.resolve(targetPath);

  if (useCache) {
    const cachedStat = readCache(statCacheByPath, canonicalPath);

    if (cachedStat) {
      return cachedStat;
    }
  }

  try {
    const stat = fs.statSync(canonicalPath);
    const kind = stat.isDirectory() ? "directory" : (stat.isFile() ? "file" : "other");
    const updatedAt = Date.now();

    if (useCache) {
      writeCache(statCacheByPath, canonicalPath, stat);
    }

    dispatchFilesystemAction(
      "setFilesystemStatCacheEntry",
      canonicalPath,
      true,
      kind,
      updatedAt
    );

    return stat;
  } catch (_) {
    dispatchFilesystemAction(
      "setFilesystemStatCacheEntry",
      canonicalPath,
      false,
      "missing",
      Date.now()
    );
    return null;
  }
}

/**
 * Returns whether one path exists and is a directory.
 *
 * @param {string} targetPath Candidate path.
 * @param {{useCache?: boolean}} [options] Lookup options.
 * @returns {boolean} True when path exists and is a directory.
 */
function isDirectoryPath(targetPath, options = {}) {
  const stat = statPath(targetPath, options);
  return Boolean(stat?.isDirectory());
}

/**
 * Returns whether one path exists and is a file.
 *
 * @param {string} targetPath Candidate path.
 * @param {{useCache?: boolean}} [options] Lookup options.
 * @returns {boolean} True when path exists and is a file.
 */
function isFilePath(targetPath, options = {}) {
  const stat = statPath(targetPath, options);
  return Boolean(stat?.isFile());
}

/**
 * Reads directory entries with optional short-lived caching.
 *
 * @param {string} directoryPath Directory to list.
 * @param {{withFileTypes?: boolean, useCache?: boolean}} [options] Read options.
 * @returns {fs.Dirent[]|string[]|null} Directory entries or null when read fails.
 */
function readDirectoryEntries(directoryPath, options = {}) {
  const withFileTypes = options.withFileTypes !== false;
  const useCache = options.useCache !== false;
  const canonicalPath = path.resolve(directoryPath);

  if (useCache && withFileTypes) {
    const cachedEntries = readCache(directoryCacheByPath, canonicalPath);

    if (cachedEntries) {
      return cachedEntries;
    }
  }

  try {
    const entries = fs.readdirSync(canonicalPath, { withFileTypes });
    const updatedAt = Date.now();

    if (useCache && withFileTypes) {
      writeCache(directoryCacheByPath, canonicalPath, entries);
    }

    dispatchFilesystemAction(
      "setFilesystemDirectoryCacheEntry",
      canonicalPath,
      Array.isArray(entries) ? entries.length : 0,
      updatedAt
    );

    return entries;
  } catch (_) {
    return null;
  }
}

/**
 * Reads one text file and returns its contents.
 *
 * @param {string} filePath File path to read.
 * @param {{encoding?: BufferEncoding}} [options] Read options.
 * @returns {string|null} File text when readable, otherwise null.
 */
function readTextFilePath(filePath, options = {}) {
  const canonicalPath = path.resolve(filePath);
  const encoding = options.encoding || "utf8";

  try {
    return fs.readFileSync(canonicalPath, encoding);
  } catch (_) {
    return null;
  }
}

/**
 * Checks whether a path stays within the given root directory.
 *
 * @param {string} rootPath Canonical root directory path.
 * @param {string} candidatePath Candidate path to validate.
 * @returns {boolean} True when candidatePath is inside rootPath.
 */
function isPathWithinRoot(rootPath, candidatePath) {
  const canonicalRootPath = realpathSafe(rootPath);
  const normalizedCandidatePath = path.resolve(candidatePath);
  const relativePath = path.relative(canonicalRootPath, normalizedCandidatePath);

  if (!relativePath || relativePath === ".") {
    return true;
  }

  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

/**
 * Deletes one target URI by trying OS trash first and falling back to direct delete.
 *
 * @param {import("vscode")} vscodeApi VS Code API object.
 * @param {import("vscode").Uri} targetUri Target URI to delete.
 * @param {boolean} recursive Whether deletion should recurse for directories.
 * @returns {Promise<{usedTrash: boolean}>} Delete result metadata.
 */
async function deleteWithTrashFallback(vscodeApi, targetUri, recursive) {
  const targetPath = String(targetUri?.fsPath || "");
  const operationId = createFilesystemOperationId("delete", targetPath || "unknown");

  dispatchFilesystemAction(
    "setFilesystemPendingOperation",
    operationId,
    "delete",
    targetPath,
    "pending",
    Date.now()
  );
  dispatchFilesystemAction("setFilesystemOperationError", targetPath, "");

  try {
    await vscodeApi.workspace.fs.delete(targetUri, {
      recursive,
      useTrash: true,
    });

    dispatchFilesystemAction("clearFilesystemPendingOperation", operationId);

    return {
      usedTrash: true,
    };
  } catch (_) {
    try {
      await vscodeApi.workspace.fs.delete(targetUri, {
        recursive,
        useTrash: false,
      });

      dispatchFilesystemAction("clearFilesystemPendingOperation", operationId);

      return {
        usedTrash: false,
      };
    } catch (error) {
      dispatchFilesystemAction("clearFilesystemPendingOperation", operationId);
      dispatchFilesystemAction(
        "setFilesystemOperationError",
        targetPath,
        String(error?.message || "Filesystem delete failed")
      );
      throw error;
    }
  }
}

/**
 * Ensures one directory path exists.
 *
 * @param {string} directoryPath Directory path to create.
 * @param {{recursive?: boolean}} [options] Create options.
 * @returns {void}
 */
function ensureDirectoryPath(directoryPath, options = {}) {
  const recursive = options.recursive !== false;
  const canonicalPath = path.resolve(directoryPath);
  const operationId = createFilesystemOperationId("mkdir", canonicalPath);

  dispatchFilesystemAction(
    "setFilesystemPendingOperation",
    operationId,
    "mkdir",
    canonicalPath,
    "pending",
    Date.now()
  );
  dispatchFilesystemAction("setFilesystemOperationError", canonicalPath, "");

  try {
    fs.mkdirSync(canonicalPath, { recursive });
    clearFilesystemCache(canonicalPath);
    clearFilesystemCache(path.dirname(canonicalPath));
    dispatchFilesystemAction("clearFilesystemPendingOperation", operationId);
  } catch (error) {
    dispatchFilesystemAction("clearFilesystemPendingOperation", operationId);
    dispatchFilesystemAction(
      "setFilesystemOperationError",
      canonicalPath,
      String(error?.message || "Directory create failed")
    );
    throw error;
  }
}

/**
 * Creates one empty file path with optional parent creation and exclusive mode.
 *
 * @param {string} filePath File path to create.
 * @param {{ensureParentDirectory?: boolean, exclusive?: boolean}} [options] Create options.
 * @returns {void}
 */
function createEmptyFilePath(filePath, options = {}) {
  const canonicalPath = path.resolve(filePath);
  const ensureParentDirectory = options.ensureParentDirectory !== false;
  const exclusive = options.exclusive !== false;
  const operationId = createFilesystemOperationId("create-file", canonicalPath);

  dispatchFilesystemAction(
    "setFilesystemPendingOperation",
    operationId,
    "create-file",
    canonicalPath,
    "pending",
    Date.now()
  );
  dispatchFilesystemAction("setFilesystemOperationError", canonicalPath, "");

  try {
    const parentPath = path.dirname(canonicalPath);

    if (ensureParentDirectory) {
      fs.mkdirSync(parentPath, { recursive: true });
      clearFilesystemCache(parentPath);
    }

    fs.writeFileSync(canonicalPath, "", {
      flag: exclusive ? "wx" : "w",
    });
    clearFilesystemCache(canonicalPath);
    clearFilesystemCache(parentPath);
    dispatchFilesystemAction("clearFilesystemPendingOperation", operationId);
  } catch (error) {
    dispatchFilesystemAction("clearFilesystemPendingOperation", operationId);
    dispatchFilesystemAction(
      "setFilesystemOperationError",
      canonicalPath,
      String(error?.message || "File create failed")
    );
    throw error;
  }
}

module.exports = {
  clearFilesystemCache,
  createEmptyFilePath,
  deleteWithTrashFallback,
  expandHomeFilesystemPath,
  ensureDirectoryPath,
  getDefaultProfilePathForPlatform,
  getFilesystemCacheTtlMs,
  getProfilePlaceholderForPlatform,
  isAbsoluteFilesystemPath,
  isDirectoryPath,
  isFilePath,
  isPathWithinRoot,
  readDirectoryEntries,
  readTextFilePath,
  realpathSafe,
  resolveEnvironmentRootInfoForWorkspace,
  setFilesystemCacheTtlMs,
  statPath,
};