import type { HostToViewMessage } from "../../../../comms/shared/messageTypes";

import { createDisposeStore, type IDisposeStore } from "../../shared";
import type { IEnvironmentControlsCommsFacade } from "../comms";
import type { IEnvironmentControlsUi } from "../ui";

/**
 * Dependencies for environment controls panel bridge.
 */
export interface EnvironmentControlsBridgeDependencies {
  comms: IEnvironmentControlsCommsFacade;
  ui: IEnvironmentControlsUi;
}

/**
 * Runtime bridge between comms and UI for environment controls panel.
 */
export interface IEnvironmentControlsBridge {
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
 * Creates environment controls panel bridge.
 *
 * @param {EnvironmentControlsBridgeDependencies} dependencies Bridge dependencies.
 * @param {IDisposeStore} [disposeStore] Dispose store.
 * @returns {IEnvironmentControlsBridge} Environment controls bridge instance.
 */
export function createEnvironmentControlsBridge(
  dependencies: EnvironmentControlsBridgeDependencies,
  disposeStore: IDisposeStore = createDisposeStore()
): IEnvironmentControlsBridge {
  return {
    start(): void {
      const unsubscribeIntent = dependencies.ui.onIntent((intent) => {
        dependencies.comms.send({
          type: "environment.intent",
          payload: intent,
        });
      });

      const unsubscribe = dependencies.comms.onMessage((message: HostToViewMessage) => {
        if (message.type === "environment.snapshot") {
          dependencies.ui.setSnapshot(message.payload);
        }
      });

      disposeStore.add(unsubscribeIntent);
      disposeStore.add(unsubscribe);
      dependencies.comms.send({ type: "environment.ready" });
    },

    stop(): void {
      disposeStore.disposeAll();
    },
  };
}
