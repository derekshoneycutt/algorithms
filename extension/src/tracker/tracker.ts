import * as vscode from "vscode";
import { assign, createActor, createMachine, type ActorRefFrom } from "xstate";
import {
  ITracker,
  type TrackerClearLanguageRunStatusInput,
  type TrackerRunCancelability,
  type TrackerLanguageRunState,
  type TrackerSetLanguageRunStatusInput,
  type TrackerState,
  type TrackerStatePatch,
} from ".";

interface TrackerPatchEvent {
  type: "patch";
  patch: TrackerStatePatch;
}

interface TrackerSetLanguageRunStatusEvent {
  type: "setLanguageRunStatus";
  input: TrackerSetLanguageRunStatusInput;
}

interface TrackerClearLanguageRunStatusEvent {
  type: "clearLanguageRunStatus";
  input: TrackerClearLanguageRunStatusInput;
}

interface TrackerClearAlgorithmRunStatusesEvent {
  type: "clearAlgorithmRunStatuses";
  algorithmPath: string;
}

interface TrackerClearAllRunStatusesEvent {
  type: "clearAllRunStatuses";
}

type TrackerEvent =
  | TrackerPatchEvent
  | TrackerSetLanguageRunStatusEvent
  | TrackerClearLanguageRunStatusEvent
  | TrackerClearAlgorithmRunStatusesEvent
  | TrackerClearAllRunStatusesEvent;

/**
 * Builds the default tracker state used by the language run tracker actor.
 *
 * @returns {TrackerState} Fresh default tracker state.
 */
function createInitialTrackerState(): TrackerState {
  return {
    languageRunsByAlgorithmPath: {},
  };
}

/**
 * Returns a normalized copy of one language run-status input.
 *
 * @param {TrackerSetLanguageRunStatusInput} input Raw status input.
 * @returns {TrackerSetLanguageRunStatusInput} Normalized status input.
 */
function normalizeSetLanguageRunStatusInput(
  input: TrackerSetLanguageRunStatusInput,
): TrackerSetLanguageRunStatusInput {
  return {
    ...input,
    algorithmPath: input.algorithmPath.trim(),
    languageKey: input.languageKey.trim(),
    runId: input.runId.trim(),
    cancelability: input.cancelability ?? resolveDefaultCancelabilityForSource(input.source),
    message: String(input.message ?? ""),
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

/**
 * Resolves the default run cancelability for one tracker source.
 *
 * @param {TrackerSetLanguageRunStatusInput["source"]} source Tracker source value.
 * @returns {TrackerRunCancelability} Default cancelability for the source.
 */
function resolveDefaultCancelabilityForSource(
  source: TrackerSetLanguageRunStatusInput["source"],
): TrackerRunCancelability {
  if (source === "runner") {
    return "single-run";
  }

  if (source === "smoker") {
    return "algorithm-run";
  }

  return "not-cancellable";
}

/**
 * Returns one tracker language-run record from normalized input.
 *
 * @param {TrackerSetLanguageRunStatusInput} input Normalized status input.
 * @returns {TrackerLanguageRunState} Language run record.
 */
function createLanguageRunStateFromInput(
  input: TrackerSetLanguageRunStatusInput,
): TrackerLanguageRunState {
  return {
    algorithmPath: input.algorithmPath,
    languageKey: input.languageKey,
    status: input.status,
    source: input.source,
    cancelability: input.cancelability ?? resolveDefaultCancelabilityForSource(input.source),
    runId: input.runId,
    message: String(input.message ?? ""),
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

/**
 * Returns tracker state with one language run-status record upserted.
 *
 * @param {TrackerState} state Current tracker state.
 * @param {TrackerSetLanguageRunStatusInput} rawInput Raw language status input.
 * @returns {TrackerState} Updated tracker state.
 */
function setLanguageRunStatusInState(
  state: TrackerState,
  rawInput: TrackerSetLanguageRunStatusInput,
): TrackerState {
  const input = normalizeSetLanguageRunStatusInput(rawInput);
  if (input.algorithmPath.length === 0 || input.languageKey.length === 0 || input.runId.length === 0) {
    return state;
  }

  const existingLanguageRuns = state.languageRunsByAlgorithmPath[input.algorithmPath] ?? {};
  return {
    ...state,
    languageRunsByAlgorithmPath: {
      ...state.languageRunsByAlgorithmPath,
      [input.algorithmPath]: {
        ...existingLanguageRuns,
        [input.languageKey]: createLanguageRunStateFromInput(input),
      },
    },
  };
}

/**
 * Returns tracker state with one language run-status record removed.
 *
 * @param {TrackerState} state Current tracker state.
 * @param {TrackerClearLanguageRunStatusInput} input Language status clear payload.
 * @returns {TrackerState} Updated tracker state.
 */
function clearLanguageRunStatusInState(
  state: TrackerState,
  input: TrackerClearLanguageRunStatusInput,
): TrackerState {
  const algorithmPath = input.algorithmPath.trim();
  const languageKey = input.languageKey.trim();
  if (algorithmPath.length === 0 || languageKey.length === 0) {
    return state;
  }

  const existingLanguageRuns = state.languageRunsByAlgorithmPath[algorithmPath];
  if (!existingLanguageRuns || !Object.prototype.hasOwnProperty.call(existingLanguageRuns, languageKey)) {
    return state;
  }

  const nextLanguageRuns = { ...existingLanguageRuns };
  delete nextLanguageRuns[languageKey];

  const nextRunsByAlgorithmPath = { ...state.languageRunsByAlgorithmPath };
  if (Object.keys(nextLanguageRuns).length === 0) {
    delete nextRunsByAlgorithmPath[algorithmPath];
  }
  else {
    nextRunsByAlgorithmPath[algorithmPath] = nextLanguageRuns;
  }

  return {
    ...state,
    languageRunsByAlgorithmPath: nextRunsByAlgorithmPath,
  };
}

/**
 * Returns tracker state with all language statuses removed for one algorithm path.
 *
 * @param {TrackerState} state Current tracker state.
 * @param {string} algorithmPath Algorithm path to clear.
 * @returns {TrackerState} Updated tracker state.
 */
function clearAlgorithmRunStatusesInState(state: TrackerState, algorithmPath: string): TrackerState {
  const normalizedAlgorithmPath = algorithmPath.trim();
  if (normalizedAlgorithmPath.length === 0) {
    return state;
  }

  if (!Object.prototype.hasOwnProperty.call(state.languageRunsByAlgorithmPath, normalizedAlgorithmPath)) {
    return state;
  }

  const nextRunsByAlgorithmPath = { ...state.languageRunsByAlgorithmPath };
  delete nextRunsByAlgorithmPath[normalizedAlgorithmPath];

  return {
    ...state,
    languageRunsByAlgorithmPath: nextRunsByAlgorithmPath,
  };
}

const trackerMachine = createMachine({
  types: {} as {
    context: TrackerState;
    events: TrackerEvent;
  },
  context: createInitialTrackerState(),
  on: {
    patch: {
      actions: assign(({ context, event }) => ({
        ...context,
        ...event.patch,
      })),
    },
    setLanguageRunStatus: {
      actions: assign(({ context, event }) => setLanguageRunStatusInState(context, event.input)),
    },
    clearLanguageRunStatus: {
      actions: assign(({ context, event }) => clearLanguageRunStatusInState(context, event.input)),
    },
    clearAlgorithmRunStatuses: {
      actions: assign(({ context, event }) => clearAlgorithmRunStatusesInState(context, event.algorithmPath)),
    },
    clearAllRunStatuses: {
      actions: assign(() => createInitialTrackerState()),
    },
  },
});

/**
 * Tracker actor wrapper for language run-status storage and fan-out.
 */
export class Tracker implements ITracker {

  private readonly trackerActor: ActorRefFrom<typeof trackerMachine>;
  private readonly onDidChangeTrackerStateEmitter: vscode.EventEmitter<TrackerState>;
  private readonly trackerActorSubscription: { unsubscribe: () => void };
  private extensionContext: vscode.ExtensionContext | undefined;

  /**
   * Creates the Tracker and starts the tracker state actor.
   */
  public constructor() {
    this.trackerActor = createActor(trackerMachine);
    this.onDidChangeTrackerStateEmitter = new vscode.EventEmitter<TrackerState>();
    this.extensionContext = undefined;

    this.trackerActor.start();
    this.trackerActorSubscription = this.trackerActor.subscribe(() => {
      const trackerState = this.trackerActor.getSnapshot().context;
      this.onDidChangeTrackerStateEmitter.fire(trackerState);
    });
  }

  /**
   * Activates the Tracker lifecycle hook.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  public activate(context: vscode.ExtensionContext): void {
    this.extensionContext = context;
  }

  /**
   * Applies a partial patch to the tracker state.
   *
   * @param {TrackerStatePatch} patch Partial update to apply.
   * @returns {void} No return value.
   */
  public patchTrackerState(patch: TrackerStatePatch): void {
    this.trackerActor.send({
      type: "patch",
      patch,
    });
  }

  /**
   * Sets or replaces one language run-status record.
   *
   * @param {TrackerSetLanguageRunStatusInput} input Language run-status payload.
   * @returns {void} No return value.
   */
  public setLanguageRunStatus(input: TrackerSetLanguageRunStatusInput): void {
    this.trackerActor.send({
      type: "setLanguageRunStatus",
      input,
    });
  }

  /**
   * Clears one language run-status record.
   *
   * @param {TrackerClearLanguageRunStatusInput} input Language run-status clear payload.
   * @returns {void} No return value.
   */
  public clearLanguageRunStatus(input: TrackerClearLanguageRunStatusInput): void {
    this.trackerActor.send({
      type: "clearLanguageRunStatus",
      input,
    });
  }

  /**
   * Clears all language run statuses for one algorithm path.
   *
   * @param {string} algorithmPath Algorithm directory path key.
   * @returns {void} No return value.
   */
  public clearAlgorithmRunStatuses(algorithmPath: string): void {
    this.trackerActor.send({
      type: "clearAlgorithmRunStatuses",
      algorithmPath,
    });
  }

  /**
   * Clears all run statuses from the tracker.
   *
   * @returns {void} No return value.
   */
  public clearAllRunStatuses(): void {
    this.trackerActor.send({
      type: "clearAllRunStatuses",
    });
  }

  /**
   * Returns the current tracker-state snapshot.
   *
   * @returns {TrackerState} Current tracker state.
   */
  public getTrackerState(): TrackerState {
    return this.trackerActor.getSnapshot().context;
  }

  /**
   * Returns one language run-status record when available.
   *
   * @param {string} algorithmPath Algorithm directory path key.
   * @param {string} languageKey Language key.
   * @returns {TrackerLanguageRunState | undefined} Current language run record.
   */
  public getLanguageRunStatus(
    algorithmPath: string,
    languageKey: string,
  ): TrackerLanguageRunState | undefined {
    const normalizedAlgorithmPath = algorithmPath.trim();
    const normalizedLanguageKey = languageKey.trim();
    if (normalizedAlgorithmPath.length === 0 || normalizedLanguageKey.length === 0) {
      return undefined;
    }

    return this.getTrackerState().languageRunsByAlgorithmPath[normalizedAlgorithmPath]?.[normalizedLanguageKey];
  }

  /**
   * Subscribes to tracker-state changes.
   *
   * @param {(state: TrackerState) => void} listener Listener that receives the current tracker state.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  public subscribeToStateChanges(listener: (state: TrackerState) => void): vscode.Disposable {
    return this.onDidChangeTrackerStateEmitter.event(listener);
  }

  /**
   * Cleans up tracker resources.
   *
   * @returns {void} No return value.
   */
  public dispose(): void {
    this.trackerActorSubscription.unsubscribe();
    this.trackerActor.stop();

    this.onDidChangeTrackerStateEmitter.dispose();
    this.extensionContext = undefined;
  }
}
