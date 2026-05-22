import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { assign, createActor, createMachine, type ActorRefFrom } from "xstate";
import {
  IEnvironment,
  type EnvironmentControlsPatch,
  type EnvironmentControlsState,
  type EnvironmentRoutingLanguageState,
  type EnvironmentVariableKey,
  type EnvironmentVariableState,
} from ".";
import {
  InitHandler,
  type InitHandlerCheckEnvironmentResult,
  type InitHandlerCopyIconsResult,
} from "./initHandler";
import { parseAlgorithmsProfile, type ParsedAlgorithmsProfile, type ParsedSshRoute } from "./shellProfileParse";
import { upsertAlgorithmsProfileBlock } from "./shellProfileWrite";
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

/**
 * Variable labels keyed by environment variable key.
 */
const environmentVariableLabelsByKey: Record<EnvironmentVariableKey, string> = {
  timeout: "TIMEOUT",
  eiffel: "EIFFEL",
  gcc13Directory: "GCC13_DIRECTORY",
  gcc13Name: "GCC13_NAME",
  gxx13Name: "GXX13_NAME",
};

/**
 * Maps profile variable keys to environment variable keys.
 */
const profileVariableKeyByEnvironmentKey: Record<EnvironmentVariableKey, keyof ReturnType<typeof parseAlgorithmsProfile>["values"]> = {
  timeout: "timeout",
  eiffel: "eiffel",
  gcc13Directory: "gcc13Directory",
  gcc13Name: "gcc13Name",
  gxx13Name: "gxx13Name",
};

/**
 * Returns the platform-specific profile filename.
 *
 * @param {string} [platformOverride] Optional platform override for tests.
 * @returns {string} Default profile filename.
 */
function getProfileFileNameForPlatform(platformOverride?: string): string {
  const platform = platformOverride !== undefined ? platformOverride : process.platform;

  if (platform === "freebsd") {
    return ".profile";
  }

  if (platform === "darwin") {
    return ".zprofile";
  }

  return ".bash_profile";
}

/**
 * Returns the platform-specific placeholder profile path.
 *
 * @param {string} [platformOverride] Optional platform override for tests.
 * @returns {string} Placeholder profile path.
 */
function getProfilePlaceholderForPlatform(platformOverride?: string): string {
  return `~/${getProfileFileNameForPlatform(platformOverride)}`;
}

/**
 * Returns the default expanded profile path for the current platform.
 *
 * @param {string} [platformOverride] Optional platform override for tests.
 * @returns {string} Expanded default profile path.
 */
function getDefaultProfilePathForPlatform(platformOverride?: string): string {
  return path.join(os.homedir(), getProfileFileNameForPlatform(platformOverride));
}

/**
 * Builds default environment variable rows.
 *
 * @returns {EnvironmentVariableState[]} Default environment variable rows.
 */
function createDefaultVariableState(): EnvironmentVariableState[] {
  const orderedKeys: EnvironmentVariableKey[] = [
    "timeout",
    "eiffel",
    "gcc13Directory",
    "gcc13Name",
    "gxx13Name",
  ];

  return orderedKeys.map((key) => {
    return {
      key,
      label: environmentVariableLabelsByKey[key],
      value: "",
    };
  });
}

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
    profilePlaceholder: getProfilePlaceholderForPlatform(),
    effectiveProfilePath: getDefaultProfilePathForPlatform(),
    checkEnvFilteredOutput: "No check-environment output yet.",
    checkEnvRawOutput: "No raw output yet.",
    copyIconsPath: "",
    variables: createDefaultVariableState(),
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

/**
 * Derives one effective profile path from a possibly-empty profile path override.
 *
 * @param {string} profilePath Requested profile path override.
 * @returns {string} Effective profile path used for file reads/writes.
 */
function resolveEffectiveProfilePath(profilePath: string): string {
  const trimmedProfilePath = String(profilePath || "").trim();
  if (trimmedProfilePath.length > 0) {
    return trimmedProfilePath;
  }

  return getDefaultProfilePathForPlatform();
}

/**
 * Applies parsed profile values onto current environment variable state.
 *
 * @param {EnvironmentVariableState[]} variables Current variables array.
 * @param {ReturnType<typeof parseAlgorithmsProfile>["values"]} parsedValues Parsed profile value set.
 * @returns {EnvironmentVariableState[]} Updated variable array.
 */
function applyProfileValuesToVariables(
  variables: EnvironmentVariableState[],
  parsedValues: ReturnType<typeof parseAlgorithmsProfile>["values"]): EnvironmentVariableState[] {
  const valueByKey = new Map<EnvironmentVariableKey, string>();

  for (const variable of variables) {
    valueByKey.set(variable.key, variable.value);
  }

  const keys = Object.keys(profileVariableKeyByEnvironmentKey) as EnvironmentVariableKey[];
  for (const key of keys) {
    const parsedValue = parsedValues[profileVariableKeyByEnvironmentKey[key]].value;
    valueByKey.set(key, parsedValue);
  }

  return variables.map((variable) => {
    return {
      ...variable,
      value: valueByKey.get(variable.key) ?? "",
    };
  });
}

/**
 * Builds profile-write values from environment state while preserving route map values.
 *
 * @param {EnvironmentControlsState} state Current environment controls state.
 * @param {ReturnType<typeof parseAlgorithmsProfile>["values"]} parsedValues Existing parsed profile values.
 * @returns {Parameters<typeof upsertAlgorithmsProfileBlock>[1]} Profile block writable values.
 */
function createProfileWritableValues(
  state: EnvironmentControlsState,
  _parsedValues: ReturnType<typeof parseAlgorithmsProfile>["values"]): Parameters<typeof upsertAlgorithmsProfileBlock>[1] {
  const variableValueByKey = new Map<EnvironmentVariableKey, string>();
  for (const variable of state.variables) {
    variableValueByKey.set(variable.key, variable.value);
  }

  return {
    timeout: variableValueByKey.get("timeout") ?? "",
    eiffel: variableValueByKey.get("eiffel") ?? "",
    gcc13Directory: variableValueByKey.get("gcc13Directory") ?? "",
    gcc13Name: variableValueByKey.get("gcc13Name") ?? "",
    gxx13Name: variableValueByKey.get("gxx13Name") ?? "",
    dockerMapText: createDockerMapTextFromRoutingEntries(state.routingEntries),
    sshMapText: createSshMapTextFromRoutingEntries(state.routingEntries),
  };
}

/**
 * Builds one docker route-map export value from routing entries.
 *
 * @param {EnvironmentRoutingLanguageState[]} routingEntries Current routing entries.
 * @returns {string} Docker route-map text in `language=value` token format.
 */
function createDockerMapTextFromRoutingEntries(routingEntries: EnvironmentRoutingLanguageState[]): string {
  return routingEntries
    .map((entry) => {
      const languageKey = entry.languageKey.trim().toLowerCase();
      const dockerValue = entry.dockerValue.trim();

      if (!entry.dockerEnabled || languageKey.length === 0 || dockerValue.length === 0) {
        return "";
      }

      return `${languageKey}=${dockerValue}`;
    })
    .filter((token) => token.length > 0)
    .join(" ");
}

/**
 * Builds one SSH route-map export value from routing entries.
 *
 * @param {EnvironmentRoutingLanguageState[]} routingEntries Current routing entries.
 * @returns {string} SSH route-map text in `language=value` token format.
 */
function createSshMapTextFromRoutingEntries(routingEntries: EnvironmentRoutingLanguageState[]): string {
  return routingEntries
    .map((entry) => {
      const languageKey = entry.languageKey.trim().toLowerCase();
      const sshValue = entry.sshValue.trim();

      if (!entry.sshEnabled || languageKey.length === 0 || sshValue.length === 0) {
        return "";
      }

      return `${languageKey}=${sshValue}`;
    })
    .filter((token) => token.length > 0)
    .join(" ");
}

/**
 * Serializes one parsed SSH route back to the profile route-map value format.
 *
 * @param {ParsedSshRoute | undefined} route Parsed SSH route value.
 * @returns {string} Serialized SSH route text, or an empty string when undefined.
 */
function serializeParsedSshRoute(route: ParsedSshRoute | undefined): string {
  if (!route) {
    return "";
  }

  if (route.kind === "named-destination") {
    return [route.destination, route.codeDirectory, route.runScript].join("|");
  }

  return [route.address, route.user, route.port, route.codeDirectory, route.runScript].join("|");
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
    const effectiveProfilePath = resolveEffectiveProfilePath(profilePath);
    const parsedProfile = await this.loadProfile(effectiveProfilePath);
    const routingEntries = await this.createLanguageRoutingEntries(parsedProfile);

    this.patchEnvironmentControls({
      profilePath,
      effectiveProfilePath,
      profilePlaceholder: getProfilePlaceholderForPlatform(),
      variables: applyProfileValuesToVariables(currentState.variables, parsedProfile.values),
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
      profilePlaceholder: getProfilePlaceholderForPlatform(),
      effectiveProfilePath: resolveEffectiveProfilePath(persistedState?.profilePath ?? initialState.profilePath),
    };

    const parsedProfile = await this.loadProfile(hydratedState.effectiveProfilePath);
    const routingEntries = await this.createLanguageRoutingEntries(parsedProfile);

    this.isHydrating = true;
    this.environmentControlsActor.send({
      type: "patch",
      patch: {
        ...hydratedState,
        variables: applyProfileValuesToVariables(hydratedState.variables, parsedProfile.values),
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
    const effectiveProfilePath = resolveEffectiveProfilePath(currentState.profilePath);
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
   * @returns {Promise<ReturnType<typeof parseAlgorithmsProfile>>} Parsed profile values.
   */
  private async loadProfile(effectiveProfilePath: string): Promise<ReturnType<typeof parseAlgorithmsProfile>> {
    let profileText = "";

    try {
      profileText = await fs.readFile(effectiveProfilePath, "utf8");
    } catch {
      profileText = "";
    }

    return parseAlgorithmsProfile(profileText);
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
        const sshValue = serializeParsedSshRoute(sshRoute);
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
    const effectiveProfilePath = resolveEffectiveProfilePath(state.profilePath);
    const parsedProfile = await this.loadProfile(effectiveProfilePath);

    let existingProfileText = "";
    try {
      existingProfileText = await fs.readFile(effectiveProfilePath, "utf8");
    } catch {
      existingProfileText = "";
    }

    const updatedProfileText = upsertAlgorithmsProfileBlock(
      existingProfileText,
      createProfileWritableValues(state, parsedProfile.values),
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
