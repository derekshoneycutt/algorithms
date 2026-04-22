"use strict";

const vscodeApi = acquireVsCodeApi();
const smokeControlsCommsClientUtils = window.AlgosWebviewClientUtils;

/**
 * Posts a setSmokeMarkdownEnabled message to the extension host.
 *
 * @param {boolean} enabled Whether smoke markdown is enabled.
 * @returns {void}
 */
function sendSetSmokeMarkdownEnabled(enabled) {
  vscodeApi.postMessage({
    type: "setSmokeMarkdownEnabled",
    enabled,
  });
}

/**
 * Posts a setSmokeMarkdownPath message to the extension host.
 *
 * @param {string} text Current smoke markdown path value.
 * @returns {void}
 */
function sendSetSmokeMarkdownPath(text) {
  vscodeApi.postMessage({
    type: "setSmokeMarkdownPath",
    text,
  });
}

/**
 * Posts a setSmokeTimeout message to the extension host.
 *
 * @param {string} text Current smoke timeout value.
 * @returns {void}
 */
function sendSetSmokeTimeout(text) {
  vscodeApi.postMessage({
    type: "setSmokeTimeout",
    text,
  });
}

/**
 * Posts a setSmokeSlowTimeout message to the extension host.
 *
 * @param {string} text Current smoke slow timeout value.
 * @returns {void}
 */
function sendSetSmokeSlowTimeout(text) {
  vscodeApi.postMessage({
    type: "setSmokeSlowTimeout",
    text,
  });
}

/**
 * Posts a setSmokeLanguageEnabled message to the extension host.
 *
 * @param {string} languageKey Key of the language to toggle.
 * @param {boolean} enabled Whether the language is enabled.
 * @returns {void}
 */
function sendSetSmokeLanguageEnabled(languageKey, enabled) {
  vscodeApi.postMessage({
    type: "setSmokeLanguageEnabled",
    languageKey,
    enabled,
  });
}

/**
 * Posts a setSmokeAllLanguagesEnabled message to the extension host.
 *
 * @param {boolean} enabled Whether all languages should be enabled.
 * @returns {void}
 */
function sendSetSmokeAllLanguagesEnabled(enabled) {
  vscodeApi.postMessage({
    type: "setSmokeAllLanguagesEnabled",
    enabled,
  });
}

smokeControlsCommsClientUtils.wireStateMessages({
  messageType: "smokeControlsState",
  applyState: (state) => {
    if (typeof window.AlgosSmokeControlsUi?.applyState === "function") {
      window.AlgosSmokeControlsUi.applyState(state);
    }
  },
});

window.AlgosSmokeControlsComms = {
  sendSetSmokeMarkdownEnabled,
  sendSetSmokeMarkdownPath,
  sendSetSmokeTimeout,
  sendSetSmokeSlowTimeout,
  sendSetSmokeLanguageEnabled,
  sendSetSmokeAllLanguagesEnabled,
};
