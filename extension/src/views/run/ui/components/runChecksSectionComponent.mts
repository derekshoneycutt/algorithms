/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type {
  IRunControlsSectionComponent,
  RunChecksRouteValue,
  RunControlsViewState,
  StatusMetadata,
} from "./types.mjs";

/**
 * Renders the run-checks section component.
 */
export class RunChecksSectionComponent implements IRunControlsSectionComponent {
  private readonly state: RunControlsViewState;

  private readonly requestRender: () => void;

  constructor(state: RunControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  private isRunChecksRouteDisabled(): boolean {
    return this.state.runChecksMode !== "check-only";
  }

  private getRunChecksStatus(): StatusMetadata {
    if (this.state.runChecksMode === "none") {
      return { text: "No Run Check Override", className: "status-muted" };
    }

    if (this.state.runChecksMode === "compile-only") {
      return { text: "Compile Only Mode", className: "status-ok" };
    }

    return {
      text: `Check Only via ${this.state.runChecksRoute.toUpperCase()}`,
      className: "status-ok",
    };
  }

  public render(): TemplateResult {
    const runChecksStatus = this.getRunChecksStatus();

    return html`
      <section class="section">
        ${renderSectionHeader("Run Checks", "check")}
        <div class="runChecksRow">
          <label class="runChecksOption" for="run-checks-mode-none">
            <input
              id="run-checks-mode-none"
              name="runChecksMode"
              type="radio"
              value="none"
              ?checked=${this.state.runChecksMode === "none"}
              @change=${() => {
                this.state.runChecksMode = "none";
                this.requestRender();
              }}
            />
            <span>None</span>
          </label>
          <label class="runChecksOption" for="run-checks-mode-compile-only">
            <input
              id="run-checks-mode-compile-only"
              name="runChecksMode"
              type="radio"
              value="compile-only"
              ?checked=${this.state.runChecksMode === "compile-only"}
              @change=${() => {
                this.state.runChecksMode = "compile-only";
                this.requestRender();
              }}
            />
            <span>Compile Only</span>
          </label>
          <label class="runChecksOption" for="run-checks-mode-check-only">
            <input
              id="run-checks-mode-check-only"
              name="runChecksMode"
              type="radio"
              value="check-only"
              ?checked=${this.state.runChecksMode === "check-only"}
              @change=${() => {
                this.state.runChecksMode = "check-only";
                this.requestRender();
              }}
            />
            <span>Check Only</span>
          </label>
          <select
            class="runChecksSelect"
            aria-label="Check-only route"
            ?disabled=${this.isRunChecksRouteDisabled()}
            .value=${this.state.runChecksRoute}
            @change=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLSelectElement)) {
                return;
              }
              this.state.runChecksRoute = target.value as RunChecksRouteValue;
              this.requestRender();
            }}
          >
            <option value="native">Native</option>
            <option value="docker">Docker</option>
            <option value="ssh">SSH</option>
          </select>
        </div>
        <div class="helperText">Use Compile Only or Check Only to override execution behavior for all runs from the sidebar.</div>
        <span class="status ${runChecksStatus.className}">${runChecksStatus.text}</span>
      </section>
    `;
  }
}
