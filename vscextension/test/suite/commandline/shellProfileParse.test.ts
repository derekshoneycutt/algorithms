import * as assert from "assert";

import {
  extractManagedExportValue,
  loadShellProfile,
  parseAlgorithmsProfile,
  parseDockerRouteMap,
  parseSshRouteMap,
  parseSshRouteValue,
  PROFILE_BLOCK_END,
  PROFILE_BLOCK_START,
} from "../../../src/commandline";
import type { IFilesystem } from "../../../src/filesystem";

describe("commandline/internal — shell profile parsing", () => {
  it("extractManagedExportValue scopes to the managed block", () => {
    const scopedText = [
      PROFILE_BLOCK_START,
      'export DEREKALGOS_TIMEOUT="-k 30s 5m"',
      PROFILE_BLOCK_END,
      'export DEREKALGOS_TIMEOUT="-k 1s 1m"',
    ].join("\n");

    const result = extractManagedExportValue(scopedText, "DEREKALGOS_TIMEOUT");
    assert.strictEqual(result.present, true);
    assert.strictEqual(result.value, "-k 30s 5m");
  });

  it("extractManagedExportValue unescapes quoted values", () => {
    const profileText = 'export DEREKALGOS_EIFFEL="path\\"with\\"quotes"';
    const result = extractManagedExportValue(profileText, "DEREKALGOS_EIFFEL");

    assert.strictEqual(result.present, true);
    assert.ok(result.value.includes('"'));
  });

  it("parseDockerRouteMap parses normalized language tokens", () => {
    const routeMap = parseDockerRouteMap("Python=docker1 javascript=ssh2 broken");

    assert.strictEqual(routeMap.get("python"), "docker1");
    assert.strictEqual(routeMap.get("javascript"), "ssh2");
    assert.strictEqual(routeMap.size, 2);
  });

  it("parseSshRouteValue parses named destination format", () => {
    const route = parseSshRouteValue("ssh-destination|/srv/code|./run.sh");

    assert.ok(route !== null);
    assert.strictEqual(route.kind, "named-destination");
    if (route !== null && route.kind === "named-destination") {
      assert.strictEqual(route.destination, "ssh-destination");
      assert.strictEqual(route.codeDirectory, "/srv/code");
      assert.strictEqual(route.runScript, "./run.sh");
    }
  });

  it("parseSshRouteValue parses direct connection format", () => {
    const route = parseSshRouteValue("1.2.3.4|derek|2222|/srv/code|./run.sh");

    assert.ok(route !== null);
    assert.strictEqual(route.kind, "direct-connection");
    if (route !== null && route.kind === "direct-connection") {
      assert.strictEqual(route.address, "1.2.3.4");
      assert.strictEqual(route.user, "derek");
      assert.strictEqual(route.port, "2222");
      assert.strictEqual(route.codeDirectory, "/srv/code");
      assert.strictEqual(route.runScript, "./run.sh");
    }
  });

  it("parseSshRouteValue returns null for malformed formats", () => {
    assert.strictEqual(parseSshRouteValue(""), null);
    assert.strictEqual(parseSshRouteValue("a|b"), null);
    assert.strictEqual(parseSshRouteValue("a|b|c|d"), null);
    assert.strictEqual(parseSshRouteValue("a||c"), null);
  });

  it("parseSshRouteMap skips malformed entries", () => {
    const routeMap = parseSshRouteMap(
      "python=ssh-destination|/srv/code|./run.sh broken javascript=1.2.3.4|derek|2222|/srv/js|./run.sh go=bad|format"
    );

    assert.strictEqual(routeMap.size, 2);
    assert.ok(routeMap.has("python"));
    assert.ok(routeMap.has("javascript"));
    assert.ok(!routeMap.has("go"));
  });

  it("parseAlgorithmsProfile returns raw values and parsed route maps", () => {
    const profileText = [
      PROFILE_BLOCK_START,
      'export DEREKALGOS_TIMEOUT="-k 30s 5m"',
      'export DEREKALGOS_RUNONDOCKER="python=docker-host javascript=node-container"',
      'export DEREKALGOS_RUNONSSH="python=ssh-destination|/srv/python|./run.sh javascript=1.2.3.4|derek|2222|/srv/js|./run.sh"',
      PROFILE_BLOCK_END,
    ].join("\n");

    const parsed = parseAlgorithmsProfile(profileText);

    assert.strictEqual(parsed.values.timeout.value, "-k 30s 5m");
    assert.strictEqual(parsed.routeMaps.docker.get("python"), "docker-host");
    assert.ok(parsed.routeMaps.ssh.has("python"));
    assert.ok(parsed.routeMaps.ssh.has("javascript"));
  });
});

describe("commandline/adapters — loadShellProfile", () => {
  /**
   * Creates one filesystem stub for shell profile loading tests.
   *
   * @param {Record<string, string | null>} files File content by path.
   * @returns {IFilesystem} Filesystem stub.
   */
  function createFilesystemStub(files: Record<string, string | null>): IFilesystem {
    return {
      async realpath(targetPath: string): Promise<string> {
        return targetPath;
      },
      async isFile(): Promise<boolean> {
        return false;
      },
      async isDirectory(): Promise<boolean> {
        return false;
      },
      async readText(filePath: string): Promise<string | null> {
        return files[filePath] ?? null;
      },
      async writeText(): Promise<void> {
        throw new Error("not implemented");
      },
      async listDirectory(): Promise<null> {
        return null;
      },
      async ensureDirectory(): Promise<void> {
        throw new Error("not implemented");
      },
      async deletePath(): Promise<void> {
        throw new Error("not implemented");
      },
      async isPathWithinRoot(): Promise<boolean> {
        return false;
      },
    };
  }

  it("loads an explicit profile path and parses values", async () => {
    const filesystem = createFilesystemStub({
      "/tmp/profile": [
        PROFILE_BLOCK_START,
        'export DEREKALGOS_TIMEOUT="-k 10s 2m"',
        'export DEREKALGOS_RUNONDOCKER="python=docker-host"',
        PROFILE_BLOCK_END,
      ].join("\n"),
    });

    const result = await loadShellProfile({
      filesystem,
      profilePath: "/tmp/profile",
    });

    assert.strictEqual(result.effectiveProfilePath, "/tmp/profile");
    assert.strictEqual(result.values.timeout.value, "-k 10s 2m");
    assert.strictEqual(result.routeMaps.docker.get("python"), "docker-host");
  });

  it("falls back to empty content when the profile cannot be read", async () => {
    const filesystem = createFilesystemStub({});

    const result = await loadShellProfile({
      filesystem,
      profilePath: "/tmp/missing-profile",
    });

    assert.strictEqual(result.values.timeout.present, false);
    assert.strictEqual(result.routeMaps.docker.size, 0);
    assert.strictEqual(result.routeMaps.ssh.size, 0);
  });
});
