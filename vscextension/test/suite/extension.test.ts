import * as assert from "node:assert/strict";
import * as vscode from "vscode";

import {
  getShowBootstrapStatusCommandId,
  getStandardLibraryCreateFileCommandId,
  getStandardLibraryCreateFolderCommandId,
  getStandardLibraryDeleteCommandId,
  getAlgorithmsCreateFolderAtRootCommandId,
  getAlgorithmsCreateFolderCommandId,
  getAlgorithmsCreateFileCommandId,
  getAlgorithmsDeleteCommandId,
  getAlgorithmsFlagLanguageCommandId,
  getAlgorithmsUnflagLanguageCommandId,
  getAlgorithmsRunFileCommandId,
  getAlgorithmsCompileOnlyCommandId,
  getAlgorithmsCheckOnlyNativeCommandId,
  getAlgorithmsCheckOnlyDockerCommandId,
  getAlgorithmsCheckOnlySshCommandId,
  getAlgorithmsCleanCommandId,
  getAlgorithmsLocalCleanCommandId,
  getAlgorithmsSmokeTestCommandId,
  getAlgorithmsStopSmokeTestCommandId,
  getAlgorithmsClearSmokeResultsCommandId,
  getAlgorithmsClearRunResultsCommandId,
  getAlgorithmsSidebarShowAllRowsCommandId,
  getAlgorithmsSidebarShowProblemRowsCommandId,
} from "../../src/commands/commandIds";

describe("bootstrap extension", () => {
  it("activates the standalone TypeScript extension", async () => {
    const extension = vscode.extensions.getExtension(
      "derekshoneycutt.algorithms-runner-vscext"
    );

    assert.ok(extension, "extension should be discoverable");

    await extension.activate();

    assert.equal(extension.isActive, true);
  });

  it("registers and executes the bootstrap command", async () => {
    const commandId = getShowBootstrapStatusCommandId();
    const availableCommands = await vscode.commands.getCommands(true);

    assert.ok(
      availableCommands.includes(commandId),
      "bootstrap command should be registered"
    );

    const message = await vscode.commands.executeCommand<string>(commandId);

    assert.match(
      message ?? "",
      /bootstrap is active/i,
      "bootstrap command should report a status message derived from state"
    );

    // Second invocation: machine was already started; snapshot should include last command ID.
    const messageWithHistory =
      await vscode.commands.executeCommand<string>(commandId);

    assert.match(
      messageWithHistory ?? "",
      /algos\.showBootstrapStatus/,
      "subsequent invocation should reflect last command ID in message"
    );
  });

  it("contributes workspace tree view panels", async () => {
    const extension = vscode.extensions.getExtension(
      "derekshoneycutt.algorithms-runner-vscext"
    );

    assert.ok(extension, "extension should be discoverable");

    await extension.activate();

    const contributedViews =
      (extension.packageJSON?.contributes?.views?.algosSidebar as
        | Array<{ id?: string; when?: string }>
        | undefined) ?? [];

    const contributedViewIds = contributedViews.map((view) => {
      return String(view.id ?? "");
    });

    assert.ok(
      contributedViewIds.includes("algos.workspaceAlgorithmsTreeView"),
      "algorithms tree view should be contributed"
    );
    assert.ok(
      contributedViewIds.includes("algos.workspaceStandardLibraryTreeView"),
      "standard-library tree view should be contributed"
    );

    // All sidebar views must be gated on algos.workspaceSupported
    for (const view of contributedViews) {
      assert.strictEqual(
        view.when,
        "algos.workspaceSupported",
        `view ${view.id ?? "(unknown)"} should have when: algos.workspaceSupported`
      );
    }
  });

  it("registers standard-library tree action commands", async () => {
    const availableCommands = await vscode.commands.getCommands(true);

    assert.ok(
      availableCommands.includes(getStandardLibraryCreateFileCommandId()),
      "standard-library create-file command should be registered"
    );
    assert.ok(
      availableCommands.includes(getStandardLibraryCreateFolderCommandId()),
      "standard-library create-folder command should be registered"
    );
    assert.ok(
      availableCommands.includes(getStandardLibraryDeleteCommandId()),
      "standard-library delete command should be registered"
    );
  });

  it("registers algorithms tree action commands", async () => {
    const availableCommands = await vscode.commands.getCommands(true);

    assert.ok(
      availableCommands.includes(getAlgorithmsCreateFolderAtRootCommandId()),
      "algorithms create-folder-at-root command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsCreateFolderCommandId()),
      "algorithms create-folder command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsCreateFileCommandId()),
      "algorithms create-file command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsDeleteCommandId()),
      "algorithms delete command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsFlagLanguageCommandId()),
      "algorithms flag-language command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsUnflagLanguageCommandId()),
      "algorithms unflag-language command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsSidebarShowAllRowsCommandId()),
      "algorithms show-all-rows command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsSidebarShowProblemRowsCommandId()),
      "algorithms show-problem-rows command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsRunFileCommandId()),
      "algorithms run-file command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsCompileOnlyCommandId()),
      "algorithms compile-only command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsCheckOnlyNativeCommandId()),
      "algorithms check-only-native command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsCheckOnlyDockerCommandId()),
      "algorithms check-only-docker command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsCheckOnlySshCommandId()),
      "algorithms check-only-ssh command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsCleanCommandId()),
      "algorithms clean command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsLocalCleanCommandId()),
      "algorithms local-clean command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsSmokeTestCommandId()),
      "algorithms smoke-test command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsStopSmokeTestCommandId()),
      "algorithms stop-smoke-test command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsClearSmokeResultsCommandId()),
      "algorithms clear-smoke-results command should be registered"
    );
    assert.ok(
      availableCommands.includes(getAlgorithmsClearRunResultsCommandId()),
      "algorithms clear-run-results command should be registered"
    );
  });
});