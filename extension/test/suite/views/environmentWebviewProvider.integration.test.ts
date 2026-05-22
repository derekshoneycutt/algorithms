/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createRequire } from "node:module";

interface EnvironmentStateShape {
  editModeEnabled: boolean;
  persistSessionEnabled: boolean;
  profilePath: string;
  profilePlaceholder: string;
  effectiveProfilePath: string;
  checkEnvFilteredOutput: string;
  checkEnvRawOutput: string;
  copyIconsPath: string;
  variables: Array<{ key: string; label: string; value: string }>;
  batchRouting: {
    dockerEnabled: boolean;
    dockerValue: string;
    sshEnabled: boolean;
    sshValue: string;
    isConflict: boolean;
  };
  routingEntries: Array<{
    languageKey: string;
    label: string;
    iconUri: string;
    dockerEnabled: boolean;
    dockerValue: string;
    sshEnabled: boolean;
    sshValue: string;
    isConflict: boolean;
  }>;
}

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

describe("EnvironmentWebviewProvider integration", () => {
  const extensionRootPath = path.resolve(__dirname, "../../../..");
  let updateCallback: ((message: { type?: string; state?: unknown }) => void) | undefined;
  let disposeCallback: (() => void) | undefined;
  let postedMessages: unknown[];
  let htmlText = "";
  let resolveCount = 0;
  let runCheckEnvironmentCalls = 0;
  let runCopyIconsCalls = 0;
  let patchEnvironmentControlsCalls: unknown[];

  beforeEach(() => {
    updateCallback = undefined;
    disposeCallback = undefined;
    postedMessages = [];
    htmlText = "";
    resolveCount = 0;
    runCheckEnvironmentCalls = 0;
    runCopyIconsCalls = 0;
    patchEnvironmentControlsCalls = [];
  });

  it("loads the environment webview HTML and wires ready, command, patch, and dispose flows", async () => {
    const currentState: EnvironmentStateShape = {
      editModeEnabled: true,
      persistSessionEnabled: true,
      profilePath: "/tmp/profile",
      profilePlaceholder: "~/.bash_profile",
      effectiveProfilePath: "/tmp/profile",
      checkEnvFilteredOutput: "cached filtered output",
      checkEnvRawOutput: "cached raw output",
      copyIconsPath: "/tmp/icons",
      variables: [
        { key: "timeout", label: "TIMEOUT", value: "8m" },
      ],
      batchRouting: {
        dockerEnabled: false,
        dockerValue: "",
        sshEnabled: false,
        sshValue: "",
        isConflict: false,
      },
      routingEntries: [
        {
          languageKey: "python",
          label: "Python",
          iconUri: "python.svg",
          dockerEnabled: false,
          dockerValue: "",
          sshEnabled: false,
          sshValue: "",
          isConflict: false,
        },
      ],
    };

    const vscodeMock = {
      Uri: {
        joinPath: (...segments: unknown[]) => ({
          fsPath: segments.map((segment, index) => {
            if (index === 0 && segment && typeof segment === "object" && "fsPath" in segment) {
              return String((segment as { fsPath: string }).fsPath);
            }

            return String(segment);
          }).join(path.sep),
          toString: () => segments.map((segment, index) => {
            if (index === 0 && segment && typeof segment === "object" && "fsPath" in segment) {
              return String((segment as { fsPath: string }).fsPath);
            }

            return String(segment);
          }).join(path.sep),
        }),
      },
      workspace: {
        fs: {
          readFile: async (uri: { fsPath: string }) => {
            return await fs.readFile(uri.fsPath);
          },
        },
      },
      window: {
        registerWebviewViewProvider: () => ({ dispose: () => undefined }),
      },
    };

    const module = await loadWithMockVscode<{
      EnvironmentWebviewProvider: new (extensionUri: { fsPath: string }, environment: {
        getEnvironmentControlsState: () => EnvironmentStateShape;
        runCheckEnvironment: () => Promise<void>;
        runCopyIcons: () => Promise<void>;
        patchEnvironmentControls: (patch: unknown) => void;
      }) => {
        resolveWebviewView: (webviewView: unknown) => Promise<void>;
        postEnvironmentControlsState: (state: EnvironmentStateShape) => void;
      };
    }>("../../../src/views/environment/environmentWebviewProvider", vscodeMock);

    const provider = new module.EnvironmentWebviewProvider({ fsPath: extensionRootPath }, {
      getEnvironmentControlsState: () => currentState,
      runCheckEnvironment: async () => {
        runCheckEnvironmentCalls += 1;
      },
      runCopyIcons: async () => {
        runCopyIconsCalls += 1;
      },
      patchEnvironmentControls: (patch) => {
        patchEnvironmentControlsCalls.push(patch);
      },
    });

    const webview = {
      options: undefined as unknown,
      html: "",
      asWebviewUri: (uri: { fsPath: string }) => ({
        toString: () => `webview://${uri.fsPath}`,
      }),
      onDidReceiveMessage: (listener: (message: { type?: string; state?: unknown }) => void) => {
        updateCallback = listener;
        return { dispose: () => undefined };
      },
      postMessage: async (message: unknown) => {
        postedMessages.push(message);
        return true;
      },
    };

    const webviewView = {
      webview,
      onDidDispose: (listener: () => void) => {
        disposeCallback = listener;
      },
    };

    await provider.resolveWebviewView(webviewView);
    htmlText = webview.html;
    resolveCount += 1;

    assert.strictEqual(resolveCount, 1);
    assert.ok(htmlText.includes("<title>Environment</title>"));
    assert.ok(htmlText.includes("webview://"));
    assert.ok(htmlText.includes("environment-controls-app"));

    updateCallback?.({ type: "environment-webview-ready" });
    assert.strictEqual(postedMessages.length, 1);
    assert.strictEqual((postedMessages[0] as { type: string }).type, "environment-controls-state");

    updateCallback?.({ type: "environment-run-check-environment" });
    updateCallback?.({ type: "environment-run-copy-icons" });
    assert.strictEqual(runCheckEnvironmentCalls, 1);
    assert.strictEqual(runCopyIconsCalls, 1);

    updateCallback?.({
      type: "environment-controls-update",
      state: {
        routingEntries: [
          {
            languageKey: "python",
            label: "Hijacked",
            iconUri: "hijacked.svg",
            dockerEnabled: true,
            dockerValue: "docker-run",
            sshEnabled: true,
            sshValue: "ssh-run",
            isConflict: false,
          },
        ],
        batchRouting: {
          dockerEnabled: true,
          dockerValue: "docker-batch",
          sshEnabled: false,
          sshValue: "",
          isConflict: false,
        },
      },
    });

    assert.strictEqual(patchEnvironmentControlsCalls.length, 1);
    const patch = patchEnvironmentControlsCalls[0] as EnvironmentStateShape;
    assert.strictEqual(patch.routingEntries[0].label, "Python");
    assert.strictEqual(patch.routingEntries[0].iconUri, "python.svg");
    assert.strictEqual(patch.routingEntries[0].isConflict, true);
    assert.strictEqual(patch.batchRouting.dockerEnabled, true);
    assert.strictEqual(patch.batchRouting.sshEnabled, false);
    assert.strictEqual(patch.batchRouting.isConflict, false);

    disposeCallback?.();
    provider.postEnvironmentControlsState(currentState);
    assert.strictEqual(postedMessages.length, 1);
  });
});
