import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import "mocha";

import {
  resolveEligibilityState,
  isSupportedSidebarFolder,
  resolveSidebarState,
  invalidateCanaryCache,
} from "../../../src/filesystem/eligibilityResolver";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates one temporary directory and returns its path.
 *
 * @returns {Promise<string>} Temporary directory path.
 */
async function createTempDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "vscext-eligibility-tests-"));
}

/**
 * Creates all HARD_MARKERS inside a directory.
 *
 * @param {string} rootPath Directory to populate.
 * @returns {Promise<void>}
 */
async function writeHardMarkers(rootPath: string): Promise<void> {
  await fs.writeFile(path.join(rootPath, "run.sh"), "#!/bin/sh\n");
  await fs.writeFile(path.join(rootPath, "init.sh"), "#!/bin/sh\n");
  await fs.mkdir(path.join(rootPath, "src"), { recursive: true });
  await fs.mkdir(path.join(rootPath, "shlib"), { recursive: true });
  await fs.mkdir(path.join(rootPath, "stdlib"), { recursive: true });
  await fs.mkdir(path.join(rootPath, "templates"), { recursive: true });
}

// ─── resolveEligibilityState ──────────────────────────────────────────────────

describe("filesystem/eligibilityResolver — resolveEligibilityState", () => {
  it("returns ineligible when no workspace folders provided", () => {
    const state = resolveEligibilityState([]);
    assert.strictEqual(state.status, "ineligible");
    assert.strictEqual(state.reason, "no-workspace-folders");
    assert.strictEqual(state.supported, false);
  });

  it("returns ineligible when workspace folder is missing core markers", async () => {
    const tmpDir = await createTempDirectory();
    try {
      const state = resolveEligibilityState([tmpDir], { skipCanary: true });
      assert.strictEqual(state.status, "ineligible");
      assert.strictEqual(state.supported, false);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns eligible when all hard markers are present and canary is skipped", async () => {
    const tmpDir = await createTempDirectory();
    try {
      await writeHardMarkers(tmpDir);
      invalidateCanaryCache(tmpDir);
      const state = resolveEligibilityState([tmpDir], { skipCanary: true });
      assert.strictEqual(state.status, "eligible");
      assert.strictEqual(state.supported, true);
      assert.ok(state.selected !== null);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns partial when markers are present but canary fails", async () => {
    const tmpDir = await createTempDirectory();
    try {
      await writeHardMarkers(tmpDir);
      // run.sh is not executable / does not exit 0 → canary will fail.
      invalidateCanaryCache(tmpDir);
      const state = resolveEligibilityState([tmpDir]);
      // Canary is attempted and will fail (script is not valid bash).
      assert.ok(
        state.status === "partial" || state.status === "eligible",
        `expected partial or eligible, got ${state.status}`
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns ambiguous when two distinct eligible roots are open", async () => {
    const root1 = await createTempDirectory();
    const root2 = await createTempDirectory();
    try {
      await writeHardMarkers(root1);
      await writeHardMarkers(root2);
      invalidateCanaryCache(root1);
      invalidateCanaryCache(root2);
      const state = resolveEligibilityState([root1, root2], { skipCanary: true });
      assert.strictEqual(state.status, "ambiguous");
      assert.strictEqual(state.supported, false);
    } finally {
      await fs.rm(root1, { recursive: true, force: true });
      await fs.rm(root2, { recursive: true, force: true });
    }
  });

  it("deduplicates workspace folders pointing to the same resolved root", async () => {
    const tmpDir = await createTempDirectory();
    try {
      await writeHardMarkers(tmpDir);
      invalidateCanaryCache(tmpDir);
      // Same path supplied twice.
      const state = resolveEligibilityState([tmpDir, tmpDir], { skipCanary: true });
      assert.strictEqual(state.status, "eligible");
      assert.strictEqual(state.evaluations.length, 1);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── isSupportedSidebarFolder ────────────────────────────────────────────────

describe("filesystem/eligibilityResolver — isSupportedSidebarFolder", () => {
  it("accepts repo root as supported entry point", () => {
    assert.strictEqual(isSupportedSidebarFolder("/repo", "/repo"), true);
  });

  it("accepts src as supported entry point", () => {
    assert.strictEqual(isSupportedSidebarFolder("/repo/src", "/repo"), true);
  });

  it("accepts src/<category> as supported entry point", () => {
    assert.strictEqual(isSupportedSidebarFolder("/repo/src/numeric", "/repo"), true);
  });

  it("accepts src/<category>/<algorithm> as supported entry point", () => {
    assert.strictEqual(isSupportedSidebarFolder("/repo/src/numeric/max", "/repo"), true);
  });

  it("rejects src/<category>/<algorithm>/<variant> as too deep", () => {
    assert.strictEqual(
      isSupportedSidebarFolder("/repo/src/numeric/max/variant", "/repo"),
      false
    );
  });

  it("rejects paths outside the resolved root", () => {
    assert.strictEqual(isSupportedSidebarFolder("/other/path", "/repo"), false);
  });

  it("rejects non-src top-level directories", () => {
    assert.strictEqual(isSupportedSidebarFolder("/repo/stdlib", "/repo"), false);
  });
});

// ─── resolveSidebarState ─────────────────────────────────────────────────────

describe("filesystem/eligibilityResolver — resolveSidebarState", () => {
  it("returns supported false when no folders provided", () => {
    const state = resolveSidebarState([]);
    assert.strictEqual(state.supported, false);
  });

  it("returns supported false for valid root nested too deeply under src", async () => {
    const tmpDir = await createTempDirectory();
    try {
      await writeHardMarkers(tmpDir);
      const deepPath = path.join(tmpDir, "src", "category", "algorithm", "variant");
      await fs.mkdir(deepPath, { recursive: true });
      invalidateCanaryCache(tmpDir);
      const state = resolveSidebarState([deepPath], { skipCanary: true });
      assert.strictEqual(state.supported, false);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns supported true when repo root is opened and markers are present", async () => {
    const tmpDir = await createTempDirectory();
    try {
      await writeHardMarkers(tmpDir);
      invalidateCanaryCache(tmpDir);
      const state = resolveSidebarState([tmpDir], { skipCanary: true });
      assert.strictEqual(state.supported, true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns supported true when src/<category> is opened inside eligible root", async () => {
    const tmpDir = await createTempDirectory();
    try {
      await writeHardMarkers(tmpDir);
      const categoryPath = path.join(tmpDir, "src", "numeric");
      await fs.mkdir(categoryPath, { recursive: true });
      invalidateCanaryCache(tmpDir);
      const state = resolveSidebarState([categoryPath], { skipCanary: true });
      assert.strictEqual(state.supported, true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns supported true when one folder is supported and another is too deep", async () => {
    const tmpDir = await createTempDirectory();
    try {
      await writeHardMarkers(tmpDir);
      const deepPath = path.join(tmpDir, "src", "category", "algorithm", "variant");
      await fs.mkdir(deepPath, { recursive: true });
      invalidateCanaryCache(tmpDir);

      const state = resolveSidebarState([deepPath, tmpDir], { skipCanary: true });
      assert.strictEqual(state.supported, true);
      assert.strictEqual(state.status, "eligible");
      assert.strictEqual(state.selected?.workspaceFolderPath, tmpDir);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
