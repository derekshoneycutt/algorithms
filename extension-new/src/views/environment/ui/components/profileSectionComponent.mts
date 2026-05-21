/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type { EnvironmentControlsViewState, IEnvironmentControlsSectionComponent } from "./types.mjs";

export class ProfileSectionComponent implements IEnvironmentControlsSectionComponent {
  private readonly state: EnvironmentControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a profile section component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: EnvironmentControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders the profile section.
   *
   * @returns {TemplateResult} Profile section template.
   */
  public render(): TemplateResult {
    return html`
      <section class="section">
        ${renderSectionHeader(
          "Profile",
          "profile",
          html`<button class="button secondary" type="button">Refresh</button>`,
        )}
        <input
          class="input"
          type="text"
          placeholder=${this.state.profilePlaceholder}
          .value=${this.state.profilePath}
          @input=${(event: Event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement)) {
              return;
            }
            this.state.profilePath = target.value;
            this.requestRender();
          }}
        />
        <div class="effectiveProfile">Effective profile for reads: ${this.state.effectiveProfilePath}</div>
        <div class="helperText">Leave blank to let init.sh use its platform default profile path.</div>
      </section>
    `;
  }
}
