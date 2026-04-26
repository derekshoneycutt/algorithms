import * as assert from "assert";
import * as childProcess from "node:child_process";

import { createCommandLine } from "../../../src/commandline";

describe("commandline — createCommandLine", () => {
  it("captures stdout and stderr for successful spawn", async () => {
    const commandLine = createCommandLine();

    const result = await commandLine.spawn(
      process.execPath,
      [
        "-e",
        'process.stdout.write("hello"); process.stderr.write("world");',
      ],
      {
        timeoutMs: 2000,
      }
    );

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stdout, "hello");
    assert.strictEqual(result.stderr, "world");
    assert.strictEqual(result.combinedOutput, "helloworld");
    assert.strictEqual(result.reason, null);
  });

  it("normalizes spawn failures", async () => {
    const commandLine = createCommandLine();

    const result = await commandLine.spawn(
      "this-command-should-not-exist-987654321",
      [],
      {
        timeoutMs: 500,
      }
    );

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, "spawn-failed");
    assert.ok(result.errorMessage);
  });

  it("returns timeout-exceeded when spawn timeout is reached", async () => {
    const commandLine = createCommandLine();

    const result = await commandLine.spawn(
      process.execPath,
      ["-e", "setTimeout(() => { process.stdout.write('late'); }, 1000);"],
      {
        timeoutMs: 20,
      }
    );

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, "timeout-exceeded");
  });

  it("supports spawnSync with successful output capture", () => {
    const commandLine = createCommandLine();

    const result = commandLine.spawnSync(
      process.execPath,
      ["-e", 'process.stdout.write("sync");'],
      {
        timeoutMs: 2000,
      }
    );

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.stdout, "sync");
    assert.strictEqual(result.reason, null);
  });

  it("exposes handle kill/isRunning behavior", async () => {
    const commandLine = createCommandLine();

    const child = childProcess.spawn(process.execPath, [
      "-e",
      "setInterval(() => {}, 1000);",
    ]);

    const handle = commandLine.createHandle(child);
    assert.strictEqual(handle.isRunning(), true);

    const killResult = handle.kill("SIGTERM");
    assert.strictEqual(killResult.ok, true);

    await new Promise<void>((resolve) => {
      child.on("close", () => {
        resolve();
      });
    });

    assert.strictEqual(handle.isRunning(), false);
  });
});
