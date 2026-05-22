/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";

import {
  PROFILE_BLOCK_END,
  PROFILE_BLOCK_START,
} from "../../../src/environment/shellProfileParse";
import {
  renderAlgorithmsProfileBlock,
  upsertAlgorithmsProfileBlock,
} from "../../../src/environment/shellProfileWrite";

// Guard against duplicate managed markers after updates.
function countOccurrences(text: string, token: string): number {
  return text.split(token).length - 1;
}

describe("shellProfileWrite (unit)", () => {
  it("renders only defined values and escapes quotes/backslashes", () => {
    const block = renderAlgorithmsProfileBlock({
      timeout: "-k 10s 2m",
      eiffel: "C:\\tools\\\"eiffel\"",
      dockerMapText: "python=code-runner",
      sshMapText: undefined,
    });

    assert.strictEqual(block.includes("export DEREKALGOS_TIMEOUT=\"-k 10s 2m\""), true);
    assert.strictEqual(block.includes("export DEREKALGOS_EIFFEL=\"C:\\\\tools\\\\\\\"eiffel\\\"\""), true);
    assert.strictEqual(block.includes("export DEREKALGOS_RUNONDOCKER=\"python=code-runner\""), true);
    assert.strictEqual(block.includes("DEREKALGOS_RUNONSSH"), false);
  });

  it("appends a block to an empty profile", () => {
    const updated = upsertAlgorithmsProfileBlock("", {
      timeout: "-k 10s 2m",
    });

    assert.strictEqual(updated.startsWith(PROFILE_BLOCK_START), true);
    assert.strictEqual(updated.includes("export DEREKALGOS_TIMEOUT=\"-k 10s 2m\""), true);
    assert.strictEqual(updated.endsWith(PROFILE_BLOCK_END), true);
  });

  it("replaces an existing managed block instead of duplicating it", () => {
    const existing = [
      "# keep-before",
      PROFILE_BLOCK_START,
      "export DEREKALGOS_TIMEOUT=\"old\"",
      PROFILE_BLOCK_END,
      "# keep-after",
    ].join("\n");

    const updated = upsertAlgorithmsProfileBlock(existing, {
      timeout: "new",
    });

    assert.strictEqual(countOccurrences(updated, PROFILE_BLOCK_START), 1);
    assert.strictEqual(countOccurrences(updated, PROFILE_BLOCK_END), 1);
    assert.strictEqual(updated.includes("export DEREKALGOS_TIMEOUT=\"new\""), true);
    assert.strictEqual(updated.includes("export DEREKALGOS_TIMEOUT=\"old\""), false);
  });

  it("pairs markers correctly when a stray end marker appears earlier in file", () => {
    const existing = [
      PROFILE_BLOCK_END,
      "# keep-before",
      PROFILE_BLOCK_START,
      "export DEREKALGOS_TIMEOUT=\"old\"",
      PROFILE_BLOCK_END,
      "# keep-after",
    ].join("\n");

    const updated = upsertAlgorithmsProfileBlock(existing, {
      timeout: "new",
      eiffel: "eiffelstudio",
    });

    assert.strictEqual(countOccurrences(updated, PROFILE_BLOCK_START), 1);
    assert.strictEqual(updated.includes("export DEREKALGOS_TIMEOUT=\"new\""), true);
    assert.strictEqual(updated.includes("export DEREKALGOS_EIFFEL=\"eiffelstudio\""), true);
    assert.strictEqual(updated.includes("export DEREKALGOS_TIMEOUT=\"old\""), false);
  });

  it("preserves CRLF line endings when replacing managed block", () => {
    const existing = [
      "# before",
      PROFILE_BLOCK_START,
      "export DEREKALGOS_TIMEOUT=\"old\"",
      PROFILE_BLOCK_END,
      "# after",
    ].join("\r\n");

    const updated = upsertAlgorithmsProfileBlock(existing, {
      timeout: "new",
    });

    // Keep original line-ending style so profile files do not churn on Windows edits.
    assert.strictEqual(updated.includes("\r\n"), true);
    assert.strictEqual(updated.includes("\n"), true);
    assert.strictEqual(updated.includes("export DEREKALGOS_TIMEOUT=\"new\""), true);
  });
});
