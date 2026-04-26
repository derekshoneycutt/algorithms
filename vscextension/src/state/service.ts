import { createActor } from "xstate";

import type { IStateMachine } from "./IStateMachine";
import { extensionHostMachine } from "./machine";
import type {
  ExtensionHostEvent,
  ExtensionHostSnapshot,
  ExtensionHostStateValue,
} from "./types";

export type { IStateMachine } from "./IStateMachine";

/**
 * Creates a lazily-started XState-backed host state service.
 *
 * The underlying actor is constructed immediately but `start()` is deferred
 * until the first call to `send`, so the extension host pays no startup cost
 * until a command actually requires orchestration.
 *
 * @returns {IStateMachine} Host state machine instance.
 */
export function createHostStateService(): IStateMachine {
  const actor = createActor(extensionHostMachine);
  let started = false;

  /**
   * Starts the actor on first use.
   *
   * @returns {void}
   */
  function ensureStarted(): void {
    if (!started) {
      actor.start();
      started = true;
    }
  }

  return {
    getSnapshot(): ExtensionHostSnapshot {
      const snapshot = actor.getSnapshot();
      const stateValue =
        typeof snapshot.value === "string"
          ? (snapshot.value as ExtensionHostStateValue)
          : "ready";

      return {
        stateValue,
        lastCommandId: snapshot.context.lastCommandId,
        lastResult: snapshot.context.lastResult,
        lastFailure: snapshot.context.lastFailure,
      };
    },

    send(event: ExtensionHostEvent): void {
      ensureStarted();
      actor.send(event);
    },

    dispose(): void {
      if (started) {
        actor.stop();
      }
    },
  };
}
