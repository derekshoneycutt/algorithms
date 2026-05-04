export type ObservabilityLevel = "trace" | "debug" | "info" | "warn" | "error";

export type ObservabilityFields = Record<string, string | number | boolean | null | undefined>;

/**
 * DI contract for host-side observability instrumentation.
 */
export interface IObservability {
  /**
   * Returns whether a category is enabled for instrumentation.
   *
   * @param {string} category Category key.
   * @returns {boolean} True when category instrumentation is enabled.
   */
  isEnabled(category: string): boolean;

  /**
   * Emits one structured log event.
   *
   * @param {ObservabilityLevel} level Log level.
   * @param {string} eventName Event identifier.
   * @param {ObservabilityFields} [fields] Optional event fields.
   * @returns {void}
   */
  log(level: ObservabilityLevel, eventName: string, fields?: ObservabilityFields): void;

  /**
   * Increments one named metric.
   *
   * @param {string} metricName Metric identifier.
   * @param {number} [value] Increment amount.
   * @param {ObservabilityFields} [tags] Optional metric tags.
   * @returns {void}
   */
  increment(metricName: string, value?: number, tags?: ObservabilityFields): void;

  /**
   * Times one sync or async operation and emits a duration metric.
   *
   * @template T
   * @param {string} operationName Operation identifier.
   * @param {() => T | Promise<T>} run Operation callback.
   * @param {ObservabilityFields} [tags] Optional metric tags.
   * @returns {Promise<T>} Operation result.
   */
  time<T>(
    operationName: string,
    run: () => T | Promise<T>,
    tags?: ObservabilityFields
  ): Promise<T>;

  /**
   * Releases module resources.
   *
   * @returns {void}
   */
  dispose(): void;
}
