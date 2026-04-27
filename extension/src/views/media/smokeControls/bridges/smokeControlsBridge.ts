import type { HostToViewMessage } from "../../../../comms/shared/messageTypes";

import { createDisposeStore, type IDisposeStore } from "../../shared";
import type { ISmokeControlsCommsFacade } from "../comms";
import type { ISmokeControlsUi } from "../ui";

/**
 * Dependencies for smoke controls panel bridge.
 */
export interface SmokeControlsBridgeDependencies {
  comms: ISmokeControlsCommsFacade;
  ui: ISmokeControlsUi;
}

/**
 * Runtime bridge between comms and UI for smoke controls panel.
 */
export interface ISmokeControlsBridge {
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
 * Creates smoke controls panel bridge.
 *
 * @param {SmokeControlsBridgeDependencies} dependencies Bridge dependencies.
 * @param {IDisposeStore} [disposeStore] Dispose store.
 * @returns {ISmokeControlsBridge} Smoke controls bridge instance.
 */
export function createSmokeControlsBridge(
  dependencies: SmokeControlsBridgeDependencies,
  disposeStore: IDisposeStore = createDisposeStore()
): ISmokeControlsBridge {
  return {
    start(): void {
      const unsubscribeIntent = dependencies.ui.onIntent((intent) => {
        dependencies.comms.send({
          type: "smoke.intent",
          payload: intent,
        });
      });

      const unsubscribe = dependencies.comms.onMessage((message: HostToViewMessage) => {
        if (message.type === "smoke.snapshot") {
          dependencies.ui.setSnapshot(message.payload);
        }
      });

      disposeStore.add(unsubscribeIntent);
      disposeStore.add(unsubscribe);
      dependencies.comms.send({ type: "smoke.ready" });
    },

    stop(): void {
      disposeStore.disposeAll();
    },
  };
}
