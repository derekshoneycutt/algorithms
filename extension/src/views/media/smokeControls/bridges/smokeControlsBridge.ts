import type {
  HostToViewMessage,
  ViewSmokeControlIntent,
} from "../../../../comms/shared/messageTypes";

import {
  createDebouncedIntentDispatcher,
  createDisposeStore,
  type IDisposeStore,
} from "../../shared";
import type { ISmokeControlsCommsFacade } from "../comms";
import type { ISmokeControlsUi } from "../ui";

const INPUT_DEBOUNCE_MS = 300;
const TOGGLE_DEBOUNCE_MS = 175;

/**
 * Resolves one debounce window for smoke-controls intent dispatch.
 *
 * @param {ViewSmokeControlIntent} intent Smoke intent.
 * @returns {number} Debounce delay in milliseconds.
 */
function resolveSmokeIntentDebounceMs(intent: ViewSmokeControlIntent): number {
  if (
    intent.kind === "setMarkdownPath"
    || intent.kind === "setTimeoutSeconds"
    || intent.kind === "setSlowTimeoutSeconds"
  ) {
    return INPUT_DEBOUNCE_MS;
  }

  if (intent.kind === "toggleLanguage") {
    return TOGGLE_DEBOUNCE_MS;
  }

  return 0;
}

/**
 * Returns true when pending debounced intents should be flushed before dispatch.
 *
 * @param {ViewSmokeControlIntent} intent Smoke intent.
 * @returns {boolean} True when dispatch order should be flushed first.
 */
function shouldFlushBeforeSmokeDispatch(intent: ViewSmokeControlIntent): boolean {
  return resolveSmokeIntentDebounceMs(intent) === 0;
}

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
  const intentDispatcher = createDebouncedIntentDispatcher<ViewSmokeControlIntent>({
    emit(intent): void {
      dependencies.comms.send({
        type: "smoke.intent",
        payload: intent,
      });
    },
    resolveDebounceMs: resolveSmokeIntentDebounceMs,
  });

  return {
    start(): void {
      const unsubscribeIntent = dependencies.ui.onIntent((intent) => {
        if (shouldFlushBeforeSmokeDispatch(intent)) {
          intentDispatcher.flush();
        }

        intentDispatcher.dispatch(intent);
      });

      const unsubscribe = dependencies.comms.onMessage((message: HostToViewMessage) => {
        if (message.type === "smoke.snapshot") {
          dependencies.ui.setSnapshot(message.payload);
        }
      });

      disposeStore.add(unsubscribeIntent);
      disposeStore.add(unsubscribe);
      disposeStore.add(() => {
        intentDispatcher.flush();
        intentDispatcher.dispose();
      });
      dependencies.comms.send({ type: "smoke.ready" });
    },

    stop(): void {
      disposeStore.disposeAll();
    },
  };
}
