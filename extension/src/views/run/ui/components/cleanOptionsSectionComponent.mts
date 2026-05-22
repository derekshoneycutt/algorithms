/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type {
  IRunControlsSectionComponent,
  RunControlsViewState,
  StatusMetadata,
} from "./types.mjs";

/**
 * Renders the clean-options section component.
 */
export class CleanOptionsSectionComponent implements IRunControlsSectionComponent {
  private readonly state: RunControlsViewState;

  private readonly requestRender: () => void;

  constructor(state: RunControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  private getCleanOptionsStatus(): StatusMetadata {
    const stdlibFlag = this.state.cleanStdlibEnabled ? "y" : "n";
    const archivesFlag = this.state.cleanArchivesEnabled ? "y" : "n";
    return {
      text: `Defaults: ${stdlibFlag}|${archivesFlag} (stdlib|archive)`,
      className: "status-muted",
    };
  }

  public render(): TemplateResult {
    const cleanOptionsStatus = this.getCleanOptionsStatus();

    return html`
      <section class="section">
        ${renderSectionHeader("Clean Options", "clean")}
        <label class="cleanOptionsRow" for="clean-stdlib-enabled">
          <input
            id="clean-stdlib-enabled"
            type="checkbox"
            ?checked=${this.state.cleanStdlibEnabled}
            @change=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }
              this.state.cleanStdlibEnabled = target.checked;
              this.requestRender();
            }}
          />
          <span>Clean Standard Library</span>
        </label>
        <label class="cleanOptionsRow" for="clean-archives-enabled">
          <input
            id="clean-archives-enabled"
            type="checkbox"
            ?checked=${this.state.cleanArchivesEnabled}
            @change=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }
              this.state.cleanArchivesEnabled = target.checked;
              this.requestRender();
            }}
          />
          <span>Clean Archives</span>
        </label>
        <span class="status ${cleanOptionsStatus.className}">${cleanOptionsStatus.text}</span>
      </section>
    `;
  }
}
