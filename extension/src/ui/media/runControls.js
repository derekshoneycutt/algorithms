const vscodeApi = acquireVsCodeApi();
const runArgsEnabled = document.getElementById("runArgsEnabled");
const runArgsText = document.getElementById("runArgsText");
const runArgsStatus = document.getElementById("runArgsStatus");
const clearRunArgs = document.getElementById("clearRunArgs");
const sourceProfileEnabled = document.getElementById("sourceProfileEnabled");
const sourceProfileText = document.getElementById("sourceProfileText");
const sourceProfileStatus = document.getElementById("sourceProfileStatus");
const clearSourceProfile = document.getElementById("clearSourceProfile");
const runChecksModeNone = document.getElementById("runChecksModeNone");
const runChecksModeCheckOnly = document.getElementById("runChecksModeCheckOnly");
const runChecksModeCompileOnly = document.getElementById("runChecksModeCompileOnly");
const runChecksRoute = document.getElementById("runChecksRoute");
const runChecksStatus = document.getElementById("runChecksStatus");
const cleanStdlibEnabled = document.getElementById("cleanStdlibEnabled");
const cleanArchivesEnabled = document.getElementById("cleanArchivesEnabled");
const cleanOptionsStatus = document.getElementById("cleanOptionsStatus");
const statusClasses = ["status-muted", "status-ok", "status-error"];

/**
 * Returns the selected run-checks mode from the UI radio group.
 *
 * @returns {"none"|"check-only"|"compile-only"} Selected mode.
 */
function getSelectedRunChecksMode() {
  if (runChecksModeCheckOnly.checked) {
    return "check-only";
  }

  if (runChecksModeCompileOnly.checked) {
    return "compile-only";
  }

  return "none";
}

/**
 * Updates whether the run-check route selector is interactive.
 *
 * @returns {void}
 */
function updateRunChecksRouteInteractivity() {
  runChecksRoute.disabled = getSelectedRunChecksMode() !== "check-only";
}

/**
 * Toggles the visibility of the clear button for run args.
 *
 * @returns {void}
 */
function updateRunArgsClearButtonVisibility() {
  const shouldShow = !runArgsText.disabled && runArgsText.value.length > 0;
  clearRunArgs.classList.toggle("hidden", !shouldShow);
}

/**
 * Toggles the visibility of the clear button for source profile.
 *
 * @returns {void}
 */
function updateSourceProfileClearButtonVisibility() {
  const shouldShow = !sourceProfileText.disabled && sourceProfileText.value.length > 0;
  clearSourceProfile.classList.toggle("hidden", !shouldShow);
}

/**
 * Applies a full state snapshot to the webview controls.
 *
 * @param {Record<string, unknown>} state State snapshot from extension host.
 * @returns {void}
 */
function applyState(state) {
  const nextState = state || {};
  const activeElement = document.activeElement;
  const isRunArgsFocused = activeElement === runArgsText;
  const isSourceProfileFocused = activeElement === sourceProfileText;
  runArgsEnabled.checked = Boolean(nextState.enabled);
  runArgsText.disabled = !Boolean(nextState.enabled);
  sourceProfileEnabled.checked = Boolean(nextState.sourceProfileEnabled);
  sourceProfileText.disabled = !Boolean(nextState.sourceProfileEnabled);
  cleanStdlibEnabled.checked = Boolean(nextState.cleanStdlib);
  cleanArchivesEnabled.checked = Boolean(nextState.cleanArchives);

  const nextRunChecksMode = String(nextState.runChecksMode || "none");
  runChecksModeNone.checked = nextRunChecksMode === "none";
  runChecksModeCheckOnly.checked = nextRunChecksMode === "check-only";
  runChecksModeCompileOnly.checked = nextRunChecksMode === "compile-only";

  if (typeof nextState.runChecksRoute === "string") {
    runChecksRoute.value = nextState.runChecksRoute;
  }

  updateRunChecksRouteInteractivity();

  if (!isRunArgsFocused && typeof nextState.text === "string") {
    runArgsText.value = nextState.text;
  }

  if (!isSourceProfileFocused && typeof nextState.sourceProfileText === "string") {
    sourceProfileText.value = nextState.sourceProfileText;
  }

  runArgsStatus.textContent = String(nextState.statusText || "");
  runArgsStatus.classList.remove(...statusClasses);

  if (statusClasses.includes(nextState.statusClassName)) {
    runArgsStatus.classList.add(nextState.statusClassName);
  }

  sourceProfileStatus.textContent = String(nextState.sourceProfileStatusText || "");
  sourceProfileStatus.classList.remove(...statusClasses);

  if (statusClasses.includes(nextState.sourceProfileStatusClassName)) {
    sourceProfileStatus.classList.add(nextState.sourceProfileStatusClassName);
  }

  runChecksStatus.textContent = String(nextState.runChecksStatusText || "");
  runChecksStatus.classList.remove(...statusClasses);

  if (statusClasses.includes(nextState.runChecksStatusClassName)) {
    runChecksStatus.classList.add(nextState.runChecksStatusClassName);
  }

  cleanOptionsStatus.textContent = String(nextState.cleanOptionsStatusText || "");
  cleanOptionsStatus.classList.remove(...statusClasses);

  if (statusClasses.includes(nextState.cleanOptionsStatusClassName)) {
    cleanOptionsStatus.classList.add(nextState.cleanOptionsStatusClassName);
  }

  updateRunArgsClearButtonVisibility();
  updateSourceProfileClearButtonVisibility();
}

runArgsEnabled.addEventListener("change", () => {
  const enabled = runArgsEnabled.checked;
  runArgsText.disabled = !enabled;
  vscodeApi.postMessage({
    type: "setEnabled",
    enabled,
  });
});

runArgsText.addEventListener("input", () => {
  updateRunArgsClearButtonVisibility();
  vscodeApi.postMessage({
    type: "setText",
    text: runArgsText.value,
  });
});

clearRunArgs.addEventListener("click", () => {
  runArgsText.value = "";
  vscodeApi.postMessage({
    type: "setText",
    text: "",
  });

  if (!runArgsText.disabled) {
    runArgsText.focus();
  }

  updateRunArgsClearButtonVisibility();
});

sourceProfileEnabled.addEventListener("change", () => {
  const enabled = sourceProfileEnabled.checked;
  sourceProfileText.disabled = !enabled;
  vscodeApi.postMessage({
    type: "setSourceProfileEnabled",
    enabled,
  });
});

sourceProfileText.addEventListener("input", () => {
  updateSourceProfileClearButtonVisibility();
  vscodeApi.postMessage({
    type: "setSourceProfileText",
    text: sourceProfileText.value,
  });
});

clearSourceProfile.addEventListener("click", () => {
  sourceProfileText.value = "";
  vscodeApi.postMessage({
    type: "setSourceProfileText",
    text: "",
  });

  if (!sourceProfileText.disabled) {
    sourceProfileText.focus();
  }

  updateSourceProfileClearButtonVisibility();
});

runChecksModeNone.addEventListener("change", () => {
  if (!runChecksModeNone.checked) {
    return;
  }

  updateRunChecksRouteInteractivity();
  vscodeApi.postMessage({
    type: "setRunChecksMode",
    mode: "none",
  });
});

runChecksModeCheckOnly.addEventListener("change", () => {
  if (!runChecksModeCheckOnly.checked) {
    return;
  }

  updateRunChecksRouteInteractivity();
  vscodeApi.postMessage({
    type: "setRunChecksMode",
    mode: "check-only",
  });
});

runChecksModeCompileOnly.addEventListener("change", () => {
  if (!runChecksModeCompileOnly.checked) {
    return;
  }

  updateRunChecksRouteInteractivity();
  vscodeApi.postMessage({
    type: "setRunChecksMode",
    mode: "compile-only",
  });
});

runChecksRoute.addEventListener("change", () => {
  vscodeApi.postMessage({
    type: "setRunChecksRoute",
    route: runChecksRoute.value,
  });
});

cleanStdlibEnabled.addEventListener("change", () => {
  vscodeApi.postMessage({
    type: "setCleanStdlibEnabled",
    enabled: cleanStdlibEnabled.checked,
  });
});

cleanArchivesEnabled.addEventListener("change", () => {
  vscodeApi.postMessage({
    type: "setCleanArchivesEnabled",
    enabled: cleanArchivesEnabled.checked,
  });
});

window.addEventListener("message", (event) => {
  const message = event.data;

  if (message?.type !== "runArgsState") {
    return;
  }

  applyState(message.state);
});

updateRunArgsClearButtonVisibility();
updateSourceProfileClearButtonVisibility();
updateRunChecksRouteInteractivity();
