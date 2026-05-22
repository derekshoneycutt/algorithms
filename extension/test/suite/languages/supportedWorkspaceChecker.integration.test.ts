/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";

interface WorkspaceFolderShape {
  uri: {
    fsPath: string;
  };
}

interface SupportedWorkspaceCheckerModule {
  SupportedWorkspaceChecker: {
    isSupported: () => Promise<boolean>;
    getCurrentBaseDirectory: () => Promise<string | undefined>;
    [key: string]: unknown;
  };
}

// Load one fresh module instance with a temporary vscode mock for each scenario.
async function loadWithMockVscode<TModule>(modulePath: string, vscodeMock: unknown): Promise<TModule> {
  const cjsRequire = createRequire(__filename);
  const moduleSystem = cjsRequire("node:module") as {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };

  const originalLoad = moduleSystem._load;
  moduleSystem._load = ((request: string, parent: unknown, isMain: boolean) => {
    if (request === "vscode") {
      return vscodeMock;
    }

    return originalLoad(request, parent, isMain);
  });

  try {
    const resolvedPath = cjsRequire.resolve(modulePath);
    delete cjsRequire.cache[resolvedPath];
    return cjsRequire(modulePath) as TModule;
  }
  finally {
    moduleSystem._load = originalLoad;
  }
}

async function createSupportedRepository(rootPath: string): Promise<void> {
  await fs.mkdir(path.join(rootPath, "src"), { recursive: true });
  await fs.mkdir(path.join(rootPath, "stdlib"), { recursive: true });
  await fs.writeFile(path.join(rootPath, "run.sh"), "#!/bin/sh\n", "utf8");
}

describe("SupportedWorkspaceChecker integration", () => {
  let tempRootPath = "";
  let workspaceFolders: WorkspaceFolderShape[] | undefined;

  beforeEach(async () => {
    tempRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-checker-test-"));
    workspaceFolders = undefined;
  });

  afterEach(async () => {
    if (tempRootPath.length > 0) {
      await fs.rm(tempRootPath, { recursive: true, force: true });
    }
  });

  it("accepts repository root and nested algorithm workspace folders", async () => {
    const repositoryRootPath = path.join(tempRootPath, "algorithms");
    await createSupportedRepository(repositoryRootPath);
    const nestedAlgorithmPath = path.join(repositoryRootPath, "src", "numeric", "max");
    await fs.mkdir(nestedAlgorithmPath, { recursive: true });

    const vscodeMock = {
      workspace: {
        get workspaceFolders(): WorkspaceFolderShape[] | undefined {
          return workspaceFolders;
        },
      },
    };

    const module = await loadWithMockVscode<SupportedWorkspaceCheckerModule>(
      "../../../src/languages/supportedWorkspaceChecker",
      vscodeMock,
    );

    workspaceFolders = [{ uri: { fsPath: repositoryRootPath } }];
    const supportedFromRoot = await module.SupportedWorkspaceChecker.isSupported();
    const baseFromRoot = await module.SupportedWorkspaceChecker.getCurrentBaseDirectory();

    assert.strictEqual(supportedFromRoot, true);
    assert.strictEqual(baseFromRoot, repositoryRootPath);

    // Reset static caches so the nested-path check runs independently.
    (module.SupportedWorkspaceChecker as Record<string, unknown>).cachedWorkspacePath = undefined;
    (module.SupportedWorkspaceChecker as Record<string, unknown>).cachedWorkspaceSignature = undefined;
    (module.SupportedWorkspaceChecker as Record<string, unknown>).cachedIsSupported = undefined;
    (module.SupportedWorkspaceChecker as Record<string, unknown>).cachedBaseDirectory = undefined;

    workspaceFolders = [{ uri: { fsPath: nestedAlgorithmPath } }];
    const supportedFromNested = await module.SupportedWorkspaceChecker.isSupported();
    const baseFromNested = await module.SupportedWorkspaceChecker.getCurrentBaseDirectory();

    assert.strictEqual(supportedFromNested, true);
    assert.strictEqual(baseFromNested, repositoryRootPath);
  });

  it("rejects folders outside a supported repository", async () => {
    const unrelatedPath = path.join(tempRootPath, "unrelated");
    await fs.mkdir(unrelatedPath, { recursive: true });

    const vscodeMock = {
      workspace: {
        get workspaceFolders(): WorkspaceFolderShape[] | undefined {
          return workspaceFolders;
        },
      },
    };

    const module = await loadWithMockVscode<SupportedWorkspaceCheckerModule>(
      "../../../src/languages/supportedWorkspaceChecker",
      vscodeMock,
    );

    workspaceFolders = [{ uri: { fsPath: unrelatedPath } }];

    const supported = await module.SupportedWorkspaceChecker.isSupported();
    const baseDirectory = await module.SupportedWorkspaceChecker.getCurrentBaseDirectory();

    assert.strictEqual(supported, false);
    assert.strictEqual(baseDirectory, undefined);
  });
});
