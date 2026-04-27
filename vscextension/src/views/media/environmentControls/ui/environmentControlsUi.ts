import type {
  EnvironmentControlsViewSnapshot,
  EnvironmentControlsViewVariable,
  ViewEnvironmentControlsIntent,
} from "../../../../comms/shared/messageTypes";

/**
 * Environment controls panel UI surface.
 */
export interface IEnvironmentControlsUi {
  /**
   * Subscribes to user intents from the environment controls UI.
   *
   * @param {(intent: ViewEnvironmentControlsIntent) => void} listener Intent listener.
   * @returns {() => void} Unsubscribe callback.
   */
  onIntent(listener: (intent: ViewEnvironmentControlsIntent) => void): () => void;

  /**
   * Applies one host snapshot to the environment controls UI.
   *
   * @param {EnvironmentControlsViewSnapshot} snapshot Host snapshot payload.
   * @returns {void}
   */
  setSnapshot(snapshot: EnvironmentControlsViewSnapshot): void;
}

/**
 * Escapes one string for safe HTML interpolation.
 *
 * @param {string} value Text to escape.
 * @returns {string} Escaped string.
 */
function escapeHtml(value: string): string {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Renders one variable card markup.
 *
 * @param {EnvironmentControlsViewVariable} variable Variable payload.
 * @returns {string} Card markup.
 */
function renderVariableCard(variable: EnvironmentControlsViewVariable): string {
  return `
    <div class="variableCard" data-variable-key="${escapeHtml(variable.key)}">
      <div class="variableLabel">${escapeHtml(variable.label)}</div>
      <div class="fieldRow">
        <input class="input" data-role="variable-value" data-variable-key="${escapeHtml(variable.key)}" value="${escapeHtml(variable.value)}" />
        <button class="button" type="button" data-role="save-variable" data-variable-key="${escapeHtml(variable.key)}">Save</button>
      </div>
      <div class="status ${escapeHtml(variable.statusClassName)}">${escapeHtml(variable.statusText)}</div>
    </div>
  `;
}

/**
 * Renders environment controls layout into one app root.
 *
 * @param {HTMLElement} appRoot Environment app root.
 * @param {EnvironmentControlsViewSnapshot} snapshot Host snapshot payload.
 * @returns {void}
 */
function renderEnvironmentControls(
  appRoot: HTMLElement,
  snapshot: EnvironmentControlsViewSnapshot
): void {
  const variableCardsHtml = snapshot.variables.map((variable) => {
    return renderVariableCard(variable);
  }).join("");

  appRoot.innerHTML = `
    <section class="panel" aria-label="Environment controls">
      <p class="panelDescription">Controls environment factors for the algorithms project via init.sh.</p>

      <section class="section">
        <div class="sectionHeader"><div class="sectionTitle">Profile</div></div>
        <input class="input" data-role="profile-path" value="${escapeHtml(snapshot.profilePath)}" placeholder="${escapeHtml(snapshot.profilePlaceholder)}" />
        <div class="effectiveProfile">Effective profile for reads: ${escapeHtml(snapshot.effectiveProfilePath)}</div>
        <div class="helperText">Leave blank to let init.sh use its platform default profile path.</div>
      </section>

      <section class="section">
        <div class="sectionHeader">
          <div class="sectionTitle">Check Environment</div>
          <button class="button secondary" type="button" data-role="run-check-env">Run Check</button>
        </div>
        <div class="status ${escapeHtml(snapshot.checkEnvStatusClassName)}">${escapeHtml(snapshot.checkEnvStatusText)}</div>
        <div class="outputBox">${escapeHtml(snapshot.checkEnvFilteredOutput)}</div>
        <details>
          <summary>Raw Output</summary>
          <div class="outputBox">${escapeHtml(snapshot.checkEnvRawOutput)}</div>
        </details>
      </section>

      <section class="section">
        <div class="sectionHeader">
          <div class="sectionTitle">Copy Icons</div>
          <button class="button secondary" type="button" data-role="run-copy-icons">Run Copy</button>
        </div>
        <input class="input" data-role="copy-icons-path" value="${escapeHtml(snapshot.copyIconsPath)}" placeholder="Optional destination path" />
        <div class="helperText">Skips profile updates.</div>
        <div class="status ${escapeHtml(snapshot.copyIconsStatusClassName)}">${escapeHtml(snapshot.copyIconsStatusText)}</div>
      </section>

      <section class="section">
        <div class="sectionHeader"><div class="sectionTitle">Variables</div></div>
        <div class="variableGrid">${variableCardsHtml}</div>
      </section>

      <section class="section">
        <div class="sectionHeader">
          <div class="sectionTitle">Routing</div>
          <button class="button secondary" type="button" data-role="save-routing">Save Routing</button>
        </div>
        <label class="helperText" for="routing-docker-map">Docker Map</label>
        <textarea id="routing-docker-map" class="textarea" data-role="routing-docker-map">${escapeHtml(snapshot.routingDockerMapText)}</textarea>
        <label class="helperText" for="routing-ssh-map">SSH Map</label>
        <textarea id="routing-ssh-map" class="textarea" data-role="routing-ssh-map">${escapeHtml(snapshot.routingSshMapText)}</textarea>
        <div class="status ${escapeHtml(snapshot.routingStatusClassName)}">${escapeHtml(snapshot.routingStatusText)}</div>
      </section>
    </section>
  `;
}

/**
 * Binds environment controls handlers for one app root.
 *
 * @param {HTMLElement} appRoot Environment app root.
 * @param {(intent: ViewEnvironmentControlsIntent) => void} emit Intent emitter.
 * @returns {void}
 */
function bindEnvironmentHandlers(
  appRoot: HTMLElement,
  emit: (intent: ViewEnvironmentControlsIntent) => void
): void {
  const profilePathInput = appRoot.querySelector("[data-role='profile-path']");
  if (profilePathInput instanceof HTMLInputElement) {
    profilePathInput.addEventListener("change", () => {
      emit({
        kind: "setProfilePath",
        profilePath: profilePathInput.value,
      });
    });
  }

  const copyIconsPathInput = appRoot.querySelector("[data-role='copy-icons-path']");
  if (copyIconsPathInput instanceof HTMLInputElement) {
    copyIconsPathInput.addEventListener("change", () => {
      emit({
        kind: "setCopyIconsPath",
        copyIconsPath: copyIconsPathInput.value,
      });
    });
  }

  const runCheckEnvButton = appRoot.querySelector("[data-role='run-check-env']");
  if (runCheckEnvButton instanceof HTMLButtonElement) {
    runCheckEnvButton.addEventListener("click", () => {
      emit({ kind: "runCheckEnvironment" });
    });
  }

  const runCopyIconsButton = appRoot.querySelector("[data-role='run-copy-icons']");
  if (runCopyIconsButton instanceof HTMLButtonElement) {
    runCopyIconsButton.addEventListener("click", () => {
      emit({ kind: "runCopyIcons" });
    });
  }

  const variableInputs = appRoot.querySelectorAll("[data-role='variable-value']");
  variableInputs.forEach((variableInput) => {
    if (!(variableInput instanceof HTMLInputElement)) {
      return;
    }

    variableInput.addEventListener("input", () => {
      const key = String(variableInput.dataset.variableKey || "");
      if (
        key !== "timeout"
        && key !== "eiffel"
        && key !== "gcc13Directory"
        && key !== "gcc13Name"
        && key !== "gxx13Name"
      ) {
        return;
      }

      emit({
        kind: "setVariableValue",
        key,
        value: variableInput.value,
      });
    });
  });

  const saveVariableButtons = appRoot.querySelectorAll("[data-role='save-variable']");
  saveVariableButtons.forEach((saveVariableButton) => {
    if (!(saveVariableButton instanceof HTMLButtonElement)) {
      return;
    }

    saveVariableButton.addEventListener("click", () => {
      const key = String(saveVariableButton.dataset.variableKey || "");
      if (
        key !== "timeout"
        && key !== "eiffel"
        && key !== "gcc13Directory"
        && key !== "gcc13Name"
        && key !== "gxx13Name"
      ) {
        return;
      }

      emit({
        kind: "saveVariable",
        key,
      });
    });
  });

  const routingDockerMap = appRoot.querySelector("[data-role='routing-docker-map']");
  if (routingDockerMap instanceof HTMLTextAreaElement) {
    routingDockerMap.addEventListener("change", () => {
      emit({
        kind: "setRoutingDockerMapText",
        text: routingDockerMap.value,
      });
    });
  }

  const routingSshMap = appRoot.querySelector("[data-role='routing-ssh-map']");
  if (routingSshMap instanceof HTMLTextAreaElement) {
    routingSshMap.addEventListener("change", () => {
      emit({
        kind: "setRoutingSshMapText",
        text: routingSshMap.value,
      });
    });
  }

  const saveRoutingButton = appRoot.querySelector("[data-role='save-routing']");
  if (saveRoutingButton instanceof HTMLButtonElement) {
    saveRoutingButton.addEventListener("click", () => {
      emit({ kind: "saveRouting" });
    });
  }
}

/**
 * Creates the environment controls panel UI adapter.
 *
 * @returns {IEnvironmentControlsUi} Environment controls UI adapter.
 */
export function createEnvironmentControlsUi(): IEnvironmentControlsUi {
  const appRoot = document.querySelector("[data-role='environment-controls-app']");
  const listeners = new Set<(intent: ViewEnvironmentControlsIntent) => void>();

  /**
   * Emits one intent to all listeners.
   *
   * @param {ViewEnvironmentControlsIntent} intent Environment intent payload.
   * @returns {void}
   */
  function emit(intent: ViewEnvironmentControlsIntent): void {
    for (const listener of listeners) {
      listener(intent);
    }
  }

  const applySnapshot = (snapshot: EnvironmentControlsViewSnapshot): void => {
    if (!(appRoot instanceof HTMLElement)) {
      return;
    }

    renderEnvironmentControls(appRoot, snapshot);
    bindEnvironmentHandlers(appRoot, emit);
  };

  applySnapshot({
    stateValue: "ready",
    profilePath: "",
    profilePlaceholder: "",
    effectiveProfilePath: "",
    copyIconsPath: "",
    checkEnvStatusText: "Booting environment view...",
    checkEnvStatusClassName: "status-muted",
    checkEnvFilteredOutput: "",
    checkEnvRawOutput: "",
    copyIconsStatusText: "Copy icons has not run yet.",
    copyIconsStatusClassName: "status-muted",
    routingDockerMapText: "",
    routingSshMapText: "",
    routingStatusText: "Routing values are ready to edit.",
    routingStatusClassName: "status-muted",
    variables: [],
  });

  return {
    onIntent(listener: (intent: ViewEnvironmentControlsIntent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setSnapshot(snapshot: EnvironmentControlsViewSnapshot): void {
      applySnapshot(snapshot);
    },
  };
}
