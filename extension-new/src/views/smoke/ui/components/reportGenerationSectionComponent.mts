/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type {
  ISmokeControlsSectionComponent,
  SmokeControlsViewState,
  StatusClassName,
  StatusMetadata,
} from "./types.mjs";

export class ReportGenerationSectionComponent implements ISmokeControlsSectionComponent {
  private readonly state: SmokeControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a report-generation section component.
   *
   * @param {SmokeControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: SmokeControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders the report-generation section.
   *
   * @returns {TemplateResult} Report-generation section template.
   */
  public render(): TemplateResult {
    const reportStatus = this.getReportStatus();
    const reportStatusClass = this.normalizeStatusClassName(reportStatus.className);

    return html`
      <section class="section">
        ${renderSectionHeader("Report Generation", "report")}
        <div class="smoke-markdown-row">
          <label class="smoke-markdown-label" for="smoke-markdown-enabled">
            <input
              id="smoke-markdown-enabled"
              type="checkbox"
              ?checked=${this.state.reportEnabled}
              @change=${(event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) {
                  return;
                }
                this.state.reportEnabled = target.checked;
                this.requestRender();
              }}
            />
          </label>
          <div class="smoke-input-row">
            <input
              class="smoke-input smoke-input-with-clear"
              type="text"
              placeholder="Optional report path"
              .value=${this.state.markdownPath}
              ?disabled=${!this.state.reportEnabled}
              @input=${(event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) {
                  return;
                }
                this.state.markdownPath = target.value;
                this.requestRender();
              }}
            />
            <button
              class="smoke-clear-inline-button ${this.state.reportEnabled && this.state.markdownPath.length > 0 ? "" : "hidden"}"
              type="button"
              aria-label="Clear markdown path"
              title="Clear"
              @click=${() => {
                this.state.markdownPath = "";
                this.requestRender();
              }}
            >
              ×
            </button>
          </div>
        </div>
        <p class="smoke-helper-text">Enable markdown output and optionally override the generated report path.</p>
        <p class="smoke-status ${reportStatusClass}">${reportStatus.text}</p>
      </section>
    `;
  }

  /**
   * Returns report status metadata from current state.
   *
   * @returns {StatusMetadata} Report status metadata.
   */
  private getReportStatus(): StatusMetadata {
    if (!this.state.reportEnabled) {
      return { text: "No report generated.", className: "status-muted" };
    }

    if (this.state.markdownPath.length === 0) {
      return { text: "Report enabled (default path).", className: "status-ok" };
    }

    return { text: `Report path: ${this.state.markdownPath}`, className: "status-ok" };
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
