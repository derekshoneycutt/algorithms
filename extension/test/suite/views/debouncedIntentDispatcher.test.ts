import * as assert from "node:assert/strict";

import {
  createDebouncedIntentDispatcher,
} from "../../../src/views/media/shared";

interface TestIntent {
  kind: "text" | "toggle";
  value: string;
}

/**
 * Waits for the provided duration.
 *
 * @param {number} ms Duration in milliseconds.
 * @returns {Promise<void>} Resolves when the timer elapses.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("views/shared/runtime — createDebouncedIntentDispatcher", () => {
  it("coalesces intents by kind and emits the latest payload", async () => {
    const emitted: TestIntent[] = [];
    const dispatcher = createDebouncedIntentDispatcher<TestIntent>({
      emit(intent): void {
        emitted.push(intent);
      },
      resolveDebounceMs(intent): number {
        if (intent.kind === "text") {
          return 20;
        }

        return 0;
      },
    });

    try {
      dispatcher.dispatch({ kind: "text", value: "a" });
      dispatcher.dispatch({ kind: "text", value: "ab" });

      await delay(35);

      assert.equal(emitted.length, 1);
      assert.deepEqual(emitted[0], { kind: "text", value: "ab" });
    } finally {
      dispatcher.dispose();
    }
  });

  it("flushes pending intents immediately", () => {
    const emitted: TestIntent[] = [];
    const dispatcher = createDebouncedIntentDispatcher<TestIntent>({
      emit(intent): void {
        emitted.push(intent);
      },
      resolveDebounceMs(intent): number {
        if (intent.kind === "text") {
          return 50;
        }

        return 0;
      },
    });

    try {
      dispatcher.dispatch({ kind: "text", value: "pending" });
      dispatcher.flush();

      assert.equal(emitted.length, 1);
      assert.deepEqual(emitted[0], { kind: "text", value: "pending" });
    } finally {
      dispatcher.dispose();
    }
  });

  it("emits immediate intents without delay", () => {
    const emitted: TestIntent[] = [];
    const dispatcher = createDebouncedIntentDispatcher<TestIntent>({
      emit(intent): void {
        emitted.push(intent);
      },
      resolveDebounceMs(): number {
        return 0;
      },
    });

    try {
      dispatcher.dispatch({ kind: "toggle", value: "enabled" });

      assert.equal(emitted.length, 1);
      assert.deepEqual(emitted[0], { kind: "toggle", value: "enabled" });
    } finally {
      dispatcher.dispose();
    }
  });
});
