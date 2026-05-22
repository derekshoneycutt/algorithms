import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { assign, createActor, createMachine, type ActorRefFrom } from "xstate";
import {
  IEnvironment,
  type EnvironmentControlsPatch,
  type EnvironmentControlsState,
  type EnvironmentRoutingLanguageState,
} from ".";
import {
  InitHandler,
  type InitHandlerCheckEnvironmentResult,
  type InitHandlerCopyIconsResult,
} from "./initHandler";
import { ProfileHandler, type ParsedAlgorithmsProfile } from "./profileHandler";
import { ILanguages, type ISupportedLanguage } from "../languages";

interface EnvironmentControlsEvent {
  type: "patch";
  patch: EnvironmentControlsPatch;
}

interface EnvironmentToggleEditModeEvent {
  type: "toggle-edit-mode";
}

/**
 * Storage key used for persisting environment-controls state across sessions.
 */
const environmentControlsStorageKey = "algos.environmentControlsState";

const defaultProfileHandler = new ProfileHandler();

/**
 * Builds the default environment-controls state.
 *
 * @returns {EnvironmentControlsState} Fresh default environment-controls state.
 */
function createInitialEnvironmentControlsState(): EnvironmentControlsState {
  return {
    editModeEnabled: true,
    persistSessionEnabled: true,
    profilePath: "",
    profilePlaceholder: defaultProfileHandler.getProfilePlaceholderForPlatform(),
    effectiveProfilePath: defaultProfileHandler.getDefaultProfilePathForPlatform(),
    checkEnvFilteredOutput: "No check-environment output yet.",
    checkEnvRawOutput: "No raw output yet.",
    copyIconsPath: "",
    variables: defaultProfileHandler.createDefaultVariableState(),
    batchRouting: {
      dockerEnabled: false,
      dockerValue: "",
      sshEnabled: false,
      sshValue: "",
      isConflict: false,
    },
    routingEntries: [],
  };
}

const environmentControlsMachine = createMachine({
  types: {} as {
    context: EnvironmentControlsState;
    events: EnvironmentControlsEvent | EnvironmentToggleEditModeEvent;
  },
  context: createInitialEnvironmentControlsState(),
  on: {
    patch: {
      actions: assign(({ context, event }) => ({
        ...context,
        ...event.patch,
      })),
    },
    "toggle-edit-mode": {
      actions: assign(({ context }) => ({
        ...context,
        editModeEnabled: !context.editModeEnabled,
      })),
    },
  },
});

/**
 * Environment actor wrapper for environment-controls persistence and shell-profile synchronization.
 */
export class Environment implements IEnvironment {

  private readonly languages : ILanguages;
  private readonly profileHandler: ProfileHandler;
  private readonly environmentControlsActor: ActorRefFrom<typeof environmentControlsMachine>;
  private readonly onDidChangeEnvironmentControlsEmitter: vscode.EventEmitter<EnvironmentControlsState>;
  private readonly environmentControlsActorSubscription: { unsubscribe: () => void };
  private readonly languagesDataChangeSubscription: vscode.Disposable;
  private initHandler: InitHandler | undefined;
  private extensionContext: vscode.ExtensionContext | undefined;
  private isHydrating: boolean;

  /**
   * Creates the Environment actor and starts state updates.
   */
  public constructor(languages : ILanguages) {
    this.languages = languages;
    this.profileHandler = defaultProfileHandler;
    this.environmentControlsActor = createActor(environmentControlsMachine);
    this.onDidChangeEnvironmentControlsEmitter = new vscode.EventEmitter<EnvironmentControlsState>();
    this.initHandler = undefined;
    this.extensionContext = undefined;
    this.isHydrating = false;
    this.languagesDataChangeSubscription = this.languages.subscribeToDataChanges(() => {
      void this.syncRoutingEntriesFromCurrentProfile();
    });

    this.environmentControlsActor.start();
    this.environmentControlsActorSubscription = this.environmentControlsActor.subscribe(() => {
      const environmentControlsState = this.environmentControlsActor.getSnapshot().context;
      if (this.isHydrating) {
        this.onDidChangeEnvironmentControlsEmitter.fire(environmentControlsState);
        return;
      }

      this.persistEnvironmentControlsState(environmentControlsState);
      void this.persistProfileBackedState(environmentControlsState);
      this.onDidChangeEnvironmentControlsEmitter.fire(environmentControlsState);
    });
  }

  /**
   * Activates the Environment actor lifecycle with extension context for persistence.
   *
   * @param {vscode.ExtensionContext} context Extension lifecycle context.
   * @returns {void} No return value.
   */
  public activate(context: vscode.ExtensionContext): void {
    this.extensionContext = context;
    void this.initializeEnvironmentControlsState();
  }

  /**
   * Applies a partial environment-controls update to the active Environment state.
   *
   * @param {EnvironmentControlsPatch} patch Partial state update to apply.
   * @returns {void} No return value.
   */
  public patchEnvironmentControls(patch: EnvironmentControlsPatch): void {
    this.environmentControlsActor.send({
      type: "patch",
      patch,
    });
  }

  /**
   * Sets whether the extension should operate in editable mode.
   *
   * @param {boolean} enabled True to enable edit mode, false for read-only mode.
   * @returns {void} No return value.
   */
  public setEditModeEnabled(enabled: boolean): void {
    this.patchEnvironmentControls({
      editModeEnabled: enabled,
    });
  }

  /**
   * Toggles editable mode on/off in environment-controls state.
   *
   * @returns {void} No return value.
   */
  public toggleEditModeEnabled(): void {
    this.environmentControlsActor.send({
      type: "toggle-edit-mode",
    });
  }

  /**
   * Returns the current persisted environment-controls state snapshot.
   *
   * @returns {EnvironmentControlsState} Current environment-controls state.
   */
  public getEnvironmentControlsState(): EnvironmentControlsState {
    return this.environmentControlsActor.getSnapshot().context;
  }

  /**
   * Reloads profile-backed values from the effective shell profile path.
   *
   * @returns {Promise<void>} Resolves after profile values are applied.
   */
  public async refreshFromProfile(): Promise<void> {
    const currentState = this.getEnvironmentControlsState();
    const profilePath = currentState.profilePath;
    const effectiveProfilePath = this.profileHandler.resolveEffectiveProfilePath(profilePath);
    const parsedProfile = await this.loadProfile(effectiveProfilePath);
    const routingEntries = await this.createLanguageRoutingEntries(parsedProfile);

    this.patchEnvironmentControls({
      profilePath,
      effectiveProfilePath,
      profilePlaceholder: this.profileHandler.getProfilePlaceholderForPlatform(),
      variables: this.profileHandler.applyProfileValuesToVariables(currentState.variables, parsedProfile.values),
      routingEntries,
    });
  }

  /**
   * Runs init.sh check-environment using current Environment state.
   *
   * @returns {Promise<InitHandlerCheckEnvironmentResult>} Check-environment result.
   */
  public async runCheckEnvironment(): Promise<InitHandlerCheckEnvironmentResult> {
    const currentState = this.getEnvironmentControlsState();

    let result: InitHandlerCheckEnvironmentResult;
    try {
      const initHandler = await this.getInitHandler();
      result = await initHandler.checkEnvironment({
        profilePath: currentState.profilePath,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result = {
        kind: "error",
        text: `Environment check failed: ${errorMessage}`,
        filteredOutput: "",
        rawOutput: errorMessage,
        exitCode: null,
      };
    }

    this.patchEnvironmentControls({
      checkEnvFilteredOutput: result.filteredOutput,
      checkEnvRawOutput: result.rawOutput,
    });

    return result;
  }

  /**
   * Runs init.sh copy-icons using current Environment state.
   *
   * @returns {Promise<InitHandlerCopyIconsResult>} Copy-icons result.
   */
  public async runCopyIcons(): Promise<InitHandlerCopyIconsResult> {
    const currentState = this.getEnvironmentControlsState();

    try {
      const initHandler = await this.getInitHandler();
      return await initHandler.copyIcons({
        profilePath: currentState.profilePath,
        copyIconsPath: currentState.copyIconsPath,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        kind: "error",
        text: `Icon copy failed: ${errorMessage}`,
        rawOutput: errorMessage,
        exitCode: null,
      };
    }
  }

  /**
   * Subscribes to environment-controls state changes.
   *
   * @param {(state: EnvironmentControlsState) => void} listener Listener invoked on state changes.
   * @returns {vscode.Disposable} Subscription disposable.
   */
  public subscribeToStateChanges(
    listener: (state: EnvironmentControlsState) => void,
  ): vscode.Disposable {
    return this.onDidChangeEnvironmentControlsEmitter.event(listener);
  }

  /**
   * Cleans up any resources used by the environment state.
   *
   * @returns {void} No return value.
   */
  public dispose(): void {
    this.languagesDataChangeSubscription.dispose();
    this.environmentControlsActorSubscription.unsubscribe();
    this.onDidChangeEnvironmentControlsEmitter.dispose();
    this.environmentControlsActor.stop();
  }

  /**
   * Hydrates environment-controls state from persisted state and shell profile values.
   *
   * @returns {Promise<void>} Resolves when hydration is complete.
   */
  private async initializeEnvironmentControlsState(): Promise<void> {
    if (!this.extensionContext) {
      return;
    }

    const initialState = createInitialEnvironmentControlsState();
    const persistedState = this.extensionContext.globalState.get<Partial<EnvironmentControlsState> | undefined>(
      environmentControlsStorageKey,
    );

    const hydratedState: EnvironmentControlsState = {
      ...initialState,
      ...persistedState,
      variables: persistedState?.variables ?? initialState.variables,
      batchRouting: persistedState?.batchRouting ?? initialState.batchRouting,
      routingEntries: persistedState?.routingEntries ?? initialState.routingEntries,
      profilePlaceholder: this.profileHandler.getProfilePlaceholderForPlatform(),
      effectiveProfilePath: this.profileHandler.resolveEffectiveProfilePath(
        persistedState?.profilePath ?? initialState.profilePath,
      ),
    };

    const parsedProfile = await this.loadProfile(hydratedState.effectiveProfilePath);
    const routingEntries = await this.createLanguageRoutingEntries(parsedProfile);

    this.isHydrating = true;
    this.environmentControlsActor.send({
      type: "patch",
      patch: {
        ...hydratedState,
        variables: this.profileHandler.applyProfileValuesToVariables(hydratedState.variables, parsedProfile.values),
        routingEntries,
      },
    });
    this.isHydrating = false;

    const finalState = this.getEnvironmentControlsState();
    this.persistEnvironmentControlsState(finalState);
  }

  /**
   * Refreshes routing entries from the current profile and supported languages.
   *
   * @returns {Promise<void>} Resolves after routing entries are updated.
   */
  private async syncRoutingEntriesFromCurrentProfile(): Promise<void> {
    if (!this.extensionContext) {
      return;
    }

    const currentState = this.getEnvironmentControlsState();
    const effectiveProfilePath = this.profileHandler.resolveEffectiveProfilePath(currentState.profilePath);
    const parsedProfile = await this.loadProfile(effectiveProfilePath);
    const routingEntries = await this.createLanguageRoutingEntries(parsedProfile);

    this.patchEnvironmentControls({
      routingEntries,
    });
  }

  /**
   * Loads and parses one shell profile file.
   *
   * @param {string} effectiveProfilePath Effective profile path to load.
   * @returns {Promise<ParsedAlgorithmsProfile>} Parsed profile values.
   */
  private async loadProfile(effectiveProfilePath: string): Promise<ParsedAlgorithmsProfile> {
    let profileText = "";

    try {
      profileText = await fs.readFile(effectiveProfilePath, "utf8");
    } catch {
      profileText = "";
    }

    return this.profileHandler.parseAlgorithmsProfile(profileText);
  }

  /**
   * Returns an initialized init.sh handler scoped to the repository root.
   *
   * @returns {Promise<InitHandler>} Initialized init handler.
   */
  private async getInitHandler(): Promise<InitHandler> {
    if (this.initHandler) {
      return this.initHandler;
    }

    const repositoryRoot = await this.resolveRepositoryRootForInit();
    if (!repositoryRoot) {
      throw new Error("Unable to locate repository root containing init.sh.");
    }

    this.initHandler = new InitHandler(repositoryRoot);
    return this.initHandler;
  }

  /**
   * Locates the nearest known root that contains init.sh.
   *
   * @returns {Promise<string | undefined>} Repository root path when found.
   */
  private async resolveRepositoryRootForInit(): Promise<string | undefined> {
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
      const initScriptPath = path.join(candidatePath, "init.sh");
      try {
        await fs.access(initScriptPath);
        return candidatePath;
      } catch {
        continue;
      }
    }

    return undefined;
  }

  /**
   * Creates per-language routing entries using supported languages and parsed route maps.
   *
   * @param {ParsedAlgorithmsProfile} parsedProfile Parsed profile values and route maps.
   * @returns {Promise<EnvironmentRoutingLanguageState[]>} Per-language routing entries.
   */
  private async createLanguageRoutingEntries(
    parsedProfile: ParsedAlgorithmsProfile,
  ): Promise<EnvironmentRoutingLanguageState[]> {
    let supportedLanguages: ISupportedLanguage[] = [];

    try {
      supportedLanguages = await this.languages.getSupportedLanguages();
    } catch {
      supportedLanguages = [];
    }

    const routingEntries = await Promise.all(supportedLanguages
      .map(async (language) => {
        const dockerValue = parsedProfile.routeMaps.docker.get(language.key) ?? "";
        const sshRoute = parsedProfile.routeMaps.ssh.get(language.key);
        const sshValue = this.profileHandler.serializeParsedSshRoute(sshRoute);
        const dockerEnabled = dockerValue.length > 0;
        const sshEnabled = sshValue.length > 0;

        return {
          languageKey: language.key,
          label: language.displayName,
          iconUri: await this.createLanguageIconUri(language.iconFileName),
          dockerEnabled,
          dockerValue,
          sshEnabled,
          sshValue,
          isConflict: dockerEnabled && sshEnabled,
        };
      }));

    return routingEntries.sort((left, right) => left.label.localeCompare(right.label));
  }

  /**
   * Creates one icon URI string for a language icon file.
   *
   * @param {string} iconFileName Language icon filename.
   * @returns {string} URI string for the icon file, or an empty string when unavailable.
   */
  private async createLanguageIconUri(iconFileName: string): Promise<string> {
    if (!this.extensionContext || iconFileName.trim().length === 0) {
      return "";
    }

    const iconUri = vscode.Uri.joinPath(
      this.extensionContext.extensionUri,
      "icons",
      "languages",
      iconFileName,
    );

    let iconBuffer: Buffer;
    try {
      iconBuffer = await fs.readFile(iconUri.fsPath);
    } catch {
      return "";
    }

    const loweredName = iconFileName.toLowerCase();
    const mimeType = loweredName.endsWith(".svg")
      ? "image/svg+xml"
      : loweredName.endsWith(".png")
        ? "image/png"
        : loweredName.endsWith(".jpg") || loweredName.endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";

    return `data:${mimeType};base64,${iconBuffer.toString("base64")}`;
  }

  /**
   * Persists non-profile environment state to workspace-global storage.
   *
   * @param {EnvironmentControlsState} environmentControlsState Current environment-controls state.
   * @returns {void} No return value.
   */
  private persistEnvironmentControlsState(environmentControlsState: EnvironmentControlsState): void {
    if (!this.extensionContext) {
      return;
    }

    void this.extensionContext.globalState.update(
      environmentControlsStorageKey,
      environmentControlsState,
    );
  }

  /**
   * Persists profile-backed environment values to the managed shell-profile block.
   *
   * @param {EnvironmentControlsState} state Current environment controls state.
   * @returns {Promise<void>} Resolves when profile values are persisted.
   */
  private async persistProfileBackedState(state: EnvironmentControlsState): Promise<void> {
    const effectiveProfilePath = this.profileHandler.resolveEffectiveProfilePath(state.profilePath);

    let existingProfileText = "";
    try {
      existingProfileText = await fs.readFile(effectiveProfilePath, "utf8");
    } catch {
      existingProfileText = "";
    }

    const updatedProfileText = this.profileHandler.upsertAlgorithmsProfileBlock(
      existingProfileText,
      this.profileHandler.createProfileWritableValues(state),
    );

    await fs.writeFile(effectiveProfilePath, updatedProfileText, "utf8");

    const currentState = this.getEnvironmentControlsState();
    if (currentState.effectiveProfilePath !== effectiveProfilePath) {
      this.patchEnvironmentControls({
        effectiveProfilePath,
      });
    }
  }
}
