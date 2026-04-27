import { html, nothing, render, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import type {
  SmokeControlsViewSnapshot,
  ViewSmokeControlIntent,
} from "../../../../comms/shared/messageTypes";

/**
 * Smoke controls panel UI surface.
 */
export interface ISmokeControlsUi {
  /**
   * Subscribes to user intents from the smoke controls UI.
   *
   * @param {(intent: ViewSmokeControlIntent) => void} listener Intent listener.
   * @returns {() => void} Unsubscribe callback.
   */
  onIntent(listener: (intent: ViewSmokeControlIntent) => void): () => void;

  /**
   * Applies one host snapshot to the smoke controls UI.
   *
   * @param {SmokeControlsViewSnapshot} snapshot Host snapshot payload.
   * @returns {void}
   */
  setSnapshot(snapshot: SmokeControlsViewSnapshot): void;
}

const SMOKE_CONTROLS_SECTION_ICON_SVG_BY_NAME = Object.freeze({
  report:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 2H10L12 4V13C12 13.55 11.55 14 11 14H4C3.45 14 3 13.55 3 13V3C3 2.45 3.45 2 4 2Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M10 2V4H12" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 7H11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<path d="M5 9.5H9" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '</svg>',
  timeout:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M8 5V8L10 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>',
  languages:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M5 5L2 8L5 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M11 5L14 8L11 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M9 3L7 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    + '</svg>',
});

/**
 * Returns the normalized smoke status class name for rendering.
 *
 * @param {string} className Input status class.
 * @returns {"status-muted" | "status-ok" | "status-error"} Supported class name.
 */
function normalizeSmokeStatusClassName(
  className: string
): "status-muted" | "status-ok" | "status-error" {
  if (className === "status-ok") {
    return className;
  }

  if (className === "status-error") {
    return className;
  }

  return "status-muted";
}

/**
 * Renders one section header with icon and optional actions markup.
 *
 * @param {string} title Section title.
 * @param {"report" | "timeout" | "languages"} iconName Icon key.
 * @param {TemplateResult | typeof nothing} [actionsTemplate] Optional actions template.
 * @returns {TemplateResult} Section header template.
 */
function renderSectionHeader(
  title: string,
  iconName: "report" | "timeout" | "languages",
  actionsTemplate: TemplateResult | typeof nothing = nothing
): TemplateResult {
  return html`<div class="sectionHeader"><div class="sectionTitleGroup">${unsafeHTML(SMOKE_CONTROLS_SECTION_ICON_SVG_BY_NAME[iconName])}<div class="sectionTitle">${title}</div></div>${actionsTemplate}</div>`;
}

/**
 * Reads one text input element by role from the app root.
 *
 * @param {HTMLElement} appRoot Smoke controls app root.
 * @param {string} role Data role value.
 * @returns {HTMLInputElement | null} Input element or null.
 */
function getTextInputByRole(appRoot: HTMLElement, role: string): HTMLInputElement | null {
  const element = appRoot.querySelector(`[data-role='${role}']`);
  if (!(element instanceof HTMLInputElement)) {
    return null;
  }

  return element;
}

/**
 * Reads one clear button element by role from the app root.
 *
 * @param {HTMLElement} appRoot Smoke controls app root.
 * @param {string} role Data role value.
 * @returns {HTMLButtonElement | null} Button element or null.
 */
function getClearButtonByRole(appRoot: HTMLElement, role: string): HTMLButtonElement | null {
  const element = appRoot.querySelector(`[data-role='${role}']`);
  if (!(element instanceof HTMLButtonElement)) {
    return null;
  }

  return element;
}

/**
 * Updates one clear-button visibility from input state.
 *
 * @param {HTMLElement} appRoot Smoke controls app root.
 * @param {string} inputRole Data role for the input.
 * @param {string} clearRole Data role for the clear button.
 * @returns {void}
 */
function updateClearButtonVisibility(
  appRoot: HTMLElement,
  inputRole: string,
  clearRole: string
): void {
  const input = getTextInputByRole(appRoot, inputRole);
  const clearButton = getClearButtonByRole(appRoot, clearRole);
  if (input === null || clearButton === null) {
    return;
  }

  const shouldShow = !input.disabled && input.value.length > 0;
  clearButton.classList.toggle("hidden", !shouldShow);
}

/**
 * Updates clear-button visibility for all smoke controls text fields.
 *
 * @param {HTMLElement} appRoot Smoke controls app root.
 * @returns {void}
 */
function updateAllClearButtonVisibility(appRoot: HTMLElement): void {
  updateClearButtonVisibility(appRoot, "markdown-path", "clear-markdown-path");
  updateClearButtonVisibility(appRoot, "timeout-seconds", "clear-timeout-seconds");
  updateClearButtonVisibility(
    appRoot,
    "slow-timeout-seconds",
    "clear-slow-timeout-seconds"
  );
}

/**
 * Renders one language item.
 *
 * @param {SmokeControlsViewSnapshot["languages"][number]} language One language snapshot row.
 * @returns {TemplateResult} Language item template.
 */
function renderLanguageItem(
  language: SmokeControlsViewSnapshot["languages"][number]
): TemplateResult {
  const iconTemplate =
    typeof language.iconUri === "string" && language.iconUri.length > 0
      ? html`<img class="smoke-language-icon" src=${language.iconUri} alt="" aria-hidden="true" />`
      : html`<span class="smoke-language-icon smoke-language-icon-fallback" aria-hidden="true"></span>`;

  return html`
    <label class="smoke-language-item" title=${language.disabledReason.length > 0 ? language.disabledReason : nothing}>
      <input
        type="checkbox"
        data-role="language-toggle"
        data-language-key=${language.languageKey}
        ?checked=${language.selected}
        ?disabled=${language.disabled}
      />
      <span class="smoke-language-label">${iconTemplate}<span>${language.label}</span></span>
    </label>
  `;
}

/**
 * Renders the smoke controls template for one snapshot.
 *
 * @param {SmokeControlsViewSnapshot} snapshot Host snapshot payload.
 * @returns {TemplateResult} Smoke controls template.
 */
function renderSmokeControlsTemplate(snapshot: SmokeControlsViewSnapshot): TemplateResult {
  const reportStatusClass = normalizeSmokeStatusClassName(snapshot.reportStatusClassName);
  const smokeStatusClass = normalizeSmokeStatusClassName(snapshot.smokeStatusClassName);

  return html`
    <section class="panel" aria-label="Smoke controls">
      <p class="panelDescription">Controls smoke tests run in supported directories.</p>
      <section class="section">
        ${renderSectionHeader("Report Generation", "report")}
        <div class="smoke-markdown-row">
          <label class="smoke-markdown-label" for="smoke-markdown-enabled">
            <input id="smoke-markdown-enabled" type="checkbox" data-role="report-enabled" ?checked=${snapshot.reportEnabled} />
          </label>
          <div class="smoke-input-row">
            <input
              class="smoke-input smoke-input-with-clear"
              type="text"
              data-role="markdown-path"
              placeholder="Optional report path"
              .value=${snapshot.markdownPath}
              ?disabled=${!snapshot.reportEnabled}
            />
            <button
              class="smoke-clear-inline-button ${snapshot.reportEnabled && snapshot.markdownPath.length > 0 ? "" : "hidden"}"
              data-role="clear-markdown-path"
              type="button"
              aria-label="Clear markdown path"
              title="Clear"
            >
              ×
            </button>
          </div>
        </div>
        <p class="smoke-helper-text">Enable markdown output and optionally override the generated report path.</p>
        <p class="smoke-status ${reportStatusClass}">${snapshot.reportStatusText}</p>
      </section>
      <section class="section">
        ${renderSectionHeader("Timeouts", "timeout")}
        <div class="smoke-timeout-row">
          <label class="smoke-timeout-field">
            <span>Timeout</span>
            <div class="smoke-input-row">
              <input class="smoke-input smoke-input-with-clear" type="text" data-role="timeout-seconds" .value=${snapshot.timeoutSeconds} />
              <button
                class="smoke-clear-inline-button ${snapshot.timeoutSeconds.length > 0 ? "" : "hidden"}"
                data-role="clear-timeout-seconds"
                type="button"
                aria-label="Clear timeout"
                title="Clear"
              >
                ×
              </button>
            </div>
          </label>
          <label class="smoke-timeout-field">
            <span>Slow Timeout</span>
            <div class="smoke-input-row">
              <input class="smoke-input smoke-input-with-clear" type="text" data-role="slow-timeout-seconds" .value=${snapshot.slowTimeoutSeconds} />
              <button
                class="smoke-clear-inline-button ${snapshot.slowTimeoutSeconds.length > 0 ? "" : "hidden"}"
                data-role="clear-slow-timeout-seconds"
                type="button"
                aria-label="Clear slow timeout"
                title="Clear"
              >
                ×
              </button>
            </div>
          </label>
        </div>
        <p class="smoke-helper-text">Defaults use timeout. Long-running languages should use slow-timeout.</p>
      </section>
      <section class="section">
        ${renderSectionHeader(
          "Languages",
          "languages",
          html`<div class="buttonRow"><button class="button secondary" type="button" data-role="select-all-languages">Select all</button><button class="button secondary" type="button" data-role="deselect-all-languages">Deselect all</button></div>`
        )}
        <div class="smoke-language-list-container">
          <div class="smoke-language-grid">
            ${snapshot.languages.map((language) => renderLanguageItem(language))}
          </div>
        </div>
        <p class="smoke-status ${smokeStatusClass}">${snapshot.smokeStatusText}</p>
      </section>
    </section>
  `;
}

/**
 * Applies one snapshot to the smoke controls root using Lit.
 *
 * @param {HTMLElement} appRoot Smoke controls app root.
 * @param {SmokeControlsViewSnapshot} snapshot Snapshot to render.
 * @returns {void}
 */
function applySnapshot(appRoot: HTMLElement, snapshot: SmokeControlsViewSnapshot): void {
  render(renderSmokeControlsTemplate(snapshot), appRoot);
  updateAllClearButtonVisibility(appRoot);
}

/**
 * Creates the smoke controls panel UI adapter.
 *
 * @returns {ISmokeControlsUi} Smoke controls UI adapter.
 */
export function createSmokeControlsUi(): ISmokeControlsUi {
  const appRoot = document.querySelector("[data-role='smoke-controls-app']");
  const listeners = new Set<(intent: ViewSmokeControlIntent) => void>();

  if (!(appRoot instanceof HTMLElement)) {
    return {
      onIntent(listener: (intent: ViewSmokeControlIntent) => void): () => void {
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
   * @param {ViewSmokeControlIntent} intent Smoke intent payload.
   * @returns {void}
   */
  function emit(intent: ViewSmokeControlIntent): void {
    for (const listener of listeners) {
      listener(intent);
    }
  }

  applySnapshot(appRoot, {
    stateValue: "ready",
    reportEnabled: false,
    markdownPath: "",
    timeoutSeconds: "",
    slowTimeoutSeconds: "",
    statusLabel: "booting",
    reportStatusText: "No report generated.",
    reportStatusClassName: "status-muted",
    smokeStatusText: "Select at least one language",
    smokeStatusClassName: "status-error",
    languages: [],
  });

  appRoot.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const role = String(target.dataset.role || "");
    if (role === "report-enabled") {
      const markdownPathInput = getTextInputByRole(appRoot, "markdown-path");
      if (markdownPathInput !== null) {
        markdownPathInput.disabled = !target.checked;
      }

      updateClearButtonVisibility(appRoot, "markdown-path", "clear-markdown-path");

      emit({
        kind: "setReportEnabled",
        enabled: target.checked,
      });
      return;
    }

    if (role === "markdown-path") {
      updateClearButtonVisibility(appRoot, "markdown-path", "clear-markdown-path");
      emit({
        kind: "setMarkdownPath",
        markdownPath: target.value,
      });
      return;
    }

    if (role === "timeout-seconds") {
      updateClearButtonVisibility(appRoot, "timeout-seconds", "clear-timeout-seconds");
      emit({
        kind: "setTimeoutSeconds",
        timeoutSeconds: target.value,
      });
      return;
    }

    if (role === "slow-timeout-seconds") {
      updateClearButtonVisibility(
        appRoot,
        "slow-timeout-seconds",
        "clear-slow-timeout-seconds"
      );
      emit({
        kind: "setSlowTimeoutSeconds",
        slowTimeoutSeconds: target.value,
      });
      return;
    }

    if (role === "language-toggle") {
      emit({
        kind: "toggleLanguage",
        languageKey: String(target.dataset.languageKey || ""),
      });
    }
  });

  appRoot.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const role = String(target.dataset.role || "");
    if (role === "markdown-path") {
      updateClearButtonVisibility(appRoot, "markdown-path", "clear-markdown-path");
      return;
    }

    if (role === "timeout-seconds") {
      updateClearButtonVisibility(appRoot, "timeout-seconds", "clear-timeout-seconds");
      return;
    }

    if (role === "slow-timeout-seconds") {
      updateClearButtonVisibility(
        appRoot,
        "slow-timeout-seconds",
        "clear-slow-timeout-seconds"
      );
    }
  });

  appRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const role = String(target.dataset.role || "");
    if (role === "select-all-languages") {
      emit({ kind: "selectAllLanguages" });
      return;
    }

    if (role === "deselect-all-languages") {
      emit({ kind: "deselectAllLanguages" });
      return;
    }

    if (role === "clear-markdown-path") {
      const input = getTextInputByRole(appRoot, "markdown-path");
      if (input === null) {
        return;
      }

      input.value = "";
      updateClearButtonVisibility(appRoot, "markdown-path", "clear-markdown-path");
      emit({
        kind: "setMarkdownPath",
        markdownPath: "",
      });

      if (!input.disabled) {
        input.focus();
      }
      return;
    }

    if (role === "clear-timeout-seconds") {
      const input = getTextInputByRole(appRoot, "timeout-seconds");
      if (input === null) {
        return;
      }

      input.value = "";
      updateClearButtonVisibility(appRoot, "timeout-seconds", "clear-timeout-seconds");
      emit({
        kind: "setTimeoutSeconds",
        timeoutSeconds: "",
      });

      input.focus();
      return;
    }

    if (role === "clear-slow-timeout-seconds") {
      const input = getTextInputByRole(appRoot, "slow-timeout-seconds");
      if (input === null) {
        return;
      }

      input.value = "";
      updateClearButtonVisibility(
        appRoot,
        "slow-timeout-seconds",
        "clear-slow-timeout-seconds"
      );
      emit({
        kind: "setSlowTimeoutSeconds",
        slowTimeoutSeconds: "",
      });

      input.focus();
    }
  });

  return {
    onIntent(listener: (intent: ViewSmokeControlIntent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setSnapshot(snapshot: SmokeControlsViewSnapshot): void {
      applySnapshot(appRoot, snapshot);
    },
  };
}
