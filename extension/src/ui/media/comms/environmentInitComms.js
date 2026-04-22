"use strict";

const vscodeApi = acquireVsCodeApi();

/**
 * Posts a refreshState message to the extension host.
 *
 * @param {string} profilePath Current profile path input value.
 * @param {string} copyIconsPath Current copy-icons path input value.
 * @returns {void}
 */
function sendRefreshState(profilePath, copyIconsPath) {
  vscodeApi.postMessage({
    type: "refreshState",
    profilePath,
    copyIconsPath,
  });
}

/**
 * Posts a runCheckEnv message to the extension host.
 *
 * @param {string} profilePath Current profile path input value.
 * @param {string} copyIconsPath Current copy-icons path input value.
 * @returns {void}
 */
function sendCheckEnv(profilePath, copyIconsPath) {
  vscodeApi.postMessage({
    type: "runCheckEnv",
    profilePath,
    copyIconsPath,
  });
}

/**
 * Posts a runCopyIcons message to the extension host.
 *
 * @param {string} profilePath Current profile path input value.
 * @param {string} copyIconsPath Current copy-icons path input value.
 * @returns {void}
 */
function sendCopyIcons(profilePath, copyIconsPath) {
  vscodeApi.postMessage({
    type: "runCopyIcons",
    profilePath,
    copyIconsPath,
  });
}

/**
 * Posts a saveVariable message to the extension host.
 *
 * @param {string} profilePath Current profile path input value.
 * @param {string} copyIconsPath Current copy-icons path input value.
 * @param {string} variableKey Key of the variable to save.
 * @param {string} value Current value of the variable.
 * @returns {void}
 */
function sendSaveVariable(profilePath, copyIconsPath, variableKey, value) {
  vscodeApi.postMessage({
    type: "saveVariable",
    profilePath,
    copyIconsPath,
    variableKey,
    value,
  });
}

/**
 * Posts a saveLanguageRouting message to the extension host.
 *
 * @param {string} profilePath Current profile path input value.
 * @param {string} copyIconsPath Current copy-icons path input value.
 * @param {string} languageKey Key of the language to save.
 * @param {boolean} dockerEnabled Whether Docker routing is enabled.
 * @param {string} dockerValue Docker routing value.
 * @param {boolean} sshEnabled Whether SSH routing is enabled.
 * @param {string} sshValue SSH routing value.
 * @returns {void}
 */
function sendSaveLanguageRouting(profilePath, copyIconsPath, languageKey, dockerEnabled, dockerValue, sshEnabled, sshValue) {
  vscodeApi.postMessage({
    type: "saveLanguageRouting",
    profilePath,
    copyIconsPath,
    languageKey,
    dockerEnabled,
    dockerValue,
    sshEnabled,
    sshValue,
  });
}

/**
 * Posts a saveBatchRouting message to the extension host.
 *
 * @param {string} profilePath Current profile path input value.
 * @param {string} copyIconsPath Current copy-icons path input value.
 * @param {boolean} dockerEnabled Whether Docker routing is enabled.
 * @param {string} dockerValue Docker routing value.
 * @param {boolean} sshEnabled Whether SSH routing is enabled.
 * @param {string} sshValue SSH routing value.
 * @returns {void}
 */
function sendSaveBatchRouting(profilePath, copyIconsPath, dockerEnabled, dockerValue, sshEnabled, sshValue) {
  vscodeApi.postMessage({
    type: "saveBatchRouting",
    profilePath,
    copyIconsPath,
    dockerEnabled,
    dockerValue,
    sshEnabled,
    sshValue,
  });
}

window.addEventListener("message", (event) => {
  const message = event.data;

  if (message?.type !== "environmentState") {
    return;
  }

  if (typeof window.AlgosEnvironmentInitUi?.applyState === "function") {
    window.AlgosEnvironmentInitUi.applyState(message.state);
  }
});

window.AlgosEnvironmentInitComms = {
  sendRefreshState,
  sendCheckEnv,
  sendCopyIcons,
  sendSaveVariable,
  sendSaveLanguageRouting,
  sendSaveBatchRouting,
};
