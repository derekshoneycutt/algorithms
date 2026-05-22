/// <reference lib="dom" />

import { html, nothing, type TemplateResult } from "lit";

import { renderSectionHeader } from "./sectionHeader.mjs";
import type {
  EnvironmentControlsViewState,
  EnvironmentRoutingLanguageState,
  IEnvironmentControlsSectionComponent,
} from "./types.mjs";

export class LanguageRoutingSectionComponent implements IEnvironmentControlsSectionComponent {
  private readonly state: EnvironmentControlsViewState;

  private readonly requestRender: () => void;

  /**
   * Creates a language-routing section component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   */
  public constructor(state: EnvironmentControlsViewState, requestRender: () => void) {
    this.state = state;
    this.requestRender = requestRender;
  }

  /**
   * Renders routing badges for one language row.
   *
   * @param {EnvironmentRoutingLanguageState} entry Language routing entry.
   * @returns {TemplateResult} Badge list template.
   */
  private renderLanguageIndicators(entry: EnvironmentRoutingLanguageState): TemplateResult {
    return html`
      ${entry.dockerEnabled ? html`<span class="indicator">docker</span>` : nothing}
      ${entry.sshEnabled ? html`<span class="indicator">ssh</span>` : nothing}
    `;
  }

  /**
   * Renders one language routing editor row.
   *
   * @param {EnvironmentRoutingLanguageState} entry Language routing entry.
   * @returns {TemplateResult} Language row template.
   */
  private renderRoutingLanguageRow(entry: EnvironmentRoutingLanguageState): TemplateResult {
    const iconTemplate =
      entry.iconUri.length > 0
        ? html`<img class="languageIcon" src=${entry.iconUri} alt="" />`
        : html`<span class="languageIconFallback"></span>`;

    return html`
      <details class="languageRow ${entry.isConflict ? "conflict" : ""}">
        <summary class="languageSummary">
          <div class="languageMain">
            ${iconTemplate}
            <span class="languageName">${entry.label}</span>
          </div>
          <div class="indicatorList">${this.renderLanguageIndicators(entry)}</div>
        </summary>
        <div class="editorBody">
          <label class="toggleRow">
            <input
              type="checkbox"
              ?checked=${entry.dockerEnabled}
              @change=${(event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) {
                  return;
                }

                this.state.routingEntries = this.state.routingEntries.map((candidate) => {
                  if (candidate.languageKey !== entry.languageKey) {
                    return candidate;
                  }

                  return {
                    ...candidate,
                    dockerEnabled: target.checked,
                  };
                });

                this.requestRender();
              }}
            />
            <span class="checkboxText">Docker</span>
          </label>
          <input
            class="input"
            type="text"
            placeholder="Docker image"
            .value=${entry.dockerValue}
            ?disabled=${!entry.dockerEnabled}
            @input=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }

              this.state.routingEntries = this.state.routingEntries.map((candidate) => {
                if (candidate.languageKey !== entry.languageKey) {
                  return candidate;
                }

                return {
                  ...candidate,
                  dockerValue: target.value,
                };
              });

              this.requestRender();
            }}
          />

          <label class="toggleRow">
            <input
              type="checkbox"
              ?checked=${entry.sshEnabled}
              @change=${(event: Event) => {
                const target = event.currentTarget;
                if (!(target instanceof HTMLInputElement)) {
                  return;
                }

                this.state.routingEntries = this.state.routingEntries.map((candidate) => {
                  if (candidate.languageKey !== entry.languageKey) {
                    return candidate;
                  }

                  return {
                    ...candidate,
                    sshEnabled: target.checked,
                  };
                });

                this.requestRender();
              }}
            />
            <span class="checkboxText">SSH</span>
          </label>
          <input
            class="input"
            type="text"
            placeholder="SSH route"
            .value=${entry.sshValue}
            ?disabled=${!entry.sshEnabled}
            @input=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }

              this.state.routingEntries = this.state.routingEntries.map((candidate) => {
                if (candidate.languageKey !== entry.languageKey) {
                  return candidate;
                }

                return {
                  ...candidate,
                  sshValue: target.value,
                };
              });

              this.requestRender();
            }}
          />
          <div class="buttonRow">
            <button class="button" type="button">Save</button>
          </div>
        </div>
      </details>
    `;
  }

  /**
   * Renders the routing batch editor section.
   *
   * @returns {TemplateResult} Routing batch section template.
   */
  private renderBatchRoutingSection(): TemplateResult {
    return html`
      <section class="batchSection ${this.state.batchRouting.isConflict ? "conflict" : ""}">
        <div class="subSectionTitle">Batch All</div>
        <label class="toggleRow">
          <input
            type="checkbox"
            ?checked=${this.state.batchRouting.dockerEnabled}
            @change=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }
              this.state.batchRouting = {
                ...this.state.batchRouting,
                dockerEnabled: target.checked,
              };
              this.requestRender();
            }}
          />
          <span class="checkboxText">Docker</span>
        </label>
        <input
          class="input"
          type="text"
          placeholder="Docker image"
          .value=${this.state.batchRouting.dockerValue}
          ?disabled=${!this.state.batchRouting.dockerEnabled}
          @input=${(event: Event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement)) {
              return;
            }
            this.state.batchRouting = {
              ...this.state.batchRouting,
              dockerValue: target.value,
            };
            this.requestRender();
          }}
        />

        <label class="toggleRow">
          <input
            type="checkbox"
            ?checked=${this.state.batchRouting.sshEnabled}
            @change=${(event: Event) => {
              const target = event.currentTarget;
              if (!(target instanceof HTMLInputElement)) {
                return;
              }
              this.state.batchRouting = {
                ...this.state.batchRouting,
                sshEnabled: target.checked,
              };
              this.requestRender();
            }}
          />
          <span class="checkboxText">SSH</span>
        </label>
        <input
          class="input"
          type="text"
          placeholder="SSH route"
          .value=${this.state.batchRouting.sshValue}
          ?disabled=${!this.state.batchRouting.sshEnabled}
          @input=${(event: Event) => {
            const target = event.currentTarget;
            if (!(target instanceof HTMLInputElement)) {
              return;
            }
            this.state.batchRouting = {
              ...this.state.batchRouting,
              sshValue: target.value,
            };
            this.requestRender();
          }}
        />

        <div class="buttonRow">
          <button class="button" type="button">Save</button>
        </div>
      </section>
    `;
  }

  /**
   * Renders the language-routing section.
   *
   * @returns {TemplateResult} Language-routing section template.
   */
  public render(): TemplateResult {
    return html`
      <section class="section">
        ${renderSectionHeader("Language Routing", "routing")}
        <div class="helperText">
          Configure per-language docker or ssh execution targets. SSH route value must use one of two formats:
          <pre>ssh-destination|code-dir|run-script<br />ssh-address|ssh-user|ssh-port|code-dir|run-script</pre>
          Each language should have exactly one target configured (docker or ssh) or none.
        </div>

        ${this.renderBatchRoutingSection()}

        <div class="routingTable">
          ${this.state.routingEntries.map((entry) => this.renderRoutingLanguageRow(entry))}
        </div>
      </section>
    `;
  }
}
