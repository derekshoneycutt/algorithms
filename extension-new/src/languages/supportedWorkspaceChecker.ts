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
  private static cachedWorkspaceSignature: string | undefined = undefined;
  private static cachedIsSupported: boolean | undefined = undefined;
  private static cachedBaseDirectory: string | undefined = undefined;

  public static getCurrentBaseDirectory() : string | undefined {
    if (!this.isSupported()) {
      return undefined;
    }

    return this.cachedBaseDirectory;
  }

  /**
   * Returns true if any open workspace folder is a valid entry point (repo root, src, src/category, src/category/algorithm)
   * and the resolved root contains all required marker files/directories.
   */
  public static isSupported(): boolean {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      this.cachedWorkspacePath = undefined;
      this.cachedWorkspaceSignature = undefined;
      this.cachedIsSupported = undefined;
      this.cachedBaseDirectory = undefined;
      return false;
    }

    const workspacePaths = folders.map((folder) => this.realpathSafe(folder.uri.fsPath));
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
      const baseDirectory = this.findBaseDirectory(startPath);
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

  private static findBaseDirectory(startPath: string): string | undefined {
    let current = startPath;
    const requiredMarkerCount = this.required.length;

    for (let i = 0; i < maxSearchDepth; ++i) {
      const count = this.countPresentMarkers(current);
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
