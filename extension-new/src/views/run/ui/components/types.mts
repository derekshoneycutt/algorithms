import type { TemplateResult } from "lit";

export type RunChecksModeValue = "none" | "compile-only" | "check-only";
export type RunChecksRouteValue = "native" | "docker" | "ssh";
export type StatusClassName = "status-muted" | "status-ok" | "status-error";
export type SectionIconName = "terminal" | "check" | "profile" | "clean";

export interface RunControlsViewState {
  runArgsEnabled: boolean;
  runArgsText: string;
  sourceProfileEnabled: boolean;
  sourceProfileText: string;
  runChecksMode: RunChecksModeValue;
  runChecksRoute: RunChecksRouteValue;
  cleanStdlibEnabled: boolean;
  cleanArchivesEnabled: boolean;
}

export interface StatusMetadata {
  text: string;
  className: StatusClassName;
}

export interface IRunControlsSectionComponent {
  /**
   * Renders one section.
   *
   * @returns {TemplateResult} Rendered section.
   */
  render(): TemplateResult;
}
