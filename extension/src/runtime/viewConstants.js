// Shared extension-wide view constants.

/**
 * Stable sidebar view identifiers contributed in package.json.
 *
 * @type {{SMOKE_CONTROLS: string, RUN_CONTROLS: string, ALGORITHMS_RUN: string, STANDARD_LIBRARY: string, ENVIRONMENT: string}}
 */
const VIEW_IDS = Object.freeze({
  SMOKE_CONTROLS: "algosWorkspaceSmokeControlsView",
  RUN_CONTROLS: "algosWorkspaceRunControlsView",
  ALGORITHMS_RUN: "algosWorkspaceAlgorithmsRunView",
  STANDARD_LIBRARY: "algosWorkspaceStandardLibraryView",
  ENVIRONMENT: "algosWorkspaceEnvironmentView",
});

// Public constants shared across extension modules.
module.exports = {
  VIEW_IDS,
};