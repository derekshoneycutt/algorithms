import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { assign, createActor, createMachine, type ActorRefFrom } from "xstate";
import {
  IRunner,
  type RunOptionsPatch,
  type RunOptionsState,
  type RunnerExecuteRunRequest,
  type RunnerExecuteRunResult,
} from ".";
import { IEnvironment } from "../environment";
import { ITracker } from "../tracker";
import { RunHandler } from "./runHandler";

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
  private readonly tracker: ITracker;
  private readonly runOptionsActor: ActorRefFrom<typeof runOptionsMachine>;
  private readonly onDidChangeRunOptionsEmitter: vscode.EventEmitter<RunOptionsState>;
  private readonly runOptionsActorSubscription: { unsubscribe: () => void };
  private readonly environmentStateSubscription: vscode.Disposable;
  private shouldPersistSessionState: boolean;
  private extensionContext: vscode.ExtensionContext | undefined;
  private runHandler: RunHandler | undefined;

  /**
   * Creates the Runner and starts the run-options actor.
   */
  public constructor(environment: IEnvironment, tracker: ITracker) {
    this.environment = environment;
    this.tracker = tracker;
    this.runOptionsActor = createActor(runOptionsMachine);
    this.onDidChangeRunOptionsEmitter = new vscode.EventEmitter<RunOptionsState>();
    this.shouldPersistSessionState = this.environment.getEnvironmentControlsState().persistSessionEnabled;
    this.extensionContext = undefined;
    this.runHandler = undefined;

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
   * Executes one run.sh invocation through the shared RunHandler.
   *
   * @param {RunnerExecuteRunRequest} request Run execution request.
   * @returns {Promise<RunnerExecuteRunResult>} Run execution result.
   */
  public async executeRun(request: RunnerExecuteRunRequest): Promise<RunnerExecuteRunResult> {
    const runHandler = await this.getRunHandler();

    return await runHandler.execute({
      algorithmDirectoryPath: request.algorithmDirectoryPath,
      runOptions: this.getRunOptionsState(),
      languageKey: request.languageKey,
      runId: request.runId,
      targetToken: request.targetToken,
      targetFilePath: request.targetFilePath,
    });
  }

  /**
   * Sends Ctrl+C to the active runner terminal when available.
   *
   * @returns {boolean} True when interrupt was sent; false when runner terminal is unavailable.
   */
  public interruptActiveRun(): boolean {
    if (!this.runHandler) {
      return false;
    }

    return this.runHandler.interruptActiveRun();
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
   * Returns a cached RunHandler or initializes one using the resolved repository root.
   *
   * @returns {Promise<RunHandler>} Initialized run handler.
   */
  private async getRunHandler(): Promise<RunHandler> {
    if (this.runHandler) {
      return this.runHandler;
    }

    const repositoryRoot = await this.resolveRepositoryRootForRun();
    if (!repositoryRoot) {
      throw new Error("Unable to locate repository root containing run.sh.");
    }

    this.runHandler = new RunHandler(repositoryRoot, this.tracker);
    return this.runHandler;
  }

  /**
   * Locates the nearest known root that contains run.sh.
   *
   * @returns {Promise<string | undefined>} Repository root path when found.
   */
  private async resolveRepositoryRootForRun(): Promise<string | undefined> {
    const candidatePaths: string[] = [];

    if (this.extensionContext) {
      const extensionPath = this.extensionContext.extensionUri.fsPath;
      candidatePaths.push(extensionPath);
      candidatePaths.push(path.dirname(extensionPath));
    }

    for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
      candidatePaths.push(workspaceFolder.uri.fsPath);
      candidatePaths.push(path.dirname(workspaceFolder.uri.fsPath));
    }

    const uniqueCandidatePaths = [...new Set(candidatePaths)];
    for (const candidatePath of uniqueCandidatePaths) {
      const runScriptPath = path.join(candidatePath, "run.sh");
      try {
        await fs.access(runScriptPath);
        return candidatePath;
      } catch {
        continue;
      }
    }

    return undefined;
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
