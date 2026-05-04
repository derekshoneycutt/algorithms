import type {
  EnvironmentControlsSettings,
  ExtensionHostEvent,
  ExtensionHostSnapshot,
  ExtensionHostStateValue,
  RunControlsSettings,
  SmokeControlsSettings,
  SmokeRunStatusByLanguage,
} from "./types";

/**
 * DI contract for the canonical host state machine.
 *
 * This is the only surface of the `state` module that consumers outside
 * the module should depend on. The machine starts the underlying XState
 * actor lazily on the first call to `send`.
 * Callers may read `getSnapshot` before any `send` call to inspect initial state.
 */
export interface IStateMachine {
  /**
   * Returns a read-only snapshot of the current machine state.
   *
   * @returns {ExtensionHostSnapshot} Current snapshot.
   */
  getSnapshot(): ExtensionHostSnapshot;

  /**
   * Returns the smoke run status for one algorithm path without cloning the full state.
   *
   * @param {string} algorithmPath Algorithm directory path.
   * @returns {SmokeRunStatusByLanguage | undefined} Per-language statuses when present.
   */
  getSmokeRunStatusForAlgorithm(algorithmPath: string): SmokeRunStatusByLanguage | undefined;

  /**
   * Returns the active smoke run algorithm path without cloning the full state.
   *
   * @returns {string | null} Active algorithm path or null.
   */
  getActiveSmokeRunAlgorithmPath(): string | null;

  /**
   * Returns the current environment controls without cloning unrelated state.
   *
   * @returns {EnvironmentControlsSettings} Environment controls state.
   */
  getEnvironmentControls(): EnvironmentControlsSettings;

  /**
   * Returns one run-controls snapshot without cloning unrelated state.
   *
   * @returns {{ stateValue: ExtensionHostStateValue; runControls: RunControlsSettings }} Run-controls snapshot.
   */
  getRunControlsSnapshot(): {
    readonly stateValue: ExtensionHostStateValue;
    readonly runControls: RunControlsSettings;
  };

  /**
   * Returns one smoke-controls snapshot without cloning unrelated state.
   *
   * @returns {{ stateValue: ExtensionHostStateValue; smokeControls: SmokeControlsSettings }} Smoke-controls snapshot.
   */
  getSmokeControlsSnapshot(): {
    readonly stateValue: ExtensionHostStateValue;
    readonly smokeControls: SmokeControlsSettings;
  };

  /**
   * Returns one environment-controls snapshot without cloning unrelated state.
   *
   * @returns {{ stateValue: ExtensionHostStateValue; environmentControls: EnvironmentControlsSettings }} Environment-controls snapshot.
   */
  getEnvironmentControlsSnapshot(): {
    readonly stateValue: ExtensionHostStateValue;
    readonly environmentControls: EnvironmentControlsSettings;
  };

  /**
   * Sends an event to the machine, starting it lazily if it has not started yet.
   *
   * @param {ExtensionHostEvent} event Event to dispatch.
   * @returns {void}
   */
  send(event: ExtensionHostEvent): void;

  /**
   * Stops the machine and releases resources.
   *
   * @returns {void}
   */
  dispose(): void;
}
