/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { SmokeHandler } from "../../../src/smoker/smokeHandler";
import type { SmokeControlsState } from "../../../src/smoker";
import type { TrackerSetLanguageRunStatusInput } from "../../../src/tracker";

interface TrackerSink {
  setLanguageRunStatus(input: TrackerSetLanguageRunStatusInput): void;
}

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

function makeRunScriptContent(scriptBody: string): string {
  return [
    "#!/bin/sh",
    "set -eu",
    scriptBody,
    "",
  ].join("\n");
}

describe("SmokeHandler integration", () => {
  let tempRootPath = "";
  let algorithmDirectoryPath = "";
  let runScriptPath = "";
  let trackerEvents: TrackerSetLanguageRunStatusInput[] = [];

  beforeEach(async () => {
    tempRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "smoke-handler-test-"));
    algorithmDirectoryPath = path.join(tempRootPath, "src", "numeric", "max");
    runScriptPath = path.join(tempRootPath, "run.sh");
    trackerEvents = [];

    await fs.mkdir(algorithmDirectoryPath, { recursive: true });
  });

  afterEach(async () => {
    if (tempRootPath.length > 0) {
      await fs.rm(tempRootPath, { recursive: true, force: true });
    }
  });

  it("executes selected languages and publishes pass statuses", async () => {
    await fs.writeFile(runScriptPath, makeRunScriptContent([
      "echo 'SMOKE [1/2] lang=python [RUNNING]'",
      "echo 'SMOKE [1/2] lang=python [PASS]'",
      "echo 'SMOKE [2/2] lang=go [RUNNING]'",
      "echo 'SMOKE [2/2] lang=go [PASS]'",
      "exit 0",
    ].join("\n")), "utf8");

    const tracker: TrackerSink = {
      setLanguageRunStatus: (input) => {
        trackerEvents.push(input);
      },
    };

    const handler = new SmokeHandler(tempRootPath, tracker as never);
    const result = await handler.execute({
      algorithmDirectoryPath,
      smokeControls: createSmokeControls({
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
            selected: true,
            disabled: false,
            disabledReason: "",
            iconUri: "go.svg",
          },
        ],
      }),
      runId: "run-001",
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.exitCode, 0);
    assert.deepStrictEqual(result.selectedLanguageKeys, ["python", "go"]);

    // Ensure streamed status lines produce per-language tracker completion updates.
    const completedEvents = trackerEvents.filter((event) => event.status === "completed");
    assert.strictEqual(completedEvents.some((event) => event.languageKey === "python"), true);
    assert.strictEqual(completedEvents.some((event) => event.languageKey === "go"), true);
  });

  it("normalizes selected language keys and forwards markdown flag", async () => {
    await fs.writeFile(runScriptPath, makeRunScriptContent([
      "echo \"$@\"",
      "exit 0",
    ].join("\n")), "utf8");

    const handler = new SmokeHandler(tempRootPath);
    const result = await handler.execute({
      algorithmDirectoryPath,
      smokeControls: createSmokeControls({
        reportEnabled: true,
        markdownPath: "",
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
            disabled: false,
            disabledReason: "",
            iconUri: "go.svg",
          },
        ],
      }),
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.selectedLanguageKeys.includes("python"), true);
    assert.strictEqual(result.selectedLanguageKeys.includes("go"), true);
    // Preview should include normalized language list and markdown toggle.
    assert.strictEqual(result.commandPreview.includes("--langs="), true);
    assert.strictEqual(result.commandPreview.includes("python go"), true);
    assert.strictEqual(result.commandPreview.includes("--markdown"), true);
  });

  it("returns failed result on non-zero run.sh exit and publishes failed status", async () => {
    await fs.writeFile(runScriptPath, makeRunScriptContent([
      "echo 'SMOKE [1/1] lang=python [RUNNING]'",
      "exit 7",
    ].join("\n")), "utf8");

    const tracker: TrackerSink = {
      setLanguageRunStatus: (input) => {
        trackerEvents.push(input);
      },
    };

    const handler = new SmokeHandler(tempRootPath, tracker as never);
    const result = await handler.execute({
      algorithmDirectoryPath,
      smokeControls: createSmokeControls(),
      runId: "run-002",
    });

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.exitCode, 7);

    const failedEvents = trackerEvents.filter((event) => event.status === "failed");
    assert.strictEqual(failedEvents.some((event) => event.languageKey === "python"), true);
  });

  it("throws when no smoke languages are selected", async () => {
    await fs.writeFile(runScriptPath, makeRunScriptContent("exit 0"), "utf8");

    const handler = new SmokeHandler(tempRootPath);

    await assert.rejects(async () => {
      await handler.execute({
        algorithmDirectoryPath,
        smokeControls: createSmokeControls({
          languages: [
            {
              languageKey: "python",
              label: "Python",
              selected: false,
              disabled: false,
              disabledReason: "",
              iconUri: "python.svg",
            },
          ],
        }),
      });
    }, /Select at least one smoke language/);
  });

  it("throws when algorithm path is not a directory", async () => {
    await fs.writeFile(runScriptPath, makeRunScriptContent("exit 0"), "utf8");

    const filePath = path.join(tempRootPath, "not-a-directory");
    await fs.writeFile(filePath, "hello", "utf8");

    const handler = new SmokeHandler(tempRootPath);

    await assert.rejects(async () => {
      await handler.execute({
        algorithmDirectoryPath: filePath,
        smokeControls: createSmokeControls(),
      });
    }, /Expected a directory path/);
  });
});
