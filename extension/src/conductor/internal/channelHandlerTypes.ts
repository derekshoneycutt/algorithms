import type { ConductorNotificationEffect } from "../IConductor";
import type { IStateMachine } from "../../state";

/**
 * Dependencies used to apply one conductor reaction to host runtime state.
 */
export interface ApplyConductorReactionDependencies {
  stateMachine: IStateMachine;
  dispatchNotification: (notification: ConductorNotificationEffect) => void;
}