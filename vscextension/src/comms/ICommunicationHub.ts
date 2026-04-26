import type * as vscode from "vscode";

import type { IConductor } from "../conductor";
import type { ConductorNotificationEffect } from "../conductor";
import type { ExtensionHostSnapshot, IStateMachine } from "../state";
import type { HostToViewMessage, ViewToHostMessage } from "./shared/messageTypes";
import type {
  RunControlsViewSnapshot,
  SmokeControlsViewSnapshot,
} from "./shared/messageTypes";

/**
 * Dependencies for wiring one smoke-controls message channel.
 */
export interface RegisterSmokeControlsChannelInput {
  viewId: string;
  stateMachine: IStateMachine;
  conductor: IConductor;
  dispatchNotification: (notification: ConductorNotificationEffect) => void;
  buildSnapshot: (snapshot: ExtensionHostSnapshot) => SmokeControlsViewSnapshot;
}

/**
 * Dependencies for wiring one run-controls message channel.
 */
export interface RegisterRunControlsChannelInput {
  viewId: string;
  stateMachine: IStateMachine;
  conductor: IConductor;
  dispatchNotification: (notification: ConductorNotificationEffect) => void;
  buildSnapshot: (snapshot: ExtensionHostSnapshot) => RunControlsViewSnapshot;
}

/**
 * DI contract for host-side communication between runtime modules and webviews.
 */
export interface ICommunicationHub extends vscode.Disposable {
  /**
   * Subscribes to view-to-host messages for one panel.
   *
   * @param {string} viewId Sidebar view identifier.
   * @param {(message: ViewToHostMessage) => void} listener Message listener.
   * @returns {vscode.Disposable} Disposable listener registration.
   */
  subscribe(
    viewId: string,
    listener: (message: ViewToHostMessage) => void
  ): vscode.Disposable;

  /**
   * Posts a typed message to one panel when available.
   *
   * @param {string} viewId Sidebar view identifier.
   * @param {HostToViewMessage} message Message payload.
   * @returns {Thenable<boolean> | undefined} Delivery result or undefined when unresolved.
   */
  post(
    viewId: string,
    message: HostToViewMessage
  ): Thenable<boolean> | undefined;

  /**
   * Wires smoke-controls message handling for one view channel.
   *
   * @param {RegisterSmokeControlsChannelInput} input Smoke channel dependencies.
   * @returns {vscode.Disposable} Disposable channel subscription.
   */
  registerSmokeControlsChannel(
    input: RegisterSmokeControlsChannelInput
  ): vscode.Disposable;

  /**
   * Wires run-controls message handling for one view channel.
   *
   * @param {RegisterRunControlsChannelInput} input Run channel dependencies.
   * @returns {vscode.Disposable} Disposable channel subscription.
   */
  registerRunControlsChannel(
    input: RegisterRunControlsChannelInput
  ): vscode.Disposable;
}
