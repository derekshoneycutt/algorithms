/**
 * Machine state values the extension host can occupy.
 */
export type ExtensionHostStateValue = "ready" | "running" | "stopped";

/**
 * Mutable context held across all machine states.
 */
export interface ExtensionHostContext {
  lastCommandId: string | null;
  lastResult: string | null;
  lastFailure: string | null;
}

/**
 * Events the extension host machine accepts.
 */
export type ExtensionHostEvent =
  | { type: "COMMAND_REQUESTED"; commandId: string }
  | { type: "COMMAND_SUCCEEDED"; result: string }
  | { type: "COMMAND_FAILED"; error: string }
  | { type: "SHUTDOWN" };

/**
 * Read-only snapshot exposed to consumers outside the state module.
 */
export interface ExtensionHostSnapshot {
  readonly stateValue: ExtensionHostStateValue;
  readonly lastCommandId: string | null;
  readonly lastResult: string | null;
  readonly lastFailure: string | null;
}
