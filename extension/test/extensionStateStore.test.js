const assert = require("assert");
const {
  SMOKE_LANGUAGE_RUNNABLE_BY_KEY,
  actionCreators,
  extensionStateStore,
  selectCachedPreflightState,
  selectSidebarCleanOptionsState,
  selectSidebarFilterMode,
  selectFilesystemCacheTtlMs,
  selectFilesystemDirectoryCacheEntry,
  selectFilesystemStatCacheEntry,
  selectFilesystemPendingOperation,
  selectFilesystemOperationError,
  selectEnvironmentCheckEnvResult,
  selectEnvironmentCopyIconsResult,
  selectEnvironmentBatchRoutingResult,
  selectEnvironmentVariableStatus,
  selectEnvironmentRoutingStatus,
  selectSidebarRunArgsState,
  selectSidebarRunChecksState,
  selectSidebarSmokeControlsState,
  selectSidebarSourceProfileState,
  selectSidebarViewMode,
  selectHasSmokeResultsForAlgorithm,
  selectIsSmokeProcessRunningForAlgorithm,
  selectSmokeRunTokenForAlgorithm,
  selectStoppedSmokeRunTokenForAlgorithm,
  selectSmokeLanguageState,
  selectSmokeStateForAlgorithm,
} = require("../src/runtime/extensionStateStore");

/**
 * Restores central extension store slices to a stable baseline for tests.
 *
 * @returns {void}
 */
function resetExtensionStoreState() {
  const resetAlgorithmPath = "/tmp/store-smoke";

  extensionStateStore.dispatch(actionCreators.setSidebarRunArgsEnabled(false));
  extensionStateStore.dispatch(actionCreators.setSidebarRunArgsText(""));
  extensionStateStore.dispatch(actionCreators.setSidebarSourceProfileEnabled(false));
  extensionStateStore.dispatch(actionCreators.setSidebarSourceProfileText(""));
  extensionStateStore.dispatch(actionCreators.setSidebarRunChecksMode("none"));
  extensionStateStore.dispatch(actionCreators.setSidebarRunChecksRoute("native"));
  extensionStateStore.dispatch(actionCreators.setSidebarCleanStdlibEnabled(true));
  extensionStateStore.dispatch(actionCreators.setSidebarCleanArchivesEnabled(true));
  extensionStateStore.dispatch(actionCreators.setSidebarSmokeMarkdownEnabled(false));
  extensionStateStore.dispatch(actionCreators.setSidebarSmokeMarkdownPath(""));
  extensionStateStore.dispatch(actionCreators.setSidebarSmokeTimeout("8m"));
  extensionStateStore.dispatch(actionCreators.setSidebarSmokeSlowTimeout("20m"));
  extensionStateStore.dispatch(actionCreators.setSidebarSmokeAllLanguagesEnabled(true));
  extensionStateStore.dispatch(actionCreators.setSidebarViewMode("files"));
  extensionStateStore.dispatch(actionCreators.setSidebarFilterMode("all"));
  extensionStateStore.dispatch(actionCreators.setFilesystemCacheTtlMs(2000));
  extensionStateStore.dispatch(actionCreators.clearFilesystemCache());
  extensionStateStore.dispatch(actionCreators.clearFilesystemPendingOperations());
  extensionStateStore.dispatch(actionCreators.clearFilesystemOperationErrors());
  extensionStateStore.dispatch(actionCreators.resetEnvironmentStatus());
  extensionStateStore.dispatch(actionCreators.resetEnvironmentDraftValues());
  extensionStateStore.dispatch(actionCreators.setCachedPreflightState(null));
  extensionStateStore.dispatch(actionCreators.setSmokeRunToken(resetAlgorithmPath, 0));
  extensionStateStore.dispatch(
    actionCreators.setStoppedSmokeRunToken(resetAlgorithmPath, null)
  );
  extensionStateStore.dispatch(
    actionCreators.setSmokeProcessError(resetAlgorithmPath, "")
  );
  extensionStateStore.dispatch(
    actionCreators.setSmokeProcessExit(resetAlgorithmPath, null, null)
  );
}

/**
 * Verifies run-controls selector output reflects dispatched updates.
 *
 * @returns {void}
 */
function testRunControlsSelectorsReflectDispatchedState() {
  resetExtensionStoreState();

  extensionStateStore.dispatch(actionCreators.setSidebarRunArgsEnabled(true));
  extensionStateStore.dispatch(actionCreators.setSidebarRunArgsText("--flag alpha"));
  extensionStateStore.dispatch(actionCreators.setSidebarSourceProfileEnabled(true));
  extensionStateStore.dispatch(actionCreators.setSidebarSourceProfileText("profile.sh"));
  extensionStateStore.dispatch(actionCreators.setSidebarRunChecksMode("check-only"));
  extensionStateStore.dispatch(actionCreators.setSidebarRunChecksRoute("docker"));
  extensionStateStore.dispatch(actionCreators.setSidebarCleanStdlibEnabled(false));
  extensionStateStore.dispatch(actionCreators.setSidebarCleanArchivesEnabled(true));

  assert.deepStrictEqual(selectSidebarRunArgsState(), {
    enabled: true,
    text: "--flag alpha",
  });

  assert.deepStrictEqual(selectSidebarSourceProfileState(), {
    enabled: true,
    text: "profile.sh",
  });

  assert.deepStrictEqual(selectSidebarRunChecksState(), {
    mode: "check-only",
    route: "docker",
  });

  assert.deepStrictEqual(selectSidebarCleanOptionsState(), {
    cleanStdlib: false,
    cleanArchives: true,
  });
}

/**
 * Verifies invalid run-check updates normalize to safe defaults.
 *
 * @returns {void}
 */
function testRunChecksInvalidValuesFallbackToDefaults() {
  resetExtensionStoreState();

  extensionStateStore.dispatch(actionCreators.setSidebarRunChecksMode("bogus-mode"));
  extensionStateStore.dispatch(actionCreators.setSidebarRunChecksRoute("bogus-route"));

  assert.deepStrictEqual(selectSidebarRunChecksState(), {
    mode: "none",
    route: "native",
  });
}

/**
 * Verifies smoke-controls selector output reflects dispatched updates.
 *
 * @returns {void}
 */
function testSmokeControlsSelectorsReflectDispatchedState() {
  resetExtensionStoreState();

  extensionStateStore.dispatch(actionCreators.setSidebarSmokeMarkdownEnabled(true));
  extensionStateStore.dispatch(actionCreators.setSidebarSmokeMarkdownPath("smoke-report.md"));
  extensionStateStore.dispatch(actionCreators.setSidebarSmokeTimeout("5m"));
  extensionStateStore.dispatch(actionCreators.setSidebarSmokeSlowTimeout("30m"));

  const smokeControlsState = selectSidebarSmokeControlsState();

  assert.strictEqual(smokeControlsState.markdownEnabled, true);
  assert.strictEqual(smokeControlsState.markdownPath, "smoke-report.md");
  assert.strictEqual(smokeControlsState.timeout, "5m");
  assert.strictEqual(smokeControlsState.slowTimeout, "30m");
  assert.ok(smokeControlsState.languageEnabledByKey instanceof Map);
}

/**
 * Verifies language selection respects host capability gating.
 *
 * @returns {void}
 */
function testSmokeLanguageCapabilityGating() {
  resetExtensionStoreState();

  const nonRunnableEntry = Array.from(SMOKE_LANGUAGE_RUNNABLE_BY_KEY.entries()).find(
    (entry) => entry[1] === false
  );

  if (!nonRunnableEntry) {
    return;
  }

  const languageKey = nonRunnableEntry[0];

  extensionStateStore.dispatch(
    actionCreators.setSidebarSmokeLanguageEnabled(languageKey, true)
  );

  const smokeControlsState = selectSidebarSmokeControlsState();
  assert.strictEqual(smokeControlsState.languageEnabledByKey.get(languageKey), false);
}

/**
 * Verifies subscribers are notified on state changes and removable.
 *
 * @returns {void}
 */
function testStoreSubscriptionLifecycle() {
  resetExtensionStoreState();

  let callCount = 0;
  const unsubscribe = extensionStateStore.subscribe(() => {
    callCount += 1;
  });

  extensionStateStore.dispatch(actionCreators.setSidebarRunArgsEnabled(true));
  assert.strictEqual(callCount, 1);

  unsubscribe();
  extensionStateStore.dispatch(actionCreators.setSidebarRunArgsEnabled(false));
  assert.strictEqual(callCount, 1);
}

/**
 * Verifies sidebar UI mode/filter selectors reflect normalized state transitions.
 *
 * @returns {void}
 */
function testSidebarUiModeTransitions() {
  resetExtensionStoreState();

  extensionStateStore.dispatch(actionCreators.setSidebarViewMode("language"));
  extensionStateStore.dispatch(actionCreators.setSidebarFilterMode("problems"));

  assert.strictEqual(selectSidebarViewMode(), "language");
  assert.strictEqual(selectSidebarFilterMode(), "problems");

  extensionStateStore.dispatch(actionCreators.setSidebarViewMode("invalid-mode"));
  extensionStateStore.dispatch(actionCreators.setSidebarFilterMode("invalid-filter"));

  assert.strictEqual(selectSidebarViewMode(), "files");
  assert.strictEqual(selectSidebarFilterMode(), "all");
}

/**
 * Verifies smoke runtime selectors reflect reducer transitions.
 *
 * @returns {void}
 */
function testSmokeRuntimeTransitions() {
  resetExtensionStoreState();

  const algorithmPath = "/tmp/store-smoke";
  const smokeState = new Map([
    ["queuedLang", { status: "queued", locked: false }],
    ["runningLang", { status: "running", locked: false }],
    ["failedLang", { status: "failed", locked: true }],
  ]);

  extensionStateStore.dispatch(
    actionCreators.replaceSmokeStateForAlgorithm(algorithmPath, smokeState)
  );

  assert.strictEqual(selectHasSmokeResultsForAlgorithm(algorithmPath), true);
  assert.deepStrictEqual(selectSmokeLanguageState(algorithmPath, "queuedLang"), {
    status: "queued",
    locked: false,
  });

  extensionStateStore.dispatch(
    actionCreators.setSmokeLanguageStatus(algorithmPath, "queuedLang", "passed")
  );

  assert.deepStrictEqual(selectSmokeLanguageState(algorithmPath, "queuedLang"), {
    status: "passed",
    locked: false,
  });

  extensionStateStore.dispatch(
    actionCreators.applyRemainingSmokeStatus(algorithmPath, "stopped")
  );

  assert.deepStrictEqual(selectSmokeLanguageState(algorithmPath, "runningLang"), {
    status: "stopped",
    locked: false,
  });

  assert.deepStrictEqual(selectSmokeLanguageState(algorithmPath, "failedLang"), {
    status: "failed",
    locked: true,
  });

  extensionStateStore.dispatch(
    actionCreators.setSmokeProcessRunning(algorithmPath, true)
  );

  assert.strictEqual(selectIsSmokeProcessRunningForAlgorithm(algorithmPath), true);

  extensionStateStore.dispatch(
    actionCreators.setSmokeProcessRunning(algorithmPath, false)
  );

  assert.strictEqual(selectIsSmokeProcessRunningForAlgorithm(algorithmPath), false);

  const snapshot = selectSmokeStateForAlgorithm(algorithmPath);
  assert.ok(snapshot instanceof Map);

  extensionStateStore.dispatch(
    actionCreators.clearSmokeResultsForAlgorithm(algorithmPath)
  );

  assert.strictEqual(selectHasSmokeResultsForAlgorithm(algorithmPath), false);
}

/**
 * Verifies smoke lifecycle token metadata updates round-trip through selectors.
 *
 * @returns {void}
 */
function testSmokeRuntimeLifecycleMetadataTransitions() {
  resetExtensionStoreState();

  const algorithmPath = "/tmp/store-smoke";

  extensionStateStore.dispatch(actionCreators.setSmokeRunToken(algorithmPath, 4));
  extensionStateStore.dispatch(
    actionCreators.setStoppedSmokeRunToken(algorithmPath, 4)
  );

  assert.strictEqual(selectSmokeRunTokenForAlgorithm(algorithmPath), 4);
  assert.strictEqual(selectStoppedSmokeRunTokenForAlgorithm(algorithmPath), 4);

  extensionStateStore.dispatch(
    actionCreators.setStoppedSmokeRunToken(algorithmPath, null)
  );

  assert.strictEqual(selectStoppedSmokeRunTokenForAlgorithm(algorithmPath), null);
}

/**
 * Verifies cached preflight snapshot can be stored and retrieved.
 *
 * @returns {void}
 */
function testPreflightCacheTransitions() {
  resetExtensionStoreState();

  const preflightState = {
    status: "eligible",
    reason: null,
    selected: {
      resolvedRoot: "/tmp/repo",
      scriptPath: "/tmp/repo/run.sh",
    },
  };

  extensionStateStore.dispatch(
    actionCreators.setCachedPreflightState(preflightState)
  );

  assert.deepStrictEqual(selectCachedPreflightState(), preflightState);

  extensionStateStore.dispatch(actionCreators.setCachedPreflightState(null));
  assert.strictEqual(selectCachedPreflightState(), null);
}

/**
 * Verifies filesystem cache transitions and selectors round-trip metadata.
 *
 * @returns {void}
 */
function testFilesystemCacheTransitions() {
  resetExtensionStoreState();

  const directoryPath = "/tmp/cache-dir";
  const statPath = "/tmp/cache-file";

  extensionStateStore.dispatch(actionCreators.setFilesystemCacheTtlMs(2500));
  extensionStateStore.dispatch(
    actionCreators.setFilesystemDirectoryCacheEntry(directoryPath, 8, 1234)
  );
  extensionStateStore.dispatch(
    actionCreators.setFilesystemStatCacheEntry(statPath, true, "file", 5678)
  );

  assert.strictEqual(selectFilesystemCacheTtlMs(), 2500);
  assert.deepStrictEqual(selectFilesystemDirectoryCacheEntry(directoryPath), {
    entryCount: 8,
    updatedAt: 1234,
  });
  assert.deepStrictEqual(selectFilesystemStatCacheEntry(statPath), {
    exists: true,
    kind: "file",
    updatedAt: 5678,
  });

  extensionStateStore.dispatch(actionCreators.clearFilesystemCache(directoryPath));
  assert.strictEqual(selectFilesystemDirectoryCacheEntry(directoryPath), null);
  assert.ok(selectFilesystemStatCacheEntry(statPath));

  extensionStateStore.dispatch(actionCreators.clearFilesystemCache());
  assert.strictEqual(selectFilesystemStatCacheEntry(statPath), null);
}

/**
 * Verifies filesystem pending-operation and error transitions.
 *
 * @returns {void}
 */
function testFilesystemOperationTransitions() {
  resetExtensionStoreState();

  const operationId = "op-1";
  const targetPath = "/tmp/pending-target";

  extensionStateStore.dispatch(
    actionCreators.setFilesystemPendingOperation(
      operationId,
      "create-file",
      targetPath,
      "pending",
      1111
    )
  );
  extensionStateStore.dispatch(
    actionCreators.setFilesystemOperationError(targetPath, "permission denied")
  );

  assert.deepStrictEqual(selectFilesystemPendingOperation(operationId), {
    type: "create-file",
    targetPath,
    status: "pending",
    updatedAt: 1111,
  });
  assert.strictEqual(selectFilesystemOperationError(targetPath), "permission denied");

  extensionStateStore.dispatch(
    actionCreators.clearFilesystemPendingOperation(operationId)
  );
  assert.strictEqual(selectFilesystemPendingOperation(operationId), null);

  extensionStateStore.dispatch(
    actionCreators.setFilesystemPendingOperation(
      "op-2",
      "delete",
      "/tmp/other",
      "pending",
      2222
    )
  );
  extensionStateStore.dispatch(actionCreators.clearFilesystemPendingOperations());
  assert.strictEqual(selectFilesystemPendingOperation("op-2"), null);

  extensionStateStore.dispatch(actionCreators.clearFilesystemOperationErrors());
  assert.strictEqual(selectFilesystemOperationError(targetPath), null);
}

/**
 * Verifies environment status transitions round-trip through selectors.
 *
 * @returns {void}
 */
function testEnvironmentStatusTransitions() {
  resetExtensionStoreState();

  extensionStateStore.dispatch(
    actionCreators.setEnvironmentCheckEnvResult({
      kind: "ok",
      text: "Environment check succeeded.",
      filteredOutput: "filtered",
      rawOutput: "raw",
    })
  );
  extensionStateStore.dispatch(
    actionCreators.setEnvironmentCopyIconsResult({
      kind: "error",
      text: "copy failed",
    })
  );
  extensionStateStore.dispatch(
    actionCreators.setEnvironmentBatchRoutingResult({
      kind: "running",
      text: "Applying",
    })
  );
  extensionStateStore.dispatch(
    actionCreators.setEnvironmentVariableStatus("timeout", {
      kind: "ok",
      text: "saved",
    })
  );
  extensionStateStore.dispatch(
    actionCreators.setEnvironmentRoutingStatus("python", {
      kind: "ok",
      text: "saved",
    })
  );

  assert.deepStrictEqual(selectEnvironmentCheckEnvResult(), {
    kind: "ok",
    text: "Environment check succeeded.",
    filteredOutput: "filtered",
    rawOutput: "raw",
  });
  assert.deepStrictEqual(selectEnvironmentCopyIconsResult(), {
    kind: "error",
    text: "copy failed",
  });
  assert.deepStrictEqual(selectEnvironmentBatchRoutingResult(), {
    kind: "running",
    text: "Applying",
  });
  assert.deepStrictEqual(selectEnvironmentVariableStatus("timeout"), {
    kind: "ok",
    text: "saved",
  });
  assert.deepStrictEqual(selectEnvironmentRoutingStatus("python"), {
    kind: "ok",
    text: "saved",
  });

  extensionStateStore.dispatch(actionCreators.resetEnvironmentStatus());

  assert.deepStrictEqual(selectEnvironmentCheckEnvResult(), {
    kind: "idle",
    text: "",
    filteredOutput: "",
    rawOutput: "",
  });
  assert.deepStrictEqual(selectEnvironmentCopyIconsResult(), {
    kind: "idle",
    text: "",
  });
  assert.deepStrictEqual(selectEnvironmentBatchRoutingResult(), {
    kind: "idle",
    text: "",
  });
  assert.strictEqual(selectEnvironmentVariableStatus("timeout"), null);
  assert.strictEqual(selectEnvironmentRoutingStatus("python"), null);
}

/**
 * Runs all extension-state-store tests.
 *
 * @returns {void}
 */
function runTests() {
  resetExtensionStoreState();
  testRunControlsSelectorsReflectDispatchedState();
  testRunChecksInvalidValuesFallbackToDefaults();
  testSmokeControlsSelectorsReflectDispatchedState();
  testSmokeLanguageCapabilityGating();
  testStoreSubscriptionLifecycle();
  testSidebarUiModeTransitions();
  testSmokeRuntimeTransitions();
  testSmokeRuntimeLifecycleMetadataTransitions();
  testFilesystemCacheTransitions();
  testFilesystemOperationTransitions();
  testEnvironmentStatusTransitions();
  testPreflightCacheTransitions();
  resetExtensionStoreState();
}

// Public test entrypoint for extension state store tests.
module.exports = {
  runTests,
};
