/**
 * One top-level category (first-level directory) in the algorithms source tree.
 */
export interface AlgorithmCategory {
  /** Display name (directory base name). */
  name: string;
  /** Absolute path to the category directory. */
  path: string;
}

/**
 * One algorithm entry (second-level directory) inside a category.
 */
export interface AlgorithmEntry {
  /** Display name (directory base name). */
  name: string;
  /** Absolute path to the algorithm directory. */
  path: string;
  /** Absolute path to the parent category directory. */
  categoryPath: string;
}

/**
 * One per-language implementation of an algorithm.
 */
export interface AlgorithmImplementation {
  /** Language key (e.g. "go", "python"). */
  languageKey: string;
  /** Absolute path to the main implementation file. */
  filePath: string;
  /** True when the corresponding {languageKey}_include directory exists. */
  hasIncludes: boolean;
  /** Absolute paths to files inside the include directory. */
  includeFilePaths: string[];
}

/**
 * One entry in the standard library tree.
 */
export interface StandardLibEntry {
  /** Kind of entry: directory or file. */
  kind: "directory" | "file";
  /** Display name (base name). */
  name: string;
  /** Absolute path. */
  path: string;
}
