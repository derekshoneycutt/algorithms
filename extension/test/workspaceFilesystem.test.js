const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  clearFilesystemCache,
  createEmptyFilePath,
  deleteWithTrashFallback,
  ensureDirectoryPath,
  getFilesystemCacheTtlMs,
  isAbsoluteFilesystemPath,
  isDirectoryPath,
  isFilePath,
  isPathWithinRoot,
  readDirectoryEntries,
  readTextFilePath,
  realpathSafe,
  setFilesystemCacheTtlMs,
  statPath,
} = require("../src/runtime/workspaceFilesystem");
const {
  actionCreators,
  extensionStateStore,
  selectFilesystemCacheTtlMs,
  selectFilesystemDirectoryCacheEntry,
  selectFilesystemStatCacheEntry,
} = require("../src/runtime/extensionStateStore");

/**
 * Resets filesystem-specific central store state for isolated tests.
 *
 * @returns {void}
 */
function resetFilesystemStoreState() {
  extensionStateStore.dispatch(actionCreators.setFilesystemCacheTtlMs(2000));
  extensionStateStore.dispatch(actionCreators.clearFilesystemCache());
  extensionStateStore.dispatch(actionCreators.clearFilesystemPendingOperations());
  extensionStateStore.dispatch(actionCreators.clearFilesystemOperationErrors());
}

/**
 * Creates one temporary directory for filesystem primitive tests.
 *
 * @returns {string} Temporary directory path.
 */
function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "algos-workspacefs-"));
}

/**
 * Creates a mock VS Code API object for delete fallback tests.
 *
 * @returns {{workspace: {fs: {delete: (uri: object, options: object) => Promise<void>}}}} Mock API.
 */
function createMockVscodeApi() {
  return {
    workspace: {
      fs: {
        delete: async () => {
          // Overridden in tests.
        },
      },
    },
  };
}

/**
 * Verifies stat and type helpers resolve file and directory metadata.
 *
 * @returns {void}
 */
function testStatAndTypeHelpers() {
  resetFilesystemStoreState();

  const tempDir = createTemporaryDirectory();
  const nestedDir = path.join(tempDir, "nested");
  const filePath = path.join(tempDir, "example.txt");

  fs.mkdirSync(nestedDir, { recursive: true });
  fs.writeFileSync(filePath, "ok", "utf8");

  assert.ok(statPath(tempDir));
  assert.strictEqual(isDirectoryPath(nestedDir), true);
  assert.strictEqual(isFilePath(filePath), true);
  assert.strictEqual(isFilePath(nestedDir), false);
  assert.strictEqual(isDirectoryPath(filePath), false);
  assert.strictEqual(selectFilesystemStatCacheEntry(filePath)?.exists, true);
}

/**
 * Verifies directory reads return dirents and path containment checks work.
 *
 * @returns {void}
 */
function testReadDirectoryAndPathContainment() {
  resetFilesystemStoreState();

  const tempDir = createTemporaryDirectory();
  const childFilePath = path.join(tempDir, "child.js");

  fs.writeFileSync(childFilePath, "", "utf8");

  const entries = readDirectoryEntries(tempDir);
  assert.ok(Array.isArray(entries));
  assert.ok(entries.some((entry) => entry.name === "child.js"));
  assert.strictEqual(
    selectFilesystemDirectoryCacheEntry(path.resolve(tempDir))?.entryCount,
    entries.length
  );

  assert.strictEqual(isPathWithinRoot(tempDir, childFilePath), true);
  assert.strictEqual(isPathWithinRoot(tempDir, path.join(tempDir, "..", "outside.txt")), false);
}

/**
 * Verifies cache controls and realpath fallback behavior are stable.
 *
 * @returns {void}
 */
function testCacheControlsAndRealpathSafe() {
  resetFilesystemStoreState();

  const previousTtl = getFilesystemCacheTtlMs();
  const nextTtl = setFilesystemCacheTtlMs(1234);

  assert.strictEqual(nextTtl, 1234);
  assert.strictEqual(getFilesystemCacheTtlMs(), 1234);
  assert.strictEqual(selectFilesystemCacheTtlMs(), 1234);

  setFilesystemCacheTtlMs(previousTtl);
  clearFilesystemCache();

  const unresolvedPath = path.join(os.tmpdir(), "definitely-non-existent-path", "child");
  assert.strictEqual(realpathSafe(unresolvedPath), path.resolve(unresolvedPath));
}

/**
 * Verifies absolute-path checks are owned by the filesystem module.
 *
 * @returns {void}
 */
function testIsAbsoluteFilesystemPath() {
  assert.strictEqual(isAbsoluteFilesystemPath(""), false);
  assert.strictEqual(isAbsoluteFilesystemPath("relative/path"), false);
  assert.strictEqual(isAbsoluteFilesystemPath(path.join(path.sep, "tmp", "algorithms")), true);
}

/**
 * Verifies ensureDirectoryPath creates nested directories and tracks stat state.
 *
 * @returns {void}
 */
function testEnsureDirectoryPath() {
  resetFilesystemStoreState();

  const tempDir = createTemporaryDirectory();
  const nestedDirectoryPath = path.join(tempDir, "nested", "path");

  ensureDirectoryPath(nestedDirectoryPath, { recursive: true });

  assert.strictEqual(fs.existsSync(nestedDirectoryPath), true);
  assert.strictEqual(selectFilesystemStatCacheEntry(nestedDirectoryPath), null);
}

/**
 * Verifies createEmptyFilePath creates one file and enforces exclusive mode.
 *
 * @returns {void}
 */
function testCreateEmptyFilePath() {
  resetFilesystemStoreState();

  const tempDir = createTemporaryDirectory();
  const targetFilePath = path.join(tempDir, "new", "file.txt");

  createEmptyFilePath(targetFilePath, {
    ensureParentDirectory: true,
    exclusive: true,
  });

  assert.strictEqual(fs.existsSync(targetFilePath), true);

  let threwOnDuplicate = false;

  try {
    createEmptyFilePath(targetFilePath, {
      ensureParentDirectory: false,
      exclusive: true,
    });
  } catch (_error) {
    threwOnDuplicate = true;
  }

  assert.strictEqual(threwOnDuplicate, true);
}

/**
 * Verifies readTextFilePath returns file content and null for missing paths.
 *
 * @returns {void}
 */
function testReadTextFilePath() {
  const tempDir = createTemporaryDirectory();
  const filePath = path.join(tempDir, "content.txt");

  fs.writeFileSync(filePath, "hello", "utf8");

  assert.strictEqual(readTextFilePath(filePath, { encoding: "utf8" }), "hello");
  assert.strictEqual(readTextFilePath(path.join(tempDir, "missing.txt")), null);
}

/**
 * Verifies delete fallback uses trash first and falls back to direct delete.
 *
 * @returns {Promise<void>}
 */
async function testDeleteWithTrashFallback() {
  resetFilesystemStoreState();

  const mockVscodeApi = createMockVscodeApi();
  let deleteCallCount = 0;

  mockVscodeApi.workspace.fs.delete = async (_uri, options) => {
    deleteCallCount += 1;

    if (options?.useTrash === true) {
      throw new Error("Trash unavailable");
    }
  };

  const result = await deleteWithTrashFallback(
    mockVscodeApi,
    { fsPath: "/tmp/target" },
    true
  );

  assert.strictEqual(deleteCallCount, 2);
  assert.strictEqual(result.usedTrash, false);
  assert.strictEqual(
    extensionStateStore.getState().filesystem.pendingOperationById.size,
    0
  );
}

/**
 * Runs all workspace filesystem tests.
 *
 * @returns {Promise<void>} Resolves when all async tests complete.
 */
async function runTests() {
  testStatAndTypeHelpers();
  testReadDirectoryAndPathContainment();
  testCacheControlsAndRealpathSafe();
  testIsAbsoluteFilesystemPath();
  testEnsureDirectoryPath();
  testCreateEmptyFilePath();
  testReadTextFilePath();
  await testDeleteWithTrashFallback();
}

module.exports = {
  runTests,
};