import type { TemplateResult } from "lit";

export type EnvironmentSectionIconName =
  | "edit"
  | "session"
  | "profile"
  | "check"
  | "copy"
  | "variables"
  | "routing";

export type SupportedVariableKey =
  | "timeout"
  | "eiffel"
  | "gcc13Directory"
  | "gcc13Name"
  | "gxx13Name";

export interface EnvironmentVariableState {
  key: SupportedVariableKey;
  label: string;
  value: string;
}

export interface EnvironmentBatchRoutingState {
  dockerEnabled: boolean;
  dockerValue: string;
  sshEnabled: boolean;
  sshValue: string;
  isConflict: boolean;
}

export interface EnvironmentRoutingLanguageState {
  languageKey: string;
  label: string;
  iconUri: string;
  dockerEnabled: boolean;
  dockerValue: string;
  sshEnabled: boolean;
  sshValue: string;
  isConflict: boolean;
}

export interface EnvironmentControlsViewState {
  editModeEnabled: boolean;
  persistSessionEnabled: boolean;
  profilePath: string;
  profilePlaceholder: string;
  effectiveProfilePath: string;
  checkEnvFilteredOutput: string;
  checkEnvRawOutput: string;
  copyIconsPath: string;
  variables: EnvironmentVariableState[];
  batchRouting: EnvironmentBatchRoutingState;
  routingEntries: EnvironmentRoutingLanguageState[];
}

export interface EnvironmentActionHandlers {
  onCheckEnvironment: () => void;
  onCopyIcons: () => void;
}

export interface IEnvironmentControlsSectionComponent {
  /**
   * Renders one environment-controls section.
   *
   * @returns {TemplateResult} Rendered section template.
   */
  render(): TemplateResult;
}
