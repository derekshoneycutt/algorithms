import * as assert from "assert";

import { buildAlgorithmsTerminalRunCommand } from "../../../src/commandline";

describe("commandline/adapters — terminalRunAdapter", () => {
  it("builds run.sh command with canonical token order", () => {
    const command = buildAlgorithmsTerminalRunCommand({
      executablePath: "/repo/run.sh",
      optionTokens: ["--source-profile=profiles/default.sh", "--check-only=docker"],
      passthroughTokens: ["--verbose", "sample"],
      targetToken: "cpp",
      workingDirectoryPath: "/repo/src/numeric/max",
    });

    assert.ok(
      command.includes(
        "cd '/repo/src/numeric/max' && '/repo/run.sh' '--source-profile=profiles/default.sh' '--check-only=docker' 'cpp' '--verbose' 'sample'"
      )
    );
  });

  it("quotes tokens that contain single quotes", () => {
    const command = buildAlgorithmsTerminalRunCommand({
      executablePath: "/repo/run.sh",
      optionTokens: [],
      passthroughTokens: ["it's", "ok"],
      targetToken: "python",
      workingDirectoryPath: "/repo/src/numeric/max",
    });

    assert.ok(command.includes("'it\"'\"'s'"));
  });
});
