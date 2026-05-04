import * as assert from "node:assert/strict";

import type {
  HostToViewMessage,
  ViewEnvironmentControlsIntent,
  ViewRunControlsIntent,
  ViewSmokeControlIntent,
  ViewToHostMessage,
} from "../../../../src/comms/shared/messageTypes";
import { createEnvironmentControlsBridge } from "../../../../src/views/media/environmentControls/bridges/environmentControlsBridge";
import type { IEnvironmentControlsCommsFacade } from "../../../../src/views/media/environmentControls/comms";
import type { IEnvironmentControlsUi } from "../../../../src/views/media/environmentControls/ui";
import { createRunControlsBridge } from "../../../../src/views/media/runControls/bridges/runControlsBridge";
import type { IRunControlsCommsFacade } from "../../../../src/views/media/runControls/comms";
import type { IRunControlsUi } from "../../../../src/views/media/runControls/ui";
import { createSmokeControlsBridge } from "../../../../src/views/media/smokeControls/bridges/smokeControlsBridge";
import type { ISmokeControlsCommsFacade } from "../../../../src/views/media/smokeControls/comms";
import type { ISmokeControlsUi } from "../../../../src/views/media/smokeControls/ui";

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

/**
 * Creates a minimal run-controls UI test double.
 *
 * @returns {IRunControlsUi & { emit(intent: ViewRunControlsIntent): void }} UI test double.
 */
function createRunUiDouble(): IRunControlsUi & { emit(intent: ViewRunControlsIntent): void } {
  let listener: ((intent: ViewRunControlsIntent) => void) | null = null;

  return {
    emit(intent: ViewRunControlsIntent): void {
      listener?.(intent);
    },
    onIntent(next): () => void {
      listener = next;
      return () => {
        listener = null;
      };
    },
    setSnapshot(): void {
      // Not needed for bridge intent tests.
    },
  };
}

/**
 * Creates a minimal smoke-controls UI test double.
 *
 * @returns {ISmokeControlsUi & { emit(intent: ViewSmokeControlIntent): void }} UI test double.
 */
function createSmokeUiDouble(): ISmokeControlsUi & { emit(intent: ViewSmokeControlIntent): void } {
  let listener: ((intent: ViewSmokeControlIntent) => void) | null = null;

  return {
    emit(intent: ViewSmokeControlIntent): void {
      listener?.(intent);
    },
    onIntent(next): () => void {
      listener = next;
      return () => {
        listener = null;
      };
    },
    setSnapshot(): void {
      // Not needed for bridge intent tests.
    },
  };
}

/**
 * Creates a minimal environment-controls UI test double.
 *
 * @returns {IEnvironmentControlsUi & { emit(intent: ViewEnvironmentControlsIntent): void }} UI test double.
 */
function createEnvironmentUiDouble(): IEnvironmentControlsUi & { emit(intent: ViewEnvironmentControlsIntent): void } {
  let listener: ((intent: ViewEnvironmentControlsIntent) => void) | null = null;

  return {
    emit(intent: ViewEnvironmentControlsIntent): void {
      listener?.(intent);
    },
    onIntent(next): () => void {
      listener = next;
      return () => {
        listener = null;
      };
    },
    setSnapshot(): void {
      // Not needed for bridge intent tests.
    },
  };
}

/**
 * Creates a comms test double for capturing sent messages.
 *
 * @returns {{ sent: ViewToHostMessage[]; comms: IRunControlsCommsFacade & ISmokeControlsCommsFacade & IEnvironmentControlsCommsFacade }} Comms capture double.
 */
function createCommsDouble(): {
  sent: ViewToHostMessage[];
  comms: IRunControlsCommsFacade & ISmokeControlsCommsFacade & IEnvironmentControlsCommsFacade;
} {
  const sent: ViewToHostMessage[] = [];
  const listeners = new Set<(message: HostToViewMessage) => void>();

  const comms: IRunControlsCommsFacade & ISmokeControlsCommsFacade & IEnvironmentControlsCommsFacade = {
    onMessage(listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    send(message: ViewToHostMessage): void {
      sent.push(message);
    },
  };

  return {
    sent,
    comms,
  };
}

/**
 * Extracts run intents from sent transport messages.
 *
 * @param {ViewToHostMessage[]} sent Sent transport messages.
 * @returns {ViewRunControlsIntent[]} Run intents.
 */
function getRunIntents(sent: ViewToHostMessage[]): ViewRunControlsIntent[] {
  return sent
    .filter((message): message is { type: "run.intent"; payload: ViewRunControlsIntent } => {
      return message.type === "run.intent";
    })
    .map((message) => {
      return message.payload;
    });
}

/**
 * Extracts smoke intents from sent transport messages.
 *
 * @param {ViewToHostMessage[]} sent Sent transport messages.
 * @returns {ViewSmokeControlIntent[]} Smoke intents.
 */
function getSmokeIntents(sent: ViewToHostMessage[]): ViewSmokeControlIntent[] {
  return sent
    .filter((message): message is { type: "smoke.intent"; payload: ViewSmokeControlIntent } => {
      return message.type === "smoke.intent";
    })
    .map((message) => {
      return message.payload;
    });
}

/**
 * Extracts environment intents from sent transport messages.
 *
 * @param {ViewToHostMessage[]} sent Sent transport messages.
 * @returns {ViewEnvironmentControlsIntent[]} Environment intents.
 */
function getEnvironmentIntents(sent: ViewToHostMessage[]): ViewEnvironmentControlsIntent[] {
  return sent
    .filter((message): message is { type: "environment.intent"; payload: ViewEnvironmentControlsIntent } => {
      return message.type === "environment.intent";
    })
    .map((message) => {
      return message.payload;
    });
}

describe("views/bridges — debounce policies", () => {
  it("run bridge coalesces text intents and emits the latest value", async () => {
    const { sent, comms } = createCommsDouble();
    const ui = createRunUiDouble();
    const bridge = createRunControlsBridge({
      comms,
      ui,
    });

    bridge.start();

    try {
      ui.emit({ kind: "setRunArgsText", text: "--a" });
      ui.emit({ kind: "setRunArgsText", text: "--ab" });

      await delay(340);

      const runIntents = getRunIntents(sent);
      assert.equal(runIntents.length, 1);
      assert.deepEqual(runIntents[0], {
        kind: "setRunArgsText",
        text: "--ab",
      });
    } finally {
      bridge.stop();
    }
  });

  it("run bridge flushes pending text before immediate toggle intent", () => {
    const { sent, comms } = createCommsDouble();
    const ui = createRunUiDouble();
    const bridge = createRunControlsBridge({
      comms,
      ui,
    });

    bridge.start();

    try {
      ui.emit({ kind: "setRunArgsText", text: "--from-buffer" });
      ui.emit({ kind: "setRunArgsEnabled", enabled: true });

      const runIntents = getRunIntents(sent);
      assert.equal(runIntents.length, 2);
      assert.deepEqual(runIntents[0], {
        kind: "setRunArgsText",
        text: "--from-buffer",
      });
      assert.deepEqual(runIntents[1], {
        kind: "setRunArgsEnabled",
        enabled: true,
      });
    } finally {
      bridge.stop();
    }
  });

  it("smoke bridge flushes pending text before immediate action intent", () => {
    const { sent, comms } = createCommsDouble();
    const ui = createSmokeUiDouble();
    const bridge = createSmokeControlsBridge({
      comms,
      ui,
    });

    bridge.start();

    try {
      ui.emit({ kind: "setTimeoutSeconds", timeoutSeconds: "12" });
      ui.emit({ kind: "selectAllLanguages" });

      const smokeIntents = getSmokeIntents(sent);
      assert.equal(smokeIntents.length, 2);
      assert.deepEqual(smokeIntents[0], {
        kind: "setTimeoutSeconds",
        timeoutSeconds: "12",
      });
      assert.deepEqual(smokeIntents[1], {
        kind: "selectAllLanguages",
      });
    } finally {
      bridge.stop();
    }
  });

  it("environment bridge flushes pending draft before save intent", () => {
    const { sent, comms } = createCommsDouble();
    const ui = createEnvironmentUiDouble();
    const bridge = createEnvironmentControlsBridge({
      comms,
      ui,
    });

    bridge.start();

    try {
      ui.emit({
        kind: "setVariableValue",
        key: "timeout",
        value: "55",
      });
      ui.emit({
        kind: "saveVariable",
        key: "timeout",
      });

      const environmentIntents = getEnvironmentIntents(sent);
      assert.equal(environmentIntents.length, 2);
      assert.deepEqual(environmentIntents[0], {
        kind: "setVariableValue",
        key: "timeout",
        value: "55",
      });
      assert.deepEqual(environmentIntents[1], {
        kind: "saveVariable",
        key: "timeout",
      });
    } finally {
      bridge.stop();
    }
  });
});
