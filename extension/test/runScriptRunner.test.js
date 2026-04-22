const { runTests: runAlgorithmsRunViewTests } = require("./algorithmsRunView.test");
const { runTests: runCommandLineCoreTests } = require("./commandLineCore.test");
const { runTests: runCommandPathContextTests } = require("./commandPathContext.test");
const { runTests: runExtensionStateStoreTests } = require("./extensionStateStore.test");
const { runTests: runInitCommandAdapterTests } = require("./initCommandAdapter.test");
const { runTests: runInputValidationTests } = require("./inputValidation.test");
const { runTests: runPathResolverTests } = require("./pathResolver.test");
const { runTests: runProviderViewsTests } = require("./providerViews.test");
const { runTests: runRuntimeProcessBoundaryTests } = require("./runtimeProcessBoundary.test");
const { runTests: runRunCommandAdapterTests } = require("./runCommandAdapter.test");
const { runTests: runSidebarRunArgsStateTests } = require("./sidebarRunArgsState.test");
const { runTests: runSmokeProcessLifecycleTests } = require("./smokeProcessLifecycle.test");
const { runTests: runSmokeStatusStateTests } = require("./smokeStatusState.test");
const { runTests: runWebviewHostUtilsTests } = require("./webviewHostUtils.test");
const { runTests: runWebviewClientUtilsTests } = require("./webviewClientUtils.test");
const { runTests: runUiWorkspaceFsUtilsTests } = require("./uiWorkspaceFsUtils.test");
const { runTests: runWorkspaceFilesystemTests } = require("./workspaceFilesystem.test");
const { runTests: runEnvironmentParsingAndInitAdapterTests } = require("./environmentParsingAndInitAdapter.test");
const { runTests: runShellProfileParseCoreTests } = require("./shellProfileParseCore.test");
const { runTests: runEnvironmentProfileAdapterTests } = require("./environmentProfileAdapter.test");

/**
 * Runs the extension unit test suite and exits non-zero on failure.
 *
 * @returns {Promise<void>}
 */
async function main() {
  runAlgorithmsRunViewTests();
  const commandLineCoreResult = runCommandLineCoreTests();
  if (commandLineCoreResult instanceof Promise) {
    await commandLineCoreResult;
  }
  runCommandPathContextTests();
  runExtensionStateStoreTests();
  const initCommandAdapterResult = runInitCommandAdapterTests();
  if (initCommandAdapterResult instanceof Promise) {
    await initCommandAdapterResult;
  }
  runInputValidationTests();
  runPathResolverTests();
  runProviderViewsTests();
  runRuntimeProcessBoundaryTests();
  runRunCommandAdapterTests();
  runSidebarRunArgsStateTests();
  runSmokeProcessLifecycleTests();
  runSmokeStatusStateTests();
  runWebviewHostUtilsTests();
  runWebviewClientUtilsTests();
  const uiWorkspaceFsUtilsResult = runUiWorkspaceFsUtilsTests();
  if (uiWorkspaceFsUtilsResult instanceof Promise) {
    await uiWorkspaceFsUtilsResult;
  }
  const workspaceFilesystemResult = runWorkspaceFilesystemTests();
  if (workspaceFilesystemResult instanceof Promise) {
    await workspaceFilesystemResult;
  }
  const environmentParsingAndInitAdapterResult = runEnvironmentParsingAndInitAdapterTests();
  if (environmentParsingAndInitAdapterResult instanceof Promise) {
    await environmentParsingAndInitAdapterResult;
  }
  const shellProfileParseCoreResult = runShellProfileParseCoreTests();
  if (shellProfileParseCoreResult instanceof Promise) {
    await shellProfileParseCoreResult;
  }
  const environmentProfileAdapterResult = runEnvironmentProfileAdapterTests();
  if (environmentProfileAdapterResult instanceof Promise) {
    await environmentProfileAdapterResult;
  }
  console.log("extension tests passed");
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests() {
    return undefined;
  },
};

main();
