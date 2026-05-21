import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type { EnvironmentControlsViewState, IEnvironmentControlsSectionComponent } from "./types.mjs";

export class CheckEnvironmentSectionComponent implements IEnvironmentControlsSectionComponent {
  private readonly state: EnvironmentControlsViewState;

  private readonly requestRender: () => void;
  private readonly onCheckEnvironment: () => void;

  /**
   * Creates a check-environment section component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   * @param {() => void} onCheckEnvironment Callback to request host-side check-environment execution.
   */
  public constructor(
    state: EnvironmentControlsViewState,
    requestRender: () => void,
    onCheckEnvironment: () => void,
  ) {
    this.state = state;
    this.requestRender = requestRender;
    this.onCheckEnvironment = onCheckEnvironment;
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
                this.state.checkEnvFilteredOutput = "Running environment check...";
                this.state.checkEnvRawOutput = "Running init.sh --check-env...";
                this.requestRender();
                this.onCheckEnvironment();
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
