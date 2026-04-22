const assert = require("assert");
const {
  deleteWithTrashFallback,
  isPathWithinRoot,
} = require("../../src/runtime/filesystem/workspaceFilesystem");
const {
  getWorkspaceFolders,
  resolveFirstEligibleRootPath,
} = require("../../src/runtime/filesystem/eligibilityResolver");

/**
 * Creates a mock VS Code API object for testing.
 *
 * @param {Object} [options] Optional configuration.
 * @param {import("vscode").WorkspaceFolder[]} [options.workspaceFolders] Workspace folders.
 * @returns {Object} Mock VS Code API.
 */
function createMockVscodeApi(options) {
  return {
    workspace: {
      workspaceFolders: options?.workspaceFolders || null,
      fs: {
        delete: async () => {
          // Default mock - overridden by test
        },
      },
    },
  };
}

/**
 * Creates a mock workspace folder object.
 *
 * @param {string} uri Folder URI.
 * @returns {import("vscode").WorkspaceFolder} Mock folder.
 */
function createMockWorkspaceFolder(uri) {
  return {
    uri: { fsPath: uri },
    name: uri.split("/").pop(),
    index: 0,
  };
}

/**
 * Verifies getWorkspaceFolders returns empty array when workspaceFolders is null.
 *
 * @returns {void}
 */
function testGetWorkspaceFoldersReturnsEmptyWhenUndefined() {
  const mockVscodeApi = createMockVscodeApi({
    workspaceFolders: null,
  });

  const result = getWorkspaceFolders(mockVscodeApi);

  assert.deepStrictEqual(result, []);
}

/**
 * Verifies getWorkspaceFolders returns the workspace folders array.
 *
 * @returns {void}
 */
function testGetWorkspaceFoldersReturnsArray() {
  const folder1 = createMockWorkspaceFolder("/home/user/project1");
  const folder2 = createMockWorkspaceFolder("/home/user/project2");
  const mockVscodeApi = createMockVscodeApi({
    workspaceFolders: [folder1, folder2],
  });

  const result = getWorkspaceFolders(mockVscodeApi);

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0], folder1);
  assert.strictEqual(result[1], folder2);
}

/**
 * Verifies resolveFirstEligibleRootPath returns null when folders array is empty.
 *
 * @returns {void}
 */
function testResolveFirstEligibleRootPathReturnsNullWhenEmpty() {
  const result = resolveFirstEligibleRootPath([]);

  assert.strictEqual(result, null);
}

/**
 * Verifies resolveFirstEligibleRootPath returns null when input is not an array.
 *
 * @returns {void}
 */
function testResolveFirstEligibleRootPathReturnsNullWhenNotArray() {
  const result = resolveFirstEligibleRootPath(null);

  assert.strictEqual(result, null);
}

/**
 * Verifies isPathWithinRoot returns true when candidate is inside root.
 *
 * @returns {void}
 */
function testIsPathWithinRootReturnsTrueWhenInside() {
  const result = isPathWithinRoot(
    "/home/user/project",
    "/home/user/project/src/main.py"
  );

  assert.strictEqual(result, true);
}

/**
 * Verifies isPathWithinRoot returns true when paths are equal (path is its own root).
 *
 * @returns {void}
 */
function testIsPathWithinRootReturnsTrueWhenEqual() {
  const result = isPathWithinRoot(
    "/home/user/project",
    "/home/user/project"
  );

  assert.strictEqual(result, true);
}

/**
 * Verifies isPathWithinRoot returns false when candidate is outside root.
 *
 * @returns {void}
 */
function testIsPathWithinRootReturnsFalseWhenOutside() {
  const result = isPathWithinRoot(
    "/home/user/project",
    "/home/user/other/main.py"
  );

  assert.strictEqual(result, false);
}

/**
 * Verifies isPathWithinRoot returns false when candidate tries to escape via parent (..).
 *
 * @returns {void}
 */
function testIsPathWithinRootReturnsFalseWhenEscaping() {
  const result = isPathWithinRoot(
    "/home/user/project/src",
    "/home/user/project/src/../../etc/passwd"
  );

  assert.strictEqual(result, false);
}

/**
 * Verifies deleteWithTrashFallback returns usedTrash: true on successful trash delete.
 *
 * @returns {Promise<void>}
 */
async function testDeleteWithTrashFallbackReturnsUsedTrashTrue() {
  const mockVscodeApi = createMockVscodeApi();
  mockVscodeApi.workspace.fs.delete = async (uri, options) => {
    if (options?.useTrash === true) {
      // Trash delete succeeds
      return;
    }
    throw new Error("Should not reach direct delete");
  };

  const mockUri = { fsPath: "/home/user/file.txt" };
  const result = await deleteWithTrashFallback(mockVscodeApi, mockUri, false);

  assert.strictEqual(result.usedTrash, true);
}

/**
 * Verifies deleteWithTrashFallback returns usedTrash: false on fallback to direct delete.
 *
 * @returns {Promise<void>}
 */
async function testDeleteWithTrashFallbackFallsBackToDirectDelete() {
  const mockVscodeApi = createMockVscodeApi();
  mockVscodeApi.workspace.fs.delete = async (uri, options) => {
    if (options?.useTrash === true) {
      // Trash delete fails (e.g., trash not available)
      throw new Error("Trash not available");
    }
    if (options?.useTrash === false) {
      // Direct delete succeeds
      return;
    }
  };

  const mockUri = { fsPath: "/home/user/file.txt" };
  const result = await deleteWithTrashFallback(mockVscodeApi, mockUri, false);

  assert.strictEqual(result.usedTrash, false);
}

/**
 * Verifies deleteWithTrashFallback passes recursive option correctly to trash delete.
 *
 * @returns {Promise<void>}
 */
async function testDeleteWithTrashFallbackPassesRecursiveOption() {
  const optionsReceived = {
    forTrash: null,
  };

  const mockVscodeApi = createMockVscodeApi();
  mockVscodeApi.workspace.fs.delete = async (uri, options) => {
    if (options?.useTrash === true) {
      optionsReceived.forTrash = options.recursive;
      return;
    }
    throw new Error("Should use trash");
  };

  const mockUri = { fsPath: "/home/user/dir" };
  await deleteWithTrashFallback(mockVscodeApi, mockUri, true);

  assert.strictEqual(optionsReceived.forTrash, true);
}

/**
 * Verifies deleteWithTrashFallback throws if direct delete also fails.
 *
 * @returns {Promise<void>}
 */
async function testDeleteWithTrashFallbackThrowsWhenBothFail() {
  const mockVscodeApi = createMockVscodeApi();
  mockVscodeApi.workspace.fs.delete = async () => {
    throw new Error("Delete operation not supported");
  };

  const mockUri = { fsPath: "/home/user/file.txt" };

  let thrownError = null;
  try {
    await deleteWithTrashFallback(mockVscodeApi, mockUri, false);
  } catch (error) {
    thrownError = error;
  }

  assert.ok(thrownError instanceof Error);
  assert.ok(String(thrownError.message).includes("Delete operation not supported"));
}

/**
 * Runs all filesystemWorkspaceUtils tests.
 *
 * @returns {void}
 */
function runTests() {
  // Synchronous tests
  testGetWorkspaceFoldersReturnsEmptyWhenUndefined();
  testGetWorkspaceFoldersReturnsArray();
  testResolveFirstEligibleRootPathReturnsNullWhenEmpty();
  testResolveFirstEligibleRootPathReturnsNullWhenNotArray();
  testIsPathWithinRootReturnsTrueWhenInside();
  testIsPathWithinRootReturnsTrueWhenEqual();
  testIsPathWithinRootReturnsFalseWhenOutside();
  testIsPathWithinRootReturnsFalseWhenEscaping();

  // Async tests (must be awaited)
  return Promise.all([
    testDeleteWithTrashFallbackReturnsUsedTrashTrue(),
    testDeleteWithTrashFallbackFallsBackToDirectDelete(),
    testDeleteWithTrashFallbackPassesRecursiveOption(),
    testDeleteWithTrashFallbackThrowsWhenBothFail(),
  ]);
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests,
};
