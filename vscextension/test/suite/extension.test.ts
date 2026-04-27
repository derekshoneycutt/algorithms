import * as assert from "node:assert/strict";
import * as vscode from "vscode";

import {
  getShowBootstrapStatusCommandId,
  getStandardLibraryCreateFileCommandId,
  getStandardLibraryCreateFolderCommandId,
  getStandardLibraryDeleteCommandId,
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
        | Array<{ id?: string }>
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
});