import { assign, setup } from "xstate";

import {
  createInitialRunControlsSettings,
  createInitialSmokeControlsSettings,
  type ExtensionHostContext,
  type ExtensionHostEvent,
  type InitialRunControlsSettingsInput,
  type InitialSmokeControlsSettingsInput,
  type SmokeLanguageSelection,
} from "./types";

/**
 * Optional machine bootstrap inputs.
 */
export interface ExtensionHostMachineInput {
  initialSmokeControls?: InitialSmokeControlsSettingsInput;
  initialRunControls?: InitialRunControlsSettingsInput;
}

/**
 * Toggles one smoke language selection by key.
 *
 * @param {SmokeLanguageSelection[]} languages Existing language selections.
 * @param {string} languageKey Language key to toggle.
 * @returns {SmokeLanguageSelection[]} Updated language selections.
 */
function toggleSmokeLanguageSelection(
  languages: SmokeLanguageSelection[],
  languageKey: string
): SmokeLanguageSelection[] {
  return languages.map((language) => {
    if (language.languageKey !== languageKey) {
      return language;
    }

    if (language.disabled) {
      return language;
    }

    return {
      ...language,
      selected: !language.selected,
    };
  });
}

/**
 * Sets the selected flag across all smoke language selections.
 *
 * @param {SmokeLanguageSelection[]} languages Existing language selections.
 * @param {boolean} selected Next selected value.
 * @returns {SmokeLanguageSelection[]} Updated language selections.
 */
function setAllSmokeLanguageSelections(
  languages: SmokeLanguageSelection[],
  selected: boolean
): SmokeLanguageSelection[] {
  return languages.map((language) => {
    if (language.disabled) {
      return {
        ...language,
        selected: false,
      };
    }

    return {
      ...language,
      selected,
    };
  });
}

/**
 * Initializes queued smoke runtime statuses for one algorithm path.
 *
 * @param {ExtensionHostContext} context Current machine context.
 * @param {string} algorithmPath Algorithm path being smoke-tested.
 * @param {string[]} languageKeys Languages participating in this run.
 * @returns {ExtensionHostContext["smokeRunStatusByAlgorithm"]} Updated runtime map.
 */
function setSmokeRunStarted(
  context: ExtensionHostContext,
  algorithmPath: string,
  languageKeys: string[]
): ExtensionHostContext["smokeRunStatusByAlgorithm"] {
  const nextByAlgorithm = {
    ...context.smokeRunStatusByAlgorithm,
  };
  const queuedByLanguage: Record<string, "queued"> = {};

  for (const languageKey of languageKeys) {
    const normalizedLanguageKey = languageKey.trim().toLowerCase();
    if (normalizedLanguageKey.length === 0) {
      continue;
    }

    queuedByLanguage[normalizedLanguageKey] = "queued";
  }

  nextByAlgorithm[algorithmPath] = queuedByLanguage;
  return nextByAlgorithm;
}

/**
 * Sets one runtime smoke status for a language under an algorithm.
 *
 * @param {ExtensionHostContext} context Current machine context.
 * @param {string} algorithmPath Algorithm path key.
 * @param {string} languageKey Language key.
 * @param {"queued" | "running" | "passed" | "failed"} status Next language status.
 * @returns {ExtensionHostContext["smokeRunStatusByAlgorithm"]} Updated runtime map.
 */
function setSmokeLanguageRunStatus(
  context: ExtensionHostContext,
  algorithmPath: string,
  languageKey: string,
  status: "queued" | "running" | "passed" | "failed"
): ExtensionHostContext["smokeRunStatusByAlgorithm"] {
  const currentByLanguage = context.smokeRunStatusByAlgorithm[algorithmPath] ?? {};

  return {
    ...context.smokeRunStatusByAlgorithm,
    [algorithmPath]: {
      ...currentByLanguage,
      [languageKey.trim().toLowerCase()]: status,
    },
  };
}

/**
 * Clears runtime smoke statuses for one algorithm path.
 *
 * @param {ExtensionHostContext} context Current machine context.
 * @param {string} algorithmPath Algorithm path to clear.
 * @returns {ExtensionHostContext["smokeRunStatusByAlgorithm"]} Updated runtime map.
 */
function clearSmokeRunStatusForAlgorithm(
  context: ExtensionHostContext,
  algorithmPath: string
): ExtensionHostContext["smokeRunStatusByAlgorithm"] {
  const nextByAlgorithm = {
    ...context.smokeRunStatusByAlgorithm,
  };

  delete nextByAlgorithm[algorithmPath];
  return nextByAlgorithm;
}

/**
 * Sets the active smoke run id for one algorithm path.
 *
 * @param {ExtensionHostContext} context Current machine context.
 * @param {string} algorithmPath Algorithm path key.
 * @param {string} runId Active run id.
 * @returns {Record<string, string>} Updated run-id map.
 */
function setSmokeRunIdForAlgorithm(
  context: ExtensionHostContext,
  algorithmPath: string,
  runId: string
): Record<string, string> {
  return {
    ...context.activeSmokeRunIdByAlgorithm,
    [algorithmPath]: runId,
  };
}

/**
 * Clears the active smoke run id for one algorithm path.
 *
 * @param {ExtensionHostContext} context Current machine context.
 * @param {string} algorithmPath Algorithm path key.
 * @returns {Record<string, string>} Updated run-id map.
 */
function clearSmokeRunIdForAlgorithm(
  context: ExtensionHostContext,
  algorithmPath: string
): Record<string, string> {
  const nextByAlgorithm = {
    ...context.activeSmokeRunIdByAlgorithm,
  };

  delete nextByAlgorithm[algorithmPath];
  return nextByAlgorithm;
}

/**
 * XState machine definition for the extension host orchestration layer.
 *
 * States:
 *   ready   — started and waiting for commands.
 *   running — a command is being processed.
 *   stopped — final state after SHUTDOWN; no further transitions.
 */
const extensionHostMachineDefinition = setup({
  types: {
    context: {} as ExtensionHostContext,
    events: {} as ExtensionHostEvent,
    input: {} as ExtensionHostMachineInput,
  },
});

/**
 * Creates the host state machine with optional initial smoke controls input.
 *
 * @returns {ReturnType<typeof extensionHostMachineDefinition.createMachine>} Machine instance.
 */
export function createExtensionHostMachine() {
  return extensionHostMachineDefinition.createMachine({
  id: "extensionHost",
  initial: "ready",
  context: ({ input }) => {
    return {
      lastCommandId: null,
      lastResult: null,
      lastFailure: null,
      smokeControls: createInitialSmokeControlsSettings(input.initialSmokeControls),
      smokeRunStatusByAlgorithm: {},
      activeSmokeRunAlgorithmPath: null,
      activeSmokeRunIdByAlgorithm: {},
      runControls: createInitialRunControlsSettings(input.initialRunControls),
    };
  },
  states: {
    ready: {
      on: {
        COMMAND_REQUESTED: {
          target: "running",
          actions: assign({
            lastCommandId: ({ event }) => event.commandId,
          }),
        },
        SMOKE_REPORT_ENABLED_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                reportEnabled: event.enabled,
              };
            },
          }),
        },
        SMOKE_MARKDOWN_PATH_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                markdownPath: event.path,
              };
            },
          }),
        },
        SMOKE_TIMEOUT_SECONDS_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                timeoutSeconds: event.seconds,
              };
            },
          }),
        },
        SMOKE_SLOW_TIMEOUT_SECONDS_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                slowTimeoutSeconds: event.seconds,
              };
            },
          }),
        },
        SMOKE_LANGUAGE_TOGGLED: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                languages: toggleSmokeLanguageSelection(
                  context.smokeControls.languages,
                  event.languageKey
                ),
              };
            },
          }),
        },
        SMOKE_ALL_LANGUAGES_SELECTED: {
          actions: assign({
            smokeControls: ({ context }) => {
              return {
                ...context.smokeControls,
                languages: setAllSmokeLanguageSelections(
                  context.smokeControls.languages,
                  true
                ),
              };
            },
          }),
        },
        SMOKE_ALL_LANGUAGES_DESELECTED: {
          actions: assign({
            smokeControls: ({ context }) => {
              return {
                ...context.smokeControls,
                languages: setAllSmokeLanguageSelections(
                  context.smokeControls.languages,
                  false
                ),
              };
            },
          }),
        },
        SMOKE_RUN_STARTED: {
          actions: assign({
            smokeRunStatusByAlgorithm: ({ context, event }) => {
              return setSmokeRunStarted(context, event.algorithmPath, event.languageKeys);
            },
            activeSmokeRunIdByAlgorithm: ({ context, event }) => {
              return setSmokeRunIdForAlgorithm(context, event.algorithmPath, event.runId);
            },
            activeSmokeRunAlgorithmPath: ({ event }) => event.algorithmPath,
          }),
        },
        SMOKE_LANGUAGE_RUN_STATUS_SET: {
          actions: assign({
            smokeRunStatusByAlgorithm: ({ context, event }) => {
              return setSmokeLanguageRunStatus(
                context,
                event.algorithmPath,
                event.languageKey,
                event.status
              );
            },
          }),
        },
        SMOKE_RUN_FINISHED: {
          actions: assign({
            activeSmokeRunAlgorithmPath: ({ context, event }) => {
              if (context.activeSmokeRunAlgorithmPath !== event.algorithmPath) {
                return context.activeSmokeRunAlgorithmPath;
              }

              return null;
            },
          }),
        },
        SMOKE_RUN_STATUS_CLEARED: {
          actions: assign({
            smokeRunStatusByAlgorithm: ({ context, event }) => {
              const activeRunId = context.activeSmokeRunIdByAlgorithm[event.algorithmPath];
              if (activeRunId !== event.runId) {
                return context.smokeRunStatusByAlgorithm;
              }

              return clearSmokeRunStatusForAlgorithm(context, event.algorithmPath);
            },
            activeSmokeRunIdByAlgorithm: ({ context, event }) => {
              const activeRunId = context.activeSmokeRunIdByAlgorithm[event.algorithmPath];
              if (activeRunId !== event.runId) {
                return context.activeSmokeRunIdByAlgorithm;
              }

              return clearSmokeRunIdForAlgorithm(context, event.algorithmPath);
            },
          }),
        },
        SMOKE_REPORT_STATUS_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                reportStatusText: event.statusText,
                reportStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        SMOKE_SELECTION_STATUS_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                smokeStatusText: event.statusText,
                smokeStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        SMOKE_STATUS_LABEL_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                statusLabel: event.statusLabel,
              };
            },
          }),
        },
        RUN_ARGS_ENABLED_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runArgsEnabled: event.enabled,
              };
            },
          }),
        },
        RUN_ARGS_TEXT_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runArgsText: event.text,
              };
            },
          }),
        },
        RUN_SOURCE_PROFILE_ENABLED_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                sourceProfileEnabled: event.enabled,
              };
            },
          }),
        },
        RUN_SOURCE_PROFILE_TEXT_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                sourceProfileText: event.text,
              };
            },
          }),
        },
        RUN_CHECKS_MODE_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runChecksMode: event.mode,
              };
            },
          }),
        },
        RUN_CHECKS_ROUTE_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runChecksRoute: event.route,
              };
            },
          }),
        },
        RUN_CLEAN_STDLIB_ENABLED_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                cleanStdlibEnabled: event.enabled,
              };
            },
          }),
        },
        RUN_CLEAN_ARCHIVES_ENABLED_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                cleanArchivesEnabled: event.enabled,
              };
            },
          }),
        },
        RUN_ARGS_STATUS_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runArgsStatusText: event.statusText,
                runArgsStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        RUN_SOURCE_PROFILE_STATUS_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                sourceProfileStatusText: event.statusText,
                sourceProfileStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        RUN_CHECKS_STATUS_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runChecksStatusText: event.statusText,
                runChecksStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        RUN_CLEAN_OPTIONS_STATUS_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                cleanOptionsStatusText: event.statusText,
                cleanOptionsStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        SHUTDOWN: { target: "stopped" },
      },
    },
    running: {
      on: {
        COMMAND_SUCCEEDED: {
          target: "ready",
          actions: assign({
            lastResult: ({ event }) => event.result,
            lastFailure: () => null,
          }),
        },
        COMMAND_FAILED: {
          target: "ready",
          actions: assign({
            lastFailure: ({ event }) => event.error,
          }),
        },
        SMOKE_REPORT_ENABLED_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                reportEnabled: event.enabled,
              };
            },
          }),
        },
        SMOKE_MARKDOWN_PATH_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                markdownPath: event.path,
              };
            },
          }),
        },
        SMOKE_TIMEOUT_SECONDS_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                timeoutSeconds: event.seconds,
              };
            },
          }),
        },
        SMOKE_SLOW_TIMEOUT_SECONDS_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                slowTimeoutSeconds: event.seconds,
              };
            },
          }),
        },
        SMOKE_LANGUAGE_TOGGLED: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                languages: toggleSmokeLanguageSelection(
                  context.smokeControls.languages,
                  event.languageKey
                ),
              };
            },
          }),
        },
        SMOKE_ALL_LANGUAGES_SELECTED: {
          actions: assign({
            smokeControls: ({ context }) => {
              return {
                ...context.smokeControls,
                languages: setAllSmokeLanguageSelections(
                  context.smokeControls.languages,
                  true
                ),
              };
            },
          }),
        },
        SMOKE_ALL_LANGUAGES_DESELECTED: {
          actions: assign({
            smokeControls: ({ context }) => {
              return {
                ...context.smokeControls,
                languages: setAllSmokeLanguageSelections(
                  context.smokeControls.languages,
                  false
                ),
              };
            },
          }),
        },
        SMOKE_RUN_STARTED: {
          actions: assign({
            smokeRunStatusByAlgorithm: ({ context, event }) => {
              return setSmokeRunStarted(context, event.algorithmPath, event.languageKeys);
            },
            activeSmokeRunIdByAlgorithm: ({ context, event }) => {
              return setSmokeRunIdForAlgorithm(context, event.algorithmPath, event.runId);
            },
            activeSmokeRunAlgorithmPath: ({ event }) => event.algorithmPath,
          }),
        },
        SMOKE_LANGUAGE_RUN_STATUS_SET: {
          actions: assign({
            smokeRunStatusByAlgorithm: ({ context, event }) => {
              return setSmokeLanguageRunStatus(
                context,
                event.algorithmPath,
                event.languageKey,
                event.status
              );
            },
          }),
        },
        SMOKE_RUN_FINISHED: {
          actions: assign({
            activeSmokeRunAlgorithmPath: ({ context, event }) => {
              if (context.activeSmokeRunAlgorithmPath !== event.algorithmPath) {
                return context.activeSmokeRunAlgorithmPath;
              }

              return null;
            },
          }),
        },
        SMOKE_RUN_STATUS_CLEARED: {
          actions: assign({
            smokeRunStatusByAlgorithm: ({ context, event }) => {
              const activeRunId = context.activeSmokeRunIdByAlgorithm[event.algorithmPath];
              if (activeRunId !== event.runId) {
                return context.smokeRunStatusByAlgorithm;
              }

              return clearSmokeRunStatusForAlgorithm(context, event.algorithmPath);
            },
            activeSmokeRunIdByAlgorithm: ({ context, event }) => {
              const activeRunId = context.activeSmokeRunIdByAlgorithm[event.algorithmPath];
              if (activeRunId !== event.runId) {
                return context.activeSmokeRunIdByAlgorithm;
              }

              return clearSmokeRunIdForAlgorithm(context, event.algorithmPath);
            },
          }),
        },
        SMOKE_REPORT_STATUS_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                reportStatusText: event.statusText,
                reportStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        SMOKE_SELECTION_STATUS_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                smokeStatusText: event.statusText,
                smokeStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        SMOKE_STATUS_LABEL_SET: {
          actions: assign({
            smokeControls: ({ context, event }) => {
              return {
                ...context.smokeControls,
                statusLabel: event.statusLabel,
              };
            },
          }),
        },
        RUN_ARGS_ENABLED_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runArgsEnabled: event.enabled,
              };
            },
          }),
        },
        RUN_ARGS_TEXT_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runArgsText: event.text,
              };
            },
          }),
        },
        RUN_SOURCE_PROFILE_ENABLED_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                sourceProfileEnabled: event.enabled,
              };
            },
          }),
        },
        RUN_SOURCE_PROFILE_TEXT_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                sourceProfileText: event.text,
              };
            },
          }),
        },
        RUN_CHECKS_MODE_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runChecksMode: event.mode,
              };
            },
          }),
        },
        RUN_CHECKS_ROUTE_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runChecksRoute: event.route,
              };
            },
          }),
        },
        RUN_CLEAN_STDLIB_ENABLED_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                cleanStdlibEnabled: event.enabled,
              };
            },
          }),
        },
        RUN_CLEAN_ARCHIVES_ENABLED_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                cleanArchivesEnabled: event.enabled,
              };
            },
          }),
        },
        RUN_ARGS_STATUS_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runArgsStatusText: event.statusText,
                runArgsStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        RUN_SOURCE_PROFILE_STATUS_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                sourceProfileStatusText: event.statusText,
                sourceProfileStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        RUN_CHECKS_STATUS_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                runChecksStatusText: event.statusText,
                runChecksStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        RUN_CLEAN_OPTIONS_STATUS_SET: {
          actions: assign({
            runControls: ({ context, event }) => {
              return {
                ...context.runControls,
                cleanOptionsStatusText: event.statusText,
                cleanOptionsStatusClassName: event.statusClassName,
              };
            },
          }),
        },
        SHUTDOWN: { target: "stopped" },
      },
    },
    stopped: {
      type: "final",
    },
  },
  });
}

export const extensionHostMachine = createExtensionHostMachine();
