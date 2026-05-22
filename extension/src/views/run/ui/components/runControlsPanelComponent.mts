import { html, type TemplateResult } from "lit";

import { CommandArgumentsSectionComponent } from "./commandArgumentsSectionComponent.mjs";
import { RunChecksSectionComponent } from "./runChecksSectionComponent.mjs";
import { ProfileSourcingSectionComponent } from "./profileSourcingSectionComponent.mjs";
import { CleanOptionsSectionComponent } from "./cleanOptionsSectionComponent.mjs";
import type { RunControlsViewState } from "./types.mjs";

const runControlsDescription = "Controls parameters for all code runs.";

/**
 * Composes run-controls section components into one panel renderer.
 */
export class RunControlsPanelComponent {
  private readonly state: RunControlsViewState;

  private readonly commandArgumentsSection: CommandArgumentsSectionComponent;
  private readonly runChecksSection: RunChecksSectionComponent;
  private readonly profileSourcingSection: ProfileSourcingSectionComponent;
  private readonly cleanOptionsSection: CleanOptionsSectionComponent;

  constructor(state: RunControlsViewState, requestRender: () => void) {
    this.state = state;
    this.commandArgumentsSection = new CommandArgumentsSectionComponent(this.state, requestRender);
    this.runChecksSection = new RunChecksSectionComponent(this.state, requestRender);
    this.profileSourcingSection = new ProfileSourcingSectionComponent(this.state, requestRender);
    this.cleanOptionsSection = new CleanOptionsSectionComponent(this.state, requestRender);
  }

  /**
   * Renders the full run-controls panel.
   *
   * @returns {TemplateResult} Full run controls template.
   */
  public render(): TemplateResult {
    return html`
      <section class="panel" aria-label="Run controls">
        <p class="panelDescription">${runControlsDescription}</p>
        ${this.commandArgumentsSection.render()}
        ${this.runChecksSection.render()}
        ${this.profileSourcingSection.render()}
        ${this.cleanOptionsSection.render()}
      </section>
    `;
  }
}
