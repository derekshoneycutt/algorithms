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
 * Renders one section header with icon and optional actions markup.
 *
 * @param {string} title Section title.
 * @param {"report" | "timeout" | "languages"} iconName Icon key.
 * @param {string} [actionsHtml] Optional actions markup.
 * @returns {string} Section header HTML.
 */
function renderSectionHeader(
  title: string,
  iconName: "report" | "timeout" | "languages",
  actionsHtml = ""
): string {
  return `<div class="sectionHeader"><div class="sectionTitleGroup">${SMOKE_CONTROLS_SECTION_ICON_SVG_BY_NAME[iconName]}<div class="sectionTitle">${title}</div></div>${actionsHtml}</div>`;
}

/**
 * Binds smoke controls event handlers for one app root.
 *
 * @param {HTMLElement} appRoot Smoke controls app root.
 * @param {(intent: ViewSmokeControlIntent) => void} emit Intent emitter.
 * @returns {void}
 */
function bindSmokeControlsHandlers(
  appRoot: HTMLElement,
  emit: (intent: ViewSmokeControlIntent) => void
): void {
  const reportEnabled = appRoot.querySelector("[data-role='report-enabled']");
  const markdownPath = appRoot.querySelector("[data-role='markdown-path']");
  const timeoutSeconds = appRoot.querySelector("[data-role='timeout-seconds']");
  const slowTimeoutSeconds = appRoot.querySelector(
    "[data-role='slow-timeout-seconds']"
  );
  const selectAllButton = appRoot.querySelector("[data-role='select-all-languages']");
  const deselectAllButton = appRoot.querySelector(
    "[data-role='deselect-all-languages']"
  );

  if (reportEnabled instanceof HTMLInputElement) {
    reportEnabled.addEventListener("change", () => {
      emit({
        kind: "setReportEnabled",
        enabled: reportEnabled.checked,
      });
    });
  }

  if (markdownPath instanceof HTMLInputElement) {
    markdownPath.addEventListener("change", () => {
      emit({
        kind: "setMarkdownPath",
        markdownPath: markdownPath.value,
      });
    });
  }

  if (timeoutSeconds instanceof HTMLInputElement) {
    timeoutSeconds.addEventListener("change", () => {
      emit({
        kind: "setTimeoutSeconds",
        timeoutSeconds: timeoutSeconds.value,
      });
    });
  }

  if (slowTimeoutSeconds instanceof HTMLInputElement) {
    slowTimeoutSeconds.addEventListener("change", () => {
      emit({
        kind: "setSlowTimeoutSeconds",
        slowTimeoutSeconds: slowTimeoutSeconds.value,
      });
    });
  }

  if (selectAllButton instanceof HTMLButtonElement) {
    selectAllButton.addEventListener("click", () => {
      emit({ kind: "selectAllLanguages" });
    });
  }

  if (deselectAllButton instanceof HTMLButtonElement) {
    deselectAllButton.addEventListener("click", () => {
      emit({ kind: "deselectAllLanguages" });
    });
  }

  const languageCheckboxes = appRoot.querySelectorAll("[data-role='language-toggle']");
  languageCheckboxes.forEach((checkbox) => {
    if (!(checkbox instanceof HTMLInputElement)) {
      return;
    }

    checkbox.addEventListener("change", () => {
      emit({
        kind: "toggleLanguage",
        languageKey: String(checkbox.dataset.languageKey ?? ""),
      });
    });
  });
}

/**
 * Renders the smoke controls layout into one app root.
 *
 * @param {HTMLElement} appRoot Smoke controls app root.
 * @param {SmokeControlsViewSnapshot} snapshot Host snapshot payload.
 * @returns {void}
 */
function renderSmokeControls(
  appRoot: HTMLElement,
  snapshot: SmokeControlsViewSnapshot
): void {
  const languageItems = snapshot.languages
    .map((language) => {
      const checked = language.selected ? "checked" : "";
      const disabled = language.disabled ? "disabled" : "";
      const disabledTitle = language.disabledReason
        ? ` title="${language.disabledReason}"`
        : "";
      const iconElement =
        typeof language.iconUri === "string" && language.iconUri.length > 0
          ? `<img class="smoke-language-icon" src="${language.iconUri}" alt="" aria-hidden="true" />`
          : '<span class="smoke-language-icon smoke-language-icon-fallback" aria-hidden="true"></span>';
      return `<label class="smoke-language-item"${disabledTitle}><input type="checkbox" data-role="language-toggle" data-language-key="${language.languageKey}" ${checked} ${disabled} /><span class="smoke-language-label">${iconElement}<span>${language.label}</span></span></label>`;
    })
    .join("");

  appRoot.innerHTML = `
    <section class="panel" aria-label="Smoke controls">
      <p class="panelDescription">Controls smoke tests run in supported directories.</p>
      <section class="section">
        ${renderSectionHeader("Report Generation", "report")}
        <div class="smoke-markdown-row">
          <label class="smoke-markdown-label" for="smoke-markdown-enabled">
            <input id="smoke-markdown-enabled" type="checkbox" data-role="report-enabled" ${
              snapshot.reportEnabled ? "checked" : ""
            } />
          </label>
          <input
            class="smoke-input"
            type="text"
            data-role="markdown-path"
            placeholder="Optional report path"
            value="${snapshot.markdownPath}"
            ${snapshot.reportEnabled ? "" : "disabled"}
          />
        </div>
        <p class="smoke-helper-text">Enable markdown output and optionally override the generated report path.</p>
        <p class="smoke-status ${snapshot.reportStatusClassName}">${snapshot.reportStatusText}</p>
      </section>
      <section class="section">
        ${renderSectionHeader("Timeouts", "timeout")}
        <div class="smoke-timeout-row">
          <label class="smoke-timeout-field">
            <span>Timeout</span>
            <input class="smoke-input" type="text" data-role="timeout-seconds" value="${snapshot.timeoutSeconds}" />
          </label>
          <label class="smoke-timeout-field">
            <span>Slow Timeout</span>
            <input class="smoke-input" type="text" data-role="slow-timeout-seconds" value="${snapshot.slowTimeoutSeconds}" />
          </label>
        </div>
        <p class="smoke-helper-text">Defaults use timeout. Long-running languages should use slow-timeout.</p>
      </section>
      <section class="section">
        ${renderSectionHeader(
          "Languages",
          "languages",
          '<div class="buttonRow"><button class="button secondary" type="button" data-role="select-all-languages">Select all</button><button class="button secondary" type="button" data-role="deselect-all-languages">Deselect all</button></div>'
        )}
        <div class="smoke-language-list-container">
          <div class="smoke-language-grid">
            ${languageItems}
          </div>
        </div>
        <p class="smoke-status ${snapshot.smokeStatusClassName}">${snapshot.smokeStatusText}</p>
      </section>
    </section>
  `;
}

/**
 * Creates the smoke controls panel UI adapter.
 *
 * @returns {ISmokeControlsUi} Smoke controls UI adapter.
 */
export function createSmokeControlsUi(): ISmokeControlsUi {
  const appRoot = document.querySelector("[data-role='smoke-controls-app']");
  const listeners = new Set<(intent: ViewSmokeControlIntent) => void>();

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

  const applySnapshot = (snapshot: SmokeControlsViewSnapshot): void => {
    if (!(appRoot instanceof HTMLElement)) {
      return;
    }

    renderSmokeControls(appRoot, snapshot);
    bindSmokeControlsHandlers(appRoot, emit);
  };

  applySnapshot({
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

  return {
    onIntent(listener: (intent: ViewSmokeControlIntent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setSnapshot(snapshot: SmokeControlsViewSnapshot): void {
      applySnapshot(snapshot);
    },
  };
}
