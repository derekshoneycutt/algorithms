/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";

import {
  parseAlgorithmsProfile,
  PROFILE_BLOCK_START,
} from "../../../src/environment/shellProfileParse";
import { upsertAlgorithmsProfileBlock } from "../../../src/environment/shellProfileWrite";

// Guard against duplicate managed blocks after repeated upserts.
function countOccurrences(text: string, token: string): number {
  return text.split(token).length - 1;
}

describe("shell profile parse/write integration", () => {
  it("round-trips managed values and route maps", () => {
    const profile = upsertAlgorithmsProfileBlock("# shell init\n", {
      timeout: "-k 10s 2m",
      eiffel: "libertyeiffel",
      gcc13Directory: "/usr/bin",
      gcc13Name: "gcc-13",
      gxx13Name: "g++-13",
      dockerMapText: "python=code-runner go=code-runner",
      sshMapText: "elixir=coderun-vm|/home/coderun/codefiles|../run.sh",
    });

    const parsed = parseAlgorithmsProfile(profile);

    assert.strictEqual(parsed.values.timeout.value, "-k 10s 2m");
    assert.strictEqual(parsed.values.eiffel.value, "libertyeiffel");
    assert.strictEqual(parsed.values.gcc13Directory.value, "/usr/bin");
    assert.strictEqual(parsed.values.gcc13Name.value, "gcc-13");
    assert.strictEqual(parsed.values.gxx13Name.value, "g++-13");
    assert.strictEqual(parsed.routeMaps.docker.get("python"), "code-runner");
    assert.strictEqual(parsed.routeMaps.docker.get("go"), "code-runner");
    assert.deepStrictEqual(parsed.routeMaps.ssh.get("elixir"), {
      kind: "named-destination",
      destination: "coderun-vm",
      codeDirectory: "/home/coderun/codefiles",
      runScript: "../run.sh",
    });
  });

  it("keeps non-managed profile content while replacing managed values", () => {
    const initial = [
      "# user aliases",
      "alias ll='ls -la'",
      "",
    ].join("\n");

    const first = upsertAlgorithmsProfileBlock(initial, {
      timeout: "old",
      dockerMapText: "python=code-runner",
    });

    const second = upsertAlgorithmsProfileBlock(first, {
      timeout: "new",
      dockerMapText: "python=code-runner js=code-runner",
    });

    // User-managed profile lines must survive managed-block rewrites.
    assert.strictEqual(second.includes("alias ll='ls -la'"), true);
    assert.strictEqual(countOccurrences(second, PROFILE_BLOCK_START), 1);

    const parsed = parseAlgorithmsProfile(second);
    assert.strictEqual(parsed.values.timeout.value, "new");
    assert.strictEqual(parsed.routeMaps.docker.get("python"), "code-runner");
    assert.strictEqual(parsed.routeMaps.docker.get("js"), "code-runner");
  });

  it("writes deterministic updates across repeated upserts", () => {
    let profileText = "# baseline\n";

    for (let index = 0; index < 3; index += 1) {
      profileText = upsertAlgorithmsProfileBlock(profileText, {
        timeout: `value-${index}`,
        dockerMapText: `python=runner-${index}`,
      });
    }

    assert.strictEqual(countOccurrences(profileText, PROFILE_BLOCK_START), 1);

    const parsed = parseAlgorithmsProfile(profileText);
    assert.strictEqual(parsed.values.timeout.value, "value-2");
    assert.strictEqual(parsed.routeMaps.docker.get("python"), "runner-2");
  });
});
