import * as vscode from "vscode";
import { assign, createActor, createMachine, type ActorRefFrom } from "xstate";
import { IRunner, type RunOptionsPatch, type RunOptionsState } from ".";
import { IEnvironment } from "../environment";

interface RunOptionsEvent {
  type: "patch";
  patch: RunOptionsPatch;
}

/**
 * Storage key used for persisting run-options state across sessions.
 */
const runOptionsStorageKey = "algos.runOptionsState";

/**
 * Builds the default run-options state used by the run webview.
 *
 * @returns {RunOptionsState} Fresh default run-options state.
 */
function createInitialRunOptionsState(): RunOptionsState {
  return {
    runArgsEnabled: false,
    runArgsText: "",
    sourceProfileEnabled: false,
    sourceProfileText: "",
    runChecksMode: "none",
    runChecksRoute: "native",
    cleanStdlibEnabled: true,
    cleanArchivesEnabled: true,
  };
}

const runOptionsMachine = createMachine({
  types: {} as {
    context: RunOptionsState;
    events: RunOptionsEvent;
  },
  context: createInitialRunOptionsState(),
  on: {
    patch: {
      actions: assign(({ context, event }) => ({
        ...context,
        ...event.patch,
      })),
    },
  },
});

/**
 * Runner actor wrapper for run-options persistence and fan-out.
 */
export class Runner implements IRunner {

  private readonly environment : IEnvironment;
  private readonly runOptionsActor: ActorRefFrom<typeof runOptionsMachine>;
  private readonly onDidChangeRunOptionsEmitter: vscode.EventEmitter<RunOptionsState>;
  private readonly runOptionsActorSubscription: { unsubscribe: () => void };
  private readonly environmentStateSubscription: vscode.Disposable;
  private shouldPersistSessionState: boolean;
  private extensionContext: vscode.ExtensionContext | undefined;

  /**
   * Creates the Runner and starts the run-options actor.
   */
  public constructor(environment: IEnvironment) {
    this.environment = environment;
    this.runOptionsActor = createActor(runOptionsMachine);
    this.onDidChangeRunOptionsEmitter = new vscode.EventEmitter<RunOptionsState>();
    this.shouldPersistSessionState = this.environment.getEnvironmentControlsState().persistSessionEnabled;
    this.extensionContext = undefined;

    this.environmentStateSubscription = this.environment.subscribeToStateChanges((state) => {
      this.handlePersistSessionPreferenceChanged(state.persistSessionEnabled);
    });

    this.runOptionsActor.start();
    this.runOptionsActorSubscription = this.runOptionsActor.subscribe(() => {
      const runOptionsState = this.runOptionsActor.getSnapshot().context;
      this.persistRunOptionsState(runOptionsState);
      this.onDidChangeRunOptionsEmitter.fire(runOptionsState);
    });
  }

  /**
   * Activates the Runner lifecycle hook.
   *
   * @returns {void} No return value.
   */
  public activate(context: vscode.ExtensionContext): void {
    this.extensionContext = context;

    if (!this.shouldPersistSessionState) {
      this.clearPersistedRunOptionsState();
      return;
    }

    const persistedRunOptionsState = this.extensionContext.globalState.get<Partial<RunOptionsState> | undefined>(
      runOptionsStorageKey,
    );
    if (persistedRunOptionsState) {
      this.runOptionsActor.send({
        type: "patch",
        patch: {
          ...createInitialRunOptionsState(),
          ...persistedRunOptionsState,
        },
      });
    }
  }

  /**
   * Returns the underlying run-options actor.
   *
   * @returns {ActorRefFrom<typeof runOptionsMachine>} Run-options state actor.
   */
  public getRunOptionsActor(): ActorRefFrom<typeof runOptionsMachine> {
    return this.runOptionsActor;
  }

  /**
   * Returns the current run-options snapshot.
   *
   * @returns {RunControlsViewState} Current run-options state.
   */
  public getRunOptionsState(): RunOptionsState {
    return this.runOptionsActor.getSnapshot().context;
  }

  /**
   * Subscribes to run-options state changes.
   *
   * @param {(state: RunOptionsState) => void} listener Listener that receives the current run-options state.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  public subscribeToStateChanges(
    listener: (state: RunOptionsState) => void,
  ): vscode.Disposable {
    return this.onDidChangeRunOptionsEmitter.event(listener);
  }

  /**
   * Applies a partial patch to the run-options state.
   *
   * @param {RunOptionsPatch} patch Partial update to apply.
   * @returns {void} No return value.
   */
  public patchRunOptions(patch: RunOptionsPatch): void {
    this.runOptionsActor.send({
      type: "patch",
      patch,
    });
  }

  /**
   * Persists the current run-options state to workspace-global storage.
   *
   * @returns {void} No return value.
   */
  private persistRunOptionsState(runOptionsState: RunOptionsState): void {
    if (!this.extensionContext || !this.shouldPersistSessionState) {
      return;
    }

    void this.extensionContext.globalState.update(
      runOptionsStorageKey,
      runOptionsState,
    );
  }

  /**
   * Clears persisted run-options state from workspace-global storage.
   *
   * @returns {void} No return value.
   */
  private clearPersistedRunOptionsState(): void {
    if (!this.extensionContext) {
      return;
    }

    void this.extensionContext.globalState.update(
      runOptionsStorageKey,
      undefined,
    );
  }

  /**
   * Applies persistence behavior updates when the environment session policy changes.
   *
   * @param {boolean} persistSessionEnabled Latest session persistence toggle.
   * @returns {void} No return value.
   */
  private handlePersistSessionPreferenceChanged(persistSessionEnabled: boolean): void {
    if (this.shouldPersistSessionState === persistSessionEnabled) {
      return;
    }

    this.shouldPersistSessionState = persistSessionEnabled;

    if (!persistSessionEnabled) {
      this.clearPersistedRunOptionsState();
      return;
    }

    this.persistRunOptionsState(this.getRunOptionsState());
  }

  /**
   * Cleans up any resources used by the runner state
   */
  public dispose() : void {
    this.environmentStateSubscription.dispose();
    this.runOptionsActorSubscription.unsubscribe();
    this.onDidChangeRunOptionsEmitter.dispose();
    this.runOptionsActor.stop();
  }
}
