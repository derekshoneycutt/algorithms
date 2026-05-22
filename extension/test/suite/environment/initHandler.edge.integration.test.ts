/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { InitHandler } from "../../../src/environment/initHandler";

// Compose tiny one-off init.sh scripts to drive deterministic integration cases.
function makeInitScriptContent(scriptBody: string): string {
  return [
    "#!/bin/sh",
    "set -eu",
    scriptBody,
    "",
  ].join("\n");
}

describe("InitHandler edge integration", () => {
  let tempRootPath = "";

  beforeEach(async () => {
    tempRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "init-handler-edge-test-"));
  });

  afterEach(async () => {
    if (tempRootPath.length > 0) {
      await fs.rm(tempRootPath, { recursive: true, force: true });
    }
  });

  it("returns timeout error text when init.sh exceeds timeout", async () => {
    const initScriptPath = path.join(tempRootPath, "init.sh");
    await fs.writeFile(initScriptPath, makeInitScriptContent([
      "sleep 1",
      "echo 'late output'",
      "exit 0",
    ].join("\n")), "utf8");

    const handler = new InitHandler(tempRootPath);
    const result = await handler.checkEnvironment({ timeoutMs: 10 });

    assert.strictEqual(result.kind, "error");
    assert.strictEqual(result.text, "Environment check timed out.");
  });

  it("falls back to trailing lines when filtered output has no error keywords", async () => {
    const initScriptPath = path.join(tempRootPath, "init.sh");
    const outputLines: string[] = [];
    for (let lineNumber = 1; lineNumber <= 60; lineNumber += 1) {
      outputLines.push(`line-${lineNumber}`);
    }

    await fs.writeFile(initScriptPath, makeInitScriptContent([
      ...outputLines.map((line) => `echo '${line}'`),
      "exit 0",
    ].join("\n")), "utf8");

    const handler = new InitHandler(tempRootPath);
    const result = await handler.checkEnvironment();

    assert.strictEqual(result.kind, "ok");
    assert.strictEqual(result.filteredOutput.includes("line-60"), true);
    // The fallback path keeps only the tail of large output blobs.
    assert.strictEqual(result.filteredOutput.includes("line-1"), false);
  });

  it("omits optional args when profile and copy path are blank", async () => {
    const initScriptPath = path.join(tempRootPath, "init.sh");
    await fs.writeFile(initScriptPath, makeInitScriptContent([
      "echo \"$@\"",
      "exit 0",
    ].join("\n")), "utf8");

    const handler = new InitHandler(tempRootPath);
    const result = await handler.copyIcons({
      copyIconsPath: "   ",
    });

    assert.strictEqual(result.kind, "ok");
    assert.strictEqual(result.rawOutput.includes("--copy-icons"), true);
    assert.strictEqual(result.rawOutput.includes("--skip-environment"), true);
    assert.strictEqual(result.rawOutput.includes("--update-profile="), false);
    assert.strictEqual(result.rawOutput.includes("--icons-to="), false);
  });
});
