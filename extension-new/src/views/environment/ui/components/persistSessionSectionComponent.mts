/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type { EnvironmentControlsViewState, IEnvironmentControlsSectionComponent } from "./types.mjs";

export class PersistSessionSectionComponent implements IEnvironmentControlsSectionComponent {
  private readonly state: EnvironmentControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a persist-session section component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: EnvironmentControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders the persist-session section.
   *
   * @returns {TemplateResult} Persist-session section template.
   */
  public render(): TemplateResult {
    return html`
      <section class="section">
        ${renderSectionHeader("Persist Session", "session")}
        <label class="toggleRow">
          <input
            type="checkbox"
            ?checked=${this.state.persistSessionEnabled}
            @change=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }
              this.state.persistSessionEnabled = target.checked;
              this.requestRender();
            }}
          />
          <span class="checkboxText">Persist Run and Smoke options for this workspace</span>
        </label>
        <div class="helperText">When enabled, Run and Smoke controls are restored across extension reloads in this workspace.</div>
      </section>
    `;
  }
}
