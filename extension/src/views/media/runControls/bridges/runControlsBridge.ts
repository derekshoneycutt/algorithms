import type { HostToViewMessage } from "../../../../comms/shared/messageTypes";

import { createDisposeStore, type IDisposeStore } from "../../shared";
import type { IRunControlsCommsFacade } from "../comms";
import type { IRunControlsUi } from "../ui";

/**
 * Dependencies for run controls panel bridge.
 */
export interface RunControlsBridgeDependencies {
  comms: IRunControlsCommsFacade;
  ui: IRunControlsUi;
}

/**
 * Runtime bridge between comms and UI for run controls panel.
 */
export interface IRunControlsBridge {
  /**
   * Starts bridge subscriptions and initial message flow.
   *
   * @returns {void}
   */
  start(): void;

  /**
   * Stops bridge subscriptions.
   *
   * @returns {void}
   */
  stop(): void;
}

/**
 * Creates run controls panel bridge.
 *
 * @param {RunControlsBridgeDependencies} dependencies Bridge dependencies.
 * @param {IDisposeStore} [disposeStore] Dispose store.
 * @returns {IRunControlsBridge} Run controls bridge instance.
 */
export function createRunControlsBridge(
  dependencies: RunControlsBridgeDependencies,
  disposeStore: IDisposeStore = createDisposeStore()
): IRunControlsBridge {
  return {
    start(): void {
      const unsubscribeIntent = dependencies.ui.onIntent((intent) => {
        dependencies.comms.send({
          type: "run.intent",
          payload: intent,
        });
      });

      const unsubscribe = dependencies.comms.onMessage((message: HostToViewMessage) => {
        if (message.type === "run.snapshot") {
          dependencies.ui.setSnapshot(message.payload);
        }
      });

      disposeStore.add(unsubscribeIntent);
      disposeStore.add(unsubscribe);
      dependencies.comms.send({ type: "run.ready" });
    },

    stop(): void {
      disposeStore.disposeAll();
    },
  };
}