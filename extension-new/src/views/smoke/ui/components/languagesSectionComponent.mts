/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type {
  ISmokeControlsSectionComponent,
  SmokeControlsViewState,
  SmokeLanguageState,
  StatusClassName,
  StatusMetadata,
} from "./types.mjs";

export class LanguagesSectionComponent implements ISmokeControlsSectionComponent {
  private readonly state: SmokeControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a languages section component.
   *
   * @param {SmokeControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: SmokeControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders the languages section.
   *
   * @returns {TemplateResult} Languages section template.
   */
  public render(): TemplateResult {
    const smokeStatus = this.getSmokeStatus();
    const smokeStatusClass = this.normalizeStatusClassName(smokeStatus.className);

    return html`
      <section class="section">
        ${renderSectionHeader(
          "Languages",
          "languages",
          html`
            <div class="buttonRow">
              <button
                class="button secondary"
                type="button"
                @click=${() => {
                  this.state.languages = this.state.languages.map((language) => ({
                    ...language,
                    selected: language.disabled ? language.selected : true,
                  }));
                  this.requestRender();
                }}
              >
                Select all
              </button>
              <button
                class="button secondary"
                type="button"
                @click=${() => {
                  this.state.languages = this.state.languages.map((language) => ({
                    ...language,
                    selected: false,
                  }));
                  this.requestRender();
                }}
              >
                Deselect all
              </button>
            </div>
          `,
        )}
        <div class="smoke-language-list-container">
          <div class="smoke-language-grid">
            ${this.state.languages.map((language) => this.renderLanguageItem(language))}
          </div>
        </div>
        <p class="smoke-status ${smokeStatusClass}">${smokeStatus.text}</p>
      </section>
    `;
  }

  /**
   * Renders one language row.
   *
   * @param {SmokeLanguageState} language One language row state.
   * @returns {TemplateResult} Language row template.
   */
  private renderLanguageItem(language: SmokeLanguageState): TemplateResult {
    return html`
      <label class="smoke-language-item" title=${language.disabledReason.length > 0 ? language.disabledReason : ""}>
        <input
          type="checkbox"
          ?checked=${language.selected}
          ?disabled=${language.disabled}
          @change=${(event: Event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement)) {
              return;
            }

            this.state.languages = this.state.languages.map((candidate) => {
              if (candidate.languageKey !== language.languageKey) {
                return candidate;
              }

              return {
                ...candidate,
                selected: target.checked,
              };
            });

            this.requestRender();
          }}
        />
        <span class="smoke-language-label">
          <span class="smoke-language-icon smoke-language-icon-fallback" aria-hidden="true"></span>
          <span>${language.label}</span>
        </span>
      </label>
    `;
  }

  /**
   * Returns language-selection status metadata from current state.
   *
   * @returns {StatusMetadata} Languages status metadata.
   */
  private getSmokeStatus(): StatusMetadata {
    const selectedCount = this.state.languages.filter((language) => language.selected).length;
    if (selectedCount === 0) {
      return { text: "Select at least one language", className: "status-error" };
    }

    return {
      text: `${selectedCount} language${selectedCount === 1 ? "" : "s"} selected`,
      className: "status-ok",
    };
  }

  /**
   * Returns a supported status class for markup.
   *
   * @param {StatusClassName} className Candidate class name.
   * @returns {StatusClassName} Normalized class name.
   */
  private normalizeStatusClassName(className: StatusClassName): StatusClassName {
    if (className === "status-ok") {
      return className;
    }

    if (className === "status-error") {
      return className;
    }

    return "status-muted";
  }
}
