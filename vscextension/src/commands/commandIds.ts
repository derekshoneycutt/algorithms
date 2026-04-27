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
 * Command identifier for adding one Algorithms include file.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsAddIncludeFileCommandId(): string {
  return "algos.algorithmsAddIncludeFile";
}

/**
 * Command identifier for showing file view in algorithms sidebar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsSidebarShowFileViewCommandId(): string {
  return "algos.algorithmsSidebarShowFileView";
}

/**
 * Command identifier for showing language view in algorithms sidebar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsSidebarShowLanguageViewCommandId(): string {
  return "algos.algorithmsSidebarShowLanguageView";
}

/**
 * Command identifier for showing all rows in the algorithms sidebar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsSidebarShowAllRowsCommandId(): string {
  return "algos.algorithmsSidebarShowAllRows";
}

/**
 * Command identifier for showing problem rows in the algorithms sidebar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsSidebarShowProblemRowsCommandId(): string {
  return "algos.algorithmsSidebarShowProblemRows";
}

/**
 * Command identifier for deleting one Algorithms item.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsDeleteCommandId(): string {
  return "algos.algorithmsDelete";
}

/**
 * Command identifier for flagging one Algorithms language row.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsFlagLanguageCommandId(): string {
  return "algos.algorithmsFlagLanguage";
}

/**
 * Command identifier for unflagging one Algorithms language row.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsUnflagLanguageCommandId(): string {
  return "algos.algorithmsUnflagLanguage";
}

/**
 * Command identifier for running one Algorithms file from the tree.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsRunFileCommandId(): string {
  return "algos.algorithmsRunFile";
}

/**
 * Command identifier for running one Algorithms file from the editor title bar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsEditorTitleRunFileCommandId(): string {
  return "algos.algorithmsEditorTitleRunFile";
}

/**
 * Command identifier for compile-only execution from the editor title bar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsEditorTitleCompileOnlyCommandId(): string {
  return "algos.algorithmsEditorTitleCompileOnly";
}

/**
 * Command identifier for check-only native execution from the editor title bar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsEditorTitleCheckOnlyNativeCommandId(): string {
  return "algos.algorithmsEditorTitleCheckOnlyNative";
}

/**
 * Command identifier for check-only docker execution from the editor title bar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsEditorTitleCheckOnlyDockerCommandId(): string {
  return "algos.algorithmsEditorTitleCheckOnlyDocker";
}

/**
 * Command identifier for check-only ssh execution from the editor title bar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsEditorTitleCheckOnlySshCommandId(): string {
  return "algos.algorithmsEditorTitleCheckOnlySsh";
}

/**
 * Command identifier for clean execution from the editor title bar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsEditorTitleCleanCommandId(): string {
  return "algos.algorithmsEditorTitleClean";
}

/**
 * Command identifier for local clean execution from the editor title bar.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsEditorTitleLocalCleanCommandId(): string {
  return "algos.algorithmsEditorTitleLocalClean";
}

/**
 * Command identifier for compile-only execution from the tree.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsCompileOnlyCommandId(): string {
  return "algos.algorithmsCompileOnly";
}

/**
 * Command identifier for check-only native execution from the tree.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsCheckOnlyNativeCommandId(): string {
  return "algos.algorithmsCheckOnlyNative";
}

/**
 * Command identifier for check-only docker execution from the tree.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsCheckOnlyDockerCommandId(): string {
  return "algos.algorithmsCheckOnlyDocker";
}

/**
 * Command identifier for check-only ssh execution from the tree.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsCheckOnlySshCommandId(): string {
  return "algos.algorithmsCheckOnlySsh";
}

/**
 * Command identifier for full clean execution from the tree.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsCleanCommandId(): string {
  return "algos.algorithmsClean";
}

/**
 * Command identifier for local clean execution from the tree.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsLocalCleanCommandId(): string {
  return "algos.algorithmsLocalClean";
}

/**
 * Command identifier for smoke-test execution from an algorithm directory row.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsSmokeTestCommandId(): string {
  return "algos.algorithmsSmokeTest";
}

/**
 * Command identifier for stopping an active smoke test from an algorithm directory row.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsStopSmokeTestCommandId(): string {
  return "algos.algorithmsStopSmokeTest";
}

/**
 * Command identifier for clearing retained smoke results from an algorithm directory row.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsClearSmokeResultsCommandId(): string {
  return "algos.algorithmsClearSmokeResults";
}

/**
 * Command identifier for clearing retained run results from one target row.
 *
 * @returns {string} Command identifier.
 */
export function getAlgorithmsClearRunResultsCommandId(): string {
  return "algos.algorithmsClearRunResults";
}

/**
 * Command identifier for running an Algorithms file from the Explorer context menu.
 *
 * @returns {string} Command identifier.
 */
export function getExplorerRunFileCommandId(): string {
  return "algos.explorerRunFile";
}

/**
 * Command identifier for compile-only execution from the Explorer context menu.
 *
 * @returns {string} Command identifier.
 */
export function getExplorerCompileOnlyCommandId(): string {
  return "algos.explorerCompileOnly";
}

/**
 * Command identifier for check-only native execution from the Explorer context menu.
 *
 * @returns {string} Command identifier.
 */
export function getExplorerCheckOnlyNativeCommandId(): string {
  return "algos.explorerCheckOnlyNative";
}

/**
 * Command identifier for check-only docker execution from the Explorer context menu.
 *
 * @returns {string} Command identifier.
 */
export function getExplorerCheckOnlyDockerCommandId(): string {
  return "algos.explorerCheckOnlyDocker";
}

/**
 * Command identifier for check-only ssh execution from the Explorer context menu.
 *
 * @returns {string} Command identifier.
 */
export function getExplorerCheckOnlySshCommandId(): string {
  return "algos.explorerCheckOnlySsh";
}

/**
 * Command identifier for full clean execution from the Explorer context menu.
 *
 * @returns {string} Command identifier.
 */
export function getExplorerCleanCommandId(): string {
  return "algos.explorerClean";
}

/**
 * Command identifier for local clean execution from the Explorer context menu.
 *
 * @returns {string} Command identifier.
 */
export function getExplorerLocalCleanCommandId(): string {
  return "algos.explorerLocalClean";
}