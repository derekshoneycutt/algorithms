import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type { IFilesystem } from "./IFilesystem";
import type {
  DeletePathOptions,
  ListDirectoryOptions,
  ListDirectoryResult,
  ReadTextOptions,
} from "./types";

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
 * Creates the concrete filesystem module implementation.
 *
 * Query/read operations fail soft (`false`/`null`) while directory creation
 * propagates errors so callers can surface actionable failures.
 *
 * @returns {IFilesystem} Filesystem implementation.
 */
export function createFilesystem(): IFilesystem {
  return {
    async realpath(targetPath: string): Promise<string> {
      const normalizedPath = toNormalizedAbsolutePath(targetPath);
      try {
        return await fs.realpath(normalizedPath);
      } catch {
        return normalizedPath;
      }
    },

    async isFile(filePath: string): Promise<boolean> {
      const normalizedPath = toNormalizedAbsolutePath(filePath);
      try {
        const stat = await fs.stat(normalizedPath);
        return stat.isFile();
      } catch {
        return false;
      }
    },

    async isDirectory(directoryPath: string): Promise<boolean> {
      const normalizedPath = toNormalizedAbsolutePath(directoryPath);
      try {
        const stat = await fs.stat(normalizedPath);
        return stat.isDirectory();
      } catch {
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
      await fs.writeFile(normalizedPath, content, { encoding });
    },

    async listDirectory(
      directoryPath: string,
      options?: ListDirectoryOptions
    ): Promise<ListDirectoryResult | null> {
      const normalizedPath = toNormalizedAbsolutePath(directoryPath);
      const withFileTypes = options?.withFileTypes ?? false;
      try {
        if (withFileTypes) {
          return await fs.readdir(normalizedPath, { withFileTypes: true });
        }

        return await fs.readdir(normalizedPath, { withFileTypes: false });
      } catch {
        return null;
      }
    },

    async ensureDirectory(directoryPath: string): Promise<void> {
      const normalizedPath = toNormalizedAbsolutePath(directoryPath);
      await fs.mkdir(normalizedPath, { recursive: true });
    },

    async deletePath(
      targetPath: string,
      options?: DeletePathOptions
    ): Promise<void> {
      const normalizedPath = toNormalizedAbsolutePath(targetPath);
      const recursive = options?.recursive ?? false;
      await fs.rm(normalizedPath, {
        recursive,
        force: false,
      });
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
