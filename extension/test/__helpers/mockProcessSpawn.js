"use strict";

const { EventEmitter } = require("events");

/**
 * Creates one mock spawn function that emits deterministic output and exit code.
 *
 * @param {{stdout?: string, stderr?: string, exitCode?: number|null}} [options] Spawn output options.
 * @returns {(command: string, args: string[], spawnOptions: object) => EventEmitter} Mock spawn function.
 */
function createSpawnSuccessMock(options) {
  const resolvedOptions = options || {};

  return () => {
    const childProcess = new EventEmitter();
    const stdoutEmitter = new EventEmitter();
    const stderrEmitter = new EventEmitter();

    stdoutEmitter.setEncoding = () => {};
    stderrEmitter.setEncoding = () => {};

    childProcess.stdout = stdoutEmitter;
    childProcess.stderr = stderrEmitter;
    childProcess.kill = () => true;

    process.nextTick(() => {
      stdoutEmitter.emit("data", String(resolvedOptions.stdout || ""));
      stderrEmitter.emit("data", String(resolvedOptions.stderr || ""));
      childProcess.emit("close", resolvedOptions.exitCode ?? 0);
    });

    return childProcess;
  };
}

module.exports = {
  createSpawnSuccessMock,
};