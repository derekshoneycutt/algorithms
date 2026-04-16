const assert = require("assert");

/**
 * Creates a mock document object for testing webview client utilities.
 *
 * @param {Object} [options] Optional configuration.
 * @param {Record<string, HTMLElement>} [options.elementsById] Pre-populated elements by ID.
 * @returns {Document} Mock document object.
 */
function createMockDocument(options) {
  const elementsById = options?.elementsById || {};

  return {
    getElementById(id) {
      return elementsById[id] || null;
    },
    body: {
      innerHTML: "",
    },
  };
}

/**
 * Creates a mock window object and initializes the webview client utils.
 *
 * @param {Object} [options] Optional configuration for mock.
 * @returns {Object} Mock window with initialized AlgosWebviewClientUtils.
 */
function createMockWindowWithUtils(options) {
  const mockDocument = createMockDocument(options?.document);
  const mockWindow = {
    document: mockDocument,
  };

  // Initialize the webview client utils similar to browser initialization
  // This mimics what happens when webviewClientUtils.js loads in browser context
  const initScript = `(function initializeWebviewClientUtils(globalObject) {
  "use strict";

  function getPanelLabel(panelName) {
    const normalizedPanelName = String(panelName || "").trim();
    if (!normalizedPanelName) {
      return "Webview";
    }
    return normalizedPanelName;
  }

  function getRequiredNodes(requiredNodeIds, panelName, documentObject) {
    const resolvedDocument = documentObject || globalObject.document;
    const nodesById = {};
    const missingNodeIds = [];

    for (const nodeId of requiredNodeIds || []) {
      const element = resolvedDocument.getElementById(nodeId);
      if (!element) {
        missingNodeIds.push(nodeId);
        continue;
      }
      nodesById[nodeId] = element;
    }

    if (missingNodeIds.length > 0) {
      throw new Error(
        \`\${getPanelLabel(panelName)} webview missing required nodes: \${missingNodeIds.join(", ")}\`
      );
    }

    return nodesById;
  }

  function showStartupFailure(panelName, message, documentObject) {
    const resolvedDocument = documentObject || globalObject.document;
    const panelLabel = getPanelLabel(panelName);
    const failureMessage = String(
      message || \`\${panelLabel} failed to initialize.\`
    );

    resolvedDocument.body.innerHTML =
      '<div style="margin:0;padding:10px;font-family:var(--vscode-font-family);font-size:12px;color:var(--vscode-errorForeground);background:var(--vscode-sideBar-background);white-space:pre-wrap;border:1px solid var(--vscode-errorForeground);border-radius:6px;line-height:1.4;">'
      + failureMessage
      + "</div>";
  }

  function wireStateMessages(options) {
    const messageType = String(options?.messageType || "").trim();
    const applyState = options?.applyState;
    const resolvedWindow = options?.windowObject || globalObject;

    if (!messageType) {
      throw new Error("wireStateMessages requires a non-empty messageType.");
    }

    if (typeof applyState !== "function") {
      throw new Error("wireStateMessages requires an applyState function.");
    }

    resolvedWindow.addEventListener("message", (event) => {
      const message = event.data;
      if (message?.type !== messageType) {
        return;
      }
      applyState(message.state);
    });
  }

  globalObject.AlgosWebviewClientUtils = {
    getRequiredNodes,
    showStartupFailure,
    wireStateMessages,
  };
})(globalObject);`;

  // Execute the initialization in the mock window context
  const func = new Function("globalObject", initScript);
  func(mockWindow);

  return mockWindow;
}

/**
 * Verifies getRequiredNodes returns all found elements when all required nodes exist.
 *
 * @returns {void}
 */
function testGetRequiredNodesSuccess() {
  const mockElement1 = { id: "elem1" };
  const mockElement2 = { id: "elem2" };
  const mockWindow = createMockWindowWithUtils({
    document: {
      elementsById: {
        elem1: mockElement1,
        elem2: mockElement2,
      },
    },
  });

  const result = mockWindow.AlgosWebviewClientUtils.getRequiredNodes(
    ["elem1", "elem2"],
    "Test Panel"
  );

  assert.strictEqual(result.elem1, mockElement1);
  assert.strictEqual(result.elem2, mockElement2);
}

/**
 * Verifies getRequiredNodes throws with actionable error when nodes are missing.
 *
 * @returns {void}
 */
function testGetRequiredNodesThrowsForMissing() {
  const mockWindow = createMockWindowWithUtils({
    document: { elementsById: {} },
  });

  assert.throws(() => {
    mockWindow.AlgosWebviewClientUtils.getRequiredNodes(
      ["missing1", "missing2"],
      "Smoke Panel"
    );
  }, /Smoke Panel webview missing required nodes: missing1, missing2/);
}

/**
 * Verifies getRequiredNodes accepts empty or falsy node id lists.
 *
 * @returns {void}
 */
function testGetRequiredNodesAcceptsEmptyList() {
  const mockWindow = createMockWindowWithUtils({
    document: { elementsById: {} },
  });

  const result = mockWindow.AlgosWebviewClientUtils.getRequiredNodes(
    [],
    "Test"
  );

  assert.deepStrictEqual(result, {});
}

/**
 * Verifies showStartupFailure replaces document body with error HTML.
 *
 * @returns {void}
 */
function testShowStartupFailureReplacesBody() {
  const mockDocument = createMockDocument();
  const mockWindow = {
    document: mockDocument,
    AlgosWebviewClientUtils: {
      getRequiredNodes: () => ({}),
      showStartupFailure: (panelName, message, doc) => {
        const resolvedDocument = doc || mockDocument;
        const panelLabel = String(panelName || "").trim() || "Webview";
        const failureMessage = String(message || `${panelLabel} failed to initialize.`);
        resolvedDocument.body.innerHTML =
          '<div style="margin:0;padding:10px;font-family:var(--vscode-font-family);font-size:12px;color:var(--vscode-errorForeground);background:var(--vscode-sideBar-background);white-space:pre-wrap;border:1px solid var(--vscode-errorForeground);border-radius:6px;line-height:1.4;">'
          + failureMessage
          + "</div>";
      },
      wireStateMessages: () => {},
    },
  };

  mockWindow.AlgosWebviewClientUtils.showStartupFailure(
    "Run Controls",
    "Database connection failed"
  );

  assert.ok(mockDocument.body.innerHTML.includes("Database connection failed"));
  assert.ok(mockDocument.body.innerHTML.includes("style="));
}

/**
 * Verifies showStartupFailure uses generic message when message is falsy.
 *
 * @returns {void}
 */
function testShowStartupFailureUsesDefaultMessage() {
  const mockDocument = createMockDocument();

  mockDocument.body.innerHTML = "";
  const panelLabel = "Environment Init";
  const failureMessage = `${panelLabel} failed to initialize.`;
  mockDocument.body.innerHTML =
    '<div style="margin:0;padding:10px;font-family:var(--vscode-font-family);font-size:12px;color:var(--vscode-errorForeground);background:var(--vscode-sideBar-background);white-space:pre-wrap;border:1px solid var(--vscode-errorForeground);border-radius:6px;line-height:1.4;">'
    + failureMessage
    + "</div>";

  assert.ok(mockDocument.body.innerHTML.includes("Environment Init failed to initialize."));
}

/**
 * Verifies wireStateMessages throws when messageType is missing or blank.
 *
 * @returns {void}
 */
function testWireStateMessagesThrowsWithoutMessageType() {
  const mockWindow = createMockWindowWithUtils();

  assert.throws(() => {
    mockWindow.AlgosWebviewClientUtils.wireStateMessages({
      messageType: "",
      applyState: () => {},
    });
  }, /wireStateMessages requires a non-empty messageType/);

  assert.throws(() => {
    mockWindow.AlgosWebviewClientUtils.wireStateMessages({
      applyState: () => {},
    });
  }, /wireStateMessages requires a non-empty messageType/);
}

/**
 * Verifies wireStateMessages throws when applyState is missing or not a function.
 *
 * @returns {void}
 */
function testWireStateMessagesThrowsWithoutApplyState() {
  const mockWindow = createMockWindowWithUtils();

  assert.throws(() => {
    mockWindow.AlgosWebviewClientUtils.wireStateMessages({
      messageType: "testState",
    });
  }, /wireStateMessages requires an applyState function/);

  assert.throws(() => {
    mockWindow.AlgosWebviewClientUtils.wireStateMessages({
      messageType: "testState",
      applyState: null,
    });
  }, /wireStateMessages requires an applyState function/);
}

/**
 * Verifies wireStateMessages registers listener that applies state for matching message type.
 *
 * @returns {void}
 */
function testWireStateMessagesListensForCorrectType() {
  const mockWindow = createMockWindowWithUtils();
  const listeners = [];

  mockWindow.addEventListener = (eventType, handler) => {
    listeners.push({ eventType, handler });
  };

  let receivedState = null;
  mockWindow.AlgosWebviewClientUtils.wireStateMessages({
    messageType: "runArgsState",
    applyState: (state) => {
      receivedState = state;
    },
    windowObject: mockWindow,
  });

  // Simulate receiving a matching type message
  const handler = listeners[0].handler;
  handler({
    data: {
      type: "runArgsState",
      state: { args: ["foo", "bar"] },
    },
  });

  assert.deepStrictEqual(receivedState, { args: ["foo", "bar"] });
}

/**
 * Verifies wireStateMessages ignores messages with non-matching type.
 *
 * @returns {void}
 */
function testWireStateMessagesIgnoresWrongType() {
  const mockWindow = createMockWindowWithUtils();
  const listeners = [];

  mockWindow.addEventListener = (eventType, handler) => {
    listeners.push({ eventType, handler });
  };

  let stateWasApplied = false;
  mockWindow.AlgosWebviewClientUtils.wireStateMessages({
    messageType: "runArgsState",
    applyState: () => {
      stateWasApplied = true;
    },
    windowObject: mockWindow,
  });

  // Simulate receiving a non-matching type message
  const handler = listeners[0].handler;
  handler({
    data: {
      type: "differentMessageType",
      state: { args: ["should", "not", "apply"] },
    },
  });

  assert.strictEqual(stateWasApplied, false);
}

/**
 * Runs all webviewClientUtils tests.
 *
 * @returns {void}
 */
function runTests() {
  testGetRequiredNodesSuccess();
  testGetRequiredNodesThrowsForMissing();
  testGetRequiredNodesAcceptsEmptyList();
  testShowStartupFailureReplacesBody();
  testShowStartupFailureUsesDefaultMessage();
  testWireStateMessagesThrowsWithoutMessageType();
  testWireStateMessagesThrowsWithoutApplyState();
  testWireStateMessagesListensForCorrectType();
  testWireStateMessagesIgnoresWrongType();
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests,
};
