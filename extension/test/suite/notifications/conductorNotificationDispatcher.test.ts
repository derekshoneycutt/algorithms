import * as assert from "node:assert/strict";

import {
  createConductorNotificationDispatcher,
} from "../../../src/notifications";
import type { INotificationRouter } from "../../../src/notifications";

/**
 * Creates a simple notification-router test double.
 *
 * @param {string[]} calls Mutable calls list.
 * @returns {INotificationRouter} Test double.
 */
function createNotificationRouterDouble(calls: string[]): INotificationRouter {
  return {
    info(message: string): Promise<string | undefined> {
      calls.push(`info:${message}`);
      return Promise.resolve(undefined);
    },
    warn(message: string): Promise<string | undefined> {
      calls.push(`warn:${message}`);
      return Promise.resolve(undefined);
    },
    error(message: string): Promise<string | undefined> {
      calls.push(`error:${message}`);
      return Promise.resolve(undefined);
    },
  };
}

describe("notifications — createConductorNotificationDispatcher", () => {
  it("routes error notifications to error", () => {
    const calls: string[] = [];
    const dispatcher = createConductorNotificationDispatcher(
      createNotificationRouterDouble(calls)
    );
    dispatcher.dispatch({ level: "error", message: "boom" });
    assert.deepEqual(calls, ["error:boom"]);
  });

  it("routes warn notifications to warn", () => {
    const calls: string[] = [];
    const dispatcher = createConductorNotificationDispatcher(
      createNotificationRouterDouble(calls)
    );
    dispatcher.dispatch({ level: "warn", message: "careful" });
    assert.deepEqual(calls, ["warn:careful"]);
  });

  it("routes info notifications to info", () => {
    const calls: string[] = [];
    const dispatcher = createConductorNotificationDispatcher(
      createNotificationRouterDouble(calls)
    );
    dispatcher.dispatch({ level: "info", message: "ok" });
    assert.deepEqual(calls, ["info:ok"]);
  });
});
