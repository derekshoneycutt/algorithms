import { html, type TemplateResult } from "lit";

import { LanguagesSectionComponent } from "./languagesSectionComponent.mjs";
import { ReportGenerationSectionComponent } from "./reportGenerationSectionComponent.mjs";
import { TimeoutsSectionComponent } from "./timeoutsSectionComponent.mjs";
import type { ISmokeControlsSectionComponent, SmokeControlsViewState } from "./types.mjs";

const smokeControlsDescription = "Controls smoke tests run in supported directories.";

export class SmokeControlsPanelComponent {
  private readonly reportGenerationSectionComponent: ISmokeControlsSectionComponent;

  private readonly timeoutsSectionComponent: ISmokeControlsSectionComponent;

  private readonly languagesSectionComponent: ISmokeControlsSectionComponent;

  /**
   * Creates the smoke controls panel component.
   *
   * @param {SmokeControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: SmokeControlsViewState, requestRender: () => void) {
    this.reportGenerationSectionComponent = new ReportGenerationSectionComponent(state, requestRender);
    this.timeoutsSectionComponent = new TimeoutsSectionComponent(state, requestRender);
    this.languagesSectionComponent = new LanguagesSectionComponent(state, requestRender);
  }

  /**
   * Renders the composed smoke controls panel.
   *
   * @returns {TemplateResult} Smoke controls panel template.
   */
  public render(): TemplateResult {
    return html`
      <section class="panel" aria-label="Smoke controls">
        <p class="panelDescription">${smokeControlsDescription}</p>
        ${this.reportGenerationSectionComponent.render()}
        ${this.timeoutsSectionComponent.render()}
        ${this.languagesSectionComponent.render()}
      </section>
    `;
  }
}
