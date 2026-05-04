import type {
  HostToViewMessage,
  ViewRunControlsIntent,
} from "../../../../comms/shared/messageTypes";

import {
  createDebouncedIntentDispatcher,
  createDisposeStore,
  type IDisposeStore,
} from "../../shared";
import type { IRunControlsCommsFacade } from "../comms";
import type { IRunControlsUi } from "../ui";

const INPUT_DEBOUNCE_MS = 300;
const TOGGLE_DEBOUNCE_MS = 175;

/**
 * Resolves one debounce window for run-controls intent dispatch.
 *
 * @param {ViewRunControlsIntent} intent Run-controls intent.
 * @returns {number} Debounce delay in milliseconds.
 */
function resolveRunControlsIntentDebounceMs(intent: ViewRunControlsIntent): number {
  if (intent.kind === "setRunArgsText" || intent.kind === "setSourceProfileText") {
    return INPUT_DEBOUNCE_MS;
  }

  if (intent.kind === "setRunChecksRoute") {
    return TOGGLE_DEBOUNCE_MS;
  }

  return 0;
}

/**
 * Returns true when pending debounced intents should be flushed before dispatch.
 *
 * @param {ViewRunControlsIntent} intent Run-controls intent.
 * @returns {boolean} True when dispatch order should be flushed first.
 */
function shouldFlushBeforeRunControlsDispatch(intent: ViewRunControlsIntent): boolean {
  return resolveRunControlsIntentDebounceMs(intent) === 0;
}

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
  const intentDispatcher = createDebouncedIntentDispatcher<ViewRunControlsIntent>({
    emit(intent): void {
      dependencies.comms.send({
        type: "run.intent",
        payload: intent,
      });
    },
    resolveDebounceMs: resolveRunControlsIntentDebounceMs,
  });

  return {
    start(): void {
      const unsubscribeIntent = dependencies.ui.onIntent((intent) => {
        if (shouldFlushBeforeRunControlsDispatch(intent)) {
          intentDispatcher.flush();
        }

        intentDispatcher.dispatch(intent);
      });

      const unsubscribe = dependencies.comms.onMessage((message: HostToViewMessage) => {
        if (message.type === "run.snapshot") {
          dependencies.ui.setSnapshot(message.payload);
        }
      });

      disposeStore.add(unsubscribeIntent);
      disposeStore.add(unsubscribe);
      disposeStore.add(() => {
        intentDispatcher.flush();
        intentDispatcher.dispose();
      });
      dependencies.comms.send({ type: "run.ready" });
    },

    stop(): void {
      disposeStore.disposeAll();
    },
  };
}