import type { SmokeStatusClassName } from "../../state";

/**
 * Smoke language payload sent to the webview.
 */
export interface SmokeControlsViewLanguage {
  languageKey: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  disabledReason: string;
  iconUri?: string;
}

/**
 * Smoke controls snapshot payload shared with webview.
 */
export interface SmokeControlsViewSnapshot {
  stateValue: string;
  reportEnabled: boolean;
  markdownPath: string;
  timeoutSeconds: string;
  slowTimeoutSeconds: string;
  statusLabel: string;
  reportStatusText: string;
  reportStatusClassName: SmokeStatusClassName;
  smokeStatusText: string;
  smokeStatusClassName: SmokeStatusClassName;
  languages: SmokeControlsViewLanguage[];
}

/**
 * Smoke controls intent sent from the webview.
 */
export type ViewSmokeControlIntent =
  | { kind: "setReportEnabled"; enabled: boolean }
  | { kind: "setMarkdownPath"; markdownPath: string }
  | { kind: "setTimeoutSeconds"; timeoutSeconds: string }
  | { kind: "setSlowTimeoutSeconds"; slowTimeoutSeconds: string }
  | { kind: "toggleLanguage"; languageKey: string }
  | { kind: "selectAllLanguages" }
  | { kind: "deselectAllLanguages" };

/**
 * Message sent from the host runtime to a webview frontend.
 */
export type HostToViewMessage =
  | {
      type: "smoke.snapshot";
      payload: SmokeControlsViewSnapshot;
    };

/**
 * Message sent from a webview frontend to the host runtime.
 */
export type ViewToHostMessage =
  | {
      type: "smoke.ready";
    }
  | {
      type: "smoke.intent";
      payload: ViewSmokeControlIntent;
    };

/**
 * Checks whether one value is a smoke-controls view language entry.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is SmokeControlsViewLanguage} True when the value is a valid language entry.
 */
function isSmokeControlsViewLanguage(value: unknown): value is SmokeControlsViewLanguage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (
    !("languageKey" in value) ||
    typeof value.languageKey !== "string" ||
    !("label" in value) ||
    typeof value.label !== "string" ||
    !("selected" in value) ||
    typeof value.selected !== "boolean" ||
    !("disabled" in value) ||
    typeof value.disabled !== "boolean" ||
    !("disabledReason" in value) ||
    typeof value.disabledReason !== "string"
  ) {
    return false;
  }

  if ("iconUri" in value && value.iconUri !== undefined && typeof value.iconUri !== "string") {
    return false;
  }

  return true;
}

/**
 * Checks whether an unknown value is a valid smoke controls intent.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is ViewSmokeControlIntent} True when the value is a smoke controls intent.
 */
export function isViewSmokeControlIntent(value: unknown): value is ViewSmokeControlIntent {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }

  if (value.kind === "setReportEnabled") {
    return "enabled" in value && typeof value.enabled === "boolean";
  }

  if (value.kind === "setMarkdownPath") {
    return "markdownPath" in value && typeof value.markdownPath === "string";
  }

  if (value.kind === "setTimeoutSeconds") {
    return "timeoutSeconds" in value && typeof value.timeoutSeconds === "string";
  }

  if (value.kind === "setSlowTimeoutSeconds") {
    return (
      "slowTimeoutSeconds" in value && typeof value.slowTimeoutSeconds === "string"
    );
  }

  if (value.kind === "toggleLanguage") {
    return "languageKey" in value && typeof value.languageKey === "string";
  }

  return value.kind === "selectAllLanguages" || value.kind === "deselectAllLanguages";
}

/**
 * Checks whether an unknown value is a host-to-view message.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is HostToViewMessage} True when the value is a valid host-to-view message.
 */
export function isHostToViewMessage(value: unknown): value is HostToViewMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  if (value.type !== "smoke.snapshot") {
    return false;
  }

  return (
    "payload" in value &&
    typeof value.payload === "object" &&
    value.payload !== null &&
    "stateValue" in value.payload &&
    typeof value.payload.stateValue === "string" &&
    "reportEnabled" in value.payload &&
    typeof value.payload.reportEnabled === "boolean" &&
    "markdownPath" in value.payload &&
    typeof value.payload.markdownPath === "string" &&
    "timeoutSeconds" in value.payload &&
    typeof value.payload.timeoutSeconds === "string" &&
    "slowTimeoutSeconds" in value.payload &&
    typeof value.payload.slowTimeoutSeconds === "string" &&
    "statusLabel" in value.payload &&
    typeof value.payload.statusLabel === "string" &&
    "reportStatusText" in value.payload &&
    typeof value.payload.reportStatusText === "string" &&
    "reportStatusClassName" in value.payload &&
    (value.payload.reportStatusClassName === "status-muted" ||
      value.payload.reportStatusClassName === "status-ok" ||
      value.payload.reportStatusClassName === "status-error") &&
    "smokeStatusText" in value.payload &&
    typeof value.payload.smokeStatusText === "string" &&
    "smokeStatusClassName" in value.payload &&
    (value.payload.smokeStatusClassName === "status-muted" ||
      value.payload.smokeStatusClassName === "status-ok" ||
      value.payload.smokeStatusClassName === "status-error") &&
    "languages" in value.payload &&
    Array.isArray(value.payload.languages) &&
    value.payload.languages.every((language) => isSmokeControlsViewLanguage(language))
  );
}

/**
 * Checks whether an unknown value is a view-to-host message.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is ViewToHostMessage} True when the value is a valid view-to-host message.
 */
export function isViewToHostMessage(value: unknown): value is ViewToHostMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  if (value.type === "smoke.ready") {
    return true;
  }

  if (value.type !== "smoke.intent") {
    return false;
  }

  return "payload" in value && isViewSmokeControlIntent(value.payload);
}
