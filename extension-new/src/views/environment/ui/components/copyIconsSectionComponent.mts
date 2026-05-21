/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type { EnvironmentControlsViewState, IEnvironmentControlsSectionComponent } from "./types.mjs";

export class CopyIconsSectionComponent implements IEnvironmentControlsSectionComponent {
  private readonly state: EnvironmentControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a copy-icons section component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: EnvironmentControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders the copy-icons section.
   *
   * @returns {TemplateResult} Copy-icons section template.
   */
  public render(): TemplateResult {
    return html`
      <section class="section">
        ${renderSectionHeader(
          "Copy Icons",
          "copy",
          html`<button class="button secondary" type="button">Copy Icons</button>`,
        )}
        <input
          class="input"
          type="text"
          placeholder="Optional destination path"
          .value=${this.state.copyIconsPath}
          @input=${(event: Event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement)) {
              return;
            }
            this.state.copyIconsPath = target.value;
            this.requestRender();
          }}
        />
        <div class="helperText">Skips profile updates.</div>
      </section>
    `;
  }
}
