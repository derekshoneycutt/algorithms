/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";

import { SmokeHandler } from "../../../src/smoker/smokeHandler";
import type { SmokeControlsState } from "../../../src/smoker";

// Build baseline controls and override only fields relevant to each case.
function createSmokeControls(overrides?: Partial<SmokeControlsState>): SmokeControlsState {
  return {
    reportEnabled: false,
    markdownPath: "",
    timeoutSeconds: "20",
    slowTimeoutSeconds: "30",
    languages: [
      {
        languageKey: "python",
        label: "Python",
        selected: true,
        disabled: false,
        disabledReason: "",
        iconUri: "python.svg",
      },
      {
        languageKey: "go",
        label: "Go",
        selected: false,
        disabled: false,
        disabledReason: "",
        iconUri: "go.svg",
      },
    ],
    ...overrides,
  };
}

describe("SmokeHandler edge/unit", () => {
  it("parseSmokeStatusLine handles ansi and status token variants", () => {
    // Probe parser internals directly to lock down token mapping behavior.
    const handler = new SmokeHandler("/tmp") as unknown as {
      parseSmokeStatusLine: (line: string) => { languageKey: string; status: string } | undefined;
    };

    const running = handler.parseSmokeStatusLine("\u001b[32mSMOKE [1/2] lang=PyThOn [RUNNING]\u001b[0m");
    const pass = handler.parseSmokeStatusLine("SMOKE [1/2] lang=python PASS");
    const fail = handler.parseSmokeStatusLine("SMOKE [1/2] lang=python [FAIL]");
    const timeout = handler.parseSmokeStatusLine("SMOKE [1/2] lang=python TIMEOUT");
    const invalid = handler.parseSmokeStatusLine("hello world");

    assert.deepStrictEqual(running, { languageKey: "python", status: "running" });
    assert.deepStrictEqual(pass, { languageKey: "python", status: "completed" });
    assert.deepStrictEqual(fail, { languageKey: "python", status: "failed" });
    assert.deepStrictEqual(timeout, { languageKey: "python", status: "failed" });
    assert.strictEqual(invalid, undefined);
  });

  it("buildSmokeProcessArgs emits markdown flag with and without explicit path", () => {
    const handler = new SmokeHandler("/tmp") as unknown as {
      buildSmokeProcessArgs: (smokeControls: SmokeControlsState, selectedLanguageKeys: string[]) => string[];
    };

    const withoutPathArgs = handler.buildSmokeProcessArgs(
      createSmokeControls({ reportEnabled: true, markdownPath: "" }),
      ["python"],
    );
    const withPathArgs = handler.buildSmokeProcessArgs(
      createSmokeControls({ reportEnabled: true, markdownPath: "./report.md" }),
      ["python"],
    );

    assert.strictEqual(withoutPathArgs.includes("--markdown"), true);
    assert.strictEqual(withoutPathArgs.some((token) => token.startsWith("--markdown=")), false);

    assert.strictEqual(withPathArgs.includes("--markdown=./report.md"), true);
    assert.strictEqual(withPathArgs.includes("--timeout=20"), true);
    assert.strictEqual(withPathArgs.includes("--slow-timeout=30"), true);
    assert.strictEqual(withPathArgs.includes("--langs=python"), true);
  });

  it("quoteTokenForShell quotes tokens with spaces and apostrophes", () => {
    const handler = new SmokeHandler("/tmp") as unknown as {
      quoteTokenForShell: (token: string) => string;
    };

    assert.strictEqual(handler.quoteTokenForShell("plain-token"), "plain-token");
    assert.strictEqual(handler.quoteTokenForShell("has space"), "'has space'");
    assert.strictEqual(handler.quoteTokenForShell("it's"), "'it'\\''s'");
  });

  it("resolveSelectedLanguageKeys normalizes keys and excludes disabled/unselected", () => {
    const handler = new SmokeHandler("/tmp") as unknown as {
      resolveSelectedLanguageKeys: (smokeControls: SmokeControlsState) => string[];
    };

    const selectedLanguageKeys = handler.resolveSelectedLanguageKeys(
      createSmokeControls({
        languages: [
          {
            languageKey: " Python ",
            label: "Python",
            selected: true,
            disabled: false,
            disabledReason: "",
            iconUri: "python.svg",
          },
          {
            languageKey: " Go ",
            label: "Go",
            selected: true,
            disabled: true,
            disabledReason: "Unsupported",
            iconUri: "go.svg",
          },
          {
            languageKey: "  ",
            label: "Bad",
            selected: true,
            disabled: false,
            disabledReason: "",
            iconUri: "bad.svg",
          },
        ],
      }),
    );

    assert.deepStrictEqual(selectedLanguageKeys, ["python"]);
  });
});
