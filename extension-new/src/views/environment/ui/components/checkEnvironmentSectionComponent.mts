import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type { EnvironmentControlsViewState, IEnvironmentControlsSectionComponent } from "./types.mjs";

export class CheckEnvironmentSectionComponent implements IEnvironmentControlsSectionComponent {
  private readonly state: EnvironmentControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a check-environment section component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: EnvironmentControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders the check-environment section.
   *
   * @returns {TemplateResult} Check-environment section template.
   */
  public render(): TemplateResult {
    return html`
      <section class="section">
        ${renderSectionHeader(
          "Check Environment",
          "check",
          html`
            <button
              class="button secondary"
              type="button"
              @click=${() => {
                this.state.checkEnvFilteredOutput = "Environment check completed (local UI preview).";
                this.state.checkEnvRawOutput = "No host process is wired yet. This is UI-only mode.";
                this.requestRender();
              }}
            >
              Check Environment
            </button>
          `,
        )}
        <div class="outputBox">${this.state.checkEnvFilteredOutput}</div>
        <details>
          <summary>Raw Output</summary>
          <div class="outputBox">${this.state.checkEnvRawOutput}</div>
        </details>
      </section>
    `;
  }
}
