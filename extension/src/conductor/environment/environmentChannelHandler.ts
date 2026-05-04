import * as vscode from "vscode";

import type { ViewToHostMessage } from "../../comms/shared/messageTypes";
import {
  parseDockerRouteMap,
  type AlgorithmsProfileWritableValues,
} from "../../commandline";
import type { ILanguages } from "../../languages";
import type {
  EnvironmentControlsSettings,
  EnvironmentVariableKey,
  IStateMachine,
  ViewStatusClassName,
} from "../../state";
import type { IConductor } from "../IConductor";
import type { ApplyConductorReactionDependencies } from "../channels/types";

/**
 * Dependencies used to create one environment-controls channel handler.
 */
export interface CreateEnvironmentControlsChannelMessageHandlerInput
  extends ApplyConductorReactionDependencies {
  conductor: IConductor;
  languages: ILanguages;
  publishSnapshot: () => void;
}

/**
 * Maps one environment operation kind to a shared status class name.
 *
 * @param {"running" | "ok" | "error"} kind Operation status kind.
 * @returns {ViewStatusClassName} Shared status class name.
 */
function mapEnvironmentKindToStatusClass(kind: "running" | "ok" | "error"): ViewStatusClassName {
  if (kind === "ok") {
    return "status-ok";
  }

  if (kind === "error") {
    return "status-error";
  }

  return "status-muted";
}

/**
 * Resolves the active workspace folder path for environment operations.
 *
 * @returns {string | null} Active workspace folder path or null when unavailable.
 */
function resolveActiveWorkspaceFolderPath(): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (workspaceFolders.length === 0) {
    return null;
  }

  return workspaceFolders[0].uri.fsPath;
}

/**
 * Builds one writable profile value map from state snapshot values.
 *
 * @param {ReturnType<IStateMachine["getSnapshot"]>} snapshot Current host snapshot.
 * @param {string} [dockerMapText] Optional docker map override.
 * @param {string} [sshMapText] Optional SSH map override.
 * @returns {AlgorithmsProfileWritableValues} Writable profile values.
 */
function buildEnvironmentWriteValuesFromSnapshot(
  environmentControls: EnvironmentControlsSettings,
  dockerMapText?: string,
  sshMapText?: string
): AlgorithmsProfileWritableValues {
  const valueByKey = new Map(environmentControls.variables.map((variable) => {
    return [variable.key, variable.value] as const;
  }));

  return {
    timeout: valueByKey.get("timeout") ?? "",
    eiffel: valueByKey.get("eiffel") ?? "",
    gcc13Directory: valueByKey.get("gcc13Directory") ?? "",
    gcc13Name: valueByKey.get("gcc13Name") ?? "",
    gxx13Name: valueByKey.get("gxx13Name") ?? "",
    dockerMapText: dockerMapText ?? environmentControls.routingDockerMapText,
    sshMapText: sshMapText ?? environmentControls.routingSshMapText,
  };
}

/**
 * Serializes one route map into shell-profile map text.
 *
 * @param {Map<string, string>} routeMap Route map.
 * @returns {string} Serialized map text.
 */
function serializeRouteMap(routeMap: Map<string, string>): string {
  const entries = Array.from(routeMap.entries()).filter(([, value]) => {
    return String(value || "").trim().length > 0;
  }).sort(([leftKey], [rightKey]) => {
    return leftKey.localeCompare(rightKey);
  });

  return entries.map(([key, value]) => {
    return `${key}=${value}`;
  }).join(" ");
}

/**
 * Parses one whitespace-delimited routing map into raw string values.
 *
 * @param {string} mapText Raw map text.
 * @returns {Map<string, string>} Parsed route map.
 */
function parseRawRouteMap(mapText: string): Map<string, string> {
  const routeMap = new Map<string, string>();
  const rawText = String(mapText || "").trim();

  if (rawText.length === 0) {
    return routeMap;
  }

  const tokens = rawText.split(/\s+/);
  for (const token of tokens) {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const languageKey = token.slice(0, separatorIndex).trim().toLowerCase();
    const value = token.slice(separatorIndex + 1).trim();

    if (languageKey.length === 0 || value.length === 0) {
      continue;
    }

    routeMap.set(languageKey, value);
  }

  return routeMap;
}

/**
 * Builds language routing entries from current map text values.
 *
 * @param {ReturnType<IStateMachine["getSnapshot"]>} snapshot Current host snapshot.
 * @param {ILanguages} languages Language catalog.
 * @returns {Array<{languageKey: string; label: string; iconUri?: string; dockerEnabled: boolean; dockerValue: string; sshEnabled: boolean; sshValue: string; isConflict: boolean; statusText: string; statusClassName: ViewStatusClassName;}>} Routing entries.
 */
function buildRoutingEntriesFromSnapshot(
  environmentControls: EnvironmentControlsSettings,
  languages: ILanguages
): Array<{
  languageKey: string;
  label: string;
  iconUri?: string;
  dockerEnabled: boolean;
  dockerValue: string;
  sshEnabled: boolean;
  sshValue: string;
  isConflict: boolean;
  statusText: string;
  statusClassName: ViewStatusClassName;
}> {
  const existingEntryByKey = new Map(environmentControls.routingEntries.map((entry) => {
    return [entry.languageKey, entry] as const;
  }));
  const dockerMap = parseDockerRouteMap(environmentControls.routingDockerMapText);
  const sshMap = parseRawRouteMap(environmentControls.routingSshMapText);

  return languages.getAll().map((language) => {
    const languageKey = language.key;
    const dockerValue = dockerMap.get(languageKey) ?? "";
    const sshValue = sshMap.get(languageKey) ?? "";
    const dockerEnabled = dockerValue.length > 0;
    const sshEnabled = sshValue.length > 0;
    const isConflict = dockerEnabled && sshEnabled;
    const existing = existingEntryByKey.get(languageKey);

    return {
      languageKey,
      label: language.displayLabel,
      iconUri: existing?.iconUri,
      dockerEnabled,
      dockerValue,
      sshEnabled,
      sshValue,
      isConflict,
      statusText: existing?.statusText ?? "",
      statusClassName: existing?.statusClassName ?? "status-muted",
    };
  });
}

/**
 * Synchronizes language routing entries with current routing map texts.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {void}
 */
function syncRoutingEntries(
  input: CreateEnvironmentControlsChannelMessageHandlerInput
): void {
  const environmentControls = input.stateMachine.getEnvironmentControls();

  input.stateMachine.send({
    type: "ENV_ROUTING_LANGUAGE_ENTRIES_SET",
    entries: buildRoutingEntriesFromSnapshot(environmentControls, input.languages),
  });
}

/**
 * Applies one profile read/write result back into state events.
 *
 * @param {IStateMachine} stateMachine Host state machine.
 * @param {{profilePlaceholder: string; effectiveProfilePath: string; values: { timeout: { value: string }; eiffel: { value: string }; gcc13Directory: { value: string }; gcc13Name: { value: string }; gxx13Name: { value: string }; dockerMapText: { value: string }; sshMapText: { value: string }; }; }} result Profile result payload.
 * @returns {void}
 */
function applyEnvironmentProfileResult(
  stateMachine: IStateMachine,
  result: {
    profilePlaceholder: string;
    effectiveProfilePath: string;
    values: {
      timeout: { value: string };
      eiffel: { value: string };
      gcc13Directory: { value: string };
      gcc13Name: { value: string };
      gxx13Name: { value: string };
      dockerMapText: { value: string };
      sshMapText: { value: string };
    };
  }
): void {
  stateMachine.send({
    type: "ENV_PROFILE_PLACEHOLDER_SET",
    profilePlaceholder: result.profilePlaceholder,
  });
  stateMachine.send({
    type: "ENV_EFFECTIVE_PROFILE_PATH_SET",
    effectiveProfilePath: result.effectiveProfilePath,
  });
  stateMachine.send({
    type: "ENV_VARIABLE_VALUE_SET",
    key: "timeout",
    value: result.values.timeout.value,
  });
  stateMachine.send({
    type: "ENV_VARIABLE_VALUE_SET",
    key: "eiffel",
    value: result.values.eiffel.value,
  });
  stateMachine.send({
    type: "ENV_VARIABLE_VALUE_SET",
    key: "gcc13Directory",
    value: result.values.gcc13Directory.value,
  });
  stateMachine.send({
    type: "ENV_VARIABLE_VALUE_SET",
    key: "gcc13Name",
    value: result.values.gcc13Name.value,
  });
  stateMachine.send({
    type: "ENV_VARIABLE_VALUE_SET",
    key: "gxx13Name",
    value: result.values.gxx13Name.value,
  });
  stateMachine.send({
    type: "ENV_ROUTING_DOCKER_MAP_TEXT_SET",
    text: result.values.dockerMapText.value,
  });
  stateMachine.send({
    type: "ENV_ROUTING_SSH_MAP_TEXT_SET",
    text: result.values.sshMapText.value,
  });
}

/**
 * Validates one routing configuration.
 *
 * @param {boolean} dockerEnabled Whether docker routing is enabled.
 * @param {string} dockerValue Docker route value.
 * @param {boolean} sshEnabled Whether SSH routing is enabled.
 * @param {string} sshValue SSH route value.
 * @param {boolean} isBatch Whether this is a batch save.
 * @returns {string | null} Error message when invalid; otherwise null.
 */
function validateRoutingConfiguration(
  dockerEnabled: boolean,
  dockerValue: string,
  sshEnabled: boolean,
  sshValue: string,
  isBatch: boolean
): string | null {
  if (dockerEnabled && sshEnabled) {
    return isBatch
      ? "Cannot save Batch All with both docker and ssh enabled."
      : "Cannot save with both docker and ssh enabled.";
  }

  if (dockerEnabled && dockerValue.trim().length === 0) {
    return isBatch
      ? "Enter a Docker value before saving Batch All."
      : "Enter a Docker value before saving.";
  }

  if (sshEnabled && sshValue.trim().length === 0) {
    return isBatch
      ? "Enter an SSH route before saving Batch All."
      : "Enter an SSH route before saving.";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Per-intent handler functions
// ---------------------------------------------------------------------------

/**
 * Handles `environment.ready`: publishes a snapshot then loads the environment profile.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {Promise<void>}
 */
async function handleEnvironmentReady(
  input: CreateEnvironmentControlsChannelMessageHandlerInput
): Promise<void> {
  input.publishSnapshot();

  try {
    const { profilePath } = input.stateMachine.getEnvironmentControls();
    const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
    if (workspaceFolderPath === null) {
      throw new Error("No workspace folder is open.");
    }
    const result = await input.conductor.readEnvironment({
      workspaceFolderPath,
      profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
    });
    applyEnvironmentProfileResult(input.stateMachine, result);
    syncRoutingEntries(input);
  } catch (error) {
    input.stateMachine.send({
      type: "ENV_CHECK_ENV_STATUS_SET",
      statusText: `Failed to load environment profile: ${error instanceof Error ? error.message : String(error)}`,
      statusClassName: "status-error",
      filteredOutput: "",
      rawOutput: "",
    });
  }

  input.publishSnapshot();
}

/**
 * Handles `setProfilePath` intent: updates the active profile path in state.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {string} profilePath New profile path value.
 * @returns {void}
 */
function handleSetProfilePath(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  profilePath: string
): void {
  input.stateMachine.send({ type: "ENV_PROFILE_PATH_SET", profilePath });
  input.publishSnapshot();
}

/**
 * Handles `setCopyIconsPath` intent: updates the copy-icons path in state.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {string} copyIconsPath New copy-icons path value.
 * @returns {void}
 */
function handleSetCopyIconsPath(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  copyIconsPath: string
): void {
  input.stateMachine.send({ type: "ENV_COPY_ICONS_PATH_SET", copyIconsPath });
  input.publishSnapshot();
}

/**
 * Handles `setVariableValue` intent: updates one variable value and marks it unsaved.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {string} key Variable key.
 * @param {string} value New value.
 * @returns {void}
 */
function handleSetVariableValue(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  key: EnvironmentVariableKey,
  value: string
): void {
  input.stateMachine.send({ type: "ENV_VARIABLE_VALUE_SET", key, value });
  input.stateMachine.send({
    type: "ENV_VARIABLE_STATUS_SET",
    key,
    statusText: "Unsaved changes",
    statusClassName: "status-muted",
  });
  input.publishSnapshot();
}

/**
 * Handles `setLanguageRoutingDraft` intent: updates routing draft for one language.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {string} languageKey Language key to update.
 * @param {boolean} dockerEnabled Whether docker routing is enabled.
 * @param {string} dockerValue Docker route value.
 * @param {boolean} sshEnabled Whether SSH routing is enabled.
 * @param {string} sshValue SSH route value.
 * @returns {void}
 */
function handleSetLanguageRoutingDraft(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  languageKey: string,
  dockerEnabled: boolean,
  dockerValue: string,
  sshEnabled: boolean,
  sshValue: string
): void {
  input.stateMachine.send({
    type: "ENV_ROUTING_LANGUAGE_DRAFT_SET",
    languageKey,
    dockerEnabled,
    dockerValue,
    sshEnabled,
    sshValue,
  });
  input.stateMachine.send({
    type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
    languageKey,
    statusText: "",
    statusClassName: "status-muted",
  });
  input.publishSnapshot();
}

/**
 * Handles `setBatchRoutingDraft` intent: updates the batch routing draft values.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {boolean} dockerEnabled Whether docker routing is enabled.
 * @param {string} dockerValue Docker route value.
 * @param {boolean} sshEnabled Whether SSH routing is enabled.
 * @param {string} sshValue SSH route value.
 * @returns {void}
 */
function handleSetBatchRoutingDraft(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  dockerEnabled: boolean,
  dockerValue: string,
  sshEnabled: boolean,
  sshValue: string
): void {
  input.stateMachine.send({
    type: "ENV_BATCH_ROUTING_DRAFT_SET",
    dockerEnabled,
    dockerValue,
    sshEnabled,
    sshValue,
  });
  input.stateMachine.send({ type: "ENV_ROUTING_STATUS_SET", statusText: "", statusClassName: "status-muted" });
  input.publishSnapshot();
}

/**
 * Handles `setRoutingDockerMapText` intent: updates docker map text and re-syncs routing entries.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {string} text New docker map text.
 * @returns {void}
 */
function handleSetRoutingDockerMapText(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  text: string
): void {
  input.stateMachine.send({ type: "ENV_ROUTING_DOCKER_MAP_TEXT_SET", text });
  syncRoutingEntries(input);
  input.stateMachine.send({ type: "ENV_ROUTING_STATUS_SET", statusText: "Unsaved routing changes", statusClassName: "status-muted" });
  input.publishSnapshot();
}

/**
 * Handles `setRoutingSshMapText` intent: updates SSH map text and re-syncs routing entries.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {string} text New SSH map text.
 * @returns {void}
 */
function handleSetRoutingSshMapText(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  text: string
): void {
  input.stateMachine.send({ type: "ENV_ROUTING_SSH_MAP_TEXT_SET", text });
  syncRoutingEntries(input);
  input.stateMachine.send({ type: "ENV_ROUTING_STATUS_SET", statusText: "Unsaved routing changes", statusClassName: "status-muted" });
  input.publishSnapshot();
}

/**
 * Handles `runCheckEnvironment` intent: executes environment diagnostics and reports the result.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {Promise<void>}
 */
async function handleRunCheckEnvironment(
  input: CreateEnvironmentControlsChannelMessageHandlerInput
): Promise<void> {
  const { profilePath } = input.stateMachine.getEnvironmentControls();

  input.stateMachine.send({
    type: "ENV_CHECK_ENV_STATUS_SET",
    statusText: "Running environment checks...",
    statusClassName: "status-muted",
    filteredOutput: "",
    rawOutput: "",
  });
  input.publishSnapshot();

  const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
  if (workspaceFolderPath === null) {
    input.stateMachine.send({
      type: "ENV_CHECK_ENV_STATUS_SET",
      statusText: "No workspace folder is open.",
      statusClassName: "status-error",
      filteredOutput: "",
      rawOutput: "",
    });
    input.publishSnapshot();
    return;
  }

  const result = await input.conductor.checkEnvironment({
    workspaceFolderPath,
    profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
  });
  input.stateMachine.send({
    type: "ENV_CHECK_ENV_STATUS_SET",
    statusText: result.text,
    statusClassName: mapEnvironmentKindToStatusClass(result.kind),
    filteredOutput: result.filteredOutput,
    rawOutput: result.rawOutput,
  });
  input.publishSnapshot();
}

/**
 * Handles `runCopyIcons` intent: executes the copy-icons operation and reports the result.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {Promise<void>}
 */
async function handleRunCopyIcons(
  input: CreateEnvironmentControlsChannelMessageHandlerInput
): Promise<void> {
  const { profilePath, copyIconsPath } = input.stateMachine.getEnvironmentControls();

  input.stateMachine.send({ type: "ENV_COPY_ICONS_STATUS_SET", statusText: "Running copy-icons...", statusClassName: "status-muted" });
  input.publishSnapshot();

  const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
  if (workspaceFolderPath === null) {
    input.stateMachine.send({ type: "ENV_COPY_ICONS_STATUS_SET", statusText: "No workspace folder is open.", statusClassName: "status-error" });
    input.publishSnapshot();
    return;
  }

  const result = await input.conductor.copyIcons({
    workspaceFolderPath,
    profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
    iconsPath: copyIconsPath.trim().length > 0 ? copyIconsPath : undefined,
  });
  input.stateMachine.send({
    type: "ENV_COPY_ICONS_STATUS_SET",
    statusText: result.text,
    statusClassName: mapEnvironmentKindToStatusClass(result.kind),
  });
  input.publishSnapshot();
}

/**
 * Handles `refreshEnvironment` intent: re-reads the environment profile and syncs state.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {Promise<void>}
 */
async function handleRefreshEnvironment(
  input: CreateEnvironmentControlsChannelMessageHandlerInput
): Promise<void> {
  const { profilePath } = input.stateMachine.getEnvironmentControls();

  try {
    const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
    if (workspaceFolderPath === null) {
      throw new Error("No workspace folder is open.");
    }
    const result = await input.conductor.readEnvironment({
      workspaceFolderPath,
      profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
    });
    applyEnvironmentProfileResult(input.stateMachine, result);
    syncRoutingEntries(input);
  } catch (error) {
    input.stateMachine.send({
      type: "ENV_CHECK_ENV_STATUS_SET",
      statusText: `Failed to refresh environment profile: ${error instanceof Error ? error.message : String(error)}`,
      statusClassName: "status-error",
      filteredOutput: "",
      rawOutput: "",
    });
  }

  input.publishSnapshot();
}

/**
 * Handles `saveLanguageRouting` intent: validates and persists routing for one language.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {string} languageKey Language key whose routing should be saved.
 * @returns {Promise<void>}
 */
async function handleSaveLanguageRouting(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  languageKey: string
): Promise<void> {
  const environmentControls = input.stateMachine.getEnvironmentControls();
  const { profilePath } = environmentControls;
  const languageEntry = environmentControls.routingEntries.find((entry) => entry.languageKey === languageKey);

  if (languageEntry === undefined) {
    return;
  }

  const validationError = validateRoutingConfiguration(
    languageEntry.dockerEnabled,
    languageEntry.dockerValue,
    languageEntry.sshEnabled,
    languageEntry.sshValue,
    false
  );

  if (validationError !== null) {
    input.stateMachine.send({
      type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
      languageKey: languageEntry.languageKey,
      statusText: validationError,
      statusClassName: "status-error",
    });
    input.publishSnapshot();
    return;
  }

  input.stateMachine.send({
    type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
    languageKey: languageEntry.languageKey,
    statusText: `Saving ${languageEntry.label} routing...`,
    statusClassName: "status-muted",
  });
  input.publishSnapshot();

  try {
    const dockerMap = parseDockerRouteMap(environmentControls.routingDockerMapText);
    const sshMap = parseRawRouteMap(environmentControls.routingSshMapText);

    if (languageEntry.dockerEnabled) {
      dockerMap.set(languageEntry.languageKey, languageEntry.dockerValue.trim());
    } else {
      dockerMap.delete(languageEntry.languageKey);
    }

    if (languageEntry.sshEnabled) {
      sshMap.set(languageEntry.languageKey, languageEntry.sshValue.trim());
    } else {
      sshMap.delete(languageEntry.languageKey);
    }

    const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
    if (workspaceFolderPath === null) {
      throw new Error("No workspace folder is open.");
    }

    const writeResult = await input.conductor.writeEnvironment({
      workspaceFolderPath,
      request: {
        profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
        values: buildEnvironmentWriteValuesFromSnapshot(
          environmentControls,
          serializeRouteMap(dockerMap),
          serializeRouteMap(sshMap)
        ),
      },
    });

    applyEnvironmentProfileResult(input.stateMachine, writeResult);
    syncRoutingEntries(input);

    input.stateMachine.send({
      type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
      languageKey: languageEntry.languageKey,
      statusText: `${languageEntry.label} routing saved.`,
      statusClassName: "status-ok",
    });
  } catch (error) {
    input.stateMachine.send({
      type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
      languageKey: languageEntry.languageKey,
      statusText: error instanceof Error ? error.message : String(error),
      statusClassName: "status-error",
    });
  }

  input.publishSnapshot();
}

/**
 * Handles `saveBatchRouting` / `saveRouting` intents: validates and applies routing to all languages.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {Promise<void>}
 */
async function handleSaveBatchRouting(
  input: CreateEnvironmentControlsChannelMessageHandlerInput
): Promise<void> {
  const environmentControls = input.stateMachine.getEnvironmentControls();
  const { profilePath } = environmentControls;
  const dockerEnabled = environmentControls.batchRoutingDockerEnabled;
  const dockerValue = environmentControls.batchRoutingDockerValue;
  const sshEnabled = environmentControls.batchRoutingSshEnabled;
  const sshValue = environmentControls.batchRoutingSshValue;

  const validationError = validateRoutingConfiguration(dockerEnabled, dockerValue, sshEnabled, sshValue, true);
  if (validationError !== null) {
    input.stateMachine.send({ type: "ENV_ROUTING_STATUS_SET", statusText: validationError, statusClassName: "status-error" });
    input.publishSnapshot();
    return;
  }

  input.stateMachine.send({ type: "ENV_ROUTING_STATUS_SET", statusText: "Applying Batch All routing...", statusClassName: "status-muted" });
  input.publishSnapshot();

  try {
    const dockerMap = parseDockerRouteMap(environmentControls.routingDockerMapText);
    const sshMap = parseRawRouteMap(environmentControls.routingSshMapText);

    for (const language of input.languages.getAll()) {
      if (dockerEnabled) {
        dockerMap.set(language.key, dockerValue.trim());
      } else {
        dockerMap.delete(language.key);
      }

      if (sshEnabled) {
        sshMap.set(language.key, sshValue.trim());
      } else {
        sshMap.delete(language.key);
      }
    }

    const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
    if (workspaceFolderPath === null) {
      throw new Error("No workspace folder is open.");
    }

    const writeResult = await input.conductor.writeEnvironment({
      workspaceFolderPath,
      request: {
        profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
        values: buildEnvironmentWriteValuesFromSnapshot(
          environmentControls,
          serializeRouteMap(dockerMap),
          serializeRouteMap(sshMap)
        ),
      },
    });

    applyEnvironmentProfileResult(input.stateMachine, writeResult);
    syncRoutingEntries(input);

    input.stateMachine.send({ type: "ENV_ROUTING_STATUS_SET", statusText: "Batch All routing saved.", statusClassName: "status-ok" });

    const refreshedControls = input.stateMachine.getEnvironmentControls();
    for (const entry of refreshedControls.routingEntries) {
      input.stateMachine.send({
        type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
        languageKey: entry.languageKey,
        statusText: `${entry.label} routing saved.`,
        statusClassName: "status-ok",
      });
    }
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);

    input.stateMachine.send({ type: "ENV_ROUTING_STATUS_SET", statusText: errorText, statusClassName: "status-error" });

    const refreshedControls = input.stateMachine.getEnvironmentControls();
    for (const entry of refreshedControls.routingEntries) {
      input.stateMachine.send({
        type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
        languageKey: entry.languageKey,
        statusText: errorText,
        statusClassName: "status-error",
      });
    }
  }

  input.publishSnapshot();
}

/**
 * Handles `saveVariable` intent: persists one variable value to the environment profile.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @param {string} key Variable key to save.
 * @returns {Promise<void>}
 */
async function handleSaveVariable(
  input: CreateEnvironmentControlsChannelMessageHandlerInput,
  key: EnvironmentVariableKey
): Promise<void> {
  const environmentControls = input.stateMachine.getEnvironmentControls();
  const { profilePath } = environmentControls;

  try {
    const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
    if (workspaceFolderPath === null) {
      throw new Error("No workspace folder is open.");
    }

    const writeResult = await input.conductor.writeEnvironment({
      workspaceFolderPath,
      request: {
        profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
        values: buildEnvironmentWriteValuesFromSnapshot(environmentControls),
      },
    });

    applyEnvironmentProfileResult(input.stateMachine, writeResult);
    syncRoutingEntries(input);

    input.stateMachine.send({ type: "ENV_VARIABLE_STATUS_SET", key, statusText: "Saved", statusClassName: "status-ok" });
  } catch (error) {
    input.stateMachine.send({
      type: "ENV_VARIABLE_STATUS_SET",
      key,
      statusText: error instanceof Error ? error.message : String(error),
      statusClassName: "status-error",
    });
  }

  input.publishSnapshot();
}

// ---------------------------------------------------------------------------
// Channel handler factory
// ---------------------------------------------------------------------------

/**
 * Creates one conductor-owned message handler for the environment-controls channel.
 *
 * @param {CreateEnvironmentControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {(message: ViewToHostMessage) => void} Message handler.
 */
export function createEnvironmentControlsChannelMessageHandler(
  input: CreateEnvironmentControlsChannelMessageHandlerInput
): (message: ViewToHostMessage) => void {
  return (message: ViewToHostMessage): void => {
    if (message.type === "environment.ready") {
      void handleEnvironmentReady(input);
      return;
    }

    if (message.type !== "environment.intent") {
      return;
    }

    const { payload } = message;

    if (payload.kind === "setProfilePath") {
      handleSetProfilePath(input, payload.profilePath);
      return;
    }

    if (payload.kind === "setCopyIconsPath") {
      handleSetCopyIconsPath(input, payload.copyIconsPath);
      return;
    }

    if (payload.kind === "setVariableValue") {
      handleSetVariableValue(input, payload.key, payload.value);
      return;
    }

    if (payload.kind === "setLanguageRoutingDraft") {
      handleSetLanguageRoutingDraft(input, payload.languageKey, payload.dockerEnabled, payload.dockerValue, payload.sshEnabled, payload.sshValue);
      return;
    }

    if (payload.kind === "setBatchRoutingDraft") {
      handleSetBatchRoutingDraft(input, payload.dockerEnabled, payload.dockerValue, payload.sshEnabled, payload.sshValue);
      return;
    }

    if (payload.kind === "setRoutingDockerMapText") {
      handleSetRoutingDockerMapText(input, payload.text);
      return;
    }

    if (payload.kind === "setRoutingSshMapText") {
      handleSetRoutingSshMapText(input, payload.text);
      return;
    }

    if (payload.kind === "runCheckEnvironment") {
      void handleRunCheckEnvironment(input);
      return;
    }

    if (payload.kind === "runCopyIcons") {
      void handleRunCopyIcons(input);
      return;
    }

    if (payload.kind === "refreshEnvironment") {
      void handleRefreshEnvironment(input);
      return;
    }

    if (payload.kind === "saveLanguageRouting") {
      void handleSaveLanguageRouting(input, payload.languageKey);
      return;
    }

    if (payload.kind === "saveBatchRouting" || payload.kind === "saveRouting") {
      void handleSaveBatchRouting(input);
      return;
    }

    if (payload.kind === "saveVariable") {
      void handleSaveVariable(input, payload.key);
    }
  };
}
