/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type { EnvironmentControlsViewState, IEnvironmentControlsSectionComponent } from "./types.mjs";

export class EditModeSectionComponent implements IEnvironmentControlsSectionComponent {
  private readonly state: EnvironmentControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates an edit-mode section component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: EnvironmentControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders the edit-mode section.
   *
   * @returns {TemplateResult} Edit-mode section template.
   */
  public render(): TemplateResult {
    return html`
      <section class="section">
        ${renderSectionHeader("Edit Mode", "edit")}
        <label class="toggleRow">
          <input
            type="checkbox"
            ?checked=${this.state.editModeEnabled}
            @change=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }

              this.state.editModeEnabled = target.checked;
              this.requestRender();
            }}
          />
          <span class="checkboxText">Enable create/delete actions in tree views</span>
        </label>
        <div class="helperText">
          When enabled, files and folders can be created and deleted from tree views.
          When disabled, create/delete actions are hidden, but flagging and running files remain available.
        </div>
      </section>
    `;
  }
}
