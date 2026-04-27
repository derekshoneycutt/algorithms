import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { Dirent, Stats } from "node:fs";

import type { IFilesystem } from "./IFilesystem";
import type {
  CreateFilesystemInput,
  DeletePathOptions,
  ListDirectoryOptions,
  ListDirectoryResult,
  PathLookupOptions,
  ReadTextOptions,
} from "./types";

const DEFAULT_FILESYSTEM_CACHE_TTL_MS = 2000;

interface CacheEntry<TValue> {
  timestamp: number;
  value: TValue;
}

type DirectoryCacheValue = Dirent[];

/**
 * Returns one unexpired cache value.
 *
 * @param {Map<string, CacheEntry<TValue>>} cache Cache map.
 * @param {string} cacheKey Canonical cache key.
 * @param {number} ttlMs Cache TTL in milliseconds.
 * @returns {TValue | null} Cached value or null when missing/expired.
 */
function readCache<TValue>(
  cache: Map<string, CacheEntry<TValue>>,
  cacheKey: string,
  ttlMs: number
): TValue | null {
  const entry = cache.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > ttlMs) {
    cache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

/**
 * Stores one value in a cache map.
 *
 * @param {Map<string, CacheEntry<TValue>>} cache Cache map.
 * @param {string} cacheKey Canonical cache key.
 * @param {TValue} value Cached value.
 * @returns {TValue} Stored value.
 */
function writeCache<TValue>(
  cache: Map<string, CacheEntry<TValue>>,
  cacheKey: string,
  value: TValue
): TValue {
  cache.set(cacheKey, {
    timestamp: Date.now(),
    value,
  });

  return value;
}

/**
 * Returns a normalized absolute path from any input path.
 *
 * @param {string} targetPath Input path.
 * @returns {string} Normalized absolute path.
 */
function toNormalizedAbsolutePath(targetPath: string): string {
  return path.resolve(String(targetPath));
}

/**
 * Joins one filename or relative path onto the current home directory.
 *
 * @param {string} relativePath Relative path under the home directory.
 * @returns {string} Absolute path within the home directory.
 */
export function joinHomePath(relativePath: string): string {
  return path.join(os.homedir(), String(relativePath || ""));
}

/**
 * Builds one unique filesystem operation id.
 *
 * @param {string} prefix Operation prefix.
 * @param {string} targetPath Operation path.
 * @returns {string} Operation identifier.
 */
function createFilesystemOperationId(prefix: string, targetPath: string): string {
  return `${prefix}:${targetPath}:${Date.now()}`;
}

/**
 * Creates the concrete filesystem module implementation.
 *
 * Query/read operations fail soft (`false`/`null`) while directory creation
 * propagates errors so callers can surface actionable failures.
 *
 * @returns {IFilesystem} Filesystem implementation.
 */
export function createFilesystem(input?: CreateFilesystemInput): IFilesystem {
  const inputCacheTtlMs = Number(input?.cacheTtlMs);
  let filesystemCacheTtlMs =
    Number.isFinite(inputCacheTtlMs) && inputCacheTtlMs >= 0
      ? Math.floor(inputCacheTtlMs)
      : DEFAULT_FILESYSTEM_CACHE_TTL_MS;

  const stateBridge = input?.stateBridge;
  const statCacheByPath = new Map<string, CacheEntry<Stats>>();
  const directoryCacheByPath = new Map<string, CacheEntry<DirectoryCacheValue>>();

  /**
   * Clears cached filesystem metadata for one path or for all cached paths.
   *
   * @param {string} [targetPath] Canonical path to invalidate.
   * @returns {void}
   */
  function clearCache(targetPath?: string): void {
    if (typeof targetPath === "string" && targetPath.trim().length > 0) {
      const canonicalPath = toNormalizedAbsolutePath(targetPath);
      statCacheByPath.delete(canonicalPath);
      directoryCacheByPath.delete(canonicalPath);
      stateBridge?.onCacheCleared?.(canonicalPath);
      return;
    }

    statCacheByPath.clear();
    directoryCacheByPath.clear();
    stateBridge?.onCacheCleared?.();
  }

  /**
   * Returns whether cache should be consulted for one lookup.
   *
   * @param {PathLookupOptions | ListDirectoryOptions | ReadTextOptions | undefined} options Cache options.
   * @returns {boolean} True when cache usage is enabled.
   */
  function shouldUseCache(
    options?: PathLookupOptions | ListDirectoryOptions | ReadTextOptions
  ): boolean {
    return options?.useCache !== false;
  }

  return {
    async realpath(targetPath: string): Promise<string> {
      const normalizedPath = toNormalizedAbsolutePath(targetPath);
      try {
        return await fs.realpath(normalizedPath);
      } catch {
        return normalizedPath;
      }
    },

    async isFile(filePath: string, options?: PathLookupOptions): Promise<boolean> {
      const normalizedPath = toNormalizedAbsolutePath(filePath);

      if (shouldUseCache(options)) {
        const cachedStat = readCache(statCacheByPath, normalizedPath, filesystemCacheTtlMs);

        if (cachedStat !== null) {
          return cachedStat.isFile();
        }
      }

      try {
        const stat = await fs.stat(normalizedPath);
        const kind = stat.isDirectory() ? "directory" : (stat.isFile() ? "file" : "other");
        const updatedAt = Date.now();

        if (shouldUseCache(options)) {
          writeCache(statCacheByPath, normalizedPath, stat);
        }

        stateBridge?.onStatCacheEntrySet?.(normalizedPath, true, kind, updatedAt);

        return stat.isFile();
      } catch {
        stateBridge?.onStatCacheEntrySet?.(normalizedPath, false, "missing", Date.now());
        return false;
      }
    },

    async isDirectory(
      directoryPath: string,
      options?: PathLookupOptions
    ): Promise<boolean> {
      const normalizedPath = toNormalizedAbsolutePath(directoryPath);

      if (shouldUseCache(options)) {
        const cachedStat = readCache(statCacheByPath, normalizedPath, filesystemCacheTtlMs);

        if (cachedStat !== null) {
          return cachedStat.isDirectory();
        }
      }

      try {
        const stat = await fs.stat(normalizedPath);
        const kind = stat.isDirectory() ? "directory" : (stat.isFile() ? "file" : "other");
        const updatedAt = Date.now();

        if (shouldUseCache(options)) {
          writeCache(statCacheByPath, normalizedPath, stat);
        }

        stateBridge?.onStatCacheEntrySet?.(normalizedPath, true, kind, updatedAt);

        return stat.isDirectory();
      } catch {
        stateBridge?.onStatCacheEntrySet?.(normalizedPath, false, "missing", Date.now());
        return false;
      }
    },

    async readText(
      filePath: string,
      options?: ReadTextOptions
    ): Promise<string | null> {
      const normalizedPath = toNormalizedAbsolutePath(filePath);
      const encoding = options?.encoding ?? "utf8";
      try {
        return await fs.readFile(normalizedPath, { encoding });
      } catch {
        return null;
      }
    },

    async writeText(
      filePath: string,
      content: string,
      options?: ReadTextOptions
    ): Promise<void> {
      const normalizedPath = toNormalizedAbsolutePath(filePath);
      const encoding = options?.encoding ?? "utf8";
      const operationId = createFilesystemOperationId("write", normalizedPath);

      stateBridge?.onPendingOperationSet?.(
        operationId,
        "write",
        normalizedPath,
        "pending",
        Date.now()
      );
      stateBridge?.onOperationErrorSet?.(normalizedPath, "");

      try {
        await fs.writeFile(normalizedPath, content, { encoding });
        clearCache(normalizedPath);
        clearCache(path.dirname(normalizedPath));
        stateBridge?.onPendingOperationCleared?.(operationId);
      } catch (error) {
        stateBridge?.onPendingOperationCleared?.(operationId);
        stateBridge?.onOperationErrorSet?.(
          normalizedPath,
          String((error as Error)?.message || "File write failed")
        );
        throw error;
      }
    },

    async listDirectory(
      directoryPath: string,
      options?: ListDirectoryOptions
    ): Promise<ListDirectoryResult | null> {
      const normalizedPath = toNormalizedAbsolutePath(directoryPath);
      const withFileTypes = options?.withFileTypes ?? false;

      if (withFileTypes && shouldUseCache(options)) {
        const cachedEntries = readCache(
          directoryCacheByPath,
          normalizedPath,
          filesystemCacheTtlMs
        );

        if (cachedEntries !== null) {
          return cachedEntries;
        }
      }

      try {
        if (withFileTypes) {
          const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
          const updatedAt = Date.now();

          if (shouldUseCache(options)) {
            writeCache(directoryCacheByPath, normalizedPath, entries);
          }

          stateBridge?.onDirectoryCacheEntrySet?.(normalizedPath, entries.length, updatedAt);

          return entries;
        }

        const entries = await fs.readdir(normalizedPath, { withFileTypes: false });
        stateBridge?.onDirectoryCacheEntrySet?.(normalizedPath, entries.length, Date.now());
        return entries;
      } catch {
        return null;
      }
    },

    async ensureDirectory(directoryPath: string): Promise<void> {
      const normalizedPath = toNormalizedAbsolutePath(directoryPath);
      const operationId = createFilesystemOperationId("mkdir", normalizedPath);

      stateBridge?.onPendingOperationSet?.(
        operationId,
        "mkdir",
        normalizedPath,
        "pending",
        Date.now()
      );
      stateBridge?.onOperationErrorSet?.(normalizedPath, "");

      try {
        await fs.mkdir(normalizedPath, { recursive: true });
        clearCache(normalizedPath);
        clearCache(path.dirname(normalizedPath));
        stateBridge?.onPendingOperationCleared?.(operationId);
      } catch (error) {
        stateBridge?.onPendingOperationCleared?.(operationId);
        stateBridge?.onOperationErrorSet?.(
          normalizedPath,
          String((error as Error)?.message || "Directory create failed")
        );
        throw error;
      }
    },

    async deletePath(
      targetPath: string,
      options?: DeletePathOptions
    ): Promise<void> {
      const normalizedPath = toNormalizedAbsolutePath(targetPath);
      const recursive = options?.recursive ?? false;
      const operationId = createFilesystemOperationId("delete", normalizedPath);

      stateBridge?.onPendingOperationSet?.(
        operationId,
        "delete",
        normalizedPath,
        "pending",
        Date.now()
      );
      stateBridge?.onOperationErrorSet?.(normalizedPath, "");

      try {
        await fs.rm(normalizedPath, {
          recursive,
          force: false,
        });
        clearCache(normalizedPath);
        clearCache(path.dirname(normalizedPath));
        stateBridge?.onPendingOperationCleared?.(operationId);
      } catch (error) {
        stateBridge?.onPendingOperationCleared?.(operationId);
        stateBridge?.onOperationErrorSet?.(
          normalizedPath,
          String((error as Error)?.message || "Filesystem delete failed")
        );
        throw error;
      }
    },

    getCacheTtlMs(): number {
      return filesystemCacheTtlMs;
    },

    setCacheTtlMs(nextTtlMs: number): number {
      const numericTtl = Number(nextTtlMs);

      if (!Number.isFinite(numericTtl) || numericTtl < 0) {
        return filesystemCacheTtlMs;
      }

      filesystemCacheTtlMs = Math.floor(numericTtl);
      stateBridge?.onCacheTtlSet?.(filesystemCacheTtlMs);
      return filesystemCacheTtlMs;
    },

    clearCache(targetPath?: string): void {
      clearCache(targetPath);
    },

    async isPathWithinRoot(
      rootPath: string,
      candidatePath: string
    ): Promise<boolean> {
      const canonicalRootPath = await this.realpath(rootPath);
      const canonicalCandidatePath = await this.realpath(candidatePath);
      const relativePath = path.relative(canonicalRootPath, canonicalCandidatePath);

      if (relativePath.length === 0) {
        return true;
      }

      if (relativePath === ".") {
        return true;
      }

      if (relativePath.startsWith(`..${path.sep}`)) {
        return false;
      }

      if (relativePath === "..") {
        return false;
      }

      if (path.isAbsolute(relativePath)) {
        return false;
      }

      return true;
    },
  };
}
