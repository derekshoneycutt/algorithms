import { html, nothing, render, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

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

type SupportedVariableKey =
  | "timeout"
  | "eiffel"
  | "gcc13Directory"
  | "gcc13Name"
  | "gxx13Name";

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
 * @param {TemplateResult | typeof nothing} [actionsTemplate] Pre-built actions template.
 * @returns {TemplateResult} Header template.
 */
function renderSectionHeader(
  title: string,
  iconName: string,
  actionsTemplate: TemplateResult | typeof nothing = nothing
): TemplateResult {
  return html`<div class="sectionHeader"><div class="sectionTitleGroup">${unsafeHTML(getSectionIconSvg(iconName))}<div class="sectionTitle">${title}</div></div>${actionsTemplate}</div>`;
}

/**
 * Renders one variable card markup.
 *
 * @param {EnvironmentControlsViewVariable} variable Variable payload.
 * @returns {TemplateResult} Card template.
 */
function renderVariableCard(variable: EnvironmentControlsViewVariable): TemplateResult {
  return html`
    <div class="variableCard" data-variable-key=${variable.key}>
      <div class="variableLabel">${variable.label}</div>
      <div class="fieldRow">
        <input class="input" data-role="variable-value" data-variable-key=${variable.key} .value=${variable.value} />
        <button class="button" type="button" data-role="save-variable" data-variable-key=${variable.key}>Save</button>
      </div>
    </div>
  `;
}

/**
 * Renders one language routing indicator list.
 *
 * @param {EnvironmentControlsRoutingLanguageEntry} entry Routing entry.
 * @returns {TemplateResult} Indicator template.
 */
function renderLanguageIndicators(entry: EnvironmentControlsRoutingLanguageEntry): TemplateResult {
  return html`
    ${entry.dockerEnabled ? html`<span class="indicator">docker</span>` : nothing}
    ${entry.sshEnabled ? html`<span class="indicator">ssh</span>` : nothing}
  `;
}

/**
 * Renders one language routing row.
 *
 * @param {EnvironmentControlsRoutingLanguageEntry} entry Routing entry.
 * @returns {TemplateResult} Routing row template.
 */
function renderRoutingLanguageRow(entry: EnvironmentControlsRoutingLanguageEntry): TemplateResult {
  const iconTemplate =
    entry.iconUri !== undefined && entry.iconUri.trim().length > 0
      ? html`<img class="languageIcon" src=${entry.iconUri} alt="" />`
      : html`<span class="languageIconFallback"></span>`;

  return html`
    <details class="languageRow ${entry.isConflict ? "conflict" : ""}" data-language-key=${entry.languageKey}>
      <summary class="languageSummary">
        <div class="languageMain">
          ${iconTemplate}
          <span class="languageName">${entry.label}</span>
        </div>
        <div class="indicatorList">${renderLanguageIndicators(entry)}</div>
      </summary>
      <div class="editorBody">
        <label class="toggleRow">
          <input
            type="checkbox"
            data-role="language-docker-enabled"
            data-language-key=${entry.languageKey}
            ?checked=${entry.dockerEnabled}
          />
          <span class="checkboxText">Docker</span>
        </label>
        <input
          class="input"
          data-role="language-docker-value"
          data-language-key=${entry.languageKey}
          placeholder="Docker image"
          .value=${entry.dockerValue}
          ?disabled=${!entry.dockerEnabled}
        />

        <label class="toggleRow">
          <input
            type="checkbox"
            data-role="language-ssh-enabled"
            data-language-key=${entry.languageKey}
            ?checked=${entry.sshEnabled}
          />
          <span class="checkboxText">SSH</span>
        </label>
        <input
          class="input"
          data-role="language-ssh-value"
          data-language-key=${entry.languageKey}
          placeholder="SSH route"
          .value=${entry.sshValue}
          ?disabled=${!entry.sshEnabled}
        />

        <div class="buttonRow">
          <button class="button" type="button" data-role="save-language-routing" data-language-key=${entry.languageKey}>Save</button>
        </div>
      </div>
    </details>
  `;
}

/**
 * Renders the routing batch section.
 *
 * @param {EnvironmentControlsBatchRouting} batchRouting Batch routing payload.
 * @returns {TemplateResult} Batch routing section template.
 */
function renderBatchRoutingSection(batchRouting: EnvironmentControlsBatchRouting): TemplateResult {
  return html`
    <section class="batchSection ${batchRouting.isConflict ? "conflict" : ""}">
      <div class="subSectionTitle">Batch All</div>
      <label class="toggleRow">
        <input type="checkbox" data-role="batch-docker-enabled" ?checked=${batchRouting.dockerEnabled} />
        <span class="checkboxText">Docker</span>
      </label>
      <input
        class="input"
        data-role="batch-docker-value"
        placeholder="Docker image"
        .value=${batchRouting.dockerValue}
        ?disabled=${!batchRouting.dockerEnabled}
      />

      <label class="toggleRow">
        <input type="checkbox" data-role="batch-ssh-enabled" ?checked=${batchRouting.sshEnabled} />
        <span class="checkboxText">SSH</span>
      </label>
      <input
        class="input"
        data-role="batch-ssh-value"
        placeholder="SSH route"
        .value=${batchRouting.sshValue}
        ?disabled=${!batchRouting.sshEnabled}
      />

      <div class="buttonRow">
        <button class="button" type="button" data-role="save-batch-routing">Save</button>
      </div>
    </section>
  `;
}

/**
 * Renders environment controls template from one snapshot.
 *
 * @param {EnvironmentControlsViewSnapshot} snapshot Host snapshot payload.
 * @returns {TemplateResult} Environment controls template.
 */
function renderEnvironmentControlsTemplate(
  snapshot: EnvironmentControlsViewSnapshot
): TemplateResult {
  return html`
    <section class="panel" aria-label="Environment controls">
      <p class="panelDescription">Controls environment factors for the algorithms project via init.sh.</p>

      <section class="section">
        ${renderSectionHeader(
          "Profile",
          "profile",
          html`<button class="button secondary" type="button" data-role="refresh-environment">Refresh</button>`
        )}
        <input class="input" data-role="profile-path" .value=${snapshot.profilePath} placeholder=${snapshot.profilePlaceholder} />
        <div class="effectiveProfile">Effective profile for reads: ${snapshot.effectiveProfilePath}</div>
        <div class="helperText">Leave blank to let init.sh use its platform default profile path.</div>
      </section>

      <section class="section">
        ${renderSectionHeader(
          "Check Environment",
          "check",
          html`<button class="button secondary" type="button" data-role="run-check-env">Check Environment</button>`
        )}
        <div class="outputBox">${snapshot.checkEnvFilteredOutput || "No check-environment output yet."}</div>
        <details>
          <summary>Raw Output</summary>
          <div class="outputBox">${snapshot.checkEnvRawOutput || "No raw output yet."}</div>
        </details>
      </section>

      <section class="section">
        ${renderSectionHeader(
          "Copy Icons",
          "copy",
          html`<button class="button secondary" type="button" data-role="run-copy-icons">Copy Icons</button>`
        )}
        <input class="input" data-role="copy-icons-path" .value=${snapshot.copyIconsPath} placeholder="Optional destination path" />
        <div class="helperText">Skips profile updates.</div>
      </section>

      <section class="section">
        ${renderSectionHeader("Use Environment Variables", "variables")}
        <div class="variableGrid">${snapshot.variables.map((variable) => renderVariableCard(variable))}</div>
      </section>

      <section class="section">
        ${renderSectionHeader("Language routing", "routing")}
        <div class="helperText">
          Configure per-language docker or ssh execution targets. SSH route value must use one of two formats:
          <pre>ssh-destination|code-dir|run-script<br />ssh-address|ssh-user|ssh-port|code-dir|run-script</pre>
          Each language should have exactly one target configured (docker or ssh) or none.
        </div>
        ${renderBatchRoutingSection(snapshot.batchRouting)}
        <div class="routingTable">${snapshot.routingEntries.map((entry) => renderRoutingLanguageRow(entry))}</div>
      </section>
    </section>
  `;
}

/**
 * Applies one snapshot to the environment controls root using Lit.
 *
 * @param {HTMLElement} appRoot Environment app root.
 * @param {EnvironmentControlsViewSnapshot} snapshot Snapshot to render.
 * @returns {void}
 */
function applySnapshot(appRoot: HTMLElement, snapshot: EnvironmentControlsViewSnapshot): void {
  render(renderEnvironmentControlsTemplate(snapshot), appRoot);
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
 * Returns true when one variable key is supported by environment intents.
 *
 * @param {string} key Candidate variable key.
 * @returns {key is SupportedVariableKey} True when key is supported.
 */
function isSupportedVariableKey(key: string): key is SupportedVariableKey {
  return (
    key === "timeout"
    || key === "eiffel"
    || key === "gcc13Directory"
    || key === "gcc13Name"
    || key === "gxx13Name"
  );
}

/**
 * Emits one language draft intent for one language key.
 *
 * @param {HTMLElement} appRoot Environment app root.
 * @param {(intent: ViewEnvironmentControlsIntent) => void} emit Intent emitter.
 * @param {string} languageKey Language key.
 * @returns {void}
 */
function emitLanguageDraft(
  appRoot: HTMLElement,
  emit: (intent: ViewEnvironmentControlsIntent) => void,
  languageKey: string
): void {
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
}

/**
 * Emits one batch draft intent from current batch controls.
 *
 * @param {HTMLElement} appRoot Environment app root.
 * @param {(intent: ViewEnvironmentControlsIntent) => void} emit Intent emitter.
 * @returns {void}
 */
function emitBatchDraft(
  appRoot: HTMLElement,
  emit: (intent: ViewEnvironmentControlsIntent) => void
): void {
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
}

/**
 * Creates the environment controls panel UI adapter.
 *
 * @returns {IEnvironmentControlsUi} Environment controls UI adapter.
 */
export function createEnvironmentControlsUi(): IEnvironmentControlsUi {
  const appRoot = document.querySelector("[data-role='environment-controls-app']");
  const listeners = new Set<(intent: ViewEnvironmentControlsIntent) => void>();

  if (!(appRoot instanceof HTMLElement)) {
    return {
      onIntent(listener: (intent: ViewEnvironmentControlsIntent) => void): () => void {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      setSnapshot(): void {},
    };
  }

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

  applySnapshot(appRoot, {
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
      statusClassName: "status-muted",
    },
    variables: [],
  });

  appRoot.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const role = String(target.dataset.role || "");
    if (role === "profile-path") {
      emit({
        kind: "setProfilePath",
        profilePath: target.value,
      });
      return;
    }

    if (role === "copy-icons-path") {
      emit({
        kind: "setCopyIconsPath",
        copyIconsPath: target.value,
      });
      return;
    }

    if (role === "language-docker-enabled" || role === "language-ssh-enabled") {
      const languageKey = String(target.dataset.languageKey || "").trim();
      if (languageKey.length === 0) {
        return;
      }

      emitLanguageDraft(appRoot, emit, languageKey);
      return;
    }

    if (role === "batch-docker-enabled" || role === "batch-ssh-enabled") {
      emitBatchDraft(appRoot, emit);
    }
  });

  appRoot.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const role = String(target.dataset.role || "");
    if (role === "variable-value") {
      const key = String(target.dataset.variableKey || "");
      if (!isSupportedVariableKey(key)) {
        return;
      }

      emit({
        kind: "setVariableValue",
        key,
        value: target.value,
      });
      return;
    }

    if (role === "language-docker-value" || role === "language-ssh-value") {
      const languageKey = String(target.dataset.languageKey || "").trim();
      if (languageKey.length === 0) {
        return;
      }

      emitLanguageDraft(appRoot, emit, languageKey);
      return;
    }

    if (role === "batch-docker-value" || role === "batch-ssh-value") {
      emitBatchDraft(appRoot, emit);
    }
  });

  appRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("button");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const role = String(button.dataset.role || "");
    if (role === "run-check-env") {
      emit({ kind: "runCheckEnvironment" });
      return;
    }

    if (role === "refresh-environment") {
      emit({ kind: "refreshEnvironment" });
      return;
    }

    if (role === "run-copy-icons") {
      emit({ kind: "runCopyIcons" });
      return;
    }

    if (role === "save-variable") {
      const key = String(button.dataset.variableKey || "");
      if (!isSupportedVariableKey(key)) {
        return;
      }

      emit({
        kind: "saveVariable",
        key,
      });
      return;
    }

    if (role === "save-language-routing") {
      const languageKey = String(button.dataset.languageKey || "").trim();
      if (languageKey.length === 0) {
        return;
      }

      emit({
        kind: "saveLanguageRouting",
        languageKey,
      });
      return;
    }

    if (role === "save-batch-routing") {
      emit({ kind: "saveBatchRouting" });
    }
  });

  return {
    onIntent(listener: (intent: ViewEnvironmentControlsIntent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setSnapshot(snapshot: EnvironmentControlsViewSnapshot): void {
      applySnapshot(appRoot, snapshot);
    },
  };
}
