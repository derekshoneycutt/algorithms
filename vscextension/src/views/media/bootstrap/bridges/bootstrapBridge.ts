import type { HostToViewMessage } from "../../../../comms/shared/messageTypes";

import { createDisposeStore, type IDisposeStore } from "../../shared";
import type { IBootstrapCommsFacade } from "../comms";
import type { IBootstrapUi } from "../ui";

/**
 * Dependencies for bootstrap panel bridge.
 */
export interface BootstrapBridgeDependencies {
  comms: IBootstrapCommsFacade;
  ui: IBootstrapUi;
}

/**
 * Runtime bridge between comms and UI for bootstrap panel.
 */
export interface IBootstrapBridge {
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
 * Creates bootstrap panel bridge.
 *
 * @param {BootstrapBridgeDependencies} dependencies Bridge dependencies.
 * @param {IDisposeStore} [disposeStore] Dispose store.
 * @returns {IBootstrapBridge} Bootstrap bridge instance.
 */
export function createBootstrapBridge(
  dependencies: BootstrapBridgeDependencies,
  disposeStore: IDisposeStore = createDisposeStore()
): IBootstrapBridge {
  return {
    start(): void {
      const unsubscribe = dependencies.comms.onMessage((message: HostToViewMessage) => {
        if (message.type === "bootstrap.ping") {
          dependencies.comms.send({ type: "bootstrap.pong" });
          dependencies.ui.setStatus("alive");
          return;
        }

        dependencies.ui.setStatus(message.payload.status);
      });

      disposeStore.add(unsubscribe);
      dependencies.comms.send({ type: "bootstrap.ready" });
      dependencies.ui.setStatus("ready");
    },

    stop(): void {
      disposeStore.disposeAll();
    },
  };
}
