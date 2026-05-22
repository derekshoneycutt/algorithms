/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
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

interface SmokeStateShape {
  reportEnabled: boolean;
  markdownPath: string;
  timeoutSeconds: string;
  slowTimeoutSeconds: string;
  languages: Array<{
    languageKey: string;
    label: string;
    selected: boolean;
    disabled: boolean;
    disabledReason: string;
    iconUri: string;
  }>;
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

describe("Webview provider patch sanitization", () => {
  const vscodeMock = {
    Uri: {
      joinPath: (...segments: unknown[]) => ({
        fsPath: segments.map((segment) => String(segment)).join("/"),
        toString: () => segments.map((segment) => String(segment)).join("/"),
      }),
    },
    workspace: {
      fs: {
        readFile: async () => new Uint8Array(),
      },
    },
    window: {
      registerWebviewViewProvider: () => ({ dispose: () => undefined }),
    },
  };

  it("environment provider keeps authoritative language metadata while applying editable routing fields", async () => {
    const module = await loadWithMockVscode<{
      EnvironmentWebviewProvider: new (extensionUri: unknown, environment: {
        getEnvironmentControlsState: () => EnvironmentStateShape;
      }) => unknown;
    }>("../../../src/views/environment/environmentWebviewProvider", vscodeMock);

    const currentState: EnvironmentStateShape = {
      editModeEnabled: true,
      persistSessionEnabled: true,
      profilePath: "",
      profilePlaceholder: "~/.bash_profile",
      effectiveProfilePath: "/home/user/.bash_profile",
      checkEnvFilteredOutput: "",
      checkEnvRawOutput: "",
      copyIconsPath: "",
      variables: [{ key: "timeout", label: "TIMEOUT", value: "5" }],
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

    const provider = new module.EnvironmentWebviewProvider({}, {
      getEnvironmentControlsState: () => currentState,
    }) as {
      toEnvironmentControlsPatch: (statePayload: unknown) => EnvironmentStateShape | undefined;
    };

    const patch = provider.toEnvironmentControlsPatch({
      routingEntries: [
        {
          languageKey: "python",
          label: "Hacked Label",
          iconUri: "hacked.svg",
          dockerEnabled: true,
          dockerValue: "code-runner",
          sshEnabled: true,
          sshValue: "vm|/code|run.sh",
          isConflict: false,
        },
      ],
      batchRouting: {
        dockerEnabled: true,
        dockerValue: "code-runner",
        sshEnabled: false,
        sshValue: "",
        isConflict: false,
      },
    });

    assert.notStrictEqual(patch, undefined);
    // Label/icon are host-authoritative and must not be overridden by webview payloads.
    assert.strictEqual(patch?.routingEntries[0].label, "Python");
    assert.strictEqual(patch?.routingEntries[0].iconUri, "python.svg");
    assert.strictEqual(patch?.routingEntries[0].dockerEnabled, true);
    assert.strictEqual(patch?.routingEntries[0].dockerValue, "code-runner");
    assert.strictEqual(patch?.routingEntries[0].sshEnabled, true);
    assert.strictEqual(patch?.routingEntries[0].isConflict, true);
  });

  it("smoke provider patch updates only selected flags and preserves language metadata", async () => {
    const module = await loadWithMockVscode<{
      SmokeWebviewProvider: new (extensionUri: unknown, smoker: {
        getSmokeControlsState: () => SmokeStateShape;
      }) => unknown;
    }>("../../../src/views/smoke/smokeWebviewProvider", vscodeMock);

    const currentState: SmokeStateShape = {
      reportEnabled: false,
      markdownPath: "",
      timeoutSeconds: "20",
      slowTimeoutSeconds: "30",
      languages: [
        {
          languageKey: "python",
          label: "Python",
          selected: false,
          disabled: false,
          disabledReason: "",
          iconUri: "python.svg",
        },
        {
          languageKey: "go",
          label: "Go",
          selected: true,
          disabled: true,
          disabledReason: "Unsupported",
          iconUri: "go.svg",
        },
      ],
    };

    const provider = new module.SmokeWebviewProvider({}, {
      getSmokeControlsState: () => currentState,
    }) as {
      toSmokeControlsPatch: (statePayload: unknown) => SmokeStateShape | undefined;
    };

    const patch = provider.toSmokeControlsPatch({
      reportEnabled: true,
      markdownPath: "./report.md",
      timeoutSeconds: "99",
      slowTimeoutSeconds: "120",
      languages: [
        {
          languageKey: "python",
          selected: true,
        },
      ],
    });

    assert.notStrictEqual(patch, undefined);
    assert.strictEqual(patch?.reportEnabled, true);
    assert.strictEqual(patch?.markdownPath, "./report.md");
    assert.strictEqual(patch?.timeoutSeconds, "99");
    assert.strictEqual(patch?.languages[0].label, "Python");
    assert.strictEqual(patch?.languages[0].selected, true);
    // Only selection should change from payload; metadata should remain intact.
    assert.strictEqual(patch?.languages[1].label, "Go");
    assert.strictEqual(patch?.languages[1].selected, true);
    assert.strictEqual(patch?.languages[1].disabled, true);
  });
});
