/**
 * Command identifier for the bootstrap status command.
 *
 * @returns {string} Bootstrap status command identifier.
 */
export function getShowBootstrapStatusCommandId(): string {
  return "algos.showBootstrapStatus";
}

/**
 * Command identifier for creating one Standard Library file.
 *
 * @returns {string} Command identifier.
 */
export function getStandardLibraryCreateFileCommandId(): string {
  return "algos.standardLibraryCreateFile";
}

/**
 * Command identifier for creating one Standard Library folder.
 *
 * @returns {string} Command identifier.
 */
export function getStandardLibraryCreateFolderCommandId(): string {
  return "algos.standardLibraryCreateFolder";
}

/**
 * Command identifier for deleting one Standard Library item.
 *
 * @returns {string} Command identifier.
 */
export function getStandardLibraryDeleteCommandId(): string {
  return "algos.standardLibraryDelete";
}

/**
 * Command identifier for creating one Algorithms folder at src root.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsCreateFolderAtRootCommandId(): string {
  return "algos.algorithmsCreateFolderAtRoot";
}

/**
 * Command identifier for creating one Algorithms folder inside first-level directory.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsCreateFolderCommandId(): string {
  return "algos.algorithmsCreateFolder";
}

/**
 * Command identifier for creating one Algorithms file inside second-level directory.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsCreateFileCommandId(): string {
  return "algos.algorithmsCreateFile";
}

/**
 * Command identifier for deleting one Algorithms item.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsDeleteCommandId(): string {
  return "algos.algorithmsDelete";
}