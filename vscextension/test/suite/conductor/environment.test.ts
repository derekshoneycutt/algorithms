import * as assert from "assert";

import {
  buildCheckEnvCommand,
  buildCopyIconsCommand,
  parseCheckEnvOutput,
} from "../../../src/conductor/internal/environment";

describe("conductor/internal — environment operations", () => {
  describe("parseCheckEnvOutput", () => {
    it("extracts error lines from output", () => {
      const output = [
        "checking environment...",
        "ERROR: docker not found",
        "OK: git present",
        "FAILED: gcc13 path not set",
      ].join("\n");

      const result = parseCheckEnvOutput(output);

      assert.strictEqual(result.errors.length, 2);
      assert.ok(result.filteredOutput.includes("ERROR: docker not found"));
      assert.ok(result.filteredOutput.includes("FAILED: gcc13 path not set"));
    });

    it("falls back to last 40 lines when no errors found", () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
      const output = lines.join("\n");

      const result = parseCheckEnvOutput(output);

      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.filteredOutput.includes("line 60"));
      assert.ok(result.filteredOutput.includes("line 99"));
      assert.ok(!result.filteredOutput.includes("line 59"));
    });

    it("returns full output when less than 40 lines and no errors", () => {
      const output = ["line 1", "line 2", "line 3"].join("\n");

      const result = parseCheckEnvOutput(output);

      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.filteredOutput, output);
      assert.strictEqual(result.rawOutput, output);
    });

    it("preserves rawOutput exactly", () => {
      const output = "test\noutput\nhere";

      const result = parseCheckEnvOutput(output);

      assert.strictEqual(result.rawOutput, output);
    });
  });

  describe("buildCheckEnvCommand", () => {
    it("builds check-env command with repository root", () => {
      const command = buildCheckEnvCommand("/home/derek/algorithms");

      assert.ok(command.includes("sh '/home/derek/algorithms/init.sh'"));
      assert.ok(command.includes("--no-prompt"));
      assert.ok(command.includes("--no-icons"));
      assert.ok(command.includes("--check-env"));
    });

    it("includes optional profile path when provided", () => {
      const command = buildCheckEnvCommand("/home/derek/algorithms", "/tmp/profile");

      assert.ok(command.includes("--update-profile=/tmp/profile"));
    });

    it("omits profile path when empty string provided", () => {
      const command = buildCheckEnvCommand("/home/derek/algorithms", "");

      assert.ok(!command.includes("--update-profile="));
    });

    it("escapes single quotes in repository root", () => {
      const command = buildCheckEnvCommand("/home/derek's/algorithms");

      assert.ok(command.includes("'\"'\"'"));
    });
  });

  describe("buildCopyIconsCommand", () => {
    it("builds copy-icons command with repository root", () => {
      const command = buildCopyIconsCommand("/home/derek/algorithms");

      assert.ok(command.includes("sh '/home/derek/algorithms/init.sh'"));
      assert.ok(command.includes("--no-prompt"));
      assert.ok(command.includes("--copy-icons"));
      assert.ok(command.includes("--skip-environment"));
    });

    it("includes optional profile path when provided", () => {
      const command = buildCopyIconsCommand(
        "/home/derek/algorithms",
        "/tmp/profile"
      );

      assert.ok(command.includes("--update-profile=/tmp/profile"));
    });

    it("includes optional icons destination when provided", () => {
      const command = buildCopyIconsCommand(
        "/home/derek/algorithms",
        undefined,
        "/tmp/icons"
      );

      assert.ok(command.includes("--icons-to=/tmp/icons"));
    });

    it("includes both profile path and icons destination when provided", () => {
      const command = buildCopyIconsCommand(
        "/home/derek/algorithms",
        "/tmp/profile",
        "/tmp/icons"
      );

      assert.ok(command.includes("--update-profile=/tmp/profile"));
      assert.ok(command.includes("--icons-to=/tmp/icons"));
    });

    it("omits optional parameters when empty strings provided", () => {
      const command = buildCopyIconsCommand(
        "/home/derek/algorithms",
        "",
        ""
      );

      assert.ok(!command.includes("--update-profile="));
      assert.ok(!command.includes("--icons-to="));
    });
  });
});
