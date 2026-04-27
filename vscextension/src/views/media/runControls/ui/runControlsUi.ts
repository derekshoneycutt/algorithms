import { html, render, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import type {
  RunControlsViewSnapshot,
  ViewRunControlsIntent,
} from "../../../../comms/shared/messageTypes";

type RunChecksRouteValue = "native" | "docker" | "ssh";

/**
 * Run controls panel UI surface.
 */
export interface IRunControlsUi {
  /**
   * Subscribes to user intents from the run controls UI.
   *
   * @param {(intent: ViewRunControlsIntent) => void} listener Intent listener.
   * @returns {() => void} Unsubscribe callback.
   */
  onIntent(listener: (intent: ViewRunControlsIntent) => void): () => void;

  /**
   * Applies one host snapshot to the run controls UI.
   *
   * @param {RunControlsViewSnapshot} snapshot Host snapshot payload.
   * @returns {void}
   */
  setSnapshot(snapshot: RunControlsViewSnapshot): void;
}

/**
 * Captures active input focus and selection state for one input.
 */
interface FocusedInputState {
  isFocused: boolean;
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  selectionDirection: "forward" | "backward" | "none" | null;
}

/**
 * Captures text input focus state relevant to run controls snapshots.
 */
interface FocusStateSnapshot {
  runArgs: FocusedInputState;
  sourceProfile: FocusedInputState;
}

const RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME = Object.freeze({
  terminal:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M2 3.5C2 2.67 2.67 2 3.5 2H12.5C13.33 2 14 2.67 14 3.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M4.5 6L6.75 8L4.5 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M8.5 10H11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    + "</svg>",
  check:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + "</svg>",
  profile:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
    + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M11.75 4.25L12.5 5L14 3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
    + "</svg>",
  clean:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 4.5C4 3.67 4.67 3 5.5 3H10.5C11.33 3 12 3.67 12 4.5V5.5H4V4.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M3.5 5.5H12.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 5.5V12C5 12.55 5.45 13 6 13H10C10.55 13 11 12.55 11 12V5.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M7 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<path d="M9 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + "</svg>",
});

const INITIAL_SNAPSHOT: RunControlsViewSnapshot = {
  stateValue: "ready",
  runArgsEnabled: false,
  runArgsText: "",
  runArgsStatusText: "Arguments Disabled",
  runArgsStatusClassName: "status-muted",
  sourceProfileEnabled: false,
  sourceProfileText: "",
  sourceProfileStatusText: "Source Profile Unchecked",
  sourceProfileStatusClassName: "status-muted",
  runChecksMode: "none",
  runChecksRoute: "native",
  runChecksStatusText: "No Run Check Override",
  runChecksStatusClassName: "status-muted",
  cleanStdlibEnabled: true,
  cleanArchivesEnabled: true,
  cleanOptionsStatusText: "Defaults: y|y (stdlib|archive)",
  cleanOptionsStatusClassName: "status-muted",
};

/**
 * Returns the normalized status class name for rendering.
 *
 * @param {string} className Input status class.
 * @returns {"status-muted" | "status-ok" | "status-error"} Supported class name.
 */
function normalizeStatusClassName(
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
 * Returns true when the run-checks route selector should be disabled.
 *
 * @param {RunControlsViewSnapshot} snapshot Current run controls snapshot.
 * @returns {boolean} True when the selector is disabled.
 */
function isRunChecksRouteDisabled(snapshot: RunControlsViewSnapshot): boolean {
  return snapshot.runChecksMode !== "check-only";
}

/**
 * Returns true when the run-args clear button should be visible.
 *
 * @param {RunControlsViewSnapshot} snapshot Current run controls snapshot.
 * @returns {boolean} True when clear should be visible.
 */
function shouldShowRunArgsClearButton(snapshot: RunControlsViewSnapshot): boolean {
  return snapshot.runArgsEnabled && snapshot.runArgsText.length > 0;
}

/**
 * Returns true when the source-profile clear button should be visible.
 *
 * @param {RunControlsViewSnapshot} snapshot Current run controls snapshot.
 * @returns {boolean} True when clear should be visible.
 */
function shouldShowSourceProfileClearButton(snapshot: RunControlsViewSnapshot): boolean {
  return snapshot.sourceProfileEnabled && snapshot.sourceProfileText.length > 0;
}

/**
 * Renders one section header.
 *
 * @param {string} title Section title.
 * @param {"terminal" | "check" | "profile" | "clean"} iconName Icon key.
 * @returns {TemplateResult} Section header markup.
 */
function renderSectionHeader(
  title: string,
  iconName: "terminal" | "check" | "profile" | "clean"
): TemplateResult {
  return html`<div class="sectionHeader"><div class="sectionTitleGroup">${unsafeHTML(RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME[iconName])}<div class="sectionTitle">${title}</div></div></div>`;
}

/**
 * Renders the run controls template for one snapshot.
 *
 * @param {RunControlsViewSnapshot} snapshot Current run controls snapshot.
 * @returns {TemplateResult} Lit template.
 */
function renderRunControlsTemplate(snapshot: RunControlsViewSnapshot): TemplateResult {
  const runArgsStatusClass = normalizeStatusClassName(snapshot.runArgsStatusClassName);
  const sourceProfileStatusClass = normalizeStatusClassName(snapshot.sourceProfileStatusClassName);
  const runChecksStatusClass = normalizeStatusClassName(snapshot.runChecksStatusClassName);
  const cleanOptionsStatusClass = normalizeStatusClassName(snapshot.cleanOptionsStatusClassName);

  return html`
    <section class="panel" aria-label="Run controls">
      <p class="panelDescription">Controls parameters for all code runs.</p>
      <section class="section">
        ${renderSectionHeader("Command Arguments", "terminal")}
        <div class="inputRow">
          <label class="toggleRow" for="run-args-enabled">
            <input id="run-args-enabled" type="checkbox" data-role="run-args-enabled" aria-label="Enable command arguments" ?checked=${snapshot.runArgsEnabled} />
          </label>
          <div class="inputWithClear">
            <input
              id="run-args-text"
              class="argsInput"
              data-role="run-args-text"
              type="text"
              placeholder="--foo=bar &quot;hello world&quot;"
              ?disabled=${!snapshot.runArgsEnabled}
              .value=${snapshot.runArgsText}
            />
            <button
              id="clear-run-args"
              class="clearInlineButton ${shouldShowRunArgsClearButton(snapshot) ? "" : "hidden"}"
              data-role="clear-run-args"
              type="button"
              aria-label="Clear run args"
              title="Clear"
            >
              ×
            </button>
          </div>
        </div>
        <div class="helperText">Enable extra command-line arguments for run.sh and edit them inline.</div>
        <span class="status ${runArgsStatusClass}" data-role="run-args-status">${snapshot.runArgsStatusText}</span>
      </section>
      <section class="section">
        ${renderSectionHeader("Run Checks", "check")}
        <div class="runChecksRow">
          <label class="runChecksOption" for="run-checks-mode-none">
            <input id="run-checks-mode-none" data-role="run-checks-mode-none" name="runChecksMode" type="radio" value="none" ?checked=${snapshot.runChecksMode === "none"} />
            <span>None</span>
          </label>
          <label class="runChecksOption" for="run-checks-mode-compile-only">
            <input id="run-checks-mode-compile-only" data-role="run-checks-mode-compile-only" name="runChecksMode" type="radio" value="compile-only" ?checked=${snapshot.runChecksMode === "compile-only"} />
            <span>Compile Only</span>
          </label>
          <label class="runChecksOption" for="run-checks-mode-check-only">
            <input id="run-checks-mode-check-only" data-role="run-checks-mode-check-only" name="runChecksMode" type="radio" value="check-only" ?checked=${snapshot.runChecksMode === "check-only"} />
            <span>Check Only</span>
          </label>
          <select class="runChecksSelect" data-role="run-checks-route" aria-label="Check-only route" ?disabled=${isRunChecksRouteDisabled(snapshot)} .value=${snapshot.runChecksRoute}>
            <option value="native">Native</option>
            <option value="docker">Docker</option>
            <option value="ssh">SSH</option>
          </select>
        </div>
        <div class="helperText">Use Compile Only or Check Only to override execution behavior for all runs from the sidebar.</div>
        <span class="status ${runChecksStatusClass}" data-role="run-checks-status">${snapshot.runChecksStatusText}</span>
      </section>
      <section class="section">
        ${renderSectionHeader("Profile Sourcing", "profile")}
        <div class="inputRow">
          <label class="toggleRow" for="source-profile-enabled">
            <input id="source-profile-enabled" type="checkbox" data-role="source-profile-enabled" aria-label="Enable profile sourcing override" ?checked=${snapshot.sourceProfileEnabled} />
          </label>
          <div class="inputWithClear">
            <input
              id="source-profile-text"
              class="argsInput"
              data-role="source-profile-text"
              type="text"
              placeholder="profile/path/or/name"
              ?disabled=${!snapshot.sourceProfileEnabled}
              .value=${snapshot.sourceProfileText}
            />
            <button
              id="clear-source-profile"
              class="clearInlineButton ${shouldShowSourceProfileClearButton(snapshot) ? "" : "hidden"}"
              data-role="clear-source-profile"
              type="button"
              aria-label="Clear source profile"
              title="Clear"
            >
              ×
            </button>
          </div>
        </div>
        <span class="status ${sourceProfileStatusClass}" data-role="source-profile-status">${snapshot.sourceProfileStatusText}</span>
        <span class="helperText">If checked and empty, profile sourcing is disabled entirely. If unchecked, system default profile sourcing behavior is used.</span>
      </section>
      <section class="section">
        ${renderSectionHeader("Clean Options", "clean")}
        <label class="cleanOptionsRow" for="clean-stdlib-enabled">
          <input id="clean-stdlib-enabled" type="checkbox" data-role="clean-stdlib-enabled" ?checked=${snapshot.cleanStdlibEnabled} />
          <span>Clean Standard Library</span>
        </label>
        <label class="cleanOptionsRow" for="clean-archives-enabled">
          <input id="clean-archives-enabled" type="checkbox" data-role="clean-archives-enabled" ?checked=${snapshot.cleanArchivesEnabled} />
          <span>Clean Archives</span>
        </label>
        <span class="status ${cleanOptionsStatusClass}" data-role="clean-options-status">${snapshot.cleanOptionsStatusText}</span>
      </section>
    </section>
  `;
}

/**
 * Reads one input element by role from the app root.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @param {string} role Data role value.
 * @returns {HTMLInputElement | null} Input element or null.
 */
function getInputByRole(appRoot: HTMLElement, role: string): HTMLInputElement | null {
  const element = appRoot.querySelector(`[data-role='${role}']`);
  if (!(element instanceof HTMLInputElement)) {
    return null;
  }

  return element;
}

/**
 * Reads one button element by role from the app root.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @param {string} role Data role value.
 * @returns {HTMLButtonElement | null} Button element or null.
 */
function getButtonByRole(appRoot: HTMLElement, role: string): HTMLButtonElement | null {
  const element = appRoot.querySelector(`[data-role='${role}']`);
  if (!(element instanceof HTMLButtonElement)) {
    return null;
  }

  return element;
}

/**
 * Captures focus and selection details for one input.
 *
 * @param {HTMLInputElement | null} input Target input.
 * @returns {FocusedInputState} Captured focus state.
 */
function captureFocusedInputState(input: HTMLInputElement | null): FocusedInputState {
  if (input === null || document.activeElement !== input) {
    return {
      isFocused: false,
      value: "",
      selectionStart: null,
      selectionEnd: null,
      selectionDirection: null,
    };
  }

  return {
    isFocused: true,
    value: input.value,
    selectionStart: input.selectionStart,
    selectionEnd: input.selectionEnd,
    selectionDirection: input.selectionDirection,
  };
}

/**
 * Captures current focused input state before one render.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @returns {FocusStateSnapshot} Captured focus state snapshot.
 */
function captureFocusState(appRoot: HTMLElement): FocusStateSnapshot {
  const runArgsInput = getInputByRole(appRoot, "run-args-text");
  const sourceProfileInput = getInputByRole(appRoot, "source-profile-text");

  return {
    runArgs: captureFocusedInputState(runArgsInput),
    sourceProfile: captureFocusedInputState(sourceProfileInput),
  };
}

/**
 * Restores focus and selection for one input state after render.
 *
 * @param {HTMLInputElement | null} input Target input.
 * @param {FocusedInputState} state Captured focus state.
 * @returns {void}
 */
function restoreInputFocusState(
  input: HTMLInputElement | null,
  state: FocusedInputState
): void {
  if (!state.isFocused || input === null || input.disabled) {
    return;
  }

  input.focus();
  if (state.selectionStart !== null && state.selectionEnd !== null) {
    input.setSelectionRange(
      state.selectionStart,
      state.selectionEnd,
      state.selectionDirection ?? undefined
    );
  }
}

/**
 * Restores focus state after one render.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @param {FocusStateSnapshot} focusState Captured focus state.
 * @returns {void}
 */
function restoreFocusState(appRoot: HTMLElement, focusState: FocusStateSnapshot): void {
  restoreInputFocusState(getInputByRole(appRoot, "run-args-text"), focusState.runArgs);
  restoreInputFocusState(
    getInputByRole(appRoot, "source-profile-text"),
    focusState.sourceProfile
  );
}

/**
 * Updates clear-button visibility for run args.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @returns {void}
 */
function updateRunArgsClearButtonVisibility(appRoot: HTMLElement): void {
  const input = getInputByRole(appRoot, "run-args-text");
  const clearButton = getButtonByRole(appRoot, "clear-run-args");
  if (input === null || clearButton === null) {
    return;
  }

  const shouldShow = !input.disabled && input.value.length > 0;
  clearButton.classList.toggle("hidden", !shouldShow);
}

/**
 * Updates clear-button visibility for source profile.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @returns {void}
 */
function updateSourceProfileClearButtonVisibility(appRoot: HTMLElement): void {
  const input = getInputByRole(appRoot, "source-profile-text");
  const clearButton = getButtonByRole(appRoot, "clear-source-profile");
  if (input === null || clearButton === null) {
    return;
  }

  const shouldShow = !input.disabled && input.value.length > 0;
  clearButton.classList.toggle("hidden", !shouldShow);
}

/**
 * Updates whether the run-checks route selector is interactive.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @returns {void}
 */
function updateRunChecksRouteInteractivity(appRoot: HTMLElement): void {
  const checkOnly = getInputByRole(appRoot, "run-checks-mode-check-only");
  const routeSelector = appRoot.querySelector("[data-role='run-checks-route']");
  if (!(routeSelector instanceof HTMLSelectElement) || checkOnly === null) {
    return;
  }

  routeSelector.disabled = !checkOnly.checked;
}

/**
 * Returns true when one string is a supported run-checks route.
 *
 * @param {string} value Candidate route.
 * @returns {value is RunChecksRoute} True when route is supported.
 */
function isRunChecksRoute(value: string): value is RunChecksRouteValue {
  return value === "native" || value === "docker" || value === "ssh";
}

/**
 * Applies one snapshot to the run controls root using Lit.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @param {RunControlsViewSnapshot} snapshot Snapshot to render.
 * @returns {void}
 */
function applySnapshot(appRoot: HTMLElement, snapshot: RunControlsViewSnapshot): void {
  const focusState = captureFocusState(appRoot);
  let nextSnapshot = snapshot;

  if (focusState.runArgs.isFocused) {
    nextSnapshot = {
      ...nextSnapshot,
      runArgsText: focusState.runArgs.value,
    };
  }

  if (focusState.sourceProfile.isFocused) {
    nextSnapshot = {
      ...nextSnapshot,
      sourceProfileText: focusState.sourceProfile.value,
    };
  }

  render(renderRunControlsTemplate(nextSnapshot), appRoot);
  restoreFocusState(appRoot, focusState);
  updateRunChecksRouteInteractivity(appRoot);
  updateRunArgsClearButtonVisibility(appRoot);
  updateSourceProfileClearButtonVisibility(appRoot);
}

/**
 * Creates the run controls UI adapter.
 *
 * @returns {IRunControlsUi} Run controls UI adapter.
 */
export function createRunControlsUi(): IRunControlsUi {
  const appRoot = document.querySelector("[data-role='run-controls-app']");
  const listeners = new Set<(intent: ViewRunControlsIntent) => void>();

  if (!(appRoot instanceof HTMLElement)) {
    return {
      onIntent(listener: (intent: ViewRunControlsIntent) => void): () => void {
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
   * @param {ViewRunControlsIntent} intent Run controls intent.
   * @returns {void}
   */
  function emit(intent: ViewRunControlsIntent): void {
    for (const listener of listeners) {
      listener(intent);
    }
  }

  applySnapshot(appRoot, INITIAL_SNAPSHOT);

  appRoot.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      const role = String(target.dataset.role || "");

      if (role === "run-args-enabled") {
        const runArgsText = getInputByRole(appRoot, "run-args-text");
        if (runArgsText !== null) {
          runArgsText.disabled = !target.checked;
        }
        updateRunArgsClearButtonVisibility(appRoot);
        emit({
          kind: "setRunArgsEnabled",
          enabled: target.checked,
        });
        return;
      }

      if (role === "source-profile-enabled") {
        const sourceProfileText = getInputByRole(appRoot, "source-profile-text");
        if (sourceProfileText !== null) {
          sourceProfileText.disabled = !target.checked;
        }
        updateSourceProfileClearButtonVisibility(appRoot);
        emit({
          kind: "setSourceProfileEnabled",
          enabled: target.checked,
        });
        return;
      }

      if (role === "run-checks-mode-none") {
        if (!target.checked) {
          return;
        }

        updateRunChecksRouteInteractivity(appRoot);
        emit({ kind: "setRunChecksMode", mode: "none" });
        return;
      }

      if (role === "run-checks-mode-compile-only") {
        if (!target.checked) {
          return;
        }

        updateRunChecksRouteInteractivity(appRoot);
        emit({ kind: "setRunChecksMode", mode: "compile-only" });
        return;
      }

      if (role === "run-checks-mode-check-only") {
        if (!target.checked) {
          return;
        }

        updateRunChecksRouteInteractivity(appRoot);
        emit({ kind: "setRunChecksMode", mode: "check-only" });
        return;
      }

      if (role === "clean-stdlib-enabled") {
        emit({
          kind: "setCleanStdlibEnabled",
          enabled: target.checked,
        });
        return;
      }

      if (role === "clean-archives-enabled") {
        emit({
          kind: "setCleanArchivesEnabled",
          enabled: target.checked,
        });
      }
      return;
    }

    if (target instanceof HTMLSelectElement) {
      const role = String(target.dataset.role || "");
      if (role !== "run-checks-route" || !isRunChecksRoute(target.value)) {
        return;
      }

      emit({
        kind: "setRunChecksRoute",
        route: target.value,
      });
    }
  });

  appRoot.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const role = String(target.dataset.role || "");
    if (role === "run-args-text") {
      updateRunArgsClearButtonVisibility(appRoot);
      emit({
        kind: "setRunArgsText",
        text: target.value,
      });
      return;
    }

    if (role === "source-profile-text") {
      updateSourceProfileClearButtonVisibility(appRoot);
      emit({
        kind: "setSourceProfileText",
        text: target.value,
      });
    }
  });

  appRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const role = String(target.dataset.role || "");
    if (role === "clear-run-args") {
      const runArgsInput = getInputByRole(appRoot, "run-args-text");
      if (runArgsInput === null) {
        return;
      }

      runArgsInput.value = "";
      updateRunArgsClearButtonVisibility(appRoot);
      emit({
        kind: "setRunArgsText",
        text: "",
      });

      if (!runArgsInput.disabled) {
        runArgsInput.focus();
      }
      return;
    }

    if (role === "clear-source-profile") {
      const sourceProfileInput = getInputByRole(appRoot, "source-profile-text");
      if (sourceProfileInput === null) {
        return;
      }

      sourceProfileInput.value = "";
      updateSourceProfileClearButtonVisibility(appRoot);
      emit({
        kind: "setSourceProfileText",
        text: "",
      });

      if (!sourceProfileInput.disabled) {
        sourceProfileInput.focus();
      }
    }
  });

  return {
    onIntent(listener: (intent: ViewRunControlsIntent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setSnapshot(snapshot: RunControlsViewSnapshot): void {
      applySnapshot(appRoot, snapshot);
    },
  };
}
