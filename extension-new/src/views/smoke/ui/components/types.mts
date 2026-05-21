import type { TemplateResult } from "lit";

export type StatusClassName = "status-muted" | "status-ok" | "status-error";
export type SmokeSectionIconName = "report" | "timeout" | "languages";

export interface SmokeLanguageState {
  languageKey: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  disabledReason: string;
  iconUri: string;
}

export interface SmokeControlsViewState {
  reportEnabled: boolean;
  markdownPath: string;
  timeoutSeconds: string;
  slowTimeoutSeconds: string;
  languages: SmokeLanguageState[];
}

export interface StatusMetadata {
  text: string;
  className: StatusClassName;
}

export interface ISmokeControlsSectionComponent {
  /**
   * Renders one smoke-controls section.
   *
   * @returns {TemplateResult} Rendered section template.
   */
  render(): TemplateResult;
}
