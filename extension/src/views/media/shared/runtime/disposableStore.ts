/**
 * Disposable callback.
 */
export type DisposeCallback = () => void;

/**
 * Runtime disposable store for panel-local frontend wiring.
 */
export interface IDisposeStore {
  /**
   * Adds one dispose callback.
   *
   * @param {DisposeCallback} callback Dispose callback.
   * @returns {void}
   */
  add(callback: DisposeCallback): void;

  /**
   * Disposes all registered callbacks in reverse registration order.
   *
   * @returns {void}
   */
  disposeAll(): void;
}

/**
 * Creates one disposable callback store.
 *
 * @returns {IDisposeStore} Dispose store instance.
 */
export function createDisposeStore(): IDisposeStore {
  const callbacks: DisposeCallback[] = [];

  return {
    add(callback: DisposeCallback): void {
      callbacks.push(callback);
    },

    disposeAll(): void {
      while (callbacks.length > 0) {
        const callback = callbacks.pop();
        if (callback) {
          callback();
        }
      }
    },
  };
}
