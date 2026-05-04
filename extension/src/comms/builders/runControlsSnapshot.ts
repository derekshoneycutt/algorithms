import type { ExtensionHostStateValue, RunControlsSettings } from "../../state";
import type { HostToViewMessage, RunControlsViewSnapshot } from "../shared/messageTypes";

interface RunControlsSnapshotSource {
  stateValue: ExtensionHostStateValue;
  runControls: RunControlsSettings;
}

/**
 * Builds a typed run controls snapshot payload from host state.
 *
 * @param {ExtensionHostSnapshot} snapshot Current host state snapshot.
 * @returns {RunControlsViewSnapshot} Typed run controls payload ready for transport.
 */
export function buildRunControlsSnapshot(
  snapshot: RunControlsSnapshotSource
): RunControlsViewSnapshot {
  return {
    stateValue: snapshot.stateValue,
    runArgsEnabled: snapshot.runControls.runArgsEnabled,
    runArgsText: snapshot.runControls.runArgsText,
    runArgsStatusText: snapshot.runControls.runArgsStatusText,
    runArgsStatusClassName: snapshot.runControls.runArgsStatusClassName,
    sourceProfileEnabled: snapshot.runControls.sourceProfileEnabled,
    sourceProfileText: snapshot.runControls.sourceProfileText,
    sourceProfileStatusText: snapshot.runControls.sourceProfileStatusText,
    sourceProfileStatusClassName: snapshot.runControls.sourceProfileStatusClassName,
    runChecksMode: snapshot.runControls.runChecksMode,
    runChecksRoute: snapshot.runControls.runChecksRoute,
    runChecksStatusText: snapshot.runControls.runChecksStatusText,
    runChecksStatusClassName: snapshot.runControls.runChecksStatusClassName,
    cleanStdlibEnabled: snapshot.runControls.cleanStdlibEnabled,
    cleanArchivesEnabled: snapshot.runControls.cleanArchivesEnabled,
    cleanOptionsStatusText: snapshot.runControls.cleanOptionsStatusText,
    cleanOptionsStatusClassName: snapshot.runControls.cleanOptionsStatusClassName,
  };
}

/**
 * Dependencies for creating a run snapshot publisher.
 */
export interface CreateRunControlsSnapshotPublisherInput {
  postMessage: (message: HostToViewMessage) => Thenable<boolean> | undefined;
  getSnapshot: () => RunControlsSnapshotSource;
  buildSnapshot: (snapshot: RunControlsSnapshotSource) => RunControlsViewSnapshot;
}

/**
 * Creates a run snapshot publisher bound to one transport channel.
 *
 * @param {CreateRunControlsSnapshotPublisherInput} input Publisher dependencies.
 * @returns {() => void} Run snapshot publisher.
 */
export function createRunControlsSnapshotPublisher(
  input: CreateRunControlsSnapshotPublisherInput
): () => void {
  return (): void => {
    input.postMessage({
      type: "run.snapshot",
      payload: input.buildSnapshot(input.getSnapshot()),
    });
  };
}
