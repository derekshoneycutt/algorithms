import * as fs from "node:fs";
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
  private static cachedIsSupported: boolean | undefined = undefined;

  /**
   * Returns true if the first open workspace folder is a valid entry point (repo root, src, src/category, src/category/algorithm)
   * and the root contains all required marker files/directories.
   */
  public static isSupported(): boolean {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      this.cachedWorkspacePath = undefined;
      this.cachedIsSupported = undefined;
      return false;
    }

    const startPath = this.realpathSafe(folders[0].uri.fsPath);
    if (
      this.cachedWorkspacePath === startPath
      && this.cachedIsSupported !== undefined
    ) {
      return this.cachedIsSupported;
    }

    let current = startPath;
    let bestRoot = current;
    let bestCount = -1;
    const requiredMarkerCount = this.required.length;

    for (let i = 0; i < maxSearchDepth; ++i) {
      const count = this.countPresentMarkers(current);

      if (count === requiredMarkerCount) {
        bestRoot = current;
        bestCount = count;
        break;
      }

      if (count > bestCount) {
        bestCount = count;
        bestRoot = current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
    }

    if (bestCount !== requiredMarkerCount) {
      this.cachedWorkspacePath = startPath;
      this.cachedIsSupported = false;
      return false;
    }

    const rel = path.relative(bestRoot, startPath);
    if (!rel) {
      this.cachedWorkspacePath = startPath;
      this.cachedIsSupported = true;
      return true;
    }
    const parts = rel.split(path.sep).filter(Boolean);
    if (parts[0] !== "src") {
      this.cachedWorkspacePath = startPath;
      this.cachedIsSupported = false;
      return false;
    }

    const isSupported = parts.length >= 1 && parts.length <= (maxSearchDepth - 1);
    this.cachedWorkspacePath = startPath;
    this.cachedIsSupported = isSupported;
    return isSupported;
  }

  private static realpathSafe(p: string): string {
    try {
      return fs.realpathSync(p);
    }
    catch {
      return p;
    }
  }
  private static isFile(p: string) {
    try {
      return fs.statSync(p).isFile();
    }
    catch {
      return false;
    }
  }
  private static isDir(p: string) {
    try {
      return fs.statSync(p).isDirectory();
    }
    catch {
      return false;
    }
  }
  private static markerExists(
    root: string,
    marker: {name: string, type: "file"|"directory"}) {

    const markerPath = path.join(root, marker.name);
    return marker.type === "file"
        ? this.isFile(markerPath)
        : this.isDir(markerPath);
  }
  private static countPresentMarkers(root: string) {
    return this.required.reduce(
        (n, m) =>
            n + (this.markerExists(root, m) ? 1 : 0),
        0);
  }
}
