"use strict";

const vscodeApi = acquireVsCodeApi();
const runControlsCommsClientUtils = window.AlgosWebviewClientUtils;

/**
 * Posts a setEnabled message to the extension host.
 *
 * @param {boolean} enabled Whether run args are enabled.
 * @returns {void}
 */
function sendSetEnabled(enabled) {
  vscodeApi.postMessage({
    type: "setEnabled",
    enabled,
  });
}

/**
 * Posts a setText message to the extension host.
 *
 * @param {string} text Current run args text value.
 * @returns {void}
 */
function sendSetText(text) {
  vscodeApi.postMessage({
    type: "setText",
    text,
  });
}

/**
 * Posts a setSourceProfileEnabled message to the extension host.
 *
 * @param {boolean} enabled Whether source profile is enabled.
 * @returns {void}
 */
function sendSetSourceProfileEnabled(enabled) {
  vscodeApi.postMessage({
    type: "setSourceProfileEnabled",
    enabled,
  });
}

/**
 * Posts a setSourceProfileText message to the extension host.
 *
 * @param {string} text Current source profile text value.
 * @returns {void}
 */
function sendSetSourceProfileText(text) {
  vscodeApi.postMessage({
    type: "setSourceProfileText",
    text,
  });
}

/**
 * Posts a setRunChecksMode message to the extension host.
 *
 * @param {"none"|"check-only"|"compile-only"} mode Selected run checks mode.
 * @returns {void}
 */
function sendSetRunChecksMode(mode) {
  vscodeApi.postMessage({
    type: "setRunChecksMode",
    mode,
  });
}

/**
 * Posts a setRunChecksRoute message to the extension host.
 *
 * @param {string} route Selected run checks route value.
 * @returns {void}
 */
function sendSetRunChecksRoute(route) {
  vscodeApi.postMessage({
    type: "setRunChecksRoute",
    route,
  });
}

/**
 * Posts a setCleanStdlibEnabled message to the extension host.
 *
 * @param {boolean} enabled Whether clean stdlib is enabled.
 * @returns {void}
 */
function sendSetCleanStdlibEnabled(enabled) {
  vscodeApi.postMessage({
    type: "setCleanStdlibEnabled",
    enabled,
  });
}

/**
 * Posts a setCleanArchivesEnabled message to the extension host.
 *
 * @param {boolean} enabled Whether clean archives is enabled.
 * @returns {void}
 */
function sendSetCleanArchivesEnabled(enabled) {
  vscodeApi.postMessage({
    type: "setCleanArchivesEnabled",
    enabled,
  });
}

runControlsCommsClientUtils.wireStateMessages({
  messageType: "runArgsState",
  applyState: (state) => {
    if (typeof window.AlgosRunControlsUi?.applyState === "function") {
      window.AlgosRunControlsUi.applyState(state);
    }
  },
});

window.AlgosRunControlsComms = {
  sendSetEnabled,
  sendSetText,
  sendSetSourceProfileEnabled,
  sendSetSourceProfileText,
  sendSetRunChecksMode,
  sendSetRunChecksRoute,
  sendSetCleanStdlibEnabled,
  sendSetCleanArchivesEnabled,
};
