import * as vscode from "vscode";

import type { ViewToHostMessage } from "../../../comms/shared/messageTypes";
import {
  parseDockerRouteMap,
  type AlgorithmsProfileWritableValues,
} from "../../../commandline";
import type { ILanguages } from "../../../languages";
import type { IStateMachine, ViewStatusClassName } from "../../../state";
import type { IConductor } from "../../IConductor";
import type { ApplyConductorReactionDependencies } from "../channelHandlerTypes";

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
  snapshot: ReturnType<IStateMachine["getSnapshot"]>,
  dockerMapText?: string,
  sshMapText?: string
): AlgorithmsProfileWritableValues {
  const valueByKey = new Map(snapshot.environmentControls.variables.map((variable) => {
    return [variable.key, variable.value] as const;
  }));

  return {
    timeout: valueByKey.get("timeout") ?? "",
    eiffel: valueByKey.get("eiffel") ?? "",
    gcc13Directory: valueByKey.get("gcc13Directory") ?? "",
    gcc13Name: valueByKey.get("gcc13Name") ?? "",
    gxx13Name: valueByKey.get("gxx13Name") ?? "",
    dockerMapText: dockerMapText ?? snapshot.environmentControls.routingDockerMapText,
    sshMapText: sshMapText ?? snapshot.environmentControls.routingSshMapText,
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
  snapshot: ReturnType<IStateMachine["getSnapshot"]>,
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
  const existingEntryByKey = new Map(snapshot.environmentControls.routingEntries.map((entry) => {
    return [entry.languageKey, entry] as const;
  }));
  const dockerMap = parseDockerRouteMap(snapshot.environmentControls.routingDockerMapText);
  const sshMap = parseRawRouteMap(snapshot.environmentControls.routingSshMapText);

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
  const snapshot = input.stateMachine.getSnapshot();

  input.stateMachine.send({
    type: "ENV_ROUTING_LANGUAGE_ENTRIES_SET",
    entries: buildRoutingEntriesFromSnapshot(snapshot, input.languages),
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
      input.publishSnapshot();

      void (async () => {
        try {
          const profilePath = input.stateMachine.getSnapshot().environmentControls.profilePath;
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
      })();

      return;
    }

    if (message.type !== "environment.intent") {
      return;
    }

    if (message.payload.kind === "setProfilePath") {
      input.stateMachine.send({
        type: "ENV_PROFILE_PATH_SET",
        profilePath: message.payload.profilePath,
      });
      input.publishSnapshot();
      return;
    }

    if (message.payload.kind === "setCopyIconsPath") {
      input.stateMachine.send({
        type: "ENV_COPY_ICONS_PATH_SET",
        copyIconsPath: message.payload.copyIconsPath,
      });
      input.publishSnapshot();
      return;
    }

    if (message.payload.kind === "setVariableValue") {
      input.stateMachine.send({
        type: "ENV_VARIABLE_VALUE_SET",
        key: message.payload.key,
        value: message.payload.value,
      });
      input.stateMachine.send({
        type: "ENV_VARIABLE_STATUS_SET",
        key: message.payload.key,
        statusText: "Unsaved changes",
        statusClassName: "status-muted",
      });
      input.publishSnapshot();
      return;
    }

    if (message.payload.kind === "setLanguageRoutingDraft") {
      input.stateMachine.send({
        type: "ENV_ROUTING_LANGUAGE_DRAFT_SET",
        languageKey: message.payload.languageKey,
        dockerEnabled: message.payload.dockerEnabled,
        dockerValue: message.payload.dockerValue,
        sshEnabled: message.payload.sshEnabled,
        sshValue: message.payload.sshValue,
      });
      input.stateMachine.send({
        type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
        languageKey: message.payload.languageKey,
        statusText: "",
        statusClassName: "status-muted",
      });
      input.publishSnapshot();
      return;
    }

    if (message.payload.kind === "setBatchRoutingDraft") {
      input.stateMachine.send({
        type: "ENV_BATCH_ROUTING_DRAFT_SET",
        dockerEnabled: message.payload.dockerEnabled,
        dockerValue: message.payload.dockerValue,
        sshEnabled: message.payload.sshEnabled,
        sshValue: message.payload.sshValue,
      });
      input.stateMachine.send({
        type: "ENV_ROUTING_STATUS_SET",
        statusText: "",
        statusClassName: "status-muted",
      });
      input.publishSnapshot();
      return;
    }

    if (message.payload.kind === "setRoutingDockerMapText") {
      input.stateMachine.send({
        type: "ENV_ROUTING_DOCKER_MAP_TEXT_SET",
        text: message.payload.text,
      });
      syncRoutingEntries(input);
      input.stateMachine.send({
        type: "ENV_ROUTING_STATUS_SET",
        statusText: "Unsaved routing changes",
        statusClassName: "status-muted",
      });
      input.publishSnapshot();
      return;
    }

    if (message.payload.kind === "setRoutingSshMapText") {
      input.stateMachine.send({
        type: "ENV_ROUTING_SSH_MAP_TEXT_SET",
        text: message.payload.text,
      });
      syncRoutingEntries(input);
      input.stateMachine.send({
        type: "ENV_ROUTING_STATUS_SET",
        statusText: "Unsaved routing changes",
        statusClassName: "status-muted",
      });
      input.publishSnapshot();
      return;
    }

    if (message.payload.kind === "runCheckEnvironment") {
      void (async () => {
        const snapshot = input.stateMachine.getSnapshot();
        const profilePath = snapshot.environmentControls.profilePath;

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
      })();
      return;
    }

    if (message.payload.kind === "runCopyIcons") {
      void (async () => {
        const snapshot = input.stateMachine.getSnapshot();
        const profilePath = snapshot.environmentControls.profilePath;
        const copyIconsPath = snapshot.environmentControls.copyIconsPath;

        input.stateMachine.send({
          type: "ENV_COPY_ICONS_STATUS_SET",
          statusText: "Running copy-icons...",
          statusClassName: "status-muted",
        });
        input.publishSnapshot();

        const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
        if (workspaceFolderPath === null) {
          input.stateMachine.send({
            type: "ENV_COPY_ICONS_STATUS_SET",
            statusText: "No workspace folder is open.",
            statusClassName: "status-error",
          });
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
      })();
      return;
    }

    if (message.payload.kind === "refreshEnvironment") {
      void (async () => {
        const snapshot = input.stateMachine.getSnapshot();
        const profilePath = snapshot.environmentControls.profilePath;

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
      })();
      return;
    }

    if (message.payload.kind === "saveLanguageRouting") {
      const languageKey = message.payload.languageKey;

      void (async () => {
        const snapshot = input.stateMachine.getSnapshot();
        const profilePath = snapshot.environmentControls.profilePath;
        const languageEntry = snapshot.environmentControls.routingEntries.find((entry) => {
          return entry.languageKey === languageKey;
        });

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
          const dockerMap = parseDockerRouteMap(snapshot.environmentControls.routingDockerMapText);
          const sshMap = parseRawRouteMap(snapshot.environmentControls.routingSshMapText);

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
                snapshot,
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
      })();

      return;
    }

    if (message.payload.kind === "saveBatchRouting" || message.payload.kind === "saveRouting") {
      void (async () => {
        const snapshot = input.stateMachine.getSnapshot();
        const profilePath = snapshot.environmentControls.profilePath;
        const dockerEnabled = snapshot.environmentControls.batchRoutingDockerEnabled;
        const dockerValue = snapshot.environmentControls.batchRoutingDockerValue;
        const sshEnabled = snapshot.environmentControls.batchRoutingSshEnabled;
        const sshValue = snapshot.environmentControls.batchRoutingSshValue;
        const validationError = validateRoutingConfiguration(
          dockerEnabled,
          dockerValue,
          sshEnabled,
          sshValue,
          true
        );

        if (validationError !== null) {
          input.stateMachine.send({
            type: "ENV_ROUTING_STATUS_SET",
            statusText: validationError,
            statusClassName: "status-error",
          });
          input.publishSnapshot();
          return;
        }

        input.stateMachine.send({
          type: "ENV_ROUTING_STATUS_SET",
          statusText: "Applying Batch All routing...",
          statusClassName: "status-muted",
        });
        input.publishSnapshot();

        try {
          const dockerMap = parseDockerRouteMap(snapshot.environmentControls.routingDockerMapText);
          const sshMap = parseRawRouteMap(snapshot.environmentControls.routingSshMapText);

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
                snapshot,
                serializeRouteMap(dockerMap),
                serializeRouteMap(sshMap)
              ),
            },
          });

          applyEnvironmentProfileResult(input.stateMachine, writeResult);
          syncRoutingEntries(input);
          input.stateMachine.send({
            type: "ENV_ROUTING_STATUS_SET",
            statusText: "Batch All routing saved.",
            statusClassName: "status-ok",
          });

          const refreshedSnapshot = input.stateMachine.getSnapshot();
          for (const entry of refreshedSnapshot.environmentControls.routingEntries) {
            input.stateMachine.send({
              type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
              languageKey: entry.languageKey,
              statusText: `${entry.label} routing saved.`,
              statusClassName: "status-ok",
            });
          }
        } catch (error) {
          const errorText = error instanceof Error ? error.message : String(error);

          input.stateMachine.send({
            type: "ENV_ROUTING_STATUS_SET",
            statusText: errorText,
            statusClassName: "status-error",
          });

          const refreshedSnapshot = input.stateMachine.getSnapshot();
          for (const entry of refreshedSnapshot.environmentControls.routingEntries) {
            input.stateMachine.send({
              type: "ENV_ROUTING_LANGUAGE_STATUS_SET",
              languageKey: entry.languageKey,
              statusText: errorText,
              statusClassName: "status-error",
            });
          }
        }

        input.publishSnapshot();
      })();

      return;
    }

    if (message.payload.kind === "saveVariable") {
      const key = message.payload.key;

      void (async () => {
        const snapshot = input.stateMachine.getSnapshot();
        const profilePath = snapshot.environmentControls.profilePath;

        try {
          const workspaceFolderPath = resolveActiveWorkspaceFolderPath();
          if (workspaceFolderPath === null) {
            throw new Error("No workspace folder is open.");
          }

          const writeResult = await input.conductor.writeEnvironment({
            workspaceFolderPath,
            request: {
              profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
              values: buildEnvironmentWriteValuesFromSnapshot(snapshot),
            },
          });

          applyEnvironmentProfileResult(input.stateMachine, writeResult);
          syncRoutingEntries(input);

          input.stateMachine.send({
            type: "ENV_VARIABLE_STATUS_SET",
            key,
            statusText: "Saved",
            statusClassName: "status-ok",
          });
        } catch (error) {
          input.stateMachine.send({
            type: "ENV_VARIABLE_STATUS_SET",
            key,
            statusText: error instanceof Error ? error.message : String(error),
            statusClassName: "status-error",
          });
        }

        input.publishSnapshot();
      })();
    }
  };
}
