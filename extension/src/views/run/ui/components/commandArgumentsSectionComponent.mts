/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type {
  IRunControlsSectionComponent,
  RunControlsViewState,
  StatusMetadata,
} from "./types.mjs";

/**
 * Renders the command-arguments section component.
 */
export class CommandArgumentsSectionComponent implements IRunControlsSectionComponent {
  private readonly state: RunControlsViewState;

  private readonly requestRender: () => void;

  constructor(state: RunControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  private shouldShowRunArgsClearButton(): boolean {
    return this.state.runArgsEnabled && this.state.runArgsText.length > 0;
  }

  private getRunArgsStatus(): StatusMetadata {
    if (!this.state.runArgsEnabled) {
      return { text: "Arguments Disabled", className: "status-muted" };
    }

    if (this.state.runArgsText.length === 0) {
      return { text: "Arguments Enabled", className: "status-ok" };
    }

    return { text: `Arguments: ${this.state.runArgsText}`, className: "status-ok" };
  }

  public render(): TemplateResult {
    const runArgsStatus = this.getRunArgsStatus();

    return html`
      <section class="section">
        ${renderSectionHeader("Command Arguments", "terminal")}
        <div class="inputRow">
          <label class="toggleRow" for="run-args-enabled">
            <input
              id="run-args-enabled"
              type="checkbox"
              aria-label="Enable command arguments"
              ?checked=${this.state.runArgsEnabled}
              @change=${(event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) {
                  return;
                }
                this.state.runArgsEnabled = target.checked;
                this.requestRender();
              }}
            />
          </label>
          <div class="inputWithClear">
            <input
              id="run-args-text"
              class="argsInput"
              type="text"
              placeholder="--foo=bar &quot;hello world&quot;"
              ?disabled=${!this.state.runArgsEnabled}
              .value=${this.state.runArgsText}
              @input=${(event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) {
                  return;
                }
                this.state.runArgsText = target.value;
                this.requestRender();
              }}
            />
            <button
              id="clear-run-args"
              class="clearInlineButton ${this.shouldShowRunArgsClearButton() ? "" : "hidden"}"
              type="button"
              aria-label="Clear run args"
              title="Clear"
              @click=${() => {
                this.state.runArgsText = "";
                this.requestRender();
              }}
            >
              ×
            </button>
          </div>
        </div>
        <div class="helperText">Enable extra command-line arguments for run.sh and edit them inline.</div>
        <span class="status ${runArgsStatus.className}">${runArgsStatus.text}</span>
      </section>
    `;
  }
}
