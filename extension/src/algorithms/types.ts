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
  /** True when this language key is present in the algorithm .flag-lang file. */
  isFlagged: boolean;
  /** Absolute path to the main implementation file. */
  filePath: string;
  /** Absolute paths to all implementation files for this language in the algorithm root. */
  filePaths: string[];
  /** True when the corresponding {languageKey}_include directory exists. */
  hasIncludes: boolean;
  /** Absolute paths to files inside the include directory. */
  includeFilePaths: string[];
}

/**
 * One resolved algorithm file lookup descriptor keyed by absolute file path.
 */
export interface AlgorithmFileLookup {
  /** Resolved file path associated with this lookup entry. */
  filePath: string;
  /** Absolute path to the parent algorithm directory. */
  algorithmPath: string;
  /** Language key associated with the file. */
  languageKey: string;
  /** Representative main file path for this language implementation. */
  mainFilePath: string;
  /** True when the language implementation has include files. */
  hasIncludes: boolean;
  /** True when the language implementation is currently flagged. */
  isFlagged: boolean;
  /** Category of the resolved file within the algorithm implementation. */
  fileKind: "main" | "implementation" | "include";
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
