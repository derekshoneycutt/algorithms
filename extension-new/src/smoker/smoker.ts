import * as vscode from "vscode";
import { assign, createActor, createMachine, type ActorRefFrom } from "xstate";
import {
  ISmoker,
  type SmokeControlsPatch,
  type SmokeLanguageState,
  type SmokeControlsState,
} from ".";
import { ILanguages, type ISupportedLanguage } from "../languages";
import { IEnvironment } from "../environment";

interface SmokeControlsEvent {
  type: "patch";
  patch: SmokeControlsPatch;
}

/**
 * Storage key used for persisting smoke-controls state across sessions.
 */
const smokeControlsStorageKey = "algos.smokeControlsState";

/**
 * Builds the default smoke-controls state used by the smoke webview.
 *
 * @returns {SmokeControlsState} Fresh default smoke-controls state.
 */
function createInitialSmokeControlsState(): SmokeControlsState {
  return {
    reportEnabled: false,
    markdownPath: "",
    timeoutSeconds: "8m",
    slowTimeoutSeconds: "20m",
    languages: [],
  };
}

/**
 * Returns a normalized timeout value, falling back to defaults for blank or invalid persisted values.
 *
 * @param {unknown} value Candidate persisted timeout value.
 * @param {string} fallback Default timeout value.
 * @returns {string} Normalized timeout value.
 */
function normalizeTimeoutValue(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return fallback;
  }

  return normalizedValue;
}

/**
 * Builds smoke-language rows from the supported-language catalog.
 *
 * @param {ISupportedLanguage[]} supportedLanguages Supported language descriptors.
 * @param {SmokeLanguageState[] | undefined} persistedLanguages Previously persisted language rows.
 * @returns {SmokeLanguageState[]} Normalized smoke-language rows.
 */
function buildSmokeLanguageState(
  supportedLanguages: ISupportedLanguage[],
  persistedLanguages: SmokeLanguageState[] | undefined,
): SmokeLanguageState[] {
  const persistedSelectionByKey = new Map(
    (persistedLanguages ?? []).map((language) => [language.languageKey, language.selected]),
  );

  return supportedLanguages
    .filter((language) => language.smokeVisible)
    .map((language) => {
      const disabledReason = language.hostCanRun
        ? ""
        : (language.hostCannotRunReason
          ?? language.smokeReasonIfDisabledByDefault
          ?? "Unsupported on current host");

      return {
        languageKey: language.key,
        label: language.displayName,
        selected: persistedSelectionByKey.has(language.key)
          ? !!persistedSelectionByKey.get(language.key)
          : language.smokeDefaultEnabled,
        disabled: !language.hostCanRun,
        disabledReason,
        // The view can convert this into a webview URI later.
        iconUri: language.iconFileName,
      };
    });
}

const smokeControlsMachine = createMachine({
  types: {} as {
    context: SmokeControlsState;
    events: SmokeControlsEvent;
  },
  context: createInitialSmokeControlsState(),
  on: {
    patch: {
      actions: assign(({ context, event }) => ({
        ...context,
        ...event.patch,
      })),
    },
  },
});

export class Smoker implements ISmoker {

  private readonly languages : ILanguages;
  private readonly environment : IEnvironment;
  private readonly smokeControlsActor: ActorRefFrom<typeof smokeControlsMachine>;
  private readonly onDidChangeSmokeControlsEmitter: vscode.EventEmitter<SmokeControlsState>;
  private readonly smokeControlsActorSubscription: { unsubscribe: () => void };
  private readonly environmentStateSubscription: vscode.Disposable;
  private shouldPersistSessionState: boolean;
  private extensionContext: vscode.ExtensionContext | undefined;

  /**
   * Creates the Smoker and starts the smoke-controls actor.
   */
  public constructor(languages : ILanguages, environment: IEnvironment) {
    this.languages = languages;
    this.environment = environment;
    this.smokeControlsActor = createActor(smokeControlsMachine);
    this.onDidChangeSmokeControlsEmitter = new vscode.EventEmitter<SmokeControlsState>();
    this.shouldPersistSessionState = this.environment.getEnvironmentControlsState().persistSessionEnabled;
    this.extensionContext = undefined;

    this.environmentStateSubscription = this.environment.subscribeToStateChanges((state) => {
      this.handlePersistSessionPreferenceChanged(state.persistSessionEnabled);
    });

    this.smokeControlsActor.start();
    this.smokeControlsActorSubscription = this.smokeControlsActor.subscribe(() => {
    const smokeControlsState = this.smokeControlsActor.getSnapshot().context;
      this.persistSmokeControlsState(smokeControlsState);
      this.onDidChangeSmokeControlsEmitter.fire(smokeControlsState);
    });
  }

  /**
   * Activates the Smoker lifecycle hook.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  public activate(context: vscode.ExtensionContext): void {
    this.extensionContext = context;
    void this.initializeSmokeControlsState();
  }

  /**
   * Hydrates smoke-controls state from persisted data and supported languages.
   *
   * @returns {Promise<void>} Resolves when hydration is complete.
   */
  private async initializeSmokeControlsState(): Promise<void> {
    if (!this.extensionContext) {
      return;
    }

    const initialSmokeControlsState = createInitialSmokeControlsState();
    if (!this.shouldPersistSessionState) {
      this.clearPersistedSmokeControlsState();
    }

    const persistedSmokeControlsState = this.shouldPersistSessionState
      ? this.extensionContext.globalState.get<Partial<SmokeControlsState> | undefined>(
        smokeControlsStorageKey,
      )
      : undefined;
    const supportedLanguages = await this.languages.getSupportedLanguages();
    const smokeLanguages = buildSmokeLanguageState(
      supportedLanguages,
      persistedSmokeControlsState?.languages,
    );

    this.smokeControlsActor.send({
      type: "patch",
      patch: {
        ...initialSmokeControlsState,
        ...persistedSmokeControlsState,
        timeoutSeconds: normalizeTimeoutValue(
          persistedSmokeControlsState?.timeoutSeconds,
          initialSmokeControlsState.timeoutSeconds,
        ),
        slowTimeoutSeconds: normalizeTimeoutValue(
          persistedSmokeControlsState?.slowTimeoutSeconds,
          initialSmokeControlsState.slowTimeoutSeconds,
        ),
        languages: smokeLanguages,
      },
    });
  }

  /**
   * Applies a partial patch to the smoke-controls state.
   *
   * @param {SmokeControlsPatch} patch Partial update to apply.
   * @returns {void} No return value.
   */
  public patchSmokeControls(patch: SmokeControlsPatch): void {
    this.smokeControlsActor.send({
      type: "patch",
      patch,
    });
  }

  /**
   * Returns the current smoke-controls snapshot.
   *
   * @returns {SmokeControlsState} Current smoke-controls state.
   */
  public getSmokeControlsState(): SmokeControlsState {
    return this.smokeControlsActor.getSnapshot().context;
  }

  /**
   * Subscribes to smoke-controls state changes.
   *
   * @param {(state: SmokeControlsState) => void} listener Listener that receives the current smoke-controls state.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  public subscribeToStateChanges(
    listener: (state: SmokeControlsState) => void,
  ): vscode.Disposable {
    return this.onDidChangeSmokeControlsEmitter.event(listener);
  }

  /**
   * Persists the current smoke-controls state to workspace-global storage.
   *
   * @param {SmokeControlsState} smokeControlsState Current smoke-controls state to persist.
   * @returns {void} No return value.
   */
  private persistSmokeControlsState(smokeControlsState: SmokeControlsState): void {
    if (!this.extensionContext || !this.shouldPersistSessionState) {
      return;
    }

    void this.extensionContext.globalState.update(
      smokeControlsStorageKey,
      smokeControlsState,
    );
  }

  /**
   * Clears persisted smoke-controls state from workspace-global storage.
   *
   * @returns {void} No return value.
   */
  private clearPersistedSmokeControlsState(): void {
    if (!this.extensionContext) {
      return;
    }

    void this.extensionContext.globalState.update(
      smokeControlsStorageKey,
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
      this.clearPersistedSmokeControlsState();
      return;
    }

    this.persistSmokeControlsState(this.getSmokeControlsState());
  }

  /**
   * Cleans up any resources used by the smoker state.
   *
   * @returns {void} No return value.
   */
  public dispose(): void {
    this.environmentStateSubscription.dispose();
    this.smokeControlsActorSubscription.unsubscribe();
    this.onDidChangeSmokeControlsEmitter.dispose();
    this.smokeControlsActor.stop();
  }
}
