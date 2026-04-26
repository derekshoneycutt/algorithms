import type {
  RunControlsViewSnapshot,
  ViewRunControlsIntent,
} from "../../../../comms/shared/messageTypes";

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

interface RunControlsDomNodes {
  runArgsEnabled: HTMLInputElement;
  runArgsText: HTMLInputElement;
  runArgsStatus: HTMLElement;
  clearRunArgs: HTMLButtonElement;
  sourceProfileEnabled: HTMLInputElement;
  sourceProfileText: HTMLInputElement;
  sourceProfileStatus: HTMLElement;
  clearSourceProfile: HTMLButtonElement;
  runChecksModeNone: HTMLInputElement;
  runChecksModeCheckOnly: HTMLInputElement;
  runChecksModeCompileOnly: HTMLInputElement;
  runChecksRoute: HTMLSelectElement;
  runChecksStatus: HTMLElement;
  cleanStdlibEnabled: HTMLInputElement;
  cleanArchivesEnabled: HTMLInputElement;
  cleanOptionsStatus: HTMLElement;
}

const RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME = Object.freeze({
  terminal:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M2 3.5C2 2.67 2.67 2 3.5 2H12.5C13.33 2 14 2.67 14 3.5V12.5C14 13.33 13.33 14 12.5 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M4.5 6L6.75 8L4.5 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M8.5 10H11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    + '</svg>',
  check:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>',
  profile:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
    + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M11.75 4.25L12.5 5L14 3.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>',
  clean:
    '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    + '<path d="M4 4.5C4 3.67 4.67 3 5.5 3H10.5C11.33 3 12 3.67 12 4.5V5.5H4V4.5Z" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M3.5 5.5H12.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M5 5.5V12C5 12.55 5.45 13 6 13H10C10.55 13 11 12.55 11 12V5.5" stroke="currentColor" stroke-width="1"/>'
    + '<path d="M7 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '<path d="M9 7.5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    + '</svg>',
});

/**
 * Renders one section header.
 *
 * @param {string} title Section title.
 * @param {"terminal" | "check" | "profile" | "clean"} iconName Icon key.
 * @returns {string} Section header markup.
 */
function renderSectionHeader(
  title: string,
  iconName: "terminal" | "check" | "profile" | "clean"
): string {
  return `<div class="sectionHeader"><div class="sectionTitleGroup">${RUN_CONTROLS_SECTION_ICON_SVG_BY_NAME[iconName]}<div class="sectionTitle">${title}</div></div></div>`;
}

/**
 * Sets one shared status node.
 *
 * @param {HTMLElement} element Status element.
 * @param {string} text Status text.
 * @param {string} className Status class name.
 * @returns {void}
 */
function setStatus(element: HTMLElement, text: string, className: string): void {
  element.textContent = text;
  element.classList.remove("status-muted", "status-ok", "status-error");
  element.classList.add(className);
}

/**
 * Updates whether the run-checks route selector is interactive.
 *
 * @param {RunControlsDomNodes} nodes DOM node bundle.
 * @returns {void}
 */
function updateRunChecksRouteInteractivity(nodes: RunControlsDomNodes): void {
  nodes.runChecksRoute.disabled = !nodes.runChecksModeCheckOnly.checked;
}

/**
 * Updates clear-button visibility for run args.
 *
 * @param {RunControlsDomNodes} nodes DOM node bundle.
 * @returns {void}
 */
function updateRunArgsClearButtonVisibility(nodes: RunControlsDomNodes): void {
  const shouldShow = !nodes.runArgsText.disabled && nodes.runArgsText.value.length > 0;
  nodes.clearRunArgs.classList.toggle("hidden", !shouldShow);
}

/**
 * Updates clear-button visibility for source profile.
 *
 * @param {RunControlsDomNodes} nodes DOM node bundle.
 * @returns {void}
 */
function updateSourceProfileClearButtonVisibility(nodes: RunControlsDomNodes): void {
  const shouldShow =
    !nodes.sourceProfileText.disabled && nodes.sourceProfileText.value.length > 0;
  nodes.clearSourceProfile.classList.toggle("hidden", !shouldShow);
}

/**
 * Renders the static run controls layout.
 *
 * @param {HTMLElement} appRoot Run controls app root.
 * @returns {RunControlsDomNodes} Queried DOM node bundle.
 */
function renderRunControlsLayout(appRoot: HTMLElement): RunControlsDomNodes {
  appRoot.innerHTML = `
    <section class="panel" aria-label="Run controls">
      <p class="panelDescription">Controls parameters for all code runs.</p>
      <section class="section">
        ${renderSectionHeader("Command Arguments", "terminal")}
        <div class="inputRow">
          <label class="toggleRow" for="run-args-enabled">
            <input id="run-args-enabled" type="checkbox" data-role="run-args-enabled" aria-label="Enable command arguments" />
          </label>
          <div class="inputWithClear">
            <input id="run-args-text" class="argsInput" data-role="run-args-text" type="text" placeholder="--foo=bar &quot;hello world&quot;" disabled />
            <button id="clear-run-args" class="clearInlineButton hidden" data-role="clear-run-args" type="button" aria-label="Clear run args" title="Clear">×</button>
          </div>
        </div>
        <div class="helperText">Enable extra command-line arguments for run.sh and edit them inline.</div>
        <span class="status status-muted" data-role="run-args-status">Arguments Disabled</span>
      </section>
      <section class="section">
        ${renderSectionHeader("Run Checks", "check")}
        <div class="runChecksRow">
          <label class="runChecksOption" for="run-checks-mode-none">
            <input id="run-checks-mode-none" data-role="run-checks-mode-none" name="runChecksMode" type="radio" value="none" checked />
            <span>None</span>
          </label>
          <label class="runChecksOption" for="run-checks-mode-compile-only">
            <input id="run-checks-mode-compile-only" data-role="run-checks-mode-compile-only" name="runChecksMode" type="radio" value="compile-only" />
            <span>Compile Only</span>
          </label>
          <label class="runChecksOption" for="run-checks-mode-check-only">
            <input id="run-checks-mode-check-only" data-role="run-checks-mode-check-only" name="runChecksMode" type="radio" value="check-only" />
            <span>Check Only</span>
          </label>
          <select class="runChecksSelect" data-role="run-checks-route" aria-label="Check-only route" disabled>
            <option value="native">Native</option>
            <option value="docker">Docker</option>
            <option value="ssh">SSH</option>
          </select>
        </div>
        <div class="helperText">Use Compile Only or Check Only to override execution behavior for all runs from the sidebar.</div>
        <span class="status status-muted" data-role="run-checks-status">No Run Check Override</span>
      </section>
      <section class="section">
        ${renderSectionHeader("Profile Sourcing", "profile")}
        <div class="inputRow">
          <label class="toggleRow" for="source-profile-enabled">
            <input id="source-profile-enabled" type="checkbox" data-role="source-profile-enabled" aria-label="Enable profile sourcing override" />
          </label>
          <div class="inputWithClear">
            <input id="source-profile-text" class="argsInput" data-role="source-profile-text" type="text" placeholder="profile/path/or/name" disabled />
            <button id="clear-source-profile" class="clearInlineButton hidden" data-role="clear-source-profile" type="button" aria-label="Clear source profile" title="Clear">×</button>
          </div>
        </div>
        <span class="status status-muted" data-role="source-profile-status">Source Profile Unchecked</span>
        <span class="helperText">If checked and empty, profile sourcing is disabled entirely. If unchecked, system default profile sourcing behavior is used.</span>
      </section>
      <section class="section">
        ${renderSectionHeader("Clean Options", "clean")}
        <label class="cleanOptionsRow" for="clean-stdlib-enabled">
          <input id="clean-stdlib-enabled" type="checkbox" data-role="clean-stdlib-enabled" checked />
          <span>Clean Standard Library</span>
        </label>
        <label class="cleanOptionsRow" for="clean-archives-enabled">
          <input id="clean-archives-enabled" type="checkbox" data-role="clean-archives-enabled" checked />
          <span>Clean Archives</span>
        </label>
        <span class="status status-muted" data-role="clean-options-status">Defaults: y|y (stdlib|archive)</span>
      </section>
    </section>
  `;

  return {
    runArgsEnabled: appRoot.querySelector("[data-role='run-args-enabled']") as HTMLInputElement,
    runArgsText: appRoot.querySelector("[data-role='run-args-text']") as HTMLInputElement,
    runArgsStatus: appRoot.querySelector("[data-role='run-args-status']") as HTMLElement,
    clearRunArgs: appRoot.querySelector("[data-role='clear-run-args']") as HTMLButtonElement,
    sourceProfileEnabled: appRoot.querySelector("[data-role='source-profile-enabled']") as HTMLInputElement,
    sourceProfileText: appRoot.querySelector("[data-role='source-profile-text']") as HTMLInputElement,
    sourceProfileStatus: appRoot.querySelector("[data-role='source-profile-status']") as HTMLElement,
    clearSourceProfile: appRoot.querySelector("[data-role='clear-source-profile']") as HTMLButtonElement,
    runChecksModeNone: appRoot.querySelector("[data-role='run-checks-mode-none']") as HTMLInputElement,
    runChecksModeCheckOnly: appRoot.querySelector("[data-role='run-checks-mode-check-only']") as HTMLInputElement,
    runChecksModeCompileOnly: appRoot.querySelector("[data-role='run-checks-mode-compile-only']") as HTMLInputElement,
    runChecksRoute: appRoot.querySelector("[data-role='run-checks-route']") as HTMLSelectElement,
    runChecksStatus: appRoot.querySelector("[data-role='run-checks-status']") as HTMLElement,
    cleanStdlibEnabled: appRoot.querySelector("[data-role='clean-stdlib-enabled']") as HTMLInputElement,
    cleanArchivesEnabled: appRoot.querySelector("[data-role='clean-archives-enabled']") as HTMLInputElement,
    cleanOptionsStatus: appRoot.querySelector("[data-role='clean-options-status']") as HTMLElement,
  };
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

  const nodes = renderRunControlsLayout(appRoot);

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

  nodes.runArgsEnabled.addEventListener("change", () => {
    nodes.runArgsText.disabled = !nodes.runArgsEnabled.checked;
    updateRunArgsClearButtonVisibility(nodes);
    emit({
      kind: "setRunArgsEnabled",
      enabled: nodes.runArgsEnabled.checked,
    });
  });

  nodes.runArgsText.addEventListener("input", () => {
    updateRunArgsClearButtonVisibility(nodes);
    emit({
      kind: "setRunArgsText",
      text: nodes.runArgsText.value,
    });
  });

  nodes.clearRunArgs.addEventListener("click", () => {
    nodes.runArgsText.value = "";
    updateRunArgsClearButtonVisibility(nodes);
    emit({
      kind: "setRunArgsText",
      text: "",
    });

    if (!nodes.runArgsText.disabled) {
      nodes.runArgsText.focus();
    }
  });

  nodes.sourceProfileEnabled.addEventListener("change", () => {
    nodes.sourceProfileText.disabled = !nodes.sourceProfileEnabled.checked;
    updateSourceProfileClearButtonVisibility(nodes);
    emit({
      kind: "setSourceProfileEnabled",
      enabled: nodes.sourceProfileEnabled.checked,
    });
  });

  nodes.sourceProfileText.addEventListener("input", () => {
    updateSourceProfileClearButtonVisibility(nodes);
    emit({
      kind: "setSourceProfileText",
      text: nodes.sourceProfileText.value,
    });
  });

  nodes.clearSourceProfile.addEventListener("click", () => {
    nodes.sourceProfileText.value = "";
    updateSourceProfileClearButtonVisibility(nodes);
    emit({
      kind: "setSourceProfileText",
      text: "",
    });

    if (!nodes.sourceProfileText.disabled) {
      nodes.sourceProfileText.focus();
    }
  });

  nodes.runChecksModeNone.addEventListener("change", () => {
    if (!nodes.runChecksModeNone.checked) {
      return;
    }

    updateRunChecksRouteInteractivity(nodes);
    emit({ kind: "setRunChecksMode", mode: "none" });
  });

  nodes.runChecksModeCompileOnly.addEventListener("change", () => {
    if (!nodes.runChecksModeCompileOnly.checked) {
      return;
    }

    updateRunChecksRouteInteractivity(nodes);
    emit({ kind: "setRunChecksMode", mode: "compile-only" });
  });

  nodes.runChecksModeCheckOnly.addEventListener("change", () => {
    if (!nodes.runChecksModeCheckOnly.checked) {
      return;
    }

    updateRunChecksRouteInteractivity(nodes);
    emit({ kind: "setRunChecksMode", mode: "check-only" });
  });

  nodes.runChecksRoute.addEventListener("change", () => {
    emit({
      kind: "setRunChecksRoute",
      route: nodes.runChecksRoute.value as "native" | "docker" | "ssh",
    });
  });

  nodes.cleanStdlibEnabled.addEventListener("change", () => {
    emit({
      kind: "setCleanStdlibEnabled",
      enabled: nodes.cleanStdlibEnabled.checked,
    });
  });

  nodes.cleanArchivesEnabled.addEventListener("change", () => {
    emit({
      kind: "setCleanArchivesEnabled",
      enabled: nodes.cleanArchivesEnabled.checked,
    });
  });

  updateRunArgsClearButtonVisibility(nodes);
  updateSourceProfileClearButtonVisibility(nodes);
  updateRunChecksRouteInteractivity(nodes);

  return {
    onIntent(listener: (intent: ViewRunControlsIntent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setSnapshot(snapshot: RunControlsViewSnapshot): void {
      const activeElement = document.activeElement;
      const isRunArgsFocused = activeElement === nodes.runArgsText;
      const isSourceProfileFocused = activeElement === nodes.sourceProfileText;

      nodes.runArgsEnabled.checked = snapshot.runArgsEnabled;
      nodes.runArgsText.disabled = !snapshot.runArgsEnabled;

      if (!isRunArgsFocused) {
        nodes.runArgsText.value = snapshot.runArgsText;
      }

      setStatus(
        nodes.runArgsStatus,
        snapshot.runArgsStatusText,
        snapshot.runArgsStatusClassName
      );

      nodes.sourceProfileEnabled.checked = snapshot.sourceProfileEnabled;
      nodes.sourceProfileText.disabled = !snapshot.sourceProfileEnabled;

      if (!isSourceProfileFocused) {
        nodes.sourceProfileText.value = snapshot.sourceProfileText;
      }

      setStatus(
        nodes.sourceProfileStatus,
        snapshot.sourceProfileStatusText,
        snapshot.sourceProfileStatusClassName
      );

      nodes.runChecksModeNone.checked = snapshot.runChecksMode === "none";
      nodes.runChecksModeCheckOnly.checked = snapshot.runChecksMode === "check-only";
      nodes.runChecksModeCompileOnly.checked = snapshot.runChecksMode === "compile-only";
      nodes.runChecksRoute.value = snapshot.runChecksRoute;
      updateRunChecksRouteInteractivity(nodes);
      setStatus(
        nodes.runChecksStatus,
        snapshot.runChecksStatusText,
        snapshot.runChecksStatusClassName
      );

      nodes.cleanStdlibEnabled.checked = snapshot.cleanStdlibEnabled;
      nodes.cleanArchivesEnabled.checked = snapshot.cleanArchivesEnabled;
      setStatus(
        nodes.cleanOptionsStatus,
        snapshot.cleanOptionsStatusText,
        snapshot.cleanOptionsStatusClassName
      );

      updateRunArgsClearButtonVisibility(nodes);
      updateSourceProfileClearButtonVisibility(nodes);
    },
  };
}