const vscodeApi = acquireVsCodeApi();
const smokeMarkdownEnabled = document.getElementById("smokeMarkdownEnabled");
const smokeMarkdownPath = document.getElementById("smokeMarkdownPath");
const smokeTimeout = document.getElementById("smokeTimeout");
const smokeSlowTimeout = document.getElementById("smokeSlowTimeout");
const smokeSelectAll = document.getElementById("smokeSelectAll");
const smokeDeselectAll = document.getElementById("smokeDeselectAll");
const reportGenerationStatus = document.getElementById("reportGenerationStatus");
const smokeStatus = document.getElementById("smokeStatus");
const smokeLanguageCheckboxes = Array.from(document.querySelectorAll("input[data-smoke-lang]"));
const statusClasses = ["status-muted", "status-ok", "status-error"];

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

updateSmokeMarkdownInteractivity();
