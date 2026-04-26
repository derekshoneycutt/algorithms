import type {
  RunChecksMode,
  RunChecksRoute,
  SmokeStatusClassName,
  ViewStatusClassName,
} from "../../state";

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
 * Run controls snapshot payload shared with webview.
 */
export interface RunControlsViewSnapshot {
  stateValue: string;
  runArgsEnabled: boolean;
  runArgsText: string;
  runArgsStatusText: string;
  runArgsStatusClassName: ViewStatusClassName;
  sourceProfileEnabled: boolean;
  sourceProfileText: string;
  sourceProfileStatusText: string;
  sourceProfileStatusClassName: ViewStatusClassName;
  runChecksMode: RunChecksMode;
  runChecksRoute: RunChecksRoute;
  runChecksStatusText: string;
  runChecksStatusClassName: ViewStatusClassName;
  cleanStdlibEnabled: boolean;
  cleanArchivesEnabled: boolean;
  cleanOptionsStatusText: string;
  cleanOptionsStatusClassName: ViewStatusClassName;
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
 * Run controls intent sent from the webview.
 */
export type ViewRunControlsIntent =
  | { kind: "setRunArgsEnabled"; enabled: boolean }
  | { kind: "setRunArgsText"; text: string }
  | { kind: "setSourceProfileEnabled"; enabled: boolean }
  | { kind: "setSourceProfileText"; text: string }
  | { kind: "setRunChecksMode"; mode: RunChecksMode }
  | { kind: "setRunChecksRoute"; route: RunChecksRoute }
  | { kind: "setCleanStdlibEnabled"; enabled: boolean }
  | { kind: "setCleanArchivesEnabled"; enabled: boolean };

/**
 * Message sent from the host runtime to a webview frontend.
 */
export type HostToViewMessage =
  | {
      type: "smoke.snapshot";
      payload: SmokeControlsViewSnapshot;
    }
  | {
      type: "run.snapshot";
      payload: RunControlsViewSnapshot;
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
    }
  | {
      type: "run.ready";
    }
  | {
      type: "run.intent";
      payload: ViewRunControlsIntent;
    };

/**
 * Checks whether one class name is a valid shared status class.
 *
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is a supported status class.
 */
function isStatusClassName(value: unknown): boolean {
  return value === "status-muted" || value === "status-ok" || value === "status-error";
}

/**
 * Checks whether one value is a run controls snapshot payload.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is RunControlsViewSnapshot} True when the value is valid.
 */
function isRunControlsViewSnapshot(value: unknown): value is RunControlsViewSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "stateValue" in value &&
    typeof value.stateValue === "string" &&
    "runArgsEnabled" in value &&
    typeof value.runArgsEnabled === "boolean" &&
    "runArgsText" in value &&
    typeof value.runArgsText === "string" &&
    "runArgsStatusText" in value &&
    typeof value.runArgsStatusText === "string" &&
    "runArgsStatusClassName" in value &&
    isStatusClassName(value.runArgsStatusClassName) &&
    "sourceProfileEnabled" in value &&
    typeof value.sourceProfileEnabled === "boolean" &&
    "sourceProfileText" in value &&
    typeof value.sourceProfileText === "string" &&
    "sourceProfileStatusText" in value &&
    typeof value.sourceProfileStatusText === "string" &&
    "sourceProfileStatusClassName" in value &&
    isStatusClassName(value.sourceProfileStatusClassName) &&
    "runChecksMode" in value &&
    (value.runChecksMode === "none" ||
      value.runChecksMode === "check-only" ||
      value.runChecksMode === "compile-only") &&
    "runChecksRoute" in value &&
    (value.runChecksRoute === "native" ||
      value.runChecksRoute === "docker" ||
      value.runChecksRoute === "ssh") &&
    "runChecksStatusText" in value &&
    typeof value.runChecksStatusText === "string" &&
    "runChecksStatusClassName" in value &&
    isStatusClassName(value.runChecksStatusClassName) &&
    "cleanStdlibEnabled" in value &&
    typeof value.cleanStdlibEnabled === "boolean" &&
    "cleanArchivesEnabled" in value &&
    typeof value.cleanArchivesEnabled === "boolean" &&
    "cleanOptionsStatusText" in value &&
    typeof value.cleanOptionsStatusText === "string" &&
    "cleanOptionsStatusClassName" in value &&
    isStatusClassName(value.cleanOptionsStatusClassName)
  );
}

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
 * Checks whether an unknown value is a valid run controls intent.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is ViewRunControlsIntent} True when the value is a run controls intent.
 */
export function isViewRunControlsIntent(value: unknown): value is ViewRunControlsIntent {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }

  if (value.kind === "setRunArgsEnabled") {
    return "enabled" in value && typeof value.enabled === "boolean";
  }

  if (value.kind === "setRunArgsText") {
    return "text" in value && typeof value.text === "string";
  }

  if (value.kind === "setSourceProfileEnabled") {
    return "enabled" in value && typeof value.enabled === "boolean";
  }

  if (value.kind === "setSourceProfileText") {
    return "text" in value && typeof value.text === "string";
  }

  if (value.kind === "setRunChecksMode") {
    return (
      "mode" in value &&
      (value.mode === "none" || value.mode === "check-only" || value.mode === "compile-only")
    );
  }

  if (value.kind === "setRunChecksRoute") {
    return (
      "route" in value &&
      (value.route === "native" || value.route === "docker" || value.route === "ssh")
    );
  }

  if (value.kind === "setCleanStdlibEnabled" || value.kind === "setCleanArchivesEnabled") {
    return "enabled" in value && typeof value.enabled === "boolean";
  }

  return false;
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

  if (value.type === "run.snapshot") {
    return "payload" in value && isRunControlsViewSnapshot(value.payload);
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
    isStatusClassName(value.payload.reportStatusClassName) &&
    "smokeStatusText" in value.payload &&
    typeof value.payload.smokeStatusText === "string" &&
    "smokeStatusClassName" in value.payload &&
    isStatusClassName(value.payload.smokeStatusClassName) &&
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

  if (value.type === "run.ready") {
    return true;
  }

  if (value.type === "run.intent") {
    return "payload" in value && isViewRunControlsIntent(value.payload);
  }

  if (value.type !== "smoke.intent") {
    return false;
  }

  return "payload" in value && isViewSmokeControlIntent(value.payload);
}
