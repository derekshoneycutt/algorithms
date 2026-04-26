import type {
  ConductorCancelRunInput,
  ConductorMarkCompletedInput,
  ConductorMarkFailedInput,
  ConductorMarkProgressInput,
  ConductorRunControlsIntent,
  ConductorRunControlsReaction,
  ConductorSmokeReaction,
  ConductorRunSnapshot,
  ConductorSmokeIntent,
  ConductorStartRunInput,
  IConductor,
} from "./IConductor";
import type { RunControlsSettings, SmokeControlsSettings, SmokeLanguageSelection } from "../state";
import {
  createCleanOptionsStatus,
  createRunArgsStatus,
  createRunChecksStatus,
  createSourceProfileStatus,
} from "../state";

let nextRunSequence = 1;

/**
 * Creates one bootstrap run snapshot.
 *
 * @param {ConductorStartRunInput} input Start input.
 * @returns {ConductorRunSnapshot} Initial run snapshot.
 */
function createBootstrapRunSnapshot(
  input: ConductorStartRunInput
): ConductorRunSnapshot {
  const now = Date.now();
  const runId = `conductor:${input.ownerKey}:${nextRunSequence}`;
  nextRunSequence += 1;

  return {
    runId,
    ownerKey: input.ownerKey,
    status: "starting",
    startedAt: now,
    updatedAt: now,
    message: input.reason ?? null,
    progressPercent: null,
    stepKey: null,
    errorMessage: null,
  };
}

/**
 * Creates a deterministic smoke reaction output for one intent.
 *
 * @param {ConductorSmokeIntent} intent Smoke controls intent.
 * @returns {ConductorSmokeReaction} Reaction result.
 */
function createSmokeReportStatus(settings: SmokeControlsSettings): {
  text: string;
  className: "status-muted" | "status-ok" | "status-error";
} {
  if (!settings.reportEnabled) {
    return {
      text: "No report generated.",
      className: "status-muted",
    };
  }

  const reportPath = settings.markdownPath.trim();
  if (reportPath.length === 0) {
    return {
      text: "Report generated at default smoke-test path.",
      className: "status-ok",
    };
  }

  return {
    text: `Report generated at: ${reportPath}`,
    className: "status-ok",
  };
}

/**
 * Creates smoke language-selection status metadata.
 *
 * @param {SmokeLanguageSelection[]} languages Current smoke language list.
 * @returns {{text: string, className: "status-muted" | "status-ok" | "status-error"}} Status metadata.
 */
function createSmokeSelectionStatus(languages: SmokeLanguageSelection[]): {
  text: string;
  className: "status-muted" | "status-ok" | "status-error";
} {
  const selectableCount = languages.filter((language) => !language.disabled).length;
  const selectedCount = languages.filter((language) => language.selected).length;

  if (selectedCount === 0) {
    return {
      text: "Select at least one language",
      className: "status-error",
    };
  }

  if (selectableCount > 0 && selectedCount === selectableCount) {
    return {
      text: "All languages selected (omit --langs)",
      className: "status-muted",
    };
  }

  return {
    text: `${selectedCount} smoke languages selected`,
    className: "status-ok",
  };
}

/**
 * Projects the next smoke-controls settings for one intent.
 *
 * @param {SmokeControlsSettings} settings Current smoke controls settings.
 * @param {ConductorSmokeIntent} intent Incoming smoke intent.
 * @returns {SmokeControlsSettings} Projected smoke controls settings.
 */
function projectSmokeSettings(
  settings: SmokeControlsSettings,
  intent: ConductorSmokeIntent
): SmokeControlsSettings {
  const languages = settings.languages.map((language) => {
    return {
      ...language,
    };
  });

  if (intent.kind === "setReportEnabled") {
    return {
      ...settings,
      languages,
      reportEnabled: intent.enabled,
    };
  }

  if (intent.kind === "setMarkdownPath") {
    return {
      ...settings,
      languages,
      markdownPath: intent.markdownPath,
    };
  }

  if (intent.kind === "setTimeoutSeconds") {
    return {
      ...settings,
      languages,
      timeoutSeconds: intent.timeoutSeconds,
    };
  }

  if (intent.kind === "setSlowTimeoutSeconds") {
    return {
      ...settings,
      languages,
      slowTimeoutSeconds: intent.slowTimeoutSeconds,
    };
  }

  if (intent.kind === "toggleLanguage") {
    return {
      ...settings,
      languages: languages.map((language) => {
        if (language.languageKey !== intent.languageKey || language.disabled) {
          return language;
        }

        return {
          ...language,
          selected: !language.selected,
        };
      }),
    };
  }

  if (intent.kind === "selectAllLanguages") {
    return {
      ...settings,
      languages: languages.map((language) => {
        if (language.disabled) {
          return {
            ...language,
            selected: false,
          };
        }

        return {
          ...language,
          selected: true,
        };
      }),
    };
  }

  return {
    ...settings,
    languages: languages.map((language) => {
      return {
        ...language,
        selected: false,
      };
    }),
  };
}

/**
 * Creates a deterministic smoke reaction output for one intent.
 *
 * @param {ConductorSmokeIntent} intent Smoke controls intent.
 * @param {SmokeControlsSettings} settings Current smoke settings.
 * @returns {ConductorSmokeReaction} Reaction result.
 */
function createSmokeIntentReaction(
  intent: ConductorSmokeIntent,
  settings: SmokeControlsSettings
): ConductorSmokeReaction {
  const stateEvents = [] as ConductorSmokeReaction["stateEvents"];

  if (intent.kind === "setReportEnabled") {
    stateEvents.push({ type: "SMOKE_REPORT_ENABLED_SET", enabled: intent.enabled });
  }

  if (intent.kind === "setMarkdownPath") {
    stateEvents.push({ type: "SMOKE_MARKDOWN_PATH_SET", path: intent.markdownPath });
  }

  if (intent.kind === "setTimeoutSeconds") {
    stateEvents.push({ type: "SMOKE_TIMEOUT_SECONDS_SET", seconds: intent.timeoutSeconds });
  }

  if (intent.kind === "setSlowTimeoutSeconds") {
    stateEvents.push({
      type: "SMOKE_SLOW_TIMEOUT_SECONDS_SET",
      seconds: intent.slowTimeoutSeconds,
    });
  }

  if (intent.kind === "toggleLanguage") {
    const targetedLanguage = settings.languages.find((language) => {
      return language.languageKey === intent.languageKey;
    });

    if (targetedLanguage !== undefined && !targetedLanguage.disabled) {
      stateEvents.push({ type: "SMOKE_LANGUAGE_TOGGLED", languageKey: intent.languageKey });
    }
  }

  if (intent.kind === "selectAllLanguages") {
    stateEvents.push({ type: "SMOKE_ALL_LANGUAGES_SELECTED" });
  }

  if (intent.kind === "deselectAllLanguages") {
    stateEvents.push({ type: "SMOKE_ALL_LANGUAGES_DESELECTED" });
  }

  const projectedSettings = projectSmokeSettings(settings, intent);
  const reportStatus = createSmokeReportStatus(projectedSettings);
  const selectionStatus = createSmokeSelectionStatus(projectedSettings.languages);

  stateEvents.push({
    type: "SMOKE_REPORT_STATUS_SET",
    statusText: reportStatus.text,
    statusClassName: reportStatus.className,
  });
  stateEvents.push({
    type: "SMOKE_SELECTION_STATUS_SET",
    statusText: selectionStatus.text,
    statusClassName: selectionStatus.className,
  });
  stateEvents.push({
    type: "SMOKE_STATUS_LABEL_SET",
    statusLabel: selectionStatus.text,
  });

  if (intent.kind === "setReportEnabled") {
    return {
      stateEvents,
      notification: {
        level: "info",
        message: intent.enabled
          ? "Smoke markdown report enabled"
          : "Smoke markdown report disabled",
      },
      shouldPublishSnapshot: true,
    };
  }

  if (intent.kind === "selectAllLanguages") {
    return {
      stateEvents,
      notification: {
        level: "info",
        message: "All smoke languages selected",
      },
      shouldPublishSnapshot: true,
    };
  }

  if (intent.kind === "deselectAllLanguages") {
    return {
      stateEvents,
      notification: {
        level: "warn",
        message: "All smoke languages deselected",
      },
      shouldPublishSnapshot: true,
    };
  }

  return {
    stateEvents,
    notification: null,
    shouldPublishSnapshot: true,
  };
}

/**
 * Projects the next run-controls settings for one intent.
 *
 * @param {RunControlsSettings} settings Current run controls settings.
 * @param {ConductorRunControlsIntent} intent Incoming run controls intent.
 * @returns {RunControlsSettings} Projected run controls settings.
 */
function projectRunControlsSettings(
  settings: RunControlsSettings,
  intent: ConductorRunControlsIntent
): RunControlsSettings {
  if (intent.kind === "setRunArgsEnabled") {
    return {
      ...settings,
      runArgsEnabled: intent.enabled,
    };
  }

  if (intent.kind === "setRunArgsText") {
    return {
      ...settings,
      runArgsText: intent.text,
    };
  }

  if (intent.kind === "setSourceProfileEnabled") {
    return {
      ...settings,
      sourceProfileEnabled: intent.enabled,
    };
  }

  if (intent.kind === "setSourceProfileText") {
    return {
      ...settings,
      sourceProfileText: intent.text,
    };
  }

  if (intent.kind === "setRunChecksMode") {
    const nextRoute = intent.mode === "check-only" ? settings.runChecksRoute : settings.runChecksRoute;

    return {
      ...settings,
      runChecksMode: intent.mode,
      runChecksRoute: nextRoute,
    };
  }

  if (intent.kind === "setRunChecksRoute") {
    return {
      ...settings,
      runChecksRoute: intent.route,
    };
  }

  if (intent.kind === "setCleanStdlibEnabled") {
    return {
      ...settings,
      cleanStdlibEnabled: intent.enabled,
    };
  }

  return {
    ...settings,
    cleanArchivesEnabled: intent.enabled,
  };
}

/**
 * Creates a deterministic run controls reaction output for one intent.
 *
 * @param {ConductorRunControlsIntent} intent Run controls intent.
 * @param {RunControlsSettings} settings Current run controls settings.
 * @returns {ConductorRunControlsReaction} Reaction result.
 */
function createRunControlsIntentReaction(
  intent: ConductorRunControlsIntent,
  settings: RunControlsSettings
): ConductorRunControlsReaction {
  const stateEvents = [] as ConductorRunControlsReaction["stateEvents"];

  if (intent.kind === "setRunArgsEnabled") {
    stateEvents.push({ type: "RUN_ARGS_ENABLED_SET", enabled: intent.enabled });
  }

  if (intent.kind === "setRunArgsText") {
    stateEvents.push({ type: "RUN_ARGS_TEXT_SET", text: intent.text });
  }

  if (intent.kind === "setSourceProfileEnabled") {
    stateEvents.push({ type: "RUN_SOURCE_PROFILE_ENABLED_SET", enabled: intent.enabled });
  }

  if (intent.kind === "setSourceProfileText") {
    stateEvents.push({ type: "RUN_SOURCE_PROFILE_TEXT_SET", text: intent.text });
  }

  if (intent.kind === "setRunChecksMode") {
    stateEvents.push({ type: "RUN_CHECKS_MODE_SET", mode: intent.mode });
  }

  if (intent.kind === "setRunChecksRoute") {
    stateEvents.push({ type: "RUN_CHECKS_ROUTE_SET", route: intent.route });
  }

  if (intent.kind === "setCleanStdlibEnabled") {
    stateEvents.push({ type: "RUN_CLEAN_STDLIB_ENABLED_SET", enabled: intent.enabled });
  }

  if (intent.kind === "setCleanArchivesEnabled") {
    stateEvents.push({ type: "RUN_CLEAN_ARCHIVES_ENABLED_SET", enabled: intent.enabled });
  }

  const projectedSettings = projectRunControlsSettings(settings, intent);
  const runArgsStatus = createRunArgsStatus(
    projectedSettings.runArgsEnabled,
    projectedSettings.runArgsText
  );
  const sourceProfileStatus = createSourceProfileStatus(
    projectedSettings.sourceProfileEnabled,
    projectedSettings.sourceProfileText
  );
  const runChecksStatus = createRunChecksStatus(
    projectedSettings.runChecksMode,
    projectedSettings.runChecksRoute
  );
  const cleanOptionsStatus = createCleanOptionsStatus(
    projectedSettings.cleanStdlibEnabled,
    projectedSettings.cleanArchivesEnabled
  );

  stateEvents.push({
    type: "RUN_ARGS_STATUS_SET",
    statusText: runArgsStatus.statusText,
    statusClassName: runArgsStatus.statusClassName,
  });
  stateEvents.push({
    type: "RUN_SOURCE_PROFILE_STATUS_SET",
    statusText: sourceProfileStatus.statusText,
    statusClassName: sourceProfileStatus.statusClassName,
  });
  stateEvents.push({
    type: "RUN_CHECKS_STATUS_SET",
    statusText: runChecksStatus.statusText,
    statusClassName: runChecksStatus.statusClassName,
  });
  stateEvents.push({
    type: "RUN_CLEAN_OPTIONS_STATUS_SET",
    statusText: cleanOptionsStatus.statusText,
    statusClassName: cleanOptionsStatus.statusClassName,
  });

  if (intent.kind === "setRunArgsEnabled") {
    return {
      stateEvents,
      notification: {
        level: "info",
        message: intent.enabled ? "Run arguments enabled" : "Run arguments disabled",
      },
      shouldPublishSnapshot: true,
    };
  }

  if (intent.kind === "setSourceProfileEnabled") {
    return {
      stateEvents,
      notification: {
        level: "info",
        message: intent.enabled
          ? "Profile sourcing override enabled"
          : "Profile sourcing override disabled",
      },
      shouldPublishSnapshot: true,
    };
  }

  return {
    stateEvents,
    notification: null,
    shouldPublishSnapshot: true,
  };
}

/**
 * Creates the conductor service bootstrap implementation.
 *
 * This is an interface-stable skeleton that intentionally defers full
 * run-registry and orchestration behavior to later slices.
 *
 * @returns {IConductor} Conductor implementation.
 */
export function createConductorService(): IConductor {
  return {
    reactToSmokeIntent(input) {
      return createSmokeIntentReaction(input.intent, input.snapshot.smokeControls);
    },

    reactToRunControlsIntent(input) {
      return createRunControlsIntentReaction(input.intent, input.snapshot.runControls);
    },

    startRun(input: ConductorStartRunInput): ConductorRunSnapshot {
      return createBootstrapRunSnapshot(input);
    },

    markProgress(input: ConductorMarkProgressInput): ConductorRunSnapshot | null {
      void input;
      return null;
    },

    markCompleted(input: ConductorMarkCompletedInput): ConductorRunSnapshot | null {
      void input;
      return null;
    },

    markFailed(input: ConductorMarkFailedInput): ConductorRunSnapshot | null {
      void input;
      return null;
    },

    cancelRun(input: ConductorCancelRunInput): ConductorRunSnapshot | null {
      void input;
      return null;
    },

    getRun(runId: string): ConductorRunSnapshot | null {
      void runId;
      return null;
    },
  };
}
