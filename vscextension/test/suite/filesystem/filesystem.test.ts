import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import "mocha";
import { createFilesystem } from "../../../src/filesystem";

/**
 * Creates one temporary directory for filesystem tests.
 *
 * @returns {Promise<string>} Temporary directory path.
 */
async function createTempDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "vscext-fs-cache-tests-"));
}

/**
 * Waits for one number of milliseconds.
 *
 * @param {number} durationMs Delay in milliseconds.
 * @returns {Promise<void>} Resolves after the delay.
 */
async function wait(durationMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, durationMs);
  });
}

describe("filesystem - cache behavior", () => {
  it("returns cached stat results until bypassed", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const filePath = path.join(workspaceRootPath, "example.txt");
      await fs.writeFile(filePath, "hello");

      const firstCheck = await filesystem.isFile(filePath);
      assert.equal(firstCheck, true);

      await fs.rm(filePath, { force: true });

      const cachedCheck = await filesystem.isFile(filePath);
      assert.equal(cachedCheck, true);

      const bypassedCheck = await filesystem.isFile(filePath, { useCache: false });
      assert.equal(bypassedCheck, false);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("returns cached directory entries when withFileTypes is true", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const directoryPath = path.join(workspaceRootPath, "items");
      await fs.mkdir(directoryPath, { recursive: true });
      await fs.writeFile(path.join(directoryPath, "alpha.txt"), "a");

      const firstEntries = await filesystem.listDirectory(directoryPath, {
        withFileTypes: true,
      });
      assert.ok(Array.isArray(firstEntries));
      assert.equal(firstEntries?.length, 1);

      await fs.writeFile(path.join(directoryPath, "beta.txt"), "b");

      const cachedEntries = await filesystem.listDirectory(directoryPath, {
        withFileTypes: true,
      });
      assert.equal(cachedEntries?.length, 1);

      const bypassedEntries = await filesystem.listDirectory(directoryPath, {
        withFileTypes: true,
        useCache: false,
      });
      assert.equal(bypassedEntries?.length, 2);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("invalidates parent directory cache after writeText", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const directoryPath = path.join(workspaceRootPath, "items");
      await fs.mkdir(directoryPath, { recursive: true });
      await fs.writeFile(path.join(directoryPath, "alpha.txt"), "a");

      const firstEntries = await filesystem.listDirectory(directoryPath, {
        withFileTypes: true,
      });
      assert.equal(firstEntries?.length, 1);

      await filesystem.writeText(path.join(directoryPath, "beta.txt"), "b");

      const refreshedEntries = await filesystem.listDirectory(directoryPath, {
        withFileTypes: true,
      });
      assert.equal(refreshedEntries?.length, 2);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });

  it("expires cached entries after configured TTL", async () => {
    const workspaceRootPath = await createTempDirectory();
    const filesystem = createFilesystem();

    try {
      const directoryPath = path.join(workspaceRootPath, "items");
      await fs.mkdir(directoryPath, { recursive: true });
      await fs.writeFile(path.join(directoryPath, "alpha.txt"), "a");

      const nextTtl = filesystem.setCacheTtlMs?.(1);
      assert.equal(nextTtl, 1);

      const firstEntries = await filesystem.listDirectory(directoryPath, {
        withFileTypes: true,
      });
      assert.equal(firstEntries?.length, 1);

      await fs.writeFile(path.join(directoryPath, "beta.txt"), "b");
      await wait(10);

      const expiredEntries = await filesystem.listDirectory(directoryPath, {
        withFileTypes: true,
      });
      assert.equal(expiredEntries?.length, 2);
    } finally {
      await fs.rm(workspaceRootPath, { recursive: true, force: true });
    }
  });
});
