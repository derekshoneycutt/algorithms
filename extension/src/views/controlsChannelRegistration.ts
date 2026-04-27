import type * as vscode from "vscode";

import type { ICommunicationHub } from "../comms";
import type { ViewToHostMessage } from "../comms";

/**
 * Input for registering controls channel listeners.
 */
export interface RegisterControlsChannelsInput {
  smokeControlsViewId: string;
  runControlsViewId: string;
  environmentControlsViewId: string;
  communicationHub: ICommunicationHub;
  smokeControlsListener: (message: ViewToHostMessage) => void;
  runControlsListener: (message: ViewToHostMessage) => void;
  environmentControlsListener: (message: ViewToHostMessage) => void;
}

/**
 * Controls channel registration handles.
 */
export interface ControlsChannelRegistrations {
  smokeControlsChannel: vscode.Disposable;
  runControlsChannel: vscode.Disposable;
  environmentControlsChannel: vscode.Disposable;
}

/**
 * Registers smoke, run, and environment controls channels.
 *
 * @param {RegisterControlsChannelsInput} input Channel registration input.
 * @returns {ControlsChannelRegistrations} Channel registration disposables.
 */
export function registerControlsChannels(
  input: RegisterControlsChannelsInput
): ControlsChannelRegistrations {
  const smokeControlsChannel = input.communicationHub.subscribe(
    input.smokeControlsViewId,
    input.smokeControlsListener
  );
  const runControlsChannel = input.communicationHub.subscribe(
    input.runControlsViewId,
    input.runControlsListener
  );
  const environmentControlsChannel = input.communicationHub.subscribe(
    input.environmentControlsViewId,
    input.environmentControlsListener
  );

  return {
    smokeControlsChannel,
    runControlsChannel,
    environmentControlsChannel,
  };
}
