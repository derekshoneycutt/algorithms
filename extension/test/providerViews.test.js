const assert = require("assert");
const path = require("path");
const Module = require("module");
const {
  getSidebarRunArgsState,
  getSidebarSmokeControlsState,
  setSidebarRunArgsEnabled,
  setSidebarRunArgsText,
  setSidebarSmokeMarkdownEnabled,
  setSidebarSmokeMarkdownPath,
} = require("../src/runtime/sidebarRunArgsState");
const {
  actionCreators,
  extensionStateStore,
  selectEnvironmentBatchRoutingResult,
  selectEnvironmentCheckEnvResult,
  selectEnvironmentCopyIconsResult,
  selectEnvironmentDraftValues,
  selectEnvironmentRoutingStatus,
  selectEnvironmentVariableStatus,
} = require("../src/runtime/extensionStateStore");

/**
 * Builds a minimal URI-like object used by mocked VS Code APIs.
 *
 * @param {string} fileSystemPath File system path.
 * @returns {{fsPath: string, path: string, toString: () => string}} URI-like object.
 */
function createMockUri(fileSystemPath) {
  const normalizedPath = path.resolve(String(fileSystemPath || "."));

  return {
    fsPath: normalizedPath,
    path: normalizedPath,
    toString() {
      return normalizedPath;
    },
  };
}

/**
 * Creates a minimal mocked vscode module for provider tests.
 *
 * @returns {{Uri: {joinPath: (base: {fsPath?: string, path?: string}|string, ...segments: string[]) => {fsPath: string, path: string, toString: () => string}}, workspace: {workspaceFolders: []}, window: {registerWebviewViewProvider: () => {dispose: () => void}}}} Mock vscode module.
 */
function createMockVscodeModule() {
  return {
    Uri: {
      joinPath(base, ...segments) {
        const basePath = typeof base === "string"
          ? base
          : String(base?.fsPath || base?.path || "");
        return createMockUri(path.join(basePath, ...segments));
      },
    },
    workspace: {
      workspaceFolders: [],
    },
    window: {
      registerWebviewViewProvider() {
        return {
          dispose() {
            // No-op in tests.
          },
        };
      },
    },
  };
}

/**
 * Loads provider classes while temporarily mocking the vscode module.
 *
 * @returns {{SidebarRunControlsViewProvider: Function, SidebarSmokeControlsViewProvider: Function, EnvironmentInitViewProvider: Function}} Provider classes.
 */
function loadProviderClassesWithVscodeMock() {
  const originalModuleLoad = Module._load;
  const mockedVscodeModule = createMockVscodeModule();

  Module._load = function patchedModuleLoad(request, parent, isMain) {
    if (request === "vscode") {
      return mockedVscodeModule;
    }

    return originalModuleLoad.call(this, request, parent, isMain);
  };

  try {
    const {
      _internal: {
        SidebarRunControlsViewProvider,
      },
    } = require("../src/ui/runControlsView");
    const {
      _internal: {
        SidebarSmokeControlsViewProvider,
      },
    } = require("../src/ui/smokeControlsView");
    const {
      _internal: {
        EnvironmentInitViewProvider,
      },
    } = require("../src/ui/environmentInitView");

    return {
      SidebarRunControlsViewProvider,
      SidebarSmokeControlsViewProvider,
      EnvironmentInitViewProvider,
    };
  } finally {
    Module._load = originalModuleLoad;
  }
}

const {
  SidebarRunControlsViewProvider,
  SidebarSmokeControlsViewProvider,
  EnvironmentInitViewProvider,
} = loadProviderClassesWithVscodeMock();

/**
 * Creates one active lifecycle stub and message recorder.
 *
 * @returns {{lifecycle: {getActiveWebviewView: () => {webview: {postMessage: (payload: unknown) => Promise<boolean>, asWebviewUri: (uri: {toString: () => string}) => {toString: () => string}, cspSource: string}}}, postedPayloads: unknown[]}} Lifecycle stub and payload recorder.
 */
function createActiveLifecycleStub() {
  const postedPayloads = [];

  return {
    lifecycle: {
      getActiveWebviewView() {
        return {
          webview: {
            postMessage(payload) {
              postedPayloads.push(payload);
              return Promise.resolve(true);
            },
            asWebviewUri(uri) {
              return {
                toString() {
                  return String(uri.toString());
                },
              };
            },
            cspSource: "vscode-resource:",
          },
        };
      },
    },
    postedPayloads,
  };
}

/**
 * Resets environment status slice for isolated provider tests.
 *
 * @returns {void}
 */
function resetEnvironmentStoreState() {
  extensionStateStore.dispatch(actionCreators.resetEnvironmentStatus());
}

/**
 * Returns the latest posted environment state payload.
 *
 * @param {unknown[]} postedPayloads Recorded posted payloads.
 * @returns {{type: string, state: object}} Latest environment payload.
 */
function getLatestEnvironmentPayload(postedPayloads) {
  const latestPayload = postedPayloads[postedPayloads.length - 1];

  assert.ok(latestPayload);
  assert.strictEqual(latestPayload.type, "environmentState");

  return latestPayload;
}

/**
 * Verifies run-controls provider routes messages and posts run state updates.
 *
 * @returns {void}
 */
function testRunControlsProviderMessageRoutingAndPosting() {
  setSidebarRunArgsEnabled(false);
  setSidebarRunArgsText("");

  const provider = new SidebarRunControlsViewProvider(createMockUri("/tmp/ext"));
  const { lifecycle, postedPayloads } = createActiveLifecycleStub();

  provider._lifecycle = lifecycle;
  provider.handleMessage({
    type: "setEnabled",
    enabled: true,
  });

  assert.strictEqual(getSidebarRunArgsState().enabled, true);
  assert.strictEqual(postedPayloads.length, 1);
  assert.strictEqual(postedPayloads[0].type, "runArgsState");

  provider.handleMessage({
    type: "unknownMessageType",
  });

  assert.strictEqual(postedPayloads.length, 1);
}

/**
 * Verifies smoke-controls provider routes messages and posts smoke state updates.
 *
 * @returns {void}
 */
function testSmokeControlsProviderMessageRoutingAndPosting() {
  setSidebarSmokeMarkdownEnabled(false);
  setSidebarSmokeMarkdownPath("");

  const provider = new SidebarSmokeControlsViewProvider(createMockUri("/tmp/ext"));
  const { lifecycle, postedPayloads } = createActiveLifecycleStub();

  provider._lifecycle = lifecycle;
  provider.handleMessage({
    type: "setSmokeMarkdownEnabled",
    enabled: true,
  });

  assert.strictEqual(getSidebarSmokeControlsState().markdownEnabled, true);
  assert.strictEqual(postedPayloads.length, 1);
  assert.strictEqual(postedPayloads[0].type, "smokeControlsState");

  provider.handleMessage({
    type: "unknownMessageType",
  });

  assert.strictEqual(postedPayloads.length, 1);
}

/**
 * Verifies environment provider routes refresh messages and posts environment state.
 *
 * @returns {void}
 */
function testEnvironmentProviderMessageRoutingAndPosting() {
  resetEnvironmentStoreState();

  const provider = new EnvironmentInitViewProvider(createMockUri("/tmp/ext"));
  const { lifecycle, postedPayloads } = createActiveLifecycleStub();

  provider._lifecycle = lifecycle;
  provider.handleMessage({
    type: "refreshState",
  });

  assert.strictEqual(postedPayloads.length, 1);
  assert.strictEqual(postedPayloads[0].type, "environmentState");

  provider.handleMessage({
    type: "unknownMessageType",
  });

  assert.strictEqual(postedPayloads.length, 1);
}

/**
 * Verifies environment provider applies draft fields from incoming messages.
 *
 * @returns {void}
 */
function testEnvironmentProviderDraftFieldUpdates() {
  resetEnvironmentStoreState();

  const provider = new EnvironmentInitViewProvider(createMockUri("/tmp/ext"));

  provider.handleMessage({
    profilePath: "~/.zshrc",
    copyIconsPath: "/tmp/icons",
    dockerEnabled: true,
    dockerValue: "docker-route",
    sshEnabled: true,
    sshValue: "ssh-route",
  });

  const draftValues = selectEnvironmentDraftValues();

  assert.strictEqual(draftValues.profilePath, "~/.zshrc");
  assert.strictEqual(draftValues.copyIconsPath, "/tmp/icons");
  assert.strictEqual(draftValues.batchDockerEnabled, true);
  assert.strictEqual(draftValues.batchDockerValue, "docker-route");
  assert.strictEqual(draftValues.batchSshEnabled, true);
  assert.strictEqual(draftValues.batchSshValue, "ssh-route");
}

/**
 * Verifies environment handlers update store-backed status and post state updates.
 *
 * @returns {void}
 */
function testEnvironmentProviderStoreBackedStatusUpdates() {
  resetEnvironmentStoreState();

  const provider = new EnvironmentInitViewProvider(createMockUri("/tmp/ext"));
  const { lifecycle, postedPayloads } = createActiveLifecycleStub();

  provider._lifecycle = lifecycle;

  provider.handleMessage({
    type: "runCheckEnv",
  });

  assert.strictEqual(selectEnvironmentCheckEnvResult().kind, "error");
  const checkEnvPayload = getLatestEnvironmentPayload(postedPayloads);
  assert.strictEqual(checkEnvPayload.state.checkEnv.kind, "error");
  assert.strictEqual(
    checkEnvPayload.state.checkEnv.text,
    "Unable to resolve repository root or init.sh."
  );

  provider.handleMessage({
    type: "runCopyIcons",
  });

  assert.strictEqual(selectEnvironmentCopyIconsResult().kind, "error");
  const copyIconsPayload = getLatestEnvironmentPayload(postedPayloads);
  assert.strictEqual(copyIconsPayload.state.copyIconsResult.kind, "error");
  assert.strictEqual(
    copyIconsPayload.state.copyIconsResult.text,
    "Unable to resolve repository root or init.sh."
  );

  provider.handleMessage({
    type: "saveVariable",
    variableKey: "timeout",
    value: "15",
  });

  assert.strictEqual(selectEnvironmentVariableStatus("timeout").kind, "error");
  const saveVariablePayload = getLatestEnvironmentPayload(postedPayloads);
  const timeoutVariable = saveVariablePayload.state.variables.find(
    (variableEntry) => variableEntry.key === "timeout"
  );
  assert.ok(timeoutVariable);
  assert.strictEqual(timeoutVariable.statusKind, "error");
  assert.strictEqual(
    timeoutVariable.statusText,
    "Unable to resolve init.sh variable save context."
  );

  provider.handleMessage({
    type: "saveLanguageRouting",
    languageKey: "python",
    dockerEnabled: true,
    dockerValue: "docker-host",
    sshEnabled: false,
    sshValue: "",
  });

  assert.strictEqual(selectEnvironmentRoutingStatus("python").kind, "error");
  const saveRoutingPayload = getLatestEnvironmentPayload(postedPayloads);
  const pythonLanguage = saveRoutingPayload.state.languages.find(
    (languageEntry) => languageEntry.key === "python"
  );

  if (pythonLanguage) {
    assert.strictEqual(pythonLanguage.statusKind, "error");
    assert.strictEqual(
      pythonLanguage.statusText,
      "Unable to resolve routing save context."
    );
  }

  provider.handleMessage({
    type: "saveBatchRouting",
  });

  assert.strictEqual(selectEnvironmentBatchRoutingResult().kind, "error");
  const saveBatchPayload = getLatestEnvironmentPayload(postedPayloads);
  assert.strictEqual(saveBatchPayload.state.batch.statusKind, "error");
  assert.strictEqual(
    saveBatchPayload.state.batch.statusText,
    "Unable to resolve batch routing save context."
  );
}

/**
 * Runs all provider-level lifecycle/message-routing tests.
 *
 * @returns {void}
 */
function runTests() {
  testRunControlsProviderMessageRoutingAndPosting();
  testSmokeControlsProviderMessageRoutingAndPosting();
  testEnvironmentProviderMessageRoutingAndPosting();
  testEnvironmentProviderDraftFieldUpdates();
  testEnvironmentProviderStoreBackedStatusUpdates();
}

module.exports = {
  runTests,
};
