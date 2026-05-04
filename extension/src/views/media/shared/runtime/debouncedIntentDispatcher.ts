/**
 * Input required to create one debounced intent dispatcher.
 *
 * @template TIntent Intent type with a stable kind discriminator.
 */
export interface CreateDebouncedIntentDispatcherInput<TIntent extends { kind: string }> {
  /**
   * Emits one intent immediately to the target channel.
   *
   * @param {TIntent} intent Intent payload.
   * @returns {void}
   */
  emit(intent: TIntent): void;

  /**
   * Resolves the debounce delay for one intent kind.
   *
   * Return `0` to bypass debouncing and emit immediately.
   *
   * @param {TIntent} intent Intent payload.
   * @returns {number} Debounce delay in milliseconds.
   */
  resolveDebounceMs(intent: TIntent): number;
}

/**
 * Debounced dispatcher for panel intents.
 *
 * @template TIntent Intent type with a stable kind discriminator.
 */
export interface IDebouncedIntentDispatcher<TIntent extends { kind: string }> {
  /**
   * Dispatches one intent with kind-based debounce policy.
   *
   * @param {TIntent} intent Intent payload.
   * @returns {void}
   */
  dispatch(intent: TIntent): void;

  /**
   * Flushes all pending debounced intents immediately.
   *
   * @returns {void}
   */
  flush(): void;

  /**
   * Disposes the dispatcher and clears pending timers.
   *
   * @returns {void}
   */
  dispose(): void;
}

/**
 * Creates one debounced dispatcher that coalesces intents by kind.
 *
 * @template TIntent Intent type with a stable kind discriminator.
 * @param {CreateDebouncedIntentDispatcherInput<TIntent>} input Dispatcher configuration.
 * @returns {IDebouncedIntentDispatcher<TIntent>} Dispatcher instance.
 */
export function createDebouncedIntentDispatcher<TIntent extends { kind: string }>(
  input: CreateDebouncedIntentDispatcherInput<TIntent>
): IDebouncedIntentDispatcher<TIntent> {
  const pendingByKind = new Map<string, { timer: ReturnType<typeof setTimeout>; intent: TIntent }>();

  /**
   * Emits one pending kind and clears its timer.
   *
   * @param {string} kind Intent kind.
   * @returns {void}
   */
  function flushKind(kind: string): void {
    const pending = pendingByKind.get(kind);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    pendingByKind.delete(kind);
    input.emit(pending.intent);
  }

  return {
    dispatch(intent: TIntent): void {
      const debounceMs = input.resolveDebounceMs(intent);
      if (debounceMs <= 0) {
        input.emit(intent);
        return;
      }

      const existing = pendingByKind.get(intent.kind);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(() => {
        flushKind(intent.kind);
      }, debounceMs);

      pendingByKind.set(intent.kind, {
        timer,
        intent,
      });
    },

    flush(): void {
      const kinds = [...pendingByKind.keys()];
      for (const kind of kinds) {
        flushKind(kind);
      }
    },

    dispose(): void {
      for (const pending of pendingByKind.values()) {
        clearTimeout(pending.timer);
      }

      pendingByKind.clear();
    },
  };
}
