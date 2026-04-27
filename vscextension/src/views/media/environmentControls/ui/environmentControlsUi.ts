import type {
  EnvironmentControlsBatchRouting,
  EnvironmentControlsRoutingLanguageEntry,
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
 * Renders one status block when there is status text.
 *
 * @param {string} statusText Status text.
 * @param {string} statusClassName Status class.
 * @returns {string} Status markup.
 */
function renderStatus(statusText: string, statusClassName: string): string {
  if (statusText.trim().length === 0) {
    return "";
  }

  return `<div class="status ${escapeHtml(statusClassName)}">${escapeHtml(statusText)}</div>`;
}

const SECTION_ICON_SVG_BY_NAME: Readonly<Record<string, string>> = Object.freeze({
  profile:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
    + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + "</svg>",
  check:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + "</svg>",
  copy:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M6 3H11.5C12.33 3 13 3.67 13 4.5V10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<rect x="3" y="6" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
    + "</svg>",
  variables:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 4.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M4 8H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M4 11.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>'
    + '<circle cx="10" cy="8" r="1.2" fill="currentColor"/>'
    + '<circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/>'
    + "</svg>",
  routing:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<circle cx="4" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<circle cx="12" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<circle cx="8" cy="12" r="1.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5.2 4.8L6.9 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M10.8 4.8L9.1 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M5.5 4H10.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + "</svg>",
});

/**
 * Returns inline icon markup for one section key.
 *
 * @param {string} iconName Icon key.
 * @returns {string} Icon markup or empty string.
 */
function getSectionIconSvg(iconName: string): string {
  if (Object.prototype.hasOwnProperty.call(SECTION_ICON_SVG_BY_NAME, iconName)) {
    return SECTION_ICON_SVG_BY_NAME[iconName];
  }

  return "";
}

/**
 * Renders one section header with icon and optional actions markup.
 *
 * @param {string} title Section title.
 * @param {string} iconName Section icon key.
 * @param {string} [actionsHtml] Pre-built actions markup.
 * @returns {string} Header HTML.
 */
function renderSectionHeader(title: string, iconName: string, actionsHtml?: string): string {
  return '<div class="sectionHeader">'
    + '<div class="sectionTitleGroup">'
    + getSectionIconSvg(iconName)
    + `<div class="sectionTitle">${escapeHtml(title)}</div>`
    + "</div>"
    + (actionsHtml || "")
    + "</div>";
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
      ${renderStatus(variable.statusText, variable.statusClassName)}
    </div>
  `;
}

/**
 * Renders one language routing indicator list.
 *
 * @param {EnvironmentControlsRoutingLanguageEntry} entry Routing entry.
 * @returns {string} Indicator markup.
 */
function renderLanguageIndicators(entry: EnvironmentControlsRoutingLanguageEntry): string {
  let indicators = "";

  if (entry.dockerEnabled) {
    indicators += '<span class="indicator">docker</span>';
  }

  if (entry.sshEnabled) {
    indicators += '<span class="indicator">ssh</span>';
  }

  return indicators;
}

/**
 * Renders one language routing row.
 *
 * @param {EnvironmentControlsRoutingLanguageEntry} entry Routing entry.
 * @returns {string} Routing row markup.
 */
function renderRoutingLanguageRow(entry: EnvironmentControlsRoutingLanguageEntry): string {
  const conflictClass = entry.isConflict ? " conflict" : "";
  const dockerDisabled = entry.dockerEnabled ? "" : " disabled";
  const sshDisabled = entry.sshEnabled ? "" : " disabled";
  const iconHtml = entry.iconUri !== undefined && entry.iconUri.trim().length > 0
    ? `<img class="languageIcon" src="${escapeHtml(entry.iconUri)}" alt="" />`
    : '<span class="languageIconFallback"></span>';

  return `
    <details class="languageRow${conflictClass}" data-language-key="${escapeHtml(entry.languageKey)}">
      <summary class="languageSummary">
        <div class="languageMain">
          ${iconHtml}
          <span class="languageName">${escapeHtml(entry.label)}</span>
        </div>
        <div class="indicatorList">${renderLanguageIndicators(entry)}</div>
      </summary>
      <div class="editorBody">
        <label class="toggleRow">
          <input
            type="checkbox"
            data-role="language-docker-enabled"
            data-language-key="${escapeHtml(entry.languageKey)}"
            ${entry.dockerEnabled ? "checked" : ""}
          />
          <span class="checkboxText">Docker</span>
        </label>
        <input
          class="input"
          data-role="language-docker-value"
          data-language-key="${escapeHtml(entry.languageKey)}"
          placeholder="Docker image"
          value="${escapeHtml(entry.dockerValue)}"
          ${dockerDisabled}
        />

        <label class="toggleRow">
          <input
            type="checkbox"
            data-role="language-ssh-enabled"
            data-language-key="${escapeHtml(entry.languageKey)}"
            ${entry.sshEnabled ? "checked" : ""}
          />
          <span class="checkboxText">SSH</span>
        </label>
        <input
          class="input"
          data-role="language-ssh-value"
          data-language-key="${escapeHtml(entry.languageKey)}"
          placeholder="SSH route"
          value="${escapeHtml(entry.sshValue)}"
          ${sshDisabled}
        />

        <div class="buttonRow">
          <button class="button" type="button" data-role="save-language-routing" data-language-key="${escapeHtml(entry.languageKey)}">Save</button>
        </div>
        ${renderStatus(entry.statusText, entry.statusClassName)}
      </div>
    </details>
  `;
}

/**
 * Renders the routing batch section.
 *
 * @param {EnvironmentControlsBatchRouting} batchRouting Batch routing payload.
 * @returns {string} Batch routing section markup.
 */
function renderBatchRoutingSection(batchRouting: EnvironmentControlsBatchRouting): string {
  const conflictClass = batchRouting.isConflict ? " conflict" : "";
  const dockerDisabled = batchRouting.dockerEnabled ? "" : " disabled";
  const sshDisabled = batchRouting.sshEnabled ? "" : " disabled";

  return `
    <section class="batchSection${conflictClass}">
      <div class="subSectionTitle">Batch All</div>
      <label class="toggleRow">
        <input type="checkbox" data-role="batch-docker-enabled" ${batchRouting.dockerEnabled ? "checked" : ""} />
        <span class="checkboxText">Docker</span>
      </label>
      <input class="input" data-role="batch-docker-value" placeholder="Docker image" value="${escapeHtml(batchRouting.dockerValue)}" ${dockerDisabled} />

      <label class="toggleRow">
        <input type="checkbox" data-role="batch-ssh-enabled" ${batchRouting.sshEnabled ? "checked" : ""} />
        <span class="checkboxText">SSH</span>
      </label>
      <input class="input" data-role="batch-ssh-value" placeholder="SSH route" value="${escapeHtml(batchRouting.sshValue)}" ${sshDisabled} />

      <div class="buttonRow">
        <button class="button" type="button" data-role="save-batch-routing">Save</button>
      </div>
      ${renderStatus(batchRouting.statusText, batchRouting.statusClassName)}
    </section>
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
  const routingRowsHtml = snapshot.routingEntries.map((entry) => {
    return renderRoutingLanguageRow(entry);
  }).join("");

  appRoot.innerHTML = `
    <section class="panel" aria-label="Environment controls">
      <p class="panelDescription">Controls environment factors for the algorithms project via init.sh.</p>

      <section class="section">
        ${renderSectionHeader(
          "Profile",
          "profile",
          '<button class="button secondary" type="button" data-role="refresh-environment">Refresh</button>'
        )}
        <input class="input" data-role="profile-path" value="${escapeHtml(snapshot.profilePath)}" placeholder="${escapeHtml(snapshot.profilePlaceholder)}" />
        <div class="effectiveProfile">Effective profile for reads: ${escapeHtml(snapshot.effectiveProfilePath)}</div>
        <div class="helperText">Leave blank to let init.sh use its platform default profile path.</div>
      </section>

      <section class="section">
        ${renderSectionHeader(
          "Check Environment",
          "check",
          '<button class="button secondary" type="button" data-role="run-check-env">Check Environment</button>'
        )}
        ${renderStatus(snapshot.checkEnvStatusText, snapshot.checkEnvStatusClassName)}
        <div class="outputBox">${snapshot.checkEnvFilteredOutput ? escapeHtml(snapshot.checkEnvFilteredOutput) : "No check-environment output yet."}</div>
        <details>
          <summary>Raw Output</summary>
          <div class="outputBox">${snapshot.checkEnvRawOutput ? escapeHtml(snapshot.checkEnvRawOutput) : "No raw output yet."}</div>
        </details>
      </section>

      <section class="section">
        ${renderSectionHeader(
          "Copy Icons",
          "copy",
          '<button class="button secondary" type="button" data-role="run-copy-icons">Copy Icons</button>'
        )}
        <input class="input" data-role="copy-icons-path" value="${escapeHtml(snapshot.copyIconsPath)}" placeholder="Optional destination path" />
        <div class="helperText">Skips profile updates.</div>
        ${renderStatus(snapshot.copyIconsStatusText, snapshot.copyIconsStatusClassName)}
      </section>

      <section class="section">
        ${renderSectionHeader("Use Environment Variables", "variables")}
        <div class="variableGrid">${variableCardsHtml}</div>
      </section>

      <section class="section">
        ${renderSectionHeader("Language routing", "routing")}
        <div class="helperText">Configure per-language docker or ssh execution targets. SSH route value must use one of two formats:<pre>ssh-destination|code-dir|run-script<br>ssh-address|ssh-user|ssh-port|code-dir|run-script</pre>
        Each language should have exactly one target configured (docker or ssh) or none.</div>
        ${renderBatchRoutingSection(snapshot.batchRouting)}
        <div class="routingTable">${routingRowsHtml}</div>
      </section>
    </section>
  `;
}

/**
 * Resolves one language routing row from current DOM controls.
 *
 * @param {HTMLElement} appRoot Environment app root.
 * @param {string} languageKey Language key.
 * @returns {{dockerEnabled: boolean; dockerValue: string; sshEnabled: boolean; sshValue: string} | null} Current row values.
 */
function readLanguageRowDraft(
  appRoot: HTMLElement,
  languageKey: string
): { dockerEnabled: boolean; dockerValue: string; sshEnabled: boolean; sshValue: string } | null {
  const dockerEnabledInput = appRoot.querySelector(`[data-role='language-docker-enabled'][data-language-key='${languageKey}']`);
  const dockerValueInput = appRoot.querySelector(`[data-role='language-docker-value'][data-language-key='${languageKey}']`);
  const sshEnabledInput = appRoot.querySelector(`[data-role='language-ssh-enabled'][data-language-key='${languageKey}']`);
  const sshValueInput = appRoot.querySelector(`[data-role='language-ssh-value'][data-language-key='${languageKey}']`);

  if (
    !(dockerEnabledInput instanceof HTMLInputElement)
    || !(dockerValueInput instanceof HTMLInputElement)
    || !(sshEnabledInput instanceof HTMLInputElement)
    || !(sshValueInput instanceof HTMLInputElement)
  ) {
    return null;
  }

  return {
    dockerEnabled: dockerEnabledInput.checked,
    dockerValue: dockerValueInput.value,
    sshEnabled: sshEnabledInput.checked,
    sshValue: sshValueInput.value,
  };
}

/**
 * Resolves batch routing draft values from current DOM controls.
 *
 * @param {HTMLElement} appRoot Environment app root.
 * @returns {{dockerEnabled: boolean; dockerValue: string; sshEnabled: boolean; sshValue: string} | null} Current batch values.
 */
function readBatchDraft(
  appRoot: HTMLElement
): { dockerEnabled: boolean; dockerValue: string; sshEnabled: boolean; sshValue: string } | null {
  const dockerEnabledInput = appRoot.querySelector("[data-role='batch-docker-enabled']");
  const dockerValueInput = appRoot.querySelector("[data-role='batch-docker-value']");
  const sshEnabledInput = appRoot.querySelector("[data-role='batch-ssh-enabled']");
  const sshValueInput = appRoot.querySelector("[data-role='batch-ssh-value']");

  if (
    !(dockerEnabledInput instanceof HTMLInputElement)
    || !(dockerValueInput instanceof HTMLInputElement)
    || !(sshEnabledInput instanceof HTMLInputElement)
    || !(sshValueInput instanceof HTMLInputElement)
  ) {
    return null;
  }

  return {
    dockerEnabled: dockerEnabledInput.checked,
    dockerValue: dockerValueInput.value,
    sshEnabled: sshEnabledInput.checked,
    sshValue: sshValueInput.value,
  };
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

  const refreshEnvironmentButton = appRoot.querySelector("[data-role='refresh-environment']");
  if (refreshEnvironmentButton instanceof HTMLButtonElement) {
    refreshEnvironmentButton.addEventListener("click", () => {
      emit({ kind: "refreshEnvironment" });
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

  const languageDraftInputs = appRoot.querySelectorAll(
    "[data-role='language-docker-enabled'], [data-role='language-docker-value'], [data-role='language-ssh-enabled'], [data-role='language-ssh-value']"
  );
  languageDraftInputs.forEach((languageDraftInput) => {
    if (!(languageDraftInput instanceof HTMLInputElement)) {
      return;
    }

    const eventName = languageDraftInput.type === "checkbox" ? "change" : "input";

    languageDraftInput.addEventListener(eventName, () => {
      const languageKey = String(languageDraftInput.dataset.languageKey || "");
      if (languageKey.trim().length === 0) {
        return;
      }

      const draft = readLanguageRowDraft(appRoot, languageKey);
      if (draft === null) {
        return;
      }

      emit({
        kind: "setLanguageRoutingDraft",
        languageKey,
        dockerEnabled: draft.dockerEnabled,
        dockerValue: draft.dockerValue,
        sshEnabled: draft.sshEnabled,
        sshValue: draft.sshValue,
      });
    });
  });

  const saveLanguageButtons = appRoot.querySelectorAll("[data-role='save-language-routing']");
  saveLanguageButtons.forEach((saveLanguageButton) => {
    if (!(saveLanguageButton instanceof HTMLButtonElement)) {
      return;
    }

    saveLanguageButton.addEventListener("click", () => {
      const languageKey = String(saveLanguageButton.dataset.languageKey || "");
      if (languageKey.trim().length === 0) {
        return;
      }

      emit({
        kind: "saveLanguageRouting",
        languageKey,
      });
    });
  });

  const batchInputs = appRoot.querySelectorAll(
    "[data-role='batch-docker-enabled'], [data-role='batch-docker-value'], [data-role='batch-ssh-enabled'], [data-role='batch-ssh-value']"
  );
  batchInputs.forEach((batchInput) => {
    if (!(batchInput instanceof HTMLInputElement)) {
      return;
    }

    const eventName = batchInput.type === "checkbox" ? "change" : "input";
    batchInput.addEventListener(eventName, () => {
      const draft = readBatchDraft(appRoot);
      if (draft === null) {
        return;
      }

      emit({
        kind: "setBatchRoutingDraft",
        dockerEnabled: draft.dockerEnabled,
        dockerValue: draft.dockerValue,
        sshEnabled: draft.sshEnabled,
        sshValue: draft.sshValue,
      });
    });
  });

  const saveBatchButton = appRoot.querySelector("[data-role='save-batch-routing']");
  if (saveBatchButton instanceof HTMLButtonElement) {
    saveBatchButton.addEventListener("click", () => {
      emit({ kind: "saveBatchRouting" });
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
    routingStatusText: "",
    routingStatusClassName: "status-muted",
    routingEntries: [],
    batchRouting: {
      dockerEnabled: false,
      dockerValue: "",
      sshEnabled: false,
      sshValue: "",
      isConflict: false,
      statusText: "",
      statusClassName: "",
    },
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
