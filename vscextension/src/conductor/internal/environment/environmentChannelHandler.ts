import type { ViewToHostMessage } from "../../../comms/shared/messageTypes";
import type { AlgorithmsProfileWritableValues } from "../../../commandline";
import type { IStateMachine, ViewStatusClassName } from "../../../state";
import type { IConductor } from "../../IConductor";
import type { ApplyConductorReactionDependencies } from "../channelHandlerTypes";

/**
 * Dependencies used to create one environment-controls channel handler.
 */
export interface CreateEnvironmentControlsChannelMessageHandlerInput
  extends ApplyConductorReactionDependencies {
  conductor: IConductor;
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
 * Builds one writable profile value map from state snapshot values.
 *
 * @param {ReturnType<IStateMachine["getSnapshot"]>} snapshot Current host snapshot.
 * @returns {AlgorithmsProfileWritableValues} Writable profile values.
 */
function buildEnvironmentWriteValuesFromSnapshot(
  snapshot: ReturnType<IStateMachine["getSnapshot"]>
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
    dockerMapText: snapshot.environmentControls.routingDockerMapText,
    sshMapText: snapshot.environmentControls.routingSshMapText,
  };
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
          const result = await input.conductor.readEnvironment(
            profilePath.trim().length > 0 ? profilePath : undefined
          );
          applyEnvironmentProfileResult(input.stateMachine, result);
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

    if (message.payload.kind === "setRoutingDockerMapText") {
      input.stateMachine.send({
        type: "ENV_ROUTING_DOCKER_MAP_TEXT_SET",
        text: message.payload.text,
      });
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

        const result = await input.conductor.checkEnvironment(
          profilePath.trim().length > 0 ? profilePath : undefined
        );
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

        const result = await input.conductor.copyIcons(
          profilePath.trim().length > 0 ? profilePath : undefined,
          copyIconsPath.trim().length > 0 ? copyIconsPath : undefined
        );
        input.stateMachine.send({
          type: "ENV_COPY_ICONS_STATUS_SET",
          statusText: result.text,
          statusClassName: mapEnvironmentKindToStatusClass(result.kind),
        });
        input.publishSnapshot();
      })();
      return;
    }

    if (message.payload.kind === "saveVariable" || message.payload.kind === "saveRouting") {
      void (async () => {
        const snapshot = input.stateMachine.getSnapshot();
        const profilePath = snapshot.environmentControls.profilePath;
        const writeResult = await input.conductor.writeEnvironment({
          profilePath: profilePath.trim().length > 0 ? profilePath : undefined,
          values: buildEnvironmentWriteValuesFromSnapshot(snapshot),
        });

        applyEnvironmentProfileResult(input.stateMachine, writeResult);

        if (message.payload.kind === "saveVariable") {
          input.stateMachine.send({
            type: "ENV_VARIABLE_STATUS_SET",
            key: message.payload.key,
            statusText: "Saved",
            statusClassName: "status-ok",
          });
        }

        if (message.payload.kind === "saveRouting") {
          input.stateMachine.send({
            type: "ENV_ROUTING_STATUS_SET",
            statusText: "Routing saved",
            statusClassName: "status-ok",
          });
        }

        input.publishSnapshot();
      })();
    }
  };
}