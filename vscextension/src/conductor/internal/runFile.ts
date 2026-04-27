import * as path from "node:path";

import type { ConductorRunActionKind, ConductorRunFileInput, ConductorRunTargetRef } from "../IConductor";
import type {
  IAlgorithmsTerminalRunAdapter,
  ICommandLine,
} from "../../commandline";
import type { RunControlsSettings, SmokeControlsSettings } from "../../state";
import { parseRunArgumentsText } from "../../state";
import { resolveAlgorithmsRootPath } from "../../algorithms";
import { parseSmokeStatusLine } from "./outputParsing";
import type { RunFileStatusLifecycle } from "./runRegistry";
import type { ActiveSmokeExecution, SmokeStatusRetentionLifecycle } from "./smokeRegistry";

const RUN_FILE_COMMAND_ID = "algorithms.run-file";
const COMPILE_ONLY_COMMAND_ID = "algorithms.compile-only";
const CHECK_ONLY_COMMAND_ID = "algorithms.check-only";
const CLEAN_COMMAND_ID = "algorithms.clean";
const LOCAL_CLEAN_COMMAND_ID = "algorithms.localclean";
const SMOKE_TEST_COMMAND_ID = "algorithms.smoke-test";

/**
 * Dependencies injected into run-file orchestration from the conductor factory.
 */
export interface RunFileOrchestrationDependencies {
  runAdapter: IAlgorithmsTerminalRunAdapter | undefined;
  commandLine: ICommandLine | undefined;
  runLifecycle: RunFileStatusLifecycle;
  smokeStatusRetentionLifecycle: SmokeStatusRetentionLifecycle;
  activeSmokeExecutionByAlgorithm: Map<string, ActiveSmokeExecution>;
}

/**
 * A validated tree node shape accepted by run-file orchestration.
 */
type RunnableTreeNode = {
  filePath: string;
  hasOpenTarget?: boolean;
  kind: "file" | "mainFile" | "languageSummary" | "algorithmDir";
  languageKey?: string;
  parentAlgorithmPath?: string;
};

/**
 * Returns true when one tree node can be used as a run-file target.
 *
 * @param {ConductorRunFileInput["treeNode"]} treeNode Candidate node.
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {boolean} True when the node is runnable for the given action.
 */
function isRunnableTreeNode(
  treeNode: ConductorRunFileInput["treeNode"],
  actionKind: ConductorRunActionKind
): treeNode is RunnableTreeNode {
  if (treeNode === undefined) {
    return false;
  }

  if (actionKind === "smoke-test") {
    return treeNode.kind === "algorithmDir";
  }

  return treeNode.kind === "file" || treeNode.kind === "mainFile" || treeNode.kind === "languageSummary";
}

/**
 * Resolves the algorithm directory path for one tree node.
 *
 * @param {RunnableTreeNode} treeNode Source node.
 * @returns {string} Algorithm directory path.
 */
function resolveAlgorithmDirectoryPath(treeNode: RunnableTreeNode): string {
  if (treeNode.kind === "algorithmDir") {
    return treeNode.filePath;
  }

  if (treeNode.parentAlgorithmPath !== undefined) {
    return treeNode.parentAlgorithmPath;
  }

  if (treeNode.kind === "languageSummary") {
    return treeNode.filePath;
  }

  return path.dirname(treeNode.filePath);
}

/**
 * Resolves a language key from one tree node.
 *
 * @param {RunnableTreeNode} treeNode Source node.
 * @param {ConductorRunFileInput} input Run-file orchestration input.
 * @returns {string | null} Normalized language key or null when unavailable.
 */
function resolveLanguageKeyFromNode(
  treeNode: RunnableTreeNode,
  input: ConductorRunFileInput
): string | null {
  if (treeNode.languageKey !== undefined && treeNode.languageKey.trim().length > 0) {
    return treeNode.languageKey.trim().toLowerCase();
  }

  const resolvedLanguageKey = input.languages.normalizeFileExtension(treeNode.filePath);
  if (resolvedLanguageKey === undefined) {
    return null;
  }

  return resolvedLanguageKey.trim().toLowerCase();
}

/**
 * Resolves the repository root from an algorithms-root-like path.
 *
 * @param {string} algorithmsRootPath Canonical algorithms root path.
 * @returns {string | null} Repository root or null when src segment is unavailable.
 */
function resolveRepositoryRootFromAlgorithmsRootPath(
  algorithmsRootPath: string
): string | null {
  let cursor = path.resolve(algorithmsRootPath);

  while (true) {
    if (path.basename(cursor) === "src") {
      return path.dirname(cursor);
    }

    const parentPath = path.dirname(cursor);
    if (parentPath === cursor) {
      return null;
    }

    cursor = parentPath;
  }
}

/**
 * Returns the effective action kind for one run-file input.
 *
 * @param {ConductorRunFileInput} input Run input.
 * @returns {ConductorRunActionKind} Effective action kind.
 */
function resolveRunActionKind(input: ConductorRunFileInput): ConductorRunActionKind {
  return input.actionKind ?? "run-file";
}

/**
 * Returns true when the action requires one concrete source-file target.
 *
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {boolean} True when file existence must be validated.
 */
function actionRequiresConcreteTargetFile(actionKind: ConductorRunActionKind): boolean {
  return actionKind !== "clean" && actionKind !== "localclean" && actionKind !== "smoke-test";
}

/**
 * Returns true when the action supports passthrough run arguments.
 *
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {boolean} True when passthrough args should be parsed and forwarded.
 */
function actionSupportsPassthroughArguments(actionKind: ConductorRunActionKind): boolean {
  return actionKind === "run-file" || actionKind === "compile-only" || actionKind === "check-only";
}

/**
 * Returns one state-machine command id for one action kind.
 *
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {string} Command identifier.
 */
function getCommandIdForAction(actionKind: ConductorRunActionKind): string {
  if (actionKind === "compile-only") {
    return COMPILE_ONLY_COMMAND_ID;
  }

  if (actionKind === "check-only") {
    return CHECK_ONLY_COMMAND_ID;
  }

  if (actionKind === "clean") {
    return CLEAN_COMMAND_ID;
  }

  if (actionKind === "localclean") {
    return LOCAL_CLEAN_COMMAND_ID;
  }

  if (actionKind === "smoke-test") {
    return SMOKE_TEST_COMMAND_ID;
  }

  return RUN_FILE_COMMAND_ID;
}

/**
 * Returns one UI label for one action kind.
 *
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {string} Human-friendly action label.
 */
function getActionLabel(actionKind: ConductorRunActionKind): string {
  if (actionKind === "compile-only") {
    return "Compile Only";
  }

  if (actionKind === "check-only") {
    return "Check Only";
  }

  if (actionKind === "clean") {
    return "Clean";
  }

  if (actionKind === "localclean") {
    return "Local Clean";
  }

  if (actionKind === "smoke-test") {
    return "Smoke Test";
  }

  return "Run File";
}

/**
 * Builds a clean defaults option token from run controls.
 *
 * @param {RunControlsSettings} runControls Snapshot run controls.
 * @returns {string} One `--defaults=` option token.
 */
function buildCleanDefaultsOptionToken(runControls: RunControlsSettings): string {
  const stdlibDefault = runControls.cleanStdlibEnabled ? "y" : "n";
  const archiveDefault = runControls.cleanArchivesEnabled ? "y" : "n";
  return `--defaults=${stdlibDefault}|${archiveDefault}`;
}

/**
 * Resolves run-control option tokens for run.sh.
 *
 * These are run.sh option flags and must appear before the target argument.
 *
 * @param {RunControlsSettings} runControls Snapshot run controls.
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {string[]} run.sh option tokens.
 */
function buildRunControlOptionTokens(
  runControls: RunControlsSettings,
  actionKind: ConductorRunActionKind
): string[] {
  const optionTokens: string[] = [];

  if (runControls.sourceProfileEnabled) {
    optionTokens.push(`--source-profile=${runControls.sourceProfileText}`);
  }

  if (actionKind === "compile-only") {
    optionTokens.push("--compile-only");
  } else if (actionKind === "check-only") {
    optionTokens.push(`--check-only=${runControls.runChecksRoute}`);
  } else if (actionKind === "clean") {
    optionTokens.push(buildCleanDefaultsOptionToken(runControls));
  } else if (runControls.runChecksMode === "compile-only") {
    optionTokens.push("--compile-only");
  } else if (runControls.runChecksMode === "check-only") {
    optionTokens.push(`--check-only=${runControls.runChecksRoute}`);
  }

  return optionTokens;
}

/**
 * Resolves smoke-control option tokens for run.sh.
 *
 * @param {SmokeControlsSettings} smokeControls Snapshot smoke controls.
 * @returns {{ok: boolean, tokens: string[], reason: string | null}} Parse result.
 */
function buildSmokeTestOptionTokens(
  smokeControls: SmokeControlsSettings
): { ok: boolean; tokens: string[]; reason: string | null } {
  const optionTokens: string[] = ["--smoke-test"];

  if (smokeControls.reportEnabled) {
    const markdownPath = smokeControls.markdownPath.trim();
    if (markdownPath.length > 0) {
      optionTokens.push(`--markdown=${markdownPath}`);
    } else {
      optionTokens.push("--markdown");
    }
  }

  const timeoutSeconds = smokeControls.timeoutSeconds.trim();
  if (timeoutSeconds.length > 0) {
    optionTokens.push(`--timeout=${timeoutSeconds}`);
  }

  const slowTimeoutSeconds = smokeControls.slowTimeoutSeconds.trim();
  if (slowTimeoutSeconds.length > 0) {
    optionTokens.push(`--slow-timeout=${slowTimeoutSeconds}`);
  }

  const selectableLanguages = smokeControls.languages.filter((language) => {
    return !language.disabled;
  });
  const selectedLanguages = selectableLanguages.filter((language) => {
    return language.selected;
  });

  if (selectedLanguages.length === 0) {
    return {
      ok: false,
      tokens: [],
      reason: "Select at least one smoke-test language.",
    };
  }

  if (selectedLanguages.length !== selectableLanguages.length) {
    optionTokens.push(`--langs=${selectedLanguages.map((language) => language.languageKey).join(" ")}`);
  }

  return {
    ok: true,
    tokens: optionTokens,
    reason: null,
  };
}

/**
 * Resolves trailing run arguments tokens for run.sh.
 *
 * These are passthrough args and must appear after the target argument.
 *
 * @param {RunControlsSettings} runControls Snapshot run controls.
 * @returns {{ok: boolean, tokens: string[], reason: string | null}} Parse result.
 */
function buildRunControlPassthroughTokens(
  runControls: RunControlsSettings
): { ok: boolean; tokens: string[]; reason: string | null } {
  if (!runControls.runArgsEnabled) {
    return {
      ok: true,
      tokens: [],
      reason: null,
    };
  }

  const parsedRunArguments = parseRunArgumentsText(runControls.runArgsText);
  if (!parsedRunArguments.ok) {
    return {
      ok: false,
      tokens: [],
      reason: parsedRunArguments.reason,
    };
  }

  return {
    ok: true,
    tokens: parsedRunArguments.tokens,
    reason: null,
  };
}

/**
 * Records one run-file launch failure in the central state machine.
 *
 * @param {ConductorRunFileInput} input Run-file orchestration input.
 * @param {string} errorMessage Failure message.
 * @returns {void}
 */
function recordRunFileFailure(input: ConductorRunFileInput, errorMessage: string): void {
  const actionKind = resolveRunActionKind(input);
  input.hostState.send({
    type: "COMMAND_REQUESTED",
    commandId: getCommandIdForAction(actionKind),
  });
  input.hostState.send({ type: "COMMAND_FAILED", error: errorMessage });
}

/**
 * Builds one stop confirmation message for one algorithm path.
 *
 * @param {string} algorithmDirectoryPath Algorithm directory path.
 * @returns {string} Human-readable stop message.
 */
function buildSmokeStoppedMessage(algorithmDirectoryPath: string): string {
  return `Smoke Test stopped for ${path.basename(algorithmDirectoryPath)}.`;
}

/**
 * Runs one Algorithms target by delegating execution to terminal or commandline adapters.
 *
 * @param {ConductorRunFileInput} input Run-file orchestration input.
 * @param {RunFileOrchestrationDependencies} deps Injected run-file dependencies.
 * @returns {Promise<void>} Resolves after orchestration completes.
 */
export async function orchestrateRunFile(
  input: ConductorRunFileInput,
  deps: RunFileOrchestrationDependencies
): Promise<void> {
  const { runAdapter, commandLine, runLifecycle, smokeStatusRetentionLifecycle, activeSmokeExecutionByAlgorithm } = deps;
  const actionKind = resolveRunActionKind(input);
  const actionLabel = getActionLabel(actionKind);
  const shouldUseCommandLineSmokeExecution = actionKind === "smoke-test" && commandLine !== undefined;

  if (!isRunnableTreeNode(input.treeNode, actionKind)) {
    if (actionKind === "smoke-test") {
      await input.notificationRouter.warn("Select an algorithm directory row to smoke test.");
    } else {
      await input.notificationRouter.warn(`Select an algorithm file or language row to ${actionLabel.toLowerCase()}.`);
    }
    return;
  }

  const treeNode = input.treeNode;
  const runTarget: ConductorRunTargetRef = {
    nodeKind: treeNode.kind,
    filePath: treeNode.filePath,
  };

  if (
    actionRequiresConcreteTargetFile(actionKind)
    && treeNode.kind === "languageSummary"
    && treeNode.hasOpenTarget === false
  ) {
    await input.notificationRouter.warn(`Cannot ${actionLabel.toLowerCase()} a missing language row.`);
    return;
  }

  if (runAdapter === undefined && !shouldUseCommandLineSmokeExecution) {
    const errorMessage = "Run adapter is not configured.";
    runLifecycle.markFailed(runTarget, errorMessage);
    recordRunFileFailure(input, errorMessage);
    await input.notificationRouter.error(errorMessage);
    return;
  }

  const algorithmsRootPath = await resolveAlgorithmsRootPath({
    filesystem: input.filesystem,
    workspaceFolderPaths: input.workspaceFolderPaths,
  });

  if (algorithmsRootPath === null) {
    await input.notificationRouter.warn("Algorithms root is unavailable.");
    return;
  }

  const repositoryRootPath = resolveRepositoryRootFromAlgorithmsRootPath(algorithmsRootPath);

  if (repositoryRootPath === null) {
    await input.notificationRouter.warn("Repository root is unavailable.");
    return;
  }

  const runScriptPath = path.join(repositoryRootPath, "run.sh");
  if (!(await input.filesystem.isFile(runScriptPath))) {
    const errorMessage = "run.sh is unavailable.";
    runLifecycle.markFailed(runTarget, errorMessage);
    recordRunFileFailure(input, errorMessage);
    await input.notificationRouter.error(errorMessage);
    return;
  }

  const canonicalAlgorithmsRoot = await input.filesystem.realpath(algorithmsRootPath);

  let canonicalTargetFilePath: string | null = null;
  if (actionRequiresConcreteTargetFile(actionKind)) {
    const targetFilePath = treeNode.filePath;
    if (!(await input.filesystem.isFile(targetFilePath))) {
      await input.notificationRouter.warn("Target file no longer exists.");
      input.refreshAlgorithmsTree();
      return;
    }

    canonicalTargetFilePath = await input.filesystem.realpath(targetFilePath);
    const isWithinAlgorithmsRoot = await input.filesystem.isPathWithinRoot(
      canonicalAlgorithmsRoot,
      canonicalTargetFilePath
    );

    if (!isWithinAlgorithmsRoot) {
      await input.notificationRouter.warn("Run target must stay inside the Algorithms root.");
      return;
    }
  }

  const algorithmDirectoryPath = resolveAlgorithmDirectoryPath(treeNode);
  if (!(await input.filesystem.isDirectory(algorithmDirectoryPath))) {
    await input.notificationRouter.warn("Algorithm directory is unavailable.");
    return;
  }

  const languageKey = actionKind === "smoke-test"
    ? null
    : resolveLanguageKeyFromNode(treeNode, input);
  if (actionKind !== "smoke-test" && languageKey === null) {
    const errorMessage = "Language could not be determined.";
    runLifecycle.markFailed(runTarget, errorMessage);
    recordRunFileFailure(input, errorMessage);
    await input.notificationRouter.warn(errorMessage);
    return;
  }

  const hostSnapshot = input.hostState.getSnapshot();
  const runControls = hostSnapshot.runControls;
  const smokeControls = hostSnapshot.smokeControls;
  const smokeTestOptions = actionKind === "smoke-test"
    ? buildSmokeTestOptionTokens(smokeControls)
    : { ok: true, tokens: [], reason: null };
  if (!smokeTestOptions.ok) {
    const errorMessage = smokeTestOptions.reason ?? "Smoke-test options are invalid.";
    runLifecycle.markFailed(runTarget, errorMessage);
    recordRunFileFailure(input, errorMessage);
    await input.notificationRouter.warn(errorMessage);
    return;
  }

  const runControlOptionTokens = actionKind === "smoke-test"
    ? smokeTestOptions.tokens
    : buildRunControlOptionTokens(runControls, actionKind);
  const runControlPassthrough = actionSupportsPassthroughArguments(actionKind)
    ? buildRunControlPassthroughTokens(runControls)
    : { ok: true, tokens: [], reason: null };
  if (!runControlPassthrough.ok) {
    const errorMessage = runControlPassthrough.reason ?? "Run args are invalid.";
    runLifecycle.markFailed(runTarget, errorMessage);
    recordRunFileFailure(input, errorMessage);
    await input.notificationRouter.warn(errorMessage);
    return;
  }

  const runTargetToken = actionKind === "smoke-test"
    ? undefined
    : actionKind === "clean"
    ? "clean"
    : actionKind === "localclean"
      ? "localclean"
      : treeNode.kind === "languageSummary"
        ? (languageKey ?? "")
        : path.basename(canonicalTargetFilePath ?? treeNode.filePath);
  const runOwnerKey = actionKind === "smoke-test"
    ? `smoke:${path.basename(algorithmDirectoryPath)}`
    : `${languageKey}:${runTargetToken}`;
  const smokeSelectedLanguageKeys = actionKind === "smoke-test"
    ? smokeControls.languages
        .filter((language) => {
          return !language.disabled && language.selected;
        })
        .map((language) => {
          return language.languageKey.trim().toLowerCase();
        })
        .filter((key) => {
          return key.length > 0;
        })
    : [];
  let activeSmokeRunId: string | null = null;
  try {
    const startedRunSnapshot = runLifecycle.start(
      runTarget,
      runOwnerKey,
      `${actionLabel} launch requested`
    );
    const startedRunId = startedRunSnapshot.runId;
    let smokeOutputBuffer = "";
    let smokeRunStarted = false;

    /**
     * Finalizes one active smoke runtime status projection.
     *
     * @returns {void}
     */
    function finishSmokeRuntimeStatus(): void {
      if (!smokeRunStarted) {
        return;
      }

      smokeRunStarted = false;
      input.hostState.send({
        type: "SMOKE_RUN_FINISHED",
        algorithmPath: algorithmDirectoryPath,
      });
      smokeStatusRetentionLifecycle.markFinished(
        algorithmDirectoryPath,
        startedRunId,
        input.hostState,
        input.refreshAlgorithmsTree
      );
      input.refreshAlgorithmsTree();
    }

    /**
     * Parses and applies smoke language status updates from one output chunk.
     *
     * @param {string} chunk One output chunk from run.sh.
     * @returns {void}
     */
    function consumeSmokeOutputChunk(chunk: string): void {
      smokeOutputBuffer += chunk.replace(/\r/g, "\n");
      const lines = smokeOutputBuffer.split("\n");
      smokeOutputBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const parsedSmokeStatus = parseSmokeStatusLine(line);
        if (parsedSmokeStatus === null) {
          continue;
        }

        input.hostState.send({
          type: "SMOKE_LANGUAGE_RUN_STATUS_SET",
          algorithmPath: algorithmDirectoryPath,
          languageKey: parsedSmokeStatus.languageKey,
          status: parsedSmokeStatus.status,
        });
        input.refreshAlgorithmsTree();
      }
    }

    if (actionKind === "smoke-test") {
      activeSmokeRunId = startedRunId;
      input.hostState.send({
        type: "SMOKE_RUN_STARTED",
        algorithmPath: algorithmDirectoryPath,
        languageKeys: smokeSelectedLanguageKeys,
        runId: startedRunId,
      });
      smokeStatusRetentionLifecycle.markStarted(algorithmDirectoryPath, startedRunId);
      smokeRunStarted = true;
      input.refreshAlgorithmsTree();
    }

    input.hostState.send({
      type: "COMMAND_REQUESTED",
      commandId: getCommandIdForAction(actionKind),
    });

    runLifecycle.markRunning(
      runTarget,
      actionKind === "smoke-test"
        ? `${actionLabel} dispatched to terminal for ${path.basename(algorithmDirectoryPath)}`
        : `${actionLabel} dispatched to terminal for ${runTargetToken} (${languageKey})`,
      startedRunId
    );

    if (shouldUseCommandLineSmokeExecution) {
      const trackedExecution = commandLine.spawnTracked(
        runScriptPath,
        [...runControlOptionTokens, ...runControlPassthrough.tokens],
        {
          cwd: algorithmDirectoryPath,
          onStdoutData(chunk): void {
            consumeSmokeOutputChunk(chunk);
          },
          onStderrData(chunk): void {
            consumeSmokeOutputChunk(chunk);
          },
        }
      );

      const activeSmokeExecution: ActiveSmokeExecution = {
        algorithmPath: algorithmDirectoryPath,
        handle: trackedExecution.handle,
        result: trackedExecution.result,
        runId: startedRunId,
        stopRequested: false,
        target: runTarget,
      };
      activeSmokeExecutionByAlgorithm.set(algorithmDirectoryPath, activeSmokeExecution);

      const runResult = await trackedExecution.result;

      const latestActiveSmokeExecution = activeSmokeExecutionByAlgorithm.get(algorithmDirectoryPath);
      if (latestActiveSmokeExecution?.runId === startedRunId) {
        activeSmokeExecutionByAlgorithm.delete(algorithmDirectoryPath);
      }

      finishSmokeRuntimeStatus();

      if (activeSmokeExecution.stopRequested) {
        runLifecycle.markCancelled(
          runTarget,
          buildSmokeStoppedMessage(algorithmDirectoryPath),
          startedRunId
        );
        return;
      }

      if (!runResult.ok) {
        const exitCodeText = runResult.exitCode === null ? "unknown" : String(runResult.exitCode);
        runLifecycle.markFailed(
          runTarget,
          `${actionLabel} exited with code ${exitCodeText}.`,
          startedRunId
        );
        return;
      }

      runLifecycle.markCompleted(
        runTarget,
        `${actionLabel} completed for ${path.basename(algorithmDirectoryPath)}.`,
        startedRunId
      );
    } else {
      if (runAdapter === undefined) {
        throw new Error("Run adapter is not configured.");
      }

      runAdapter.run({
        executablePath: runScriptPath,
        optionTokens: runControlOptionTokens,
        passthroughTokens: runControlPassthrough.tokens,
        targetToken: runTargetToken,
        workingDirectoryPath: algorithmDirectoryPath,
        onExit(exitCode): void {
          if (actionKind === "smoke-test") {
            finishSmokeRuntimeStatus();
          }

          if (typeof exitCode === "number" && exitCode !== 0) {
            runLifecycle.markFailed(
              runTarget,
              `${actionLabel} exited with code ${exitCode}.`,
              startedRunId
            );
            return;
          }

          runLifecycle.markCompleted(
            runTarget,
            actionKind === "smoke-test"
              ? `${actionLabel} completed for ${path.basename(algorithmDirectoryPath)}.`
              : `${actionLabel} completed for ${runTargetToken} (${languageKey}).`,
            startedRunId
          );
        },
      });
    }

    const successMessage = actionKind === "smoke-test"
      ? shouldUseCommandLineSmokeExecution
        ? `${actionLabel} started for ${path.basename(algorithmDirectoryPath)}.`
        : `${actionLabel} started for ${path.basename(algorithmDirectoryPath)} in ${runAdapter?.getTerminalName() ?? "Algorithms Runner"}.`
      : `${actionLabel} started for ${runTargetToken} (${languageKey}) in ${runAdapter?.getTerminalName() ?? "Algorithms Runner"}.`;
    input.hostState.send({ type: "COMMAND_SUCCEEDED", result: successMessage });
    await input.notificationRouter.info(successMessage);
  } catch (error) {
    activeSmokeExecutionByAlgorithm.delete(algorithmDirectoryPath);

    if (actionKind === "smoke-test") {
      input.hostState.send({
        type: "SMOKE_RUN_FINISHED",
        algorithmPath: algorithmDirectoryPath,
      });
      if (activeSmokeRunId !== null) {
        smokeStatusRetentionLifecycle.markFinished(
          algorithmDirectoryPath,
          activeSmokeRunId,
          input.hostState,
          input.refreshAlgorithmsTree
        );
      }
      input.refreshAlgorithmsTree();
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    runLifecycle.markFailed(runTarget, errorMessage);
    input.hostState.send({ type: "COMMAND_FAILED", error: errorMessage });
    await input.notificationRouter.error(`Failed to run target: ${errorMessage}`);
  }
}
