const vscodeApi = acquireVsCodeApi();
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

/**
 * Returns required nodes keyed by id or throws with actionable diagnostics.
 *
 * @returns {Record<string, HTMLElement>} Required nodes.
 */
function getRequiredNodes() {
  const nodes = {};
  const missingNodeIds = [];

  for (const nodeId of REQUIRED_NODE_IDS) {
    const element = document.getElementById(nodeId);

    if (!element) {
      missingNodeIds.push(nodeId);
      continue;
    }

    nodes[nodeId] = element;
  }

  if (missingNodeIds.length > 0) {
    throw new Error(
      "Smoke Controls webview missing required nodes: "
        + missingNodeIds.join(", ")
    );
  }

  return nodes;
}

/**
 * Replaces the document body with a clear startup failure message.
 *
 * @param {string} message Startup failure details.
 * @returns {void}
 */
function showStartupFailure(message) {
  document.body.innerHTML =
    '<div style="margin:0;padding:10px;font-family:var(--vscode-font-family);font-size:12px;color:var(--vscode-errorForeground);background:var(--vscode-sideBar-background);white-space:pre-wrap;border:1px solid var(--vscode-errorForeground);border-radius:6px;line-height:1.4;">'
    + String(message || "Smoke Controls failed to initialize.")
    + "</div>";
}

let requiredNodes = null;

try {
  requiredNodes = getRequiredNodes();
} catch (error) {
  const failureText = String(
    error?.message || "Smoke Controls failed required-node bootstrap."
  );
  console.error(`[algorithms-runner] ${failureText}`);
  showStartupFailure(failureText);
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
  vscodeApi.postMessage({
    type: "setSmokeMarkdownEnabled",
    enabled: smokeMarkdownEnabled.checked,
  });
});

smokeMarkdownPath.addEventListener("input", () => {
  vscodeApi.postMessage({
    type: "setSmokeMarkdownPath",
    text: smokeMarkdownPath.value,
  });
});

smokeTimeout.addEventListener("input", () => {
  vscodeApi.postMessage({
    type: "setSmokeTimeout",
    text: smokeTimeout.value,
  });
});

smokeSlowTimeout.addEventListener("input", () => {
  vscodeApi.postMessage({
    type: "setSmokeSlowTimeout",
    text: smokeSlowTimeout.value,
  });
});

for (const checkbox of smokeLanguageCheckboxes) {
  checkbox.addEventListener("change", () => {
    vscodeApi.postMessage({
      type: "setSmokeLanguageEnabled",
      languageKey: checkbox.getAttribute("data-smoke-lang"),
      enabled: checkbox.checked,
    });
  });
}

smokeSelectAll.addEventListener("click", () => {
  vscodeApi.postMessage({
    type: "setSmokeAllLanguagesEnabled",
    enabled: true,
  });
});

smokeDeselectAll.addEventListener("click", () => {
  vscodeApi.postMessage({
    type: "setSmokeAllLanguagesEnabled",
    enabled: false,
  });
});

window.addEventListener("message", (event) => {
  const message = event.data;

  if (message?.type !== "smokeControlsState") {
    return;
  }

  applyState(message.state);
});

applyState(initialState);
updateSmokeMarkdownInteractivity();
