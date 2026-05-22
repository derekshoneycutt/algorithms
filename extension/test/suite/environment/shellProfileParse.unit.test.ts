/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";

import {
  extractManagedExportValue,
  parseAlgorithmsProfile,
  parseDockerRouteMap,
  parseSshRouteMap,
  parseSshRouteValue,
  PROFILE_BLOCK_END,
  PROFILE_BLOCK_START,
} from "../../../src/environment/shellProfileParse";

describe("shellProfileParse (unit)", () => {
  it("extracts managed exports only from inside the managed block", () => {
    const profile = [
      "export DEREKALGOS_TIMEOUT=\"outside\"",
      PROFILE_BLOCK_START,
      "export DEREKALGOS_TIMEOUT=\"inside\"",
      PROFILE_BLOCK_END,
      "export DEREKALGOS_TIMEOUT=\"outside2\"",
    ].join("\n");

    const value = extractManagedExportValue(profile, "DEREKALGOS_TIMEOUT");
    assert.deepStrictEqual(value, { present: true, value: "inside" });
  });

  it("pairs block markers correctly when a stray end marker appears before the start marker", () => {
    const profile = [
      PROFILE_BLOCK_END,
      "# unrelated preface",
      PROFILE_BLOCK_START,
      "export DEREKALGOS_EIFFEL=\"eiffelstudio\"",
      PROFILE_BLOCK_END,
    ].join("\n");

    // Regression guard: end-marker lookup must start after the matched start marker.
    const value = extractManagedExportValue(profile, "DEREKALGOS_EIFFEL");
    assert.deepStrictEqual(value, { present: true, value: "eiffelstudio" });
  });

  it("unescapes quoted values with escaped quotes and backslashes", () => {
    const profile = [
      PROFILE_BLOCK_START,
      "export DEREKALGOS_GCC13=\"C:\\\\tools\\\\\\\"gcc\\\"\"",
      PROFILE_BLOCK_END,
    ].join("\n");

    const value = extractManagedExportValue(profile, "DEREKALGOS_GCC13");
    assert.deepStrictEqual(value, {
      present: true,
      value: "C:\\tools\\\"gcc\"",
    });
  });

  it("parseDockerRouteMap lowercases keys and ignores malformed tokens", () => {
    const map = parseDockerRouteMap("PyThOn=runner invalid noequals= c=code-runner");

    assert.strictEqual(map.get("python"), "runner");
    assert.strictEqual(map.get("c"), "code-runner");
    assert.strictEqual(map.has("invalid"), false);
    assert.strictEqual(map.has("noequals"), false);
  });

  it("parseSshRouteValue parses both supported formats", () => {
    const named = parseSshRouteValue("coderun-vm|/home/coderun/codefiles|../run.sh");
    assert.deepStrictEqual(named, {
      kind: "named-destination",
      destination: "coderun-vm",
      codeDirectory: "/home/coderun/codefiles",
      runScript: "../run.sh",
    });

    const direct = parseSshRouteValue("10.0.0.2|derek|2222|/srv/code|./run.sh");
    assert.deepStrictEqual(direct, {
      kind: "direct-connection",
      address: "10.0.0.2",
      user: "derek",
      port: "2222",
      codeDirectory: "/srv/code",
      runScript: "./run.sh",
    });
  });

  it("parseSshRouteMap ignores malformed route entries", () => {
    const map = parseSshRouteMap("python=host|user|22|/srv|run.sh bad=host|onlytwoparts");

    assert.strictEqual(map.has("python"), true);
    // Invalid value formats should be dropped instead of poisoning the full parse.
    assert.strictEqual(map.has("bad"), false);
  });

  it("parseAlgorithmsProfile returns route maps from managed exports", () => {
    const profile = [
      PROFILE_BLOCK_START,
      "export DEREKALGOS_RUNONDOCKER=\"python=code-runner js=code-runner\"",
      "export DEREKALGOS_RUNONSSH=\"go=coderun-vm|/home/coderun/codefiles|../run.sh\"",
      PROFILE_BLOCK_END,
    ].join("\n");

    const parsed = parseAlgorithmsProfile(profile);
    assert.strictEqual(parsed.routeMaps.docker.get("python"), "code-runner");
    assert.strictEqual(parsed.routeMaps.docker.get("js"), "code-runner");

    const goSsh = parsed.routeMaps.ssh.get("go");
    assert.deepStrictEqual(goSsh, {
      kind: "named-destination",
      destination: "coderun-vm",
      codeDirectory: "/home/coderun/codefiles",
      runScript: "../run.sh",
    });
  });
});
