/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import { createRequire } from "node:module";

interface RunOptionsStateShape {
  runArgsEnabled: boolean;
  runArgsText: string;
  sourceProfileEnabled: boolean;
  sourceProfileText: string;
  runChecksMode: "none" | "compile-only" | "check-only";
  runChecksRoute: "native" | "docker" | "ssh";
  cleanStdlibEnabled: boolean;
  cleanArchivesEnabled: boolean;
}

// Load one fresh module instance with a temporary vscode mock for each suite.
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

describe("RunHandler edge/unit", () => {
  const vscodeMock = {
    window: {
      createTerminal: () => {
        return {
          exitStatus: undefined,
          show: () => undefined,
          sendText: () => undefined,
        };
      },
      onDidChangeTerminalShellIntegration: () => ({ dispose: () => undefined }),
      onDidEndTerminalShellExecution: () => ({ dispose: () => undefined }),
    },
  };

  let runHandlerModule: {
    RunHandler: new (repositoryRoot: string, tracker?: unknown) => unknown;
  };

  before(async () => {
    runHandlerModule = await loadWithMockVscode<{
      RunHandler: new (repositoryRoot: string, tracker?: unknown) => unknown;
    }>("../../../src/runner/runHandler", vscodeMock);
  });

  it("parseRunArgumentsText handles quoted tokens and escapes", () => {
    const handler = new runHandlerModule.RunHandler("/tmp") as {
      parseRunArgumentsText: (rawText: string) => {
        ok: boolean;
        tokens: string[];
        reason: string | null;
      };
    };

    const parsed = handler.parseRunArgumentsText("--foo='bar baz' --path=\"a b\" plain");
    assert.strictEqual(parsed.ok, true);
    assert.deepStrictEqual(parsed.tokens, ["--foo=bar baz", "--path=a b", "plain"]);

    // Parser should fail fast on dangling escape/quote state.
    const unfinishedEscape = handler.parseRunArgumentsText("abc\\");
    assert.strictEqual(unfinishedEscape.ok, false);
    assert.strictEqual(unfinishedEscape.reason, "Run args end with an unfinished escape (\\).");

    const unclosedQuote = handler.parseRunArgumentsText("'abc");
    assert.strictEqual(unclosedQuote.ok, false);
    assert.strictEqual(unclosedQuote.reason, "Run args contain an unclosed quote.");
  });

  it("buildRunOptionTokens maps action kinds and run-check modes", () => {
    const handler = new runHandlerModule.RunHandler("/tmp") as {
      buildRunOptionTokens: (
        runOptions: RunOptionsStateShape,
        actionKind: "run-file" | "compile-only" | "check-only" | "clean" | "localclean",
        checkOnlyRouteOverride?: "native" | "docker" | "ssh",
      ) => {
        preTargetOptionTokens: string[];
        postTargetOptionTokens: string[];
      };
    };

    const baseOptions: RunOptionsStateShape = {
      runArgsEnabled: false,
      runArgsText: "",
      sourceProfileEnabled: true,
      sourceProfileText: "~/.bash_profile",
      runChecksMode: "check-only",
      runChecksRoute: "docker",
      cleanStdlibEnabled: true,
      cleanArchivesEnabled: false,
    };

    const compileOnly = handler.buildRunOptionTokens(baseOptions, "compile-only");
    assert.deepStrictEqual(compileOnly.preTargetOptionTokens, [
      "--source-profile=~/.bash_profile",
      "--compile-only",
    ]);

    const checkOnly = handler.buildRunOptionTokens(baseOptions, "check-only", "ssh");
    assert.deepStrictEqual(checkOnly.preTargetOptionTokens, [
      "--source-profile=~/.bash_profile",
      "--check-only=ssh",
    ]);

    const clean = handler.buildRunOptionTokens(baseOptions, "clean");
    assert.deepStrictEqual(clean.postTargetOptionTokens, ["--defaults=y|n"]);

    const runFile = handler.buildRunOptionTokens(baseOptions, "run-file");
    assert.deepStrictEqual(runFile.preTargetOptionTokens, [
      "--source-profile=~/.bash_profile",
      "--check-only=docker",
    ]);
  });

  it("composeRunTokens preserves canonical option-target-passthrough ordering", () => {
    const handler = new runHandlerModule.RunHandler("/tmp") as {
      composeRunTokens: (
        preTargetOptionTokens: string[],
        targetToken: string | undefined,
        postTargetOptionTokens: string[],
        passthroughTokens: string[],
      ) => string[];
      buildTerminalRunCommand: (preparedExecution: {
        algorithmDirectoryPath: string;
        runScriptPath: string;
        preTargetOptionTokens: string[];
        postTargetOptionTokens: string[];
        passthroughTokens: string[];
        targetToken: string | undefined;
      }) => string;
    };

    // Canonical ordering prevents accidental argument reshuffling.
    const tokens = handler.composeRunTokens(
      ["--source-profile=~/.bash_profile", "--compile-only"],
      "python",
      ["--defaults=y|n"],
      ["arg1", "arg two"],
    );

    assert.deepStrictEqual(tokens, [
      "--source-profile=~/.bash_profile",
      "--compile-only",
      "python",
      "--defaults=y|n",
      "arg1",
      "arg two",
    ]);

    const command = handler.buildTerminalRunCommand({
      algorithmDirectoryPath: "/tmp/my algo",
      runScriptPath: "/tmp/repo/run.sh",
      preTargetOptionTokens: ["--check-only=docker"],
      postTargetOptionTokens: [],
      passthroughTokens: ["hello world"],
      targetToken: "python",
    });

    assert.strictEqual(command.includes("cd '/tmp/my algo' && /tmp/repo/run.sh --check-only=docker python 'hello world'"), true);
  });

  it("quoteTokenForShell quotes only when needed", () => {
    const handler = new runHandlerModule.RunHandler("/tmp") as {
      quoteTokenForShell: (token: string) => string;
    };

    assert.strictEqual(handler.quoteTokenForShell("abc-123_/=.:@"), "abc-123_/=.:@");
    assert.strictEqual(handler.quoteTokenForShell("with space"), "'with space'");
    assert.strictEqual(handler.quoteTokenForShell("it's"), "'it'\\''s'");
  });
});
