import { html, type TemplateResult } from "lit";

import { CheckEnvironmentSectionComponent } from "./checkEnvironmentSectionComponent.mjs";
import { CopyIconsSectionComponent } from "./copyIconsSectionComponent.mjs";
import { EditModeSectionComponent } from "./editModeSectionComponent.mjs";
import { LanguageRoutingSectionComponent } from "./languageRoutingSectionComponent.mjs";
import { PersistSessionSectionComponent } from "./persistSessionSectionComponent.mjs";
import { ProfileSectionComponent } from "./profileSectionComponent.mjs";
import { VariablesSectionComponent } from "./variablesSectionComponent.mjs";
import type {
  EnvironmentActionHandlers,
  EnvironmentControlsViewState,
  IEnvironmentControlsSectionComponent,
} from "./types.mjs";

const panelDescription = "Controls environment factors for the algorithms project via init.sh.";

export class EnvironmentControlsPanelComponent {
  private readonly editModeSectionComponent: IEnvironmentControlsSectionComponent;

  private readonly persistSessionSectionComponent: IEnvironmentControlsSectionComponent;

  private readonly profileSectionComponent: IEnvironmentControlsSectionComponent;

  private readonly checkEnvironmentSectionComponent: IEnvironmentControlsSectionComponent;

  private readonly copyIconsSectionComponent: IEnvironmentControlsSectionComponent;

  private readonly variablesSectionComponent: IEnvironmentControlsSectionComponent;

  private readonly languageRoutingSectionComponent: IEnvironmentControlsSectionComponent;

  /**
   * Creates the environment controls panel component.
   *
   * @param {EnvironmentControlsViewState} state Shared view state.
   * @param {() => void} requestRender Callback to trigger rerender.
   * @param {EnvironmentActionHandlers} actionHandlers Action callbacks handled by the host bridge.
   */
  public constructor(
    state: EnvironmentControlsViewState,
    requestRender: () => void,
    actionHandlers: EnvironmentActionHandlers,
  ) {
    this.editModeSectionComponent = new EditModeSectionComponent(state, requestRender);
    this.persistSessionSectionComponent = new PersistSessionSectionComponent(state, requestRender);
    this.profileSectionComponent = new ProfileSectionComponent(state, requestRender);
    this.checkEnvironmentSectionComponent = new CheckEnvironmentSectionComponent(
      state,
      requestRender,
      actionHandlers.onCheckEnvironment,
    );
    this.copyIconsSectionComponent = new CopyIconsSectionComponent(
      state,
      requestRender,
      actionHandlers.onCopyIcons,
    );
    this.variablesSectionComponent = new VariablesSectionComponent(
      state,
      requestRender,
      actionHandlers.onSaveVariable,
    );
    this.languageRoutingSectionComponent = new LanguageRoutingSectionComponent(
      state,
      requestRender,
      actionHandlers.onSaveRoutingEntry,
      actionHandlers.onSaveBatchRouting,
    );
  }

  /**
   * Renders the composed environment controls panel.
   *
   * @returns {TemplateResult} Environment controls panel template.
   */
  public render(): TemplateResult {
    return html`
      <section class="panel" aria-label="Environment controls">
        <p class="panelDescription">${panelDescription}</p>
        ${this.editModeSectionComponent.render()}
        ${this.persistSessionSectionComponent.render()}
        ${this.profileSectionComponent.render()}
        ${this.checkEnvironmentSectionComponent.render()}
        ${this.copyIconsSectionComponent.render()}
        ${this.variablesSectionComponent.render()}
        ${this.languageRoutingSectionComponent.render()}
      </section>
    `;
  }
}
