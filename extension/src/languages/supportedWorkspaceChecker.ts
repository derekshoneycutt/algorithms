import * as fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const maxSearchDepth = 4;

/**
 * Utility class for checking if the current workspace is supported.
 */
export class SupportedWorkspaceChecker {
  private static required = [
    { name: "run.sh", type: "file" },
    { name: "src", type: "directory" },
    { name: "stdlib", type: "directory" },
  ] as const;
  private static cachedWorkspacePath: string | undefined = undefined;
  private static cachedWorkspaceSignature: string | undefined = undefined;
  private static cachedIsSupported: boolean | undefined = undefined;
  private static cachedBaseDirectory: string | undefined = undefined;

  /**
   * Returns the resolved repository base directory for the current supported workspace.
   *
   * @returns {Promise<string | undefined>} Base directory path when supported, otherwise undefined.
   */
  public static async getCurrentBaseDirectory() : Promise<string | undefined> {
    if (!await this.isSupported()) {
      return undefined;
    }

    return this.cachedBaseDirectory;
  }

  /**
   * Returns true if any open workspace folder is a valid entry point (repo root, src, src/category, src/category/algorithm)
   * and the resolved root contains all required marker files/directories.
    *
    * @returns {Promise<boolean>} True when at least one workspace folder resolves to a supported project root.
   */
  public static async isSupported(): Promise<boolean> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      this.cachedWorkspacePath = undefined;
      this.cachedWorkspaceSignature = undefined;
      this.cachedIsSupported = undefined;
      this.cachedBaseDirectory = undefined;
      return false;
    }

    const workspacePaths = await Promise.all(
      folders.map((folder) => this.realpathSafe(folder.uri.fsPath)));
    const workspaceSignature = workspacePaths.join("\n");

    if (this.cachedWorkspaceSignature === workspaceSignature
        && this.cachedIsSupported !== undefined) {
      return this.cachedIsSupported;
    }

    if (this.cachedIsSupported
        && this.cachedWorkspacePath
        && this.cachedBaseDirectory
        && workspacePaths.includes(this.cachedWorkspacePath)) {
      this.cachedWorkspaceSignature = workspaceSignature;
      return true;
    }

    for (const startPath of workspacePaths) {
      const baseDirectory = await this.findBaseDirectory(startPath);
      if (!baseDirectory) {
        continue;
      }

      const rel = path.relative(baseDirectory, startPath);
      if (!rel) {
        this.cachedWorkspacePath = startPath;
        this.cachedWorkspaceSignature = workspaceSignature;
        this.cachedBaseDirectory = baseDirectory;
        this.cachedIsSupported = true;
        return true;
      }
      const parts = rel.split(path.sep).filter(Boolean);
      if (parts[0] !== "src") {
        continue;
      }

      const isSupported = parts.length >= 1 && parts.length <= (maxSearchDepth - 1);
      if (isSupported) {
        this.cachedWorkspacePath = startPath;
        this.cachedWorkspaceSignature = workspaceSignature;
        this.cachedBaseDirectory = baseDirectory;
        this.cachedIsSupported = true;
        return true;
      }
    }

    this.cachedWorkspacePath = undefined;
    this.cachedWorkspaceSignature = workspaceSignature;
    this.cachedBaseDirectory = undefined;
    this.cachedIsSupported = false;
    return false;
  }

  /**
   * Walks upward from a starting path to find a directory that contains all required markers.
   *
   * @param {string} startPath Path where upward search begins.
   * @returns {Promise<string | undefined>} Matching base directory path, or undefined when not found.
   */
  private static async findBaseDirectory(startPath: string): Promise<string | undefined> {
    let current = startPath;
    const requiredMarkerCount = this.required.length;

    for (let i = 0; i < maxSearchDepth; ++i) {
      const count = await this.countPresentMarkers(current);
      if (count === requiredMarkerCount) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
    }

    return undefined;
  }

  /**
   * Resolves symlinks and canonicalizes a path, falling back to the input path on failure.
   *
   * @param {string} p Path to canonicalize.
   * @returns {Promise<string>} Canonicalized path when available, otherwise the original path.
   */
  private static async realpathSafe(p: string): Promise<string> {
    try {
      return await fs.realpath(p);
    }
    catch {
      return p;
    }
  }

  /**
   * Reads immediate child entries for a directory, returning undefined when unreadable.
   *
   * @param {string} directoryPath Path to read.
   * @returns {Promise<Dirent[] | undefined>} Child entries when available.
   */
  private static async readDirectoryEntries(
    directoryPath: string): Promise<Dirent[] | undefined> {
    try {
      return await fs.readdir(directoryPath, { withFileTypes: true });
    }
    catch {
      return undefined;
    }
  }

  /**
   * Counts how many required marker entries are present in a candidate root directory.
   *
   * @param {string} root Candidate root directory.
   * @returns {Promise<number>} Number of required markers currently present.
   */
  private static async countPresentMarkers(root: string): Promise<number> {
    const entries = await this.readDirectoryEntries(root);
    if (!entries) {
      return 0;
    }

    const entryByName = new Map(entries.map((entry) => [entry.name, entry]));
    return this.required.reduce((count, marker) => {
      const entry = entryByName.get(marker.name);
      if (!entry) {
        return count;
      }

      const isMatch = marker.type === "file"
        ? entry.isFile()
        : entry.isDirectory();
      return count + (isMatch ? 1 : 0);
    }, 0);
  }
}
