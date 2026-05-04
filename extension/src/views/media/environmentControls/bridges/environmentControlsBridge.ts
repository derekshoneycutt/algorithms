import type {
  HostToViewMessage,
  ViewEnvironmentControlsIntent,
} from "../../../../comms/shared/messageTypes";

import {
  createDebouncedIntentDispatcher,
  createDisposeStore,
  type IDisposeStore,
} from "../../shared";
import type { IEnvironmentControlsCommsFacade } from "../comms";
import type { IEnvironmentControlsUi } from "../ui";

const INPUT_DEBOUNCE_MS = 300;
const TOGGLE_DEBOUNCE_MS = 175;

/**
 * Resolves one debounce window for environment-controls intent dispatch.
 *
 * @param {ViewEnvironmentControlsIntent} intent Environment intent.
 * @returns {number} Debounce delay in milliseconds.
 */
function resolveEnvironmentIntentDebounceMs(intent: ViewEnvironmentControlsIntent): number {
  if (
    intent.kind === "setVariableValue"
    || intent.kind === "setProfilePath"
    || intent.kind === "setCopyIconsPath"
    || intent.kind === "setRoutingDockerMapText"
    || intent.kind === "setRoutingSshMapText"
  ) {
    return INPUT_DEBOUNCE_MS;
  }

  if (intent.kind === "setLanguageRoutingDraft" || intent.kind === "setBatchRoutingDraft") {
    return TOGGLE_DEBOUNCE_MS;
  }

  return 0;
}

/**
 * Returns true when pending debounced intents should be flushed before dispatch.
 *
 * @param {ViewEnvironmentControlsIntent} intent Environment intent.
 * @returns {boolean} True when dispatch order should be flushed first.
 */
function shouldFlushBeforeEnvironmentDispatch(
  intent: ViewEnvironmentControlsIntent
): boolean {
  return resolveEnvironmentIntentDebounceMs(intent) === 0;
}

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
  const intentDispatcher = createDebouncedIntentDispatcher<ViewEnvironmentControlsIntent>({
    emit(intent): void {
      dependencies.comms.send({
        type: "environment.intent",
        payload: intent,
      });
    },
    resolveDebounceMs: resolveEnvironmentIntentDebounceMs,
  });

  return {
    start(): void {
      const unsubscribeIntent = dependencies.ui.onIntent((intent) => {
        if (shouldFlushBeforeEnvironmentDispatch(intent)) {
          intentDispatcher.flush();
        }

        intentDispatcher.dispatch(intent);
      });

      const unsubscribe = dependencies.comms.onMessage((message: HostToViewMessage) => {
        if (message.type === "environment.snapshot") {
          dependencies.ui.setSnapshot(message.payload);
        }
      });

      disposeStore.add(unsubscribeIntent);
      disposeStore.add(unsubscribe);
      disposeStore.add(() => {
        intentDispatcher.flush();
        intentDispatcher.dispose();
      });
      dependencies.comms.send({ type: "environment.ready" });
    },

    stop(): void {
      disposeStore.disposeAll();
    },
  };
}
