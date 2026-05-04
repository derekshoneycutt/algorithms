import { createActor } from "xstate";

import type { IStateMachine } from "./IStateMachine";
import { createExtensionHostMachine } from "./machine";
import type {
  EnvironmentControlsSettings,
  ExtensionHostEvent,
  ExtensionHostSnapshot,
  ExtensionHostStateValue,
  InitialRunControlsSettingsInput,
  InitialSmokeControlsSettingsInput,
  RunControlsSettings,
  SmokeControlsSettings,
  SmokeRunStatusByLanguage,
} from "./types";

export type { IStateMachine } from "./IStateMachine";

/**
 * Optional state service bootstrap configuration.
 */
export interface CreateHostStateServiceInput {
  initialSmokeControls?: InitialSmokeControlsSettingsInput;
  initialRunControls?: InitialRunControlsSettingsInput;
}

/**
 * Creates a lazily-started XState-backed host state service.
 *
 * The underlying actor is constructed immediately but `start()` is deferred
 * until the first call to `send`, so the extension host pays no startup cost
 * until a command actually requires orchestration.
 *
 * @param {CreateHostStateServiceInput} [input] Optional bootstrap configuration.
 * @returns {IStateMachine} Host state machine instance.
 */
export function createHostStateService(
  input?: CreateHostStateServiceInput
): IStateMachine {
  const actor = createActor(createExtensionHostMachine(), {
    input: {
      initialSmokeControls: input?.initialSmokeControls,
      initialRunControls: input?.initialRunControls,
    },
  });
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
        smokeControls: {
          ...snapshot.context.smokeControls,
          languages: snapshot.context.smokeControls.languages.map((language) => {
            return {
              ...language,
            };
          }),
        },
        smokeRunStatusByAlgorithm: Object.fromEntries(
          Object.entries(snapshot.context.smokeRunStatusByAlgorithm).map(
            ([algorithmPath, byLanguage]) => {
              return [
                algorithmPath,
                {
                  ...byLanguage,
                },
              ];
            }
          )
        ),
        activeSmokeRunAlgorithmPath: snapshot.context.activeSmokeRunAlgorithmPath,
        runControls: {
          ...snapshot.context.runControls,
        },
        environmentControls: {
          ...snapshot.context.environmentControls,
          variables: snapshot.context.environmentControls.variables.map((variable) => {
            return {
              ...variable,
            };
          }),
        },
        filesystemCacheTtlMs: snapshot.context.filesystemCacheTtlMs,
        filesystemStatCacheByPath: Object.fromEntries(
          Object.entries(snapshot.context.filesystemStatCacheByPath).map(
            ([targetPath, cacheEntry]) => {
              return [
                targetPath,
                {
                  ...cacheEntry,
                },
              ];
            }
          )
        ),
        filesystemDirectoryCacheByPath: Object.fromEntries(
          Object.entries(snapshot.context.filesystemDirectoryCacheByPath).map(
            ([targetPath, cacheEntry]) => {
              return [
                targetPath,
                {
                  ...cacheEntry,
                },
              ];
            }
          )
        ),
        filesystemPendingOperationById: Object.fromEntries(
          Object.entries(snapshot.context.filesystemPendingOperationById).map(
            ([operationId, operation]) => {
              return [
                operationId,
                {
                  ...operation,
                },
              ];
            }
          )
        ),
        filesystemOperationErrorByPath: {
          ...snapshot.context.filesystemOperationErrorByPath,
        },
      };
    },

    getSmokeRunStatusForAlgorithm(algorithmPath: string): SmokeRunStatusByLanguage | undefined {
      return actor.getSnapshot().context.smokeRunStatusByAlgorithm[algorithmPath];
    },

    getActiveSmokeRunAlgorithmPath(): string | null {
      return actor.getSnapshot().context.activeSmokeRunAlgorithmPath;
    },

    getEnvironmentControls(): EnvironmentControlsSettings {
      return {
        ...actor.getSnapshot().context.environmentControls,
      };
    },

    getRunControlsSnapshot(): {
      readonly stateValue: ExtensionHostStateValue;
      readonly runControls: RunControlsSettings;
    } {
      const snapshot = actor.getSnapshot();
      const stateValue =
        typeof snapshot.value === "string"
          ? (snapshot.value as ExtensionHostStateValue)
          : "ready";

      return {
        stateValue,
        runControls: {
          ...snapshot.context.runControls,
        },
      };
    },

    getSmokeControlsSnapshot(): {
      readonly stateValue: ExtensionHostStateValue;
      readonly smokeControls: SmokeControlsSettings;
    } {
      const snapshot = actor.getSnapshot();
      const stateValue =
        typeof snapshot.value === "string"
          ? (snapshot.value as ExtensionHostStateValue)
          : "ready";

      return {
        stateValue,
        smokeControls: {
          ...snapshot.context.smokeControls,
          languages: snapshot.context.smokeControls.languages.map((language) => {
            return {
              ...language,
            };
          }),
        },
      };
    },

    getEnvironmentControlsSnapshot(): {
      readonly stateValue: ExtensionHostStateValue;
      readonly environmentControls: EnvironmentControlsSettings;
    } {
      const snapshot = actor.getSnapshot();
      const stateValue =
        typeof snapshot.value === "string"
          ? (snapshot.value as ExtensionHostStateValue)
          : "ready";

      return {
        stateValue,
        environmentControls: {
          ...snapshot.context.environmentControls,
          routingEntries: snapshot.context.environmentControls.routingEntries.map((entry) => {
            return {
              ...entry,
            };
          }),
          variables: snapshot.context.environmentControls.variables.map((variable) => {
            return {
              ...variable,
            };
          }),
        },
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
