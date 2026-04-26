import { assign, setup } from "xstate";

import type { ExtensionHostContext, ExtensionHostEvent } from "./types";

/**
 * XState machine definition for the extension host orchestration layer.
 *
 * States:
 *   ready   — started and waiting for commands.
 *   running — a command is being processed.
 *   stopped — final state after SHUTDOWN; no further transitions.
 */
export const extensionHostMachine = setup({
  types: {
    context: {} as ExtensionHostContext,
    events: {} as ExtensionHostEvent,
  },
}).createMachine({
  id: "extensionHost",
  initial: "ready",
  context: {
    lastCommandId: null,
    lastResult: null,
    lastFailure: null,
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
        SHUTDOWN: { target: "stopped" },
      },
    },
    stopped: {
      type: "final",
    },
  },
});
