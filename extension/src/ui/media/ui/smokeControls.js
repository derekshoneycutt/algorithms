"use strict";

const smokeControlsUiClientUtils = window.AlgosWebviewClientUtils;
const initialStateNode = document.getElementById("smokeControlsInitialState");
const REQUIRED_NODE_IDS = [
  "smokeMarkdownEnabled",
  "smokeMarkdownPath",
  "smokeTimeout",
  "smokeSlowTimeout",
  "smokeSelectAll",
  "smokeDeselectAll",
  "reportGenerationStatus",
  "smokeStatus",
];
const statusClasses = ["status-muted", "status-ok", "status-error"];
let initialState = {};

let requiredNodes = null;

try {
  if (!smokeControlsUiClientUtils) {
    throw new Error("Smoke Controls missing AlgosWebviewClientUtils bootstrap.");
  }

  requiredNodes = smokeControlsUiClientUtils.getRequiredNodes(
    REQUIRED_NODE_IDS,
    "Smoke Controls"
  );
} catch (error) {
  const failureText = String(
    error?.message || "Smoke Controls failed required-node bootstrap."
  );
  console.error(`[algorithms-runner] ${failureText}`);

  if (smokeControlsUiClientUtils) {
    smokeControlsUiClientUtils.showStartupFailure("Smoke Controls", failureText);
  }

  throw error;
}

const smokeMarkdownEnabled = requiredNodes.smokeMarkdownEnabled;
const smokeMarkdownPath = requiredNodes.smokeMarkdownPath;
const smokeTimeout = requiredNodes.smokeTimeout;
const smokeSlowTimeout = requiredNodes.smokeSlowTimeout;
const smokeSelectAll = requiredNodes.smokeSelectAll;
const smokeDeselectAll = requiredNodes.smokeDeselectAll;
const reportGenerationStatus = requiredNodes.reportGenerationStatus;
const smokeStatus = requiredNodes.smokeStatus;
const smokeLanguageCheckboxes = Array.from(
  document.querySelectorAll("input[data-smoke-lang]")
);

if (initialStateNode) {
  try {
    initialState = JSON.parse(initialStateNode.textContent || "{}");
  } catch (error) {
    console.error(
      `[algorithms-runner] Smoke Controls failed to parse initial state: ${error.message}`
    );
  }
}

/**
 * Updates whether markdown path input is interactive.
 *
 * @returns {void}
 */
function updateSmokeMarkdownInteractivity() {
  smokeMarkdownPath.disabled = !smokeMarkdownEnabled.checked;
}

/**
 * Applies one smoke-controls state snapshot to the UI.
 *
 * @param {Record<string, unknown>} state State snapshot.
 * @returns {void}
 */
function applyState(state) {
  const nextState = state || {};
  smokeMarkdownEnabled.checked = Boolean(nextState.markdownEnabled);
  updateSmokeMarkdownInteractivity();

  if (typeof nextState.markdownPath === "string" && document.activeElement !== smokeMarkdownPath) {
    smokeMarkdownPath.value = nextState.markdownPath;
  }

  if (typeof nextState.timeout === "string" && document.activeElement !== smokeTimeout) {
    smokeTimeout.value = nextState.timeout;
  }

  if (typeof nextState.slowTimeout === "string" && document.activeElement !== smokeSlowTimeout) {
    smokeSlowTimeout.value = nextState.slowTimeout;
  }

  reportGenerationStatus.textContent = String(nextState.reportStatusText || "");
  reportGenerationStatus.classList.remove(...statusClasses);

  if (statusClasses.includes(nextState.reportStatusClassName)) {
    reportGenerationStatus.classList.add(nextState.reportStatusClassName);
  }

  if (Array.isArray(nextState.languages)) {
    const nextEnabledByKey = new Map(
      nextState.languages.map((language) => [String(language.key || ""), Boolean(language.enabled)])
    );

    for (const checkbox of smokeLanguageCheckboxes) {
      const languageKey = checkbox.getAttribute("data-smoke-lang") || "";
      checkbox.checked = nextEnabledByKey.get(languageKey) === true;
    }
  }

  smokeStatus.textContent = String(nextState.smokeStatusText || "");
  smokeStatus.classList.remove(...statusClasses);

  if (statusClasses.includes(nextState.smokeStatusClassName)) {
    smokeStatus.classList.add(nextState.smokeStatusClassName);
  }
}

smokeMarkdownEnabled.addEventListener("change", () => {
  updateSmokeMarkdownInteractivity();
  window.AlgosSmokeControlsComms.sendSetSmokeMarkdownEnabled(smokeMarkdownEnabled.checked);
});

smokeMarkdownPath.addEventListener("input", () => {
  window.AlgosSmokeControlsComms.sendSetSmokeMarkdownPath(smokeMarkdownPath.value);
});

smokeTimeout.addEventListener("input", () => {
  window.AlgosSmokeControlsComms.sendSetSmokeTimeout(smokeTimeout.value);
});

smokeSlowTimeout.addEventListener("input", () => {
  window.AlgosSmokeControlsComms.sendSetSmokeSlowTimeout(smokeSlowTimeout.value);
});

for (const checkbox of smokeLanguageCheckboxes) {
  checkbox.addEventListener("change", () => {
    window.AlgosSmokeControlsComms.sendSetSmokeLanguageEnabled(
      checkbox.getAttribute("data-smoke-lang"),
      checkbox.checked
    );
  });
}

smokeSelectAll.addEventListener("click", () => {
  window.AlgosSmokeControlsComms.sendSetSmokeAllLanguagesEnabled(true);
});

smokeDeselectAll.addEventListener("click", () => {
  window.AlgosSmokeControlsComms.sendSetSmokeAllLanguagesEnabled(false);
});

window.AlgosSmokeControlsUi = {
  applyState,
};

applyState(initialState);
updateSmokeMarkdownInteractivity();
