import * as path from "node:path";

/**
 * Result of resolving an algorithm file from an absolute path.
 */
export interface AlgorithmFileInfo {
  gitRoot: string;
  algorithmDir: string;
  fileName: string;
  category: string;
  algorithm: string;
}

/**
 * Resolves an absolute file path to algorithm coordinates.
 *
 * Scans the absolute path backwards to find the last `src` segment,
 * then verifies that exactly 3 segments follow: category, algorithm, and file.
 *
 * @param {string} absolutePath Absolute file path.
 * @returns {AlgorithmFileInfo | null} Resolved info or null if path does not match pattern.
 */
export function resolveAlgorithmFile(absolutePath: string): AlgorithmFileInfo | null {
  const allSegments = absolutePath.split(path.sep).filter(Boolean);
  const srcIndex = allSegments.lastIndexOf("src");

  if (srcIndex < 0 || allSegments.length - srcIndex !== 4) {
    return null;
  }

  const category = allSegments[srcIndex + 1];
  const algorithm = allSegments[srcIndex + 2];
  const fileName = allSegments[srcIndex + 3];

  const gitRoot = allSegments
    .slice(0, srcIndex)
    .reduce(
      (accumulatedPath, segment) => path.join(accumulatedPath, segment),
      path.parse(absolutePath).root
    );

  const algorithmDir = path.dirname(absolutePath);

  return {
    gitRoot,
    algorithmDir,
    fileName,
    category,
    algorithm,
  };
}

/**
 * Quotes one value for safe inclusion in a POSIX shell command.
 *
 * @param {string} rawValue Raw value to quote.
 * @returns {string} Quoted value.
 */
export function quoteForShell(rawValue: string): string {
  return `'${rawValue.replace(/'/g, "'\\''")}'`;
}
