/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type {
  IRunControlsSectionComponent,
  RunControlsViewState,
  StatusMetadata,
} from "./types.mjs";

/**
 * Renders the profile-sourcing section component.
 */
export class ProfileSourcingSectionComponent implements IRunControlsSectionComponent {
  private readonly state: RunControlsViewState;

  private readonly requestRender: () => void;

  constructor(state: RunControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  private shouldShowSourceProfileClearButton(): boolean {
    return this.state.sourceProfileEnabled && this.state.sourceProfileText.length > 0;
  }

  private getSourceProfileStatus(): StatusMetadata {
    if (!this.state.sourceProfileEnabled) {
      return { text: "Source Profile Unchecked", className: "status-muted" };
    }

    if (this.state.sourceProfileText.length === 0) {
      return { text: "Profile Sourcing Disabled", className: "status-ok" };
    }

    return { text: `Profile: ${this.state.sourceProfileText}`, className: "status-ok" };
  }

  public render(): TemplateResult {
    const sourceProfileStatus = this.getSourceProfileStatus();

    return html`
      <section class="section">
        ${renderSectionHeader("Profile Sourcing", "profile")}
        <div class="inputRow">
          <label class="toggleRow" for="source-profile-enabled">
            <input
              id="source-profile-enabled"
              type="checkbox"
              aria-label="Enable profile sourcing override"
              ?checked=${this.state.sourceProfileEnabled}
              @change=${(event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) {
                  return;
                }
                this.state.sourceProfileEnabled = target.checked;
                this.requestRender();
              }}
            />
          </label>
          <div class="inputWithClear">
            <input
              id="source-profile-text"
              class="argsInput"
              type="text"
              placeholder="profile/path/or/name"
              ?disabled=${!this.state.sourceProfileEnabled}
              .value=${this.state.sourceProfileText}
              @input=${(event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) {
                  return;
                }
                this.state.sourceProfileText = target.value;
                this.requestRender();
              }}
            />
            <button
              id="clear-source-profile"
              class="clearInlineButton ${this.shouldShowSourceProfileClearButton() ? "" : "hidden"}"
              type="button"
              aria-label="Clear source profile"
              title="Clear"
              @click=${() => {
                this.state.sourceProfileText = "";
                this.requestRender();
              }}
            >
              ×
            </button>
          </div>
        </div>
        <span class="status ${sourceProfileStatus.className}">${sourceProfileStatus.text}</span>
        <span class="helperText">If checked and empty, profile sourcing is disabled entirely. If unchecked, system default profile sourcing behavior is used.</span>
      </section>
    `;
  }
}
