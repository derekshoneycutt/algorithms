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
      return `<label class="smoke-language-item"${disabledTitle}><input type="checkbox" data-role="language-toggle" data-language-key="${language.languageKey}" ${checked} ${disabled} /> <span>${language.label}</span></label>`;
    })
    .join("");

  appRoot.innerHTML = `
    <section class="smoke-controls" aria-label="Smoke controls">
      <p class="smoke-controls-status">Status: ${snapshot.statusLabel} (${snapshot.stateValue})</p>
      <fieldset class="smoke-fieldset">
        <legend>Report</legend>
        <label class="smoke-field-row">
          <input type="checkbox" data-role="report-enabled" ${
            snapshot.reportEnabled ? "checked" : ""
          } />
          <span>Enable Markdown report</span>
        </label>
        <label class="smoke-field-row">
          <span>Markdown path</span>
          <input type="text" data-role="markdown-path" value="${snapshot.markdownPath}" />
        </label>
        <p class="smoke-status ${snapshot.reportStatusClassName}">${snapshot.reportStatusText}</p>
      </fieldset>
      <fieldset class="smoke-fieldset">
        <legend>Timeouts</legend>
        <label class="smoke-field-row">
          <span>Timeout seconds</span>
          <input type="text" data-role="timeout-seconds" value="${snapshot.timeoutSeconds}" />
        </label>
        <label class="smoke-field-row">
          <span>Slow timeout seconds</span>
          <input type="text" data-role="slow-timeout-seconds" value="${snapshot.slowTimeoutSeconds}" />
        </label>
      </fieldset>
      <fieldset class="smoke-fieldset">
        <legend>Languages</legend>
        <div class="smoke-language-actions">
          <button type="button" data-role="select-all-languages">Select all</button>
          <button type="button" data-role="deselect-all-languages">Deselect all</button>
        </div>
        <div class="smoke-language-grid">
          ${languageItems}
        </div>
        <p class="smoke-status ${snapshot.smokeStatusClassName}">${snapshot.smokeStatusText}</p>
      </fieldset>
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
