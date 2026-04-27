import * as assert from "assert";

import {
  getDefaultProfilePathForPlatform,
  parseAlgorithmsProfile,
  PROFILE_BLOCK_END,
  PROFILE_BLOCK_START,
  renderAlgorithmsProfileBlock,
  upsertAlgorithmsProfileBlock,
  writeShellProfile,
} from "../../../src/commandline";
import type { IFilesystem } from "../../../src/filesystem";

/**
 * Creates one filesystem stub for shell profile writer tests.
 *
 * @param {Record<string, string | null>} files File content by path.
 * @returns {IFilesystem & { writes: Map<string, string> }} Filesystem stub with write capture.
 */
function createFilesystemStub(
  files: Record<string, string | null>
): IFilesystem & { writes: Map<string, string> } {
  const storedFiles = new Map<string, string | null>(Object.entries(files));
  const writes = new Map<string, string>();

  return {
    writes,
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
      return storedFiles.get(filePath) ?? null;
    },
    async writeText(filePath: string, content: string): Promise<void> {
      storedFiles.set(filePath, content);
      writes.set(filePath, content);
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

describe("commandline/internal — shell profile writing", () => {
  it("renders a managed block in canonical order with shell escaping", () => {
    const block = renderAlgorithmsProfileBlock({
      timeout: "-k 30s 5m",
      eiffel: "path\\with\"quotes",
      dockerMapText: "python=docker-host",
      sshMapText: "python=ssh-destination|/srv/code|./run.sh",
    });

    assert.strictEqual(
      block,
      [
        PROFILE_BLOCK_START,
        'export DEREKALGOS_TIMEOUT="-k 30s 5m"',
        'export DEREKALGOS_EIFFEL="path\\\\with\\"quotes"',
        'export DEREKALGOS_RUNONDOCKER="python=docker-host"',
        'export DEREKALGOS_RUNONSSH="python=ssh-destination|/srv/code|./run.sh"',
        PROFILE_BLOCK_END,
      ].join("\n")
    );
  });

  it("replaces an existing managed block in place", () => {
    const existingProfile = [
      "export PATH=\"/usr/local/bin:$PATH\"",
      PROFILE_BLOCK_START,
      'export DEREKALGOS_TIMEOUT="-k 5s 1m"',
      PROFILE_BLOCK_END,
      "alias ll='ls -la'",
    ].join("\n");

    const updatedProfile = upsertAlgorithmsProfileBlock(existingProfile, {
      timeout: "-k 30s 5m",
      dockerMapText: "python=docker-host",
    });

    assert.ok(updatedProfile.includes('export DEREKALGOS_TIMEOUT="-k 30s 5m"'));
    assert.ok(updatedProfile.includes('export DEREKALGOS_RUNONDOCKER="python=docker-host"'));
    assert.ok(!updatedProfile.includes('export DEREKALGOS_TIMEOUT="-k 5s 1m"'));
    assert.ok(updatedProfile.includes("alias ll='ls -la'"));
    assert.strictEqual(updatedProfile.split(PROFILE_BLOCK_START).length - 1, 1);
  });

  it("appends the managed block when no block is present", () => {
    const existingProfile = "export PATH=\"/usr/local/bin:$PATH\"";
    const updatedProfile = upsertAlgorithmsProfileBlock(existingProfile, {
      timeout: "-k 30s 5m",
    });

    assert.ok(updatedProfile.startsWith(existingProfile));
    assert.ok(updatedProfile.includes(PROFILE_BLOCK_START));
    assert.ok(updatedProfile.endsWith(PROFILE_BLOCK_END));
  });

  it("round-trips writer output through the existing parser", () => {
    const profileText = renderAlgorithmsProfileBlock({
      timeout: "-k 30s 5m",
      dockerMapText: "python=docker-host javascript=node-container",
      sshMapText: "python=ssh-destination|/srv/code|./run.sh",
    });
    const parsedProfile = parseAlgorithmsProfile(profileText);

    assert.strictEqual(parsedProfile.values.timeout.present, true);
    assert.strictEqual(parsedProfile.values.timeout.value, "-k 30s 5m");
    assert.strictEqual(parsedProfile.routeMaps.docker.get("python"), "docker-host");
    assert.ok(parsedProfile.routeMaps.ssh.has("python"));
  });
});

describe("commandline/adapters — writeShellProfile", () => {
  it("writes an explicit profile path and returns parsed values", async () => {
    const filesystem = createFilesystemStub({
      "/tmp/profile": [
        PROFILE_BLOCK_START,
        'export DEREKALGOS_TIMEOUT="-k 5s 1m"',
        PROFILE_BLOCK_END,
      ].join("\n"),
    });

    const result = await writeShellProfile({
      filesystem,
      profilePath: "/tmp/profile",
      values: {
        timeout: "-k 30s 5m",
        dockerMapText: "python=docker-host",
      },
    });

    assert.strictEqual(result.effectiveProfilePath, "/tmp/profile");
    assert.strictEqual(result.values.timeout.value, "-k 30s 5m");
    assert.strictEqual(result.routeMaps.docker.get("python"), "docker-host");
    assert.strictEqual(
      filesystem.writes.get("/tmp/profile"),
      result.profileText
    );
  });

  it("uses the platform default profile path when none is provided", async () => {
    const defaultProfilePath = getDefaultProfilePathForPlatform();
    const filesystem = createFilesystemStub({});

    const result = await writeShellProfile({
      filesystem,
      values: {
        timeout: "-k 30s 5m",
      },
    });

    assert.strictEqual(result.effectiveProfilePath, defaultProfilePath);
    assert.strictEqual(result.values.timeout.value, "-k 30s 5m");
    assert.strictEqual(
      filesystem.writes.get(defaultProfilePath),
      result.profileText
    );
  });
});