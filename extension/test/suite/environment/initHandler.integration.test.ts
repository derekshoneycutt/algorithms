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

describe("InitHandler integration", () => {
  let tempRootPath = "";

  beforeEach(async () => {
    tempRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "init-handler-test-"));
  });

  afterEach(async () => {
    if (tempRootPath.length > 0) {
      await fs.rm(tempRootPath, { recursive: true, force: true });
    }
  });

  it("checkEnvironment succeeds and returns filtered issue lines", async () => {
    const initScriptPath = path.join(tempRootPath, "init.sh");
    await fs.writeFile(initScriptPath, makeInitScriptContent([
      "echo 'CHECK: OK'",
      "echo 'missing: gcc-13'",
      "echo 'note: keep going'",
      "exit 0",
    ].join("\n")), "utf8");

    const handler = new InitHandler(tempRootPath);
    const result = await handler.checkEnvironment({
      profilePath: " ~/.bash_profile ",
    });

    assert.strictEqual(result.kind, "ok");
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.filteredOutput.includes("missing: gcc-13"), true);
    // The filtered view should prioritize issue lines over generic success chatter.
    assert.strictEqual(result.filteredOutput.includes("CHECK: OK"), false);
  });

  it("checkEnvironment returns error kind on non-zero exit", async () => {
    const initScriptPath = path.join(tempRootPath, "init.sh");
    await fs.writeFile(initScriptPath, makeInitScriptContent([
      "echo 'ERROR: bad env' 1>&2",
      "exit 4",
    ].join("\n")), "utf8");

    const handler = new InitHandler(tempRootPath);
    const result = await handler.checkEnvironment();

    assert.strictEqual(result.kind, "error");
    assert.strictEqual(result.exitCode, 4);
    assert.strictEqual(result.text, "Environment check found issues.");
    assert.strictEqual(result.filteredOutput.includes("ERROR: bad env"), true);
  });

  it("copyIcons forwards profile and icon path args", async () => {
    const initScriptPath = path.join(tempRootPath, "init.sh");
    await fs.writeFile(initScriptPath, makeInitScriptContent([
      "echo \"$@\"",
      "exit 0",
    ].join("\n")), "utf8");

    const handler = new InitHandler(tempRootPath);
    const result = await handler.copyIcons({
      profilePath: " ~/.zprofile ",
      copyIconsPath: " ./icons-copy ",
    });

    assert.strictEqual(result.kind, "ok");
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.rawOutput.includes("--copy-icons"), true);
    assert.strictEqual(result.rawOutput.includes("--skip-environment"), true);
    assert.strictEqual(result.rawOutput.includes("--update-profile=~/.zprofile"), true);
    assert.strictEqual(result.rawOutput.includes("--icons-to=./icons-copy"), true);
  });

  it("returns error result when init.sh is missing", async () => {
    const handler = new InitHandler(tempRootPath);
    const result = await handler.copyIcons();

    assert.strictEqual(result.kind, "error");
    assert.strictEqual(result.exitCode, null);
    assert.strictEqual(result.text.includes("Unable to find init.sh"), true);
  });
});
