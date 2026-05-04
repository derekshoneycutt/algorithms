import * as vscode from "vscode";

import type { IObservability, ObservabilityFields, ObservabilityLevel } from "./IObservability";

interface CreateObservabilityInput {
  enabledByCategory?: Readonly<Record<string, boolean>>;
  outputChannel?: vscode.LogOutputChannel;
}

/**
 * Resolves one category key from an event or metric name.
 *
 * Category convention: first two dotted segments, e.g. `index.problems`.
 *
 * @param {string} name Event or metric name.
 * @returns {string} Category key.
 */
function resolveCategoryFromName(name: string): string {
  const segments = name.split(".").filter((segment) => segment.length > 0);
  if (segments.length >= 2) {
    return `${segments[0]}.${segments[1]}`;
  }

  return segments[0] ?? "";
}

/**
 * Creates a no-op observability provider.
 *
 * @returns {IObservability} No-op observability implementation.
 */
export function createNoopObservability(): IObservability {
  return {
    isEnabled(): boolean {
      return false;
    },

    log(): void {
      return;
    },

    increment(): void {
      return;
    },

    async time<T>(
      _operationName: string,
      run: () => T | Promise<T>
    ): Promise<T> {
      return await run();
    },

    dispose(): void {
      return;
    },
  };
}

/**
 * Creates one VS Code log-channel backed observability provider.
 *
 * @param {CreateObservabilityInput} [input] Optional creation input.
 * @returns {IObservability} Observability implementation.
 */
export function createObservability(input?: CreateObservabilityInput): IObservability {
  const outputChannel = input?.outputChannel ?? vscode.window.createOutputChannel(
    "Algorithms Observability",
    { log: true }
  );
  const enabledByCategory = input?.enabledByCategory ?? {};

  /**
   * Returns true when a category is enabled.
   *
   * @param {string} category Category key.
   * @returns {boolean} True when enabled.
   */
  function isCategoryEnabled(category: string): boolean {
    return enabledByCategory[category] === true;
  }

  /**
   * Serializes one field map for compact logging.
   *
   * @param {ObservabilityFields} [fields] Optional field map.
   * @returns {string} Serialized field suffix.
   */
  function serializeFields(fields?: ObservabilityFields): string {
    if (fields === undefined) {
      return "";
    }

    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return "";
    }

    return ` ${JSON.stringify(Object.fromEntries(entries))}`;
  }

  /**
   * Writes one message to the log channel at the requested level.
   *
   * @param {ObservabilityLevel} level Log level.
   * @param {string} message Message text.
   * @returns {void}
   */
  function write(level: ObservabilityLevel, message: string): void {
    if (level === "trace") {
      outputChannel.trace(message);
      return;
    }
    if (level === "debug") {
      outputChannel.debug(message);
      return;
    }
    if (level === "info") {
      outputChannel.info(message);
      return;
    }
    if (level === "warn") {
      outputChannel.warn(message);
      return;
    }

    outputChannel.error(message);
  }

  return {
    isEnabled(category: string): boolean {
      return isCategoryEnabled(category);
    },

    log(level: ObservabilityLevel, eventName: string, fields?: ObservabilityFields): void {
      const category = resolveCategoryFromName(eventName);
      if (!isCategoryEnabled(category)) {
        return;
      }

      try {
        write(level, `${eventName}${serializeFields(fields)}`);
      } catch {
        return;
      }
    },

    increment(metricName: string, value = 1, tags?: ObservabilityFields): void {
      const category = resolveCategoryFromName(metricName);
      if (!isCategoryEnabled(category)) {
        return;
      }

      try {
        write("debug", `metric.increment ${metricName}${serializeFields({ value, ...tags })}`);
      } catch {
        return;
      }
    },

    async time<T>(
      operationName: string,
      run: () => T | Promise<T>,
      tags?: ObservabilityFields
    ): Promise<T> {
      const category = resolveCategoryFromName(operationName);
      if (!isCategoryEnabled(category)) {
        return await run();
      }

      const startedAt = Date.now();

      try {
        const result = await run();
        const durationMs = Date.now() - startedAt;
        write("debug", `metric.duration ${operationName}${serializeFields({ durationMs, ...tags })}`);
        return result;
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        write("warn", `metric.duration ${operationName}${serializeFields({ durationMs, ok: false, ...tags })}`);
        throw error;
      }
    },

    dispose(): void {
      outputChannel.dispose();
    },
  };
}
