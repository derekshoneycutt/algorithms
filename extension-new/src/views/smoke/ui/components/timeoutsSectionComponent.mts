/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type { ISmokeControlsSectionComponent, SmokeControlsViewState } from "./types.mjs";

export class TimeoutsSectionComponent implements ISmokeControlsSectionComponent {
  private readonly state: SmokeControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a timeouts section component.
   *
   * @param {SmokeControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: SmokeControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders the timeouts section.
   *
   * @returns {TemplateResult} Timeouts section template.
   */
  public render(): TemplateResult {
    return html`
      <section class="section">
        ${renderSectionHeader("Timeouts", "timeout")}
        <div class="smoke-timeout-row">
          <label class="smoke-timeout-field">
            <span>Timeout</span>
            <div class="smoke-input-row">
              <input
                class="smoke-input smoke-input-with-clear"
                type="text"
                .value=${this.state.timeoutSeconds}
                @input=${(event: Event) => {
                  const target = event.currentTarget;
                  if (!(target instanceof HTMLInputElement)) {
                    return;
                  }
                  this.state.timeoutSeconds = target.value;
                  this.requestRender();
                }}
              />
              <button
                class="smoke-clear-inline-button ${this.state.timeoutSeconds.length > 0 ? "" : "hidden"}"
                type="button"
                aria-label="Clear timeout"
                title="Clear"
                @click=${() => {
                  this.state.timeoutSeconds = "";
                  this.requestRender();
                }}
              >
                ×
              </button>
            </div>
          </label>
          <label class="smoke-timeout-field">
            <span>Slow Timeout</span>
            <div class="smoke-input-row">
              <input
                class="smoke-input smoke-input-with-clear"
                type="text"
                .value=${this.state.slowTimeoutSeconds}
                @input=${(event: Event) => {
                  const target = event.currentTarget;
                  if (!(target instanceof HTMLInputElement)) {
                    return;
                  }
                  this.state.slowTimeoutSeconds = target.value;
                  this.requestRender();
                }}
              />
              <button
                class="smoke-clear-inline-button ${this.state.slowTimeoutSeconds.length > 0 ? "" : "hidden"}"
                type="button"
                aria-label="Clear slow timeout"
                title="Clear"
                @click=${() => {
                  this.state.slowTimeoutSeconds = "";
                  this.requestRender();
                }}
              >
                ×
              </button>
            </div>
          </label>
        </div>
        <p class="smoke-helper-text">Defaults use timeout. Long-running languages should use slow-timeout.</p>
      </section>
    `;
  }
}
