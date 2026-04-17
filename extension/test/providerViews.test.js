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
 * Runs all provider-level lifecycle/message-routing tests.
 *
 * @returns {void}
 */
function runTests() {
  testRunControlsProviderMessageRoutingAndPosting();
  testSmokeControlsProviderMessageRoutingAndPosting();
  testEnvironmentProviderMessageRoutingAndPosting();
}

module.exports = {
  runTests,
};
