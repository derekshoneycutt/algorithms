import { assign, setup } from "xstate";

import {
  createInitialSmokeControlsSettings,
  type ExtensionHostContext,
  type ExtensionHostEvent,
  type InitialSmokeControlsSettingsInput,
  type SmokeLanguageSelection,
} from "./types";

/**
 * Optional machine bootstrap inputs.
 */
export interface ExtensionHostMachineInput {
  initialSmokeControls?: InitialSmokeControlsSettingsInput;
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
