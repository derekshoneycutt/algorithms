import type { ExtensionHostSnapshot } from "../../state";
import type {
  EnvironmentControlsViewSnapshot,
  HostToViewMessage,
} from "../shared/messageTypes";

/**
 * Builds a typed environment controls snapshot payload from host state.
 *
 * @param {ExtensionHostSnapshot} snapshot Current host state snapshot.
 * @returns {EnvironmentControlsViewSnapshot} Typed environment controls payload ready for transport.
 */
export function buildEnvironmentControlsSnapshot(
  snapshot: ExtensionHostSnapshot
): EnvironmentControlsViewSnapshot {
  return {
    stateValue: snapshot.stateValue,
    profilePath: snapshot.environmentControls.profilePath,
    profilePlaceholder: snapshot.environmentControls.profilePlaceholder,
    effectiveProfilePath: snapshot.environmentControls.effectiveProfilePath,
    copyIconsPath: snapshot.environmentControls.copyIconsPath,
    checkEnvStatusText: snapshot.environmentControls.checkEnvStatusText,
    checkEnvStatusClassName: snapshot.environmentControls.checkEnvStatusClassName,
    checkEnvFilteredOutput: snapshot.environmentControls.checkEnvFilteredOutput,
    checkEnvRawOutput: snapshot.environmentControls.checkEnvRawOutput,
    copyIconsStatusText: snapshot.environmentControls.copyIconsStatusText,
    copyIconsStatusClassName: snapshot.environmentControls.copyIconsStatusClassName,
    routingDockerMapText: snapshot.environmentControls.routingDockerMapText,
    routingSshMapText: snapshot.environmentControls.routingSshMapText,
    routingStatusText: snapshot.environmentControls.routingStatusText,
    routingStatusClassName: snapshot.environmentControls.routingStatusClassName,
    variables: snapshot.environmentControls.variables.map((variable) => {
      return {
        ...variable,
      };
    }),
  };
}

/**
 * Dependencies for creating an environment snapshot publisher.
 */
export interface CreateEnvironmentControlsSnapshotPublisherInput {
  postMessage: (message: HostToViewMessage) => Thenable<boolean> | undefined;
  getSnapshot: () => ExtensionHostSnapshot;
  buildSnapshot: (snapshot: ExtensionHostSnapshot) => EnvironmentControlsViewSnapshot;
}

/**
 * Creates an environment snapshot publisher bound to one transport channel.
 *
 * @param {CreateEnvironmentControlsSnapshotPublisherInput} input Publisher dependencies.
 * @returns {() => void} Environment snapshot publisher.
 */
export function createEnvironmentControlsSnapshotPublisher(
  input: CreateEnvironmentControlsSnapshotPublisherInput
): () => void {
  return (): void => {
    input.postMessage({
      type: "environment.snapshot",
      payload: input.buildSnapshot(input.getSnapshot()),
    });
  };
}
