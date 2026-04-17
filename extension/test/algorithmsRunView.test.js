const assert = require("assert");
const Module = require("module");
const { getLanguageDisplayLabel } = require("../src/runtime/languageMetadata");

/**
 * Loads algorithmsRunView internals with a minimal vscode mock.
 *
 * @returns {{WorkspaceStatusTreeDataProvider: Function}} Testable internals.
 */
function loadAlgorithmsRunViewInternals() {
  const originalModuleLoad = Module._load;

  Module._load = function patchedModuleLoad(request, parent, isMain) {
    if (request === "vscode") {
      return {
        Uri: {
          file(filePath) {
            const normalizedPath = String(filePath || "");

            return {
              fsPath: normalizedPath,
              with(patch) {
                return {
                  fsPath: normalizedPath,
                  fragment: String(patch?.fragment || ""),
                };
              },
            };
          },
        },
        EventEmitter: class EventEmitter {
          constructor() {
            this.event = () => {
              // No-op event in tests.
            };
          }

          fire() {
            // No-op event emit in tests.
          }
        },
      };
    }

    return originalModuleLoad.call(this, request, parent, isMain);
  };

  try {
    const {
      _internal: {
        createLanguageSummaryTreeNode,
        WorkspaceStatusTreeDataProvider,
      },
    } = require("../src/ui/algorithmsRunView");

    return {
      createLanguageSummaryTreeNode,
      WorkspaceStatusTreeDataProvider,
    };
  } finally {
    Module._load = originalModuleLoad;
  }
}

const {
  createLanguageSummaryTreeNode,
  WorkspaceStatusTreeDataProvider,
} = loadAlgorithmsRunViewInternals();

/**
 * Builds one smoke-state fixture representing mixed smoke outcomes.
 *
 * @returns {Map<string, {status: "queued"|"running"|"passed"|"failed"|"stopped", locked: boolean}>} Smoke-state fixture.
 */
function createSmokeStateFixture() {
  return new Map([
    ["queuedLang", { status: "queued", locked: false }],
    ["runningLang", { status: "running", locked: false }],
    ["passedLang", { status: "passed", locked: false }],
    ["failedLockedLang", { status: "failed", locked: true }],
  ]);
}

/**
 * Verifies stop transitions only queued/running entries and retains existing results.
 *
 * @returns {void}
 */
function testStopTransitionRetainsExistingSmokeResults() {
  const provider = new WorkspaceStatusTreeDataProvider();
  const algorithmPath = "/tmp/algorithm";

  provider.replaceSmokeStateForAlgorithm(algorithmPath, createSmokeStateFixture());
  provider.markRemainingSmokeStatusesStopped(algorithmPath);

  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "queuedLang").status,
    "stopped"
  );
  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "runningLang").status,
    "stopped"
  );
  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "passedLang").status,
    "passed"
  );
  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "failedLockedLang").status,
    "failed"
  );

  assert.strictEqual(provider.hasSmokeResultsForAlgorithm(algorithmPath), true);
  assert.deepStrictEqual(provider.getSmokeStatusSummary(algorithmPath), {
    queued: 0,
    running: 0,
    passed: 1,
    failed: 1,
    stopped: 2,
  });
}

/**
 * Verifies failed transitions only apply to active queued/running entries.
 *
 * @returns {void}
 */
function testFailureTransitionAffectsOnlyActiveEntries() {
  const provider = new WorkspaceStatusTreeDataProvider();
  const algorithmPath = "/tmp/algorithm";

  provider.replaceSmokeStateForAlgorithm(algorithmPath, createSmokeStateFixture());
  provider.markRemainingSmokeStatusesFailed(algorithmPath);

  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "queuedLang").status,
    "failed"
  );
  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "runningLang").status,
    "failed"
  );
  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "passedLang").status,
    "passed"
  );
  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "failedLockedLang").status,
    "failed"
  );
}

/**
 * Verifies locked failed entries are not overwritten by incoming status updates.
 *
 * @returns {void}
 */
function testLockedFailedStatusIsNotOverwritten() {
  const provider = new WorkspaceStatusTreeDataProvider();
  const algorithmPath = "/tmp/algorithm";

  provider.replaceSmokeStateForAlgorithm(
    algorithmPath,
    new Map([["lockedFailedLang", { status: "failed", locked: true }]])
  );
  provider.setSmokeLanguageStatus(algorithmPath, "lockedFailedLang", "passed");

  assert.strictEqual(
    provider.getSmokeLanguageState(algorithmPath, "lockedFailedLang").status,
    "failed"
  );
}

/**
 * Verifies running/results context values and clear-results transitions.
 *
 * @returns {void}
 */
function testSmokeContextAndClearResultsTransitions() {
  const provider = new WorkspaceStatusTreeDataProvider();
  const algorithmPath = "/tmp/algorithm";

  provider.replaceSmokeStateForAlgorithm(algorithmPath, createSmokeStateFixture());
  assert.strictEqual(
    provider.getAlgorithmDirectoryContextValue(algorithmPath),
    "algos.workspaceAlgorithmDirectoryResults"
  );

  provider.setSmokeProcessRunning(algorithmPath, true);
  assert.strictEqual(
    provider.getAlgorithmDirectoryContextValue(algorithmPath),
    "algos.workspaceAlgorithmDirectoryRunning"
  );

  provider.setSmokeProcessRunning(algorithmPath, false);
  assert.strictEqual(
    provider.getAlgorithmDirectoryContextValue(algorithmPath),
    "algos.workspaceAlgorithmDirectoryResults"
  );

  assert.strictEqual(provider.clearSmokeResultsForAlgorithm(algorithmPath), true);
  assert.strictEqual(provider.clearSmokeResultsForAlgorithm(algorithmPath), false);
  assert.strictEqual(provider.hasSmokeResultsForAlgorithm(algorithmPath), false);
  assert.strictEqual(
    provider.getAlgorithmDirectoryContextValue(algorithmPath),
    "algos.workspaceAlgorithmDirectory"
  );
}

/**
 * Verifies language summary rows use shared display labels from metadata.
 *
 * @returns {void}
 */
function testLanguageSummaryNodeUsesSubsystemDisplayLabel() {
  const expectedLabel = getLanguageDisplayLabel("cpp");
  const suggestedUntitledUri = { fsPath: "/tmp/suggested/algorithm.cpp" };
  const node = createLanguageSummaryTreeNode(
    "cpp",
    0,
    "/tmp/algorithm",
    null,
    false,
    false,
    false,
    suggestedUntitledUri
  );

  assert.strictEqual(node.label, expectedLabel);
  assert.ok(String(node.tooltip).startsWith(`${expectedLabel}:`));
}

/**
 * Runs all algorithms run-view smoke lifecycle regression tests.
 *
 * @returns {void}
 */
function runTests() {
  testStopTransitionRetainsExistingSmokeResults();
  testFailureTransitionAffectsOnlyActiveEntries();
  testLockedFailedStatusIsNotOverwritten();
  testSmokeContextAndClearResultsTransitions();
  testLanguageSummaryNodeUsesSubsystemDisplayLabel();
}

module.exports = {
  runTests,
};
