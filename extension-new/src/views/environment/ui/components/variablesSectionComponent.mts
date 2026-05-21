/// <reference lib="dom" />

import { html, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type {
  EnvironmentControlsViewState,
  EnvironmentVariableState,
  IEnvironmentControlsSectionComponent,
} from "./types.mjs";

export class VariablesSectionComponent implements IEnvironmentControlsSectionComponent {
  private readonly state: EnvironmentControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a variables section component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: EnvironmentControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders one variable card.
   *
   * @param {EnvironmentVariableState} variable Variable data.
   * @returns {TemplateResult} Variable card template.
   */
  private renderVariableCard(variable: EnvironmentVariableState): TemplateResult {
    return html`
      <div class="variableCard">
        <div class="variableLabel">${variable.label}</div>
        <div class="fieldRow">
          <input
            class="input"
            type="text"
            .value=${variable.value}
            @input=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }

              this.state.variables = this.state.variables.map((candidate) => {
                if (candidate.key !== variable.key) {
                  return candidate;
                }

                return {
                  ...candidate,
                  value: target.value,
                };
              });

              this.requestRender();
            }}
          />
          <button class="button" type="button">Save</button>
        </div>
      </div>
    `;
  }

  /**
   * Renders the variables section.
   *
   * @returns {TemplateResult} Variables section template.
   */
  public render(): TemplateResult {
    return html`
      <section class="section">
        ${renderSectionHeader("Use Environment Variables", "variables")}
        <div class="variableGrid">${this.state.variables.map((variable) => this.renderVariableCard(variable))}</div>
      </section>
    `;
  }
}
