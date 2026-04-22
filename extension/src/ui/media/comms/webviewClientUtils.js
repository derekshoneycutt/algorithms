(function initializeWebviewClientUtils(globalObject) {
  "use strict";

  /**
   * Returns a normalized panel label for user-facing diagnostics.
   *
   * @param {string} panelName Human-readable panel name.
   * @returns {string} Normalized panel label.
   */
  function getPanelLabel(panelName) {
    const normalizedPanelName = String(panelName || "").trim();

    if (!normalizedPanelName) {
      return "Webview";
    }

    return normalizedPanelName;
  }

  /**
   * Returns required nodes keyed by id or throws with actionable diagnostics.
   *
   * @param {string[]} requiredNodeIds Required DOM node ids.
   * @param {string} panelName Human-readable panel name.
   * @param {Document} [documentObject] Document object override for testing.
   * @returns {Record<string, HTMLElement>} Required nodes.
   */
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
        `${getPanelLabel(panelName)} webview missing required nodes: ${missingNodeIds.join(", ")}`
      );
    }

    return nodesById;
  }

  /**
   * Replaces the document body with a clear startup failure message.
   *
   * @param {string} panelName Human-readable panel name.
   * @param {string} message Startup failure details.
   * @param {Document} [documentObject] Document object override for testing.
   * @returns {void}
   */
  function showStartupFailure(panelName, message, documentObject) {
    const resolvedDocument = documentObject || globalObject.document;
    const panelLabel = getPanelLabel(panelName);
    const failureMessage = String(
      message || `${panelLabel} failed to initialize.`
    );

    resolvedDocument.body.innerHTML =
      '<div style="margin:0;padding:10px;font-family:var(--vscode-font-family);font-size:12px;color:var(--vscode-errorForeground);background:var(--vscode-sideBar-background);white-space:pre-wrap;border:1px solid var(--vscode-errorForeground);border-radius:6px;line-height:1.4;">'
      + failureMessage
      + "</div>";
  }

  /**
   * Wires message events for one state message type.
   *
   * @param {{messageType: string, applyState: (state: unknown) => void, windowObject?: Window}} options Listener options.
   * @returns {void}
   */
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
})(window);
