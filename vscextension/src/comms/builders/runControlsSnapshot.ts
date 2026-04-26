import type { ExtensionHostSnapshot } from "../../state";
import type { RunControlsViewSnapshot } from "../shared/messageTypes";

/**
 * Builds a typed run controls snapshot payload from host state.
 *
 * @param {ExtensionHostSnapshot} snapshot Current host state snapshot.
 * @returns {RunControlsViewSnapshot} Typed run controls payload ready for transport.
 */
export function buildRunControlsSnapshot(
  snapshot: ExtensionHostSnapshot
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
