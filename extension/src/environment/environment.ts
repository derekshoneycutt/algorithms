import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { assign, createActor, createMachine, type ActorRefFrom } from "xstate";
import {
  IEnvironment,
  type EnvironmentControlsPatch,
  type EnvironmentControlsState,
  type EnvironmentVariableKey,
  type EnvironmentRoutingLanguageState,
} from ".";
import {
  InitHandler,
  type InitHandlerCheckEnvironmentResult,
  type InitHandlerCopyIconsResult,
} from "./initHandler";
import {
  ProfileHandler,
  type AlgorithmsProfileWritableValues,
  type ParsedAlgorithmsProfile,
} from "./profileHandler";
import { ILanguages, type ISupportedLanguage } from "../languages";

const profileWritableKeyByEnvironmentKey: Record<EnvironmentVariableKey, keyof AlgorithmsProfileWritableValues> = {
  timeout: "timeout",
  eiffel: "eiffel",
  gcc13Directory: "gcc13Directory",
  gcc13Name: "gcc13Name",
  gxx13Name: "gxx13Name",
};

interface ParsedRouteToken {
  raw: string;
  key: string | null;
}

interface EnvironmentControlsEvent {
  type: "patch";
  patch: EnvironmentControlsPatch;
}

interface EnvironmentToggleEditModeEvent {
  type: "toggle-edit-mode";
}

/**
 * Returns whether one unknown error is an ENOENT-style file-not-found error.
 *
 * @param {unknown} error Candidate error value.
 * @returns {boolean} True when the error indicates a missing file.
 */
function isFileNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return String((error as NodeJS.ErrnoException).code || "") === "ENOENT";
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
  private isInitialized: boolean;

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
    this.isInitialized = false;
    this.languagesDataChangeSubscription = this.languages.subscribeToDataChanges(() => {
      void this.syncRoutingEntriesFromCurrentProfile();
    });

    this.environmentControlsActor.start();
    this.environmentControlsActorSubscription = this.environmentControlsActor.subscribe(() => {
      const environmentControlsState = this.environmentControlsActor.getSnapshot().context;
      if (this.isHydrating || !this.extensionContext || !this.isInitialized) {
        this.onDidChangeEnvironmentControlsEmitter.fire(environmentControlsState);
        return;
      }

      this.persistEnvironmentControlsState(environmentControlsState);
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
    let result: InitHandlerCheckEnvironmentResult;
    try {
      const initHandler = await this.getInitHandler();
      result = await initHandler.checkEnvironment();
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
   * Saves one environment variable while reloading all other managed values from profile first.
   *
   * @param {EnvironmentVariableKey} key Variable key to save.
   * @param {string} value Variable value to save.
   * @returns {Promise<void>} Resolves when the profile write and state patch are complete.
   */
  public async saveEnvironmentVariable(key: EnvironmentVariableKey, value: string): Promise<void> {
    const currentState = this.getEnvironmentControlsState();
    const effectiveProfilePath = this.profileHandler.resolveEffectiveProfilePath(currentState.profilePath);
    const existingProfileText = await this.readProfileText(effectiveProfilePath);
    const parsedProfile = this.profileHandler.parseAlgorithmsProfile(existingProfileText);
    const routingEntries = await this.createLanguageRoutingEntries(parsedProfile);
    const variablesFromProfile = this.profileHandler.applyProfileValuesToVariables(
      currentState.variables,
      parsedProfile.values,
    );

    const variables = variablesFromProfile.map((variable) => {
      if (variable.key !== key) {
        return variable;
      }

      return {
        ...variable,
        value,
      };
    });

    const writableValues = this.createWritableValuesFromParsedProfile(parsedProfile);
    writableValues[profileWritableKeyByEnvironmentKey[key]] = value;
    const updatedProfileText = this.profileHandler.upsertAlgorithmsProfileBlock(existingProfileText, writableValues);
    await fs.writeFile(effectiveProfilePath, updatedProfileText, "utf8");

    this.patchEnvironmentControls({
      effectiveProfilePath,
      variables,
      routingEntries,
    });
  }

  /**
   * Saves routing values for one language while preserving all other route tokens.
   *
   * @param {string} languageKey Language key to save.
   * @param {boolean} dockerEnabled Whether docker routing is enabled.
   * @param {string} dockerValue Docker routing value.
   * @param {boolean} sshEnabled Whether SSH routing is enabled.
   * @param {string} sshValue SSH routing value.
   * @returns {Promise<void>} Resolves when profile write and state patch are complete.
   */
  public async saveRoutingEntry(
    languageKey: string,
    dockerEnabled: boolean,
    dockerValue: string,
    sshEnabled: boolean,
    sshValue: string,
  ): Promise<void> {
    const normalizedLanguageKey = String(languageKey || "").trim().toLowerCase();
    if (normalizedLanguageKey.length === 0) {
      return;
    }

    const currentState = this.getEnvironmentControlsState();
    const effectiveProfilePath = this.profileHandler.resolveEffectiveProfilePath(currentState.profilePath);
    const existingProfileText = await this.readProfileText(effectiveProfilePath);
    const parsedProfile = this.profileHandler.parseAlgorithmsProfile(existingProfileText);
    const routingEntriesFromProfile = await this.createLanguageRoutingEntries(parsedProfile);
    const routingEntries = routingEntriesFromProfile.map((entry) => {
      if (entry.languageKey !== normalizedLanguageKey) {
        return entry;
      }

      return {
        ...entry,
        dockerEnabled,
        dockerValue,
        sshEnabled,
        sshValue,
        isConflict: dockerEnabled && sshEnabled,
      };
    });

    const writableValues = this.createWritableValuesFromParsedProfile(parsedProfile);
    writableValues.dockerMapText = this.upsertRouteMapEntry(
      parsedProfile.values.dockerMapText.value,
      normalizedLanguageKey,
      dockerEnabled,
      dockerValue,
    );
    writableValues.sshMapText = this.upsertRouteMapEntry(
      parsedProfile.values.sshMapText.value,
      normalizedLanguageKey,
      sshEnabled,
      sshValue,
    );

    const updatedProfileText = this.profileHandler.upsertAlgorithmsProfileBlock(existingProfileText, writableValues);
    await fs.writeFile(effectiveProfilePath, updatedProfileText, "utf8");

    this.patchEnvironmentControls({
      effectiveProfilePath,
      routingEntries,
    });
  }

  /**
   * Saves batch routing values across all supported languages and preserves unknown tokens.
   *
   * @param {boolean} dockerEnabled Whether docker routing is enabled.
   * @param {string} dockerValue Docker routing value.
   * @param {boolean} sshEnabled Whether SSH routing is enabled.
   * @param {string} sshValue SSH routing value.
   * @returns {Promise<void>} Resolves when profile write and state patch are complete.
   */
  public async saveBatchRouting(
    dockerEnabled: boolean,
    dockerValue: string,
    sshEnabled: boolean,
    sshValue: string,
  ): Promise<void> {
    const currentState = this.getEnvironmentControlsState();
    const effectiveProfilePath = this.profileHandler.resolveEffectiveProfilePath(currentState.profilePath);
    const existingProfileText = await this.readProfileText(effectiveProfilePath);
    const parsedProfile = this.profileHandler.parseAlgorithmsProfile(existingProfileText);
    const routingEntriesFromProfile = await this.createLanguageRoutingEntries(parsedProfile);
    const supportedLanguageKeys = routingEntriesFromProfile.map((entry) => entry.languageKey);

    const routingEntries = routingEntriesFromProfile.map((entry) => {
      return {
        ...entry,
        dockerEnabled,
        dockerValue,
        sshEnabled,
        sshValue,
        isConflict: dockerEnabled && sshEnabled,
      };
    });

    const writableValues = this.createWritableValuesFromParsedProfile(parsedProfile);
    writableValues.dockerMapText = this.upsertRouteMapForLanguages(
      parsedProfile.values.dockerMapText.value,
      supportedLanguageKeys,
      dockerEnabled,
      dockerValue,
    );
    writableValues.sshMapText = this.upsertRouteMapForLanguages(
      parsedProfile.values.sshMapText.value,
      supportedLanguageKeys,
      sshEnabled,
      sshValue,
    );

    const updatedProfileText = this.profileHandler.upsertAlgorithmsProfileBlock(existingProfileText, writableValues);
    await fs.writeFile(effectiveProfilePath, updatedProfileText, "utf8");

    this.patchEnvironmentControls({
      effectiveProfilePath,
      batchRouting: {
        dockerEnabled,
        dockerValue,
        sshEnabled,
        sshValue,
        isConflict: dockerEnabled && sshEnabled,
      },
      routingEntries,
    });
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
    this.isInitialized = true;

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
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }

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
   * Reads profile text from disk and returns an empty body when the file is missing.
   *
   * @param {string} effectiveProfilePath Effective profile path.
   * @returns {Promise<string>} Profile text content.
   */
  private async readProfileText(effectiveProfilePath: string): Promise<string> {
    try {
      return await fs.readFile(effectiveProfilePath, "utf8");
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }

      return "";
    }
  }

  /**
   * Creates writable profile values from one parsed managed-profile snapshot.
   *
   * @param {ParsedAlgorithmsProfile} parsedProfile Parsed profile snapshot.
   * @returns {AlgorithmsProfileWritableValues} Writable profile values initialized from file state.
   */
  private createWritableValuesFromParsedProfile(
    parsedProfile: ParsedAlgorithmsProfile,
  ): AlgorithmsProfileWritableValues {
    return {
      timeout: parsedProfile.values.timeout.value,
      eiffel: parsedProfile.values.eiffel.value,
      gcc13Directory: parsedProfile.values.gcc13Directory.value,
      gcc13Name: parsedProfile.values.gcc13Name.value,
      gxx13Name: parsedProfile.values.gxx13Name.value,
      dockerMapText: parsedProfile.values.dockerMapText.value,
      sshMapText: parsedProfile.values.sshMapText.value,
    };
  }

  /**
   * Replaces one routing-map entry while preserving untouched tokens.
   *
   * @param {string} mapText Existing map text.
   * @param {string} languageKey Target language key.
   * @param {boolean} enabled Whether the route entry should be present.
   * @param {string} value Route value.
   * @returns {string} Updated map text.
   */
  private upsertRouteMapEntry(
    mapText: string,
    languageKey: string,
    enabled: boolean,
    value: string,
  ): string {
    const normalizedLanguageKey = String(languageKey || "").trim().toLowerCase();
    const normalizedValue = String(value || "").trim();
    const tokens = this.parseRouteTokens(mapText)
      .filter((token) => token.key !== normalizedLanguageKey)
      .map((token) => token.raw);

    if (enabled && normalizedValue.length > 0 && normalizedLanguageKey.length > 0) {
      tokens.push(`${normalizedLanguageKey}=${normalizedValue}`);
    }

    return tokens.join(" ");
  }

  /**
   * Replaces routing-map entries for one language set while preserving untouched tokens.
   *
   * @param {string} mapText Existing map text.
   * @param {string[]} languageKeys Language keys to replace.
   * @param {boolean} enabled Whether route entries should be present.
   * @param {string} value Route value.
   * @returns {string} Updated map text.
   */
  private upsertRouteMapForLanguages(
    mapText: string,
    languageKeys: string[],
    enabled: boolean,
    value: string,
  ): string {
    const normalizedKeys = new Set(languageKeys.map((key) => String(key || "").trim().toLowerCase()));
    const normalizedValue = String(value || "").trim();
    const tokens = this.parseRouteTokens(mapText)
      .filter((token) => {
        return token.key === null || !normalizedKeys.has(token.key);
      })
      .map((token) => token.raw);

    if (enabled && normalizedValue.length > 0) {
      for (const languageKey of normalizedKeys) {
        if (languageKey.length === 0) {
          continue;
        }

        tokens.push(`${languageKey}=${normalizedValue}`);
      }
    }

    return tokens.join(" ");
  }

  /**
   * Parses whitespace-delimited route-map tokens and extracts key names when valid.
   *
   * @param {string} mapText Existing route-map text.
   * @returns {ParsedRouteToken[]} Parsed route tokens.
   */
  private parseRouteTokens(mapText: string): ParsedRouteToken[] {
    const normalizedMapText = String(mapText || "").trim();
    if (normalizedMapText.length === 0) {
      return [];
    }

    return normalizedMapText
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .map((rawToken) => {
        const separatorIndex = rawToken.indexOf("=");
        if (separatorIndex <= 0) {
          return {
            raw: rawToken,
            key: null,
          };
        }

        const rawKey = rawToken.slice(0, separatorIndex).trim().toLowerCase();
        if (rawKey.length === 0) {
          return {
            raw: rawToken,
            key: null,
          };
        }

        return {
          raw: rawToken,
          key: rawKey,
        };
      });
  }

}
