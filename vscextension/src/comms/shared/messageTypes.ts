/**
 * Message sent from the host runtime to a webview frontend.
 */
export type HostToViewMessage =
  | {
      type: "bootstrap.ping";
    }
  | {
      type: "bootstrap.snapshot";
      payload: {
        status: string;
      };
    };

/**
 * Message sent from a webview frontend to the host runtime.
 */
export type ViewToHostMessage =
  | {
      type: "bootstrap.ready";
    }
  | {
      type: "bootstrap.pong";
    };

/**
 * Checks whether an unknown value is a host-to-view message.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is HostToViewMessage} True when the value is a valid host-to-view message.
 */
export function isHostToViewMessage(value: unknown): value is HostToViewMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  if (value.type === "bootstrap.ping") {
    return true;
  }

  if (value.type !== "bootstrap.snapshot") {
    return false;
  }

  return (
    "payload" in value &&
    typeof value.payload === "object" &&
    value.payload !== null &&
    "status" in value.payload &&
    typeof value.payload.status === "string"
  );
}

/**
 * Checks whether an unknown value is a view-to-host message.
 *
 * @param {unknown} value Candidate value.
 * @returns {value is ViewToHostMessage} True when the value is a valid view-to-host message.
 */
export function isViewToHostMessage(value: unknown): value is ViewToHostMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  return value.type === "bootstrap.ready" || value.type === "bootstrap.pong";
}
