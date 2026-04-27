import * as path from "node:path";

import type {
  ConductorCancelRunInput,
  ConductorMarkCompletedInput,
  ConductorMarkFailedInput,
  ConductorMarkProgressInput,
  ConductorNotificationEffect,
  ConductorRunControlsIntent,
  ConductorRunControlsReaction,
  ConductorRunFileInput,
  ConductorRunTargetRef,
  ConductorRunTargetStatusChange,
  ConductorSmokeReaction,
  ConductorRunSnapshot,
  ConductorSmokeIntent,
  ConductorStartRunInput,
  ConductorSubscription,
  IConductor,
} from "./IConductor";
import type { ViewToHostMessage } from "../comms/shared/messageTypes";
import type { IAlgorithmsTerminalRunAdapter } from "../commandline";
import { resolveAlgorithmsRootPath } from "../algorithms";
import type {
  IStateMachine,
  RunControlsSettings,
  SmokeControlsSettings,
  SmokeLanguageSelection,
} from "../state";
import {
  createCleanOptionsStatus,
  parseRunArgumentsText,
  createRunArgsStatus,
  createRunChecksStatus,
  createSourceProfileStatus,
} from "../state";

const RUN_FILE_COMMAND_ID = "algorithms.run-file";
const DEFAULT_RUN_STATUS_RETENTION_MS = 120_000;

/**
 * Builds one stable run-target key.
 *
 * @param {ConductorRunTargetRef} target Run target reference.
 * @returns {string} Stable target key.
 */
function buildRunTargetKey(target: ConductorRunTargetRef): string {
  return `${target.nodeKind}:${target.filePath}`;
}

/**
 * Lifecycle operations used by run-file orchestration.
 */
interface RunFileStatusLifecycle {
  markCompleted(
    target: ConductorRunTargetRef,
    message?: string | null,
    expectedRunId?: string
  ): void;
  markFailed(
    target: ConductorRunTargetRef,
    errorMessage: string,
    expectedRunId?: string
  ): void;
  markRunning(
    target: ConductorRunTargetRef,
    message?: string | null,
    expectedRunId?: string
  ): void;
  start(
    target: ConductorRunTargetRef,
    ownerKey: string,
    message?: string | null
  ): ConductorRunSnapshot;
}

/**
 * Dependencies required to create the conductor service.
 */
export interface CreateConductorServiceInput {
  algorithmsTerminalRunAdapter?: IAlgorithmsTerminalRunAdapter;
  runStatusRetentionMs?: number;
}

/**
 * Dependencies used to apply one conductor reaction to host runtime state.
 */
export interface ApplyConductorReactionDependencies {
  stateMachine: IStateMachine;
  dispatchNotification: (notification: ConductorNotificationEffect) => void;
}

/**
 * Dependencies used to react to and apply one smoke-controls intent.
 */
export interface ReactAndApplySmokeIntentDependencies
  extends ApplyConductorReactionDependencies {
  conductor: IConductor;
}

/**
 * Dependencies used to react to and apply one run-controls intent.
 */
export interface ReactAndApplyRunControlsIntentDependencies
  extends ApplyConductorReactionDependencies {
  conductor: IConductor;
}

/**
 * Dependencies used to create one smoke-controls channel handler.
 */
export interface CreateSmokeControlsChannelMessageHandlerInput
  extends ReactAndApplySmokeIntentDependencies {
  publishSnapshot: () => void;
}

/**
 * Dependencies used to create one run-controls channel handler.
 */
export interface CreateRunControlsChannelMessageHandlerInput
  extends ReactAndApplyRunControlsIntentDependencies {
  publishSnapshot: () => void;
}

/**
 * Applies one conductor reaction to host state and notifications.
 *
 * @param {ConductorSmokeReaction | ConductorRunControlsReaction} reaction Conductor reaction to apply.
 * @param {ApplyConductorReactionDependencies} dependencies Host runtime dependencies.
 * @returns {boolean} True when the caller should publish a refreshed snapshot.
 */
export function applyConductorReaction(
  reaction: ConductorSmokeReaction | ConductorRunControlsReaction,
  dependencies: ApplyConductorReactionDependencies
): boolean {
  for (const stateEvent of reaction.stateEvents) {
    dependencies.stateMachine.send(stateEvent);
  }

  if (reaction.notification !== null) {
    dependencies.dispatchNotification(reaction.notification);
  }

  return reaction.shouldPublishSnapshot;
}

/**
 * Reacts to one smoke-controls intent and applies the resulting effects.
 *
 * @param {ConductorSmokeIntent} intent Smoke-controls intent.
 * @param {ReactAndApplySmokeIntentDependencies} dependencies Conductor and runtime dependencies.
 * @returns {boolean} True when the caller should publish a refreshed snapshot.
 */
export function reactAndApplySmokeIntent(
  intent: ConductorSmokeIntent,
  dependencies: ReactAndApplySmokeIntentDependencies
): boolean {
  const reaction = dependencies.conductor.reactToSmokeIntent({
    intent,
    snapshot: dependencies.stateMachine.getSnapshot(),
  });

  return applyConductorReaction(reaction, dependencies);
}

/**
 * Reacts to one run-controls intent and applies the resulting effects.
 *
 * @param {ConductorRunControlsIntent} intent Run-controls intent.
 * @param {ReactAndApplyRunControlsIntentDependencies} dependencies Conductor and runtime dependencies.
 * @returns {boolean} True when the caller should publish a refreshed snapshot.
 */
export function reactAndApplyRunControlsIntent(
  intent: ConductorRunControlsIntent,
  dependencies: ReactAndApplyRunControlsIntentDependencies
): boolean {
  const reaction = dependencies.conductor.reactToRunControlsIntent({
    intent,
    snapshot: dependencies.stateMachine.getSnapshot(),
  });

  return applyConductorReaction(reaction, dependencies);
}

/**
 * Creates one conductor-owned message handler for the smoke-controls channel.
 *
 * @param {CreateSmokeControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {(message: ViewToHostMessage) => void} Message handler.
 */
export function createSmokeControlsChannelMessageHandler(
  input: CreateSmokeControlsChannelMessageHandlerInput
): (message: ViewToHostMessage) => void {
  return (message: ViewToHostMessage): void => {
    if (message.type === "smoke.ready") {
      input.publishSnapshot();
      return;
    }

    if (message.type !== "smoke.intent") {
      return;
    }

    const shouldPublishSnapshot = reactAndApplySmokeIntent(message.payload, input);

    if (shouldPublishSnapshot) {
      input.publishSnapshot();
    }
  };
}

/**
 * Creates one conductor-owned message handler for the run-controls channel.
 *
 * @param {CreateRunControlsChannelMessageHandlerInput} input Channel handler dependencies.
 * @returns {(message: ViewToHostMessage) => void} Message handler.
 */
export function createRunControlsChannelMessageHandler(
  input: CreateRunControlsChannelMessageHandlerInput
): (message: ViewToHostMessage) => void {
  return (message: ViewToHostMessage): void => {
    if (message.type === "run.ready") {
      input.publishSnapshot();
      return;
    }

    if (message.type !== "run.intent") {
      return;
    }

    const shouldPublishSnapshot = reactAndApplyRunControlsIntent(message.payload, input);

    if (shouldPublishSnapshot) {
      input.publishSnapshot();
    }
  };
}

let nextRunSequence = 1;

/**
 * Returns true when one node kind can be run directly as a file target.
 *
 * @param {ConductorRunFileInput["treeNode"]} treeNode Candidate node.
 * @returns {boolean} True when supported by Run File.
 */
type RunnableTreeNode = {
  filePath: string;
  hasOpenTarget?: boolean;
  kind: "file" | "mainFile" | "languageSummary";
  languageKey?: string;
  parentAlgorithmPath?: string;
};

function isRunnableTreeNode(
  treeNode: ConductorRunFileInput["treeNode"]
): treeNode is RunnableTreeNode {
  if (treeNode === undefined) {
    return false;
  }

  return treeNode.kind === "file" || treeNode.kind === "mainFile" || treeNode.kind === "languageSummary";
}

/**
 * Resolves the algorithm directory path for one tree node.
 *
 * @param {NonNullable<ConductorRunFileInput["treeNode"]>} treeNode Source node.
 * @returns {string} Algorithm directory path.
 */
function resolveAlgorithmDirectoryPath(
  treeNode: RunnableTreeNode
): string {
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
 * @param {NonNullable<ConductorRunFileInput["treeNode"]>} treeNode Source node.
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
 * Resolves run-control option tokens for run.sh.
 *
 * These are run.sh option flags and must appear before the target argument.
 *
 * @param {RunControlsSettings} runControls Snapshot run controls.
 * @returns {string[]} run.sh option tokens.
 */
function buildRunControlOptionTokens(runControls: RunControlsSettings): string[] {
  const optionTokens: string[] = [];

  if (runControls.sourceProfileEnabled) {
    optionTokens.push(`--source-profile=${runControls.sourceProfileText}`);
  }

  if (runControls.runChecksMode === "compile-only") {
    optionTokens.push("--compile-only");
  } else if (runControls.runChecksMode === "check-only") {
    optionTokens.push(`--check-only=${runControls.runChecksRoute}`);
  }

  return optionTokens;
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
  input.hostState.send({ type: "COMMAND_REQUESTED", commandId: RUN_FILE_COMMAND_ID });
  input.hostState.send({ type: "COMMAND_FAILED", error: errorMessage });
}

/**
 * Runs one Algorithms target by delegating terminal dispatch to commandline adapter.
 *
 * @param {ConductorRunFileInput} input Run-file orchestration input.
 * @param {IAlgorithmsTerminalRunAdapter | undefined} runAdapter Terminal run adapter.
 * @returns {Promise<void>} Resolves after orchestration completes.
 */
async function runAlgorithmsFile(
  input: ConductorRunFileInput,
  runAdapter: IAlgorithmsTerminalRunAdapter | undefined,
  runLifecycle: RunFileStatusLifecycle
): Promise<void> {
  if (!isRunnableTreeNode(input.treeNode)) {
    await input.notificationRouter.warn("Select an algorithm file or language row to run.");
    return;
  }

  const treeNode = input.treeNode;
  const runTarget: ConductorRunTargetRef = {
    nodeKind: treeNode.kind,
    filePath: treeNode.filePath,
  };

  if (treeNode.kind === "languageSummary" && treeNode.hasOpenTarget === false) {
    await input.notificationRouter.warn("Cannot run a missing language row.");
    return;
  }

  if (runAdapter === undefined) {
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

  const targetFilePath = treeNode.filePath;
  if (!(await input.filesystem.isFile(targetFilePath))) {
    await input.notificationRouter.warn("Target file no longer exists.");
    input.refreshAlgorithmsTree();
    return;
  }

  const canonicalAlgorithmsRoot = await input.filesystem.realpath(algorithmsRootPath);
  const canonicalTargetFilePath = await input.filesystem.realpath(targetFilePath);
  const isWithinAlgorithmsRoot = await input.filesystem.isPathWithinRoot(
    canonicalAlgorithmsRoot,
    canonicalTargetFilePath
  );

  if (!isWithinAlgorithmsRoot) {
    await input.notificationRouter.warn("Run target must stay inside the Algorithms root.");
    return;
  }

  const algorithmDirectoryPath = resolveAlgorithmDirectoryPath(treeNode);
  if (!(await input.filesystem.isDirectory(algorithmDirectoryPath))) {
    await input.notificationRouter.warn("Algorithm directory is unavailable.");
    return;
  }

  const languageKey = resolveLanguageKeyFromNode(treeNode, input);
  if (languageKey === null) {
    const errorMessage = "Language could not be determined.";
    runLifecycle.markFailed(runTarget, errorMessage);
    recordRunFileFailure(input, errorMessage);
    await input.notificationRouter.warn(errorMessage);
    return;
  }

  const runControls = input.hostState.getSnapshot().runControls;
  const runControlOptionTokens = buildRunControlOptionTokens(runControls);
  const runControlPassthrough = buildRunControlPassthroughTokens(runControls);
  if (!runControlPassthrough.ok) {
    const errorMessage = runControlPassthrough.reason ?? "Run args are invalid.";
    runLifecycle.markFailed(runTarget, errorMessage);
    recordRunFileFailure(input, errorMessage);
    await input.notificationRouter.warn(errorMessage);
    return;
  }

  const runTargetToken = treeNode.kind === "languageSummary"
    ? languageKey
    : path.basename(canonicalTargetFilePath);
  const runOwnerKey = `${languageKey}:${runTargetToken}`;

  try {
    const startedRunSnapshot = runLifecycle.start(
      runTarget,
      runOwnerKey,
      "Run File launch requested"
    );
    const startedRunId = startedRunSnapshot.runId;
    input.hostState.send({ type: "COMMAND_REQUESTED", commandId: RUN_FILE_COMMAND_ID });

    runLifecycle.markRunning(
      runTarget,
      `Run File dispatched to terminal for ${runTargetToken} (${languageKey})`,
      startedRunId
    );

    runAdapter.run({
      executablePath: runScriptPath,
      optionTokens: runControlOptionTokens,
      passthroughTokens: runControlPassthrough.tokens,
      targetToken: runTargetToken,
      workingDirectoryPath: algorithmDirectoryPath,
      onExit(exitCode): void {
        if (typeof exitCode === "number" && exitCode !== 0) {
          runLifecycle.markFailed(
            runTarget,
            `Run File exited with code ${exitCode}.`,
            startedRunId
          );
          return;
        }

        runLifecycle.markCompleted(
          runTarget,
          `Run File completed for ${runTargetToken} (${languageKey}).`,
          startedRunId
        );
      },
    });

    const successMessage = `Run File started for ${runTargetToken} (${languageKey}) in ${runAdapter.getTerminalName()}.`;
    input.hostState.send({ type: "COMMAND_SUCCEEDED", result: successMessage });
    await input.notificationRouter.info(successMessage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    runLifecycle.markFailed(runTarget, errorMessage);
    input.hostState.send({ type: "COMMAND_FAILED", error: errorMessage });
    await input.notificationRouter.error(`Failed to run target: ${errorMessage}`);
  }
}

/**
 * Creates one bootstrap run snapshot.
 *
 * @param {ConductorStartRunInput} input Start input.
 * @returns {ConductorRunSnapshot} Initial run snapshot.
 */
function createBootstrapRunSnapshot(
  input: ConductorStartRunInput
): ConductorRunSnapshot {
  const now = Date.now();
  const runId = `conductor:${input.ownerKey}:${nextRunSequence}`;
  nextRunSequence += 1;

  return {
    runId,
    ownerKey: input.ownerKey,
    status: "starting",
    startedAt: now,
    updatedAt: now,
    message: input.reason ?? null,
    progressPercent: null,
    stepKey: null,
    errorMessage: null,
  };
}

/**
 * Returns true when one run target still points to one expected run id.
 *
 * @param {ConductorRunSnapshot | undefined} snapshot Current target snapshot.
 * @param {string | undefined} expectedRunId Expected run id.
 * @returns {boolean} True when update should be applied.
 */
function matchesExpectedRunId(
  snapshot: ConductorRunSnapshot | undefined,
  expectedRunId: string | undefined
): boolean {
  if (snapshot === undefined) {
    return false;
  }

  if (expectedRunId === undefined) {
    return true;
  }

  return snapshot.runId === expectedRunId;
}

/**
 * Creates a deterministic smoke reaction output for one intent.
 *
 * @param {ConductorSmokeIntent} intent Smoke controls intent.
 * @returns {ConductorSmokeReaction} Reaction result.
 */
function createSmokeReportStatus(settings: SmokeControlsSettings): {
  text: string;
  className: "status-muted" | "status-ok" | "status-error";
} {
  if (!settings.reportEnabled) {
    return {
      text: "No report generated.",
      className: "status-muted",
    };
  }

  const reportPath = settings.markdownPath.trim();
  if (reportPath.length === 0) {
    return {
      text: "Report generated at default smoke-test path.",
      className: "status-ok",
    };
  }

  return {
    text: `Report generated at: ${reportPath}`,
    className: "status-ok",
  };
}

/**
 * Creates smoke language-selection status metadata.
 *
 * @param {SmokeLanguageSelection[]} languages Current smoke language list.
 * @returns {{text: string, className: "status-muted" | "status-ok" | "status-error"}} Status metadata.
 */
function createSmokeSelectionStatus(languages: SmokeLanguageSelection[]): {
  text: string;
  className: "status-muted" | "status-ok" | "status-error";
} {
  const selectableCount = languages.filter((language) => !language.disabled).length;
  const selectedCount = languages.filter((language) => language.selected).length;

  if (selectedCount === 0) {
    return {
      text: "Select at least one language",
      className: "status-error",
    };
  }

  if (selectableCount > 0 && selectedCount === selectableCount) {
    return {
      text: "All languages selected (omit --langs)",
      className: "status-muted",
    };
  }

  return {
    text: `${selectedCount} smoke languages selected`,
    className: "status-ok",
  };
}

/**
 * Projects the next smoke-controls settings for one intent.
 *
 * @param {SmokeControlsSettings} settings Current smoke controls settings.
 * @param {ConductorSmokeIntent} intent Incoming smoke intent.
 * @returns {SmokeControlsSettings} Projected smoke controls settings.
 */
function projectSmokeSettings(
  settings: SmokeControlsSettings,
  intent: ConductorSmokeIntent
): SmokeControlsSettings {
  const languages = settings.languages.map((language) => {
    return {
      ...language,
    };
  });

  if (intent.kind === "setReportEnabled") {
    return {
      ...settings,
      languages,
      reportEnabled: intent.enabled,
    };
  }

  if (intent.kind === "setMarkdownPath") {
    return {
      ...settings,
      languages,
      markdownPath: intent.markdownPath,
    };
  }

  if (intent.kind === "setTimeoutSeconds") {
    return {
      ...settings,
      languages,
      timeoutSeconds: intent.timeoutSeconds,
    };
  }

  if (intent.kind === "setSlowTimeoutSeconds") {
    return {
      ...settings,
      languages,
      slowTimeoutSeconds: intent.slowTimeoutSeconds,
    };
  }

  if (intent.kind === "toggleLanguage") {
    return {
      ...settings,
      languages: languages.map((language) => {
        if (language.languageKey !== intent.languageKey || language.disabled) {
          return language;
        }

        return {
          ...language,
          selected: !language.selected,
        };
      }),
    };
  }

  if (intent.kind === "selectAllLanguages") {
    return {
      ...settings,
      languages: languages.map((language) => {
        if (language.disabled) {
          return {
            ...language,
            selected: false,
          };
        }

        return {
          ...language,
          selected: true,
        };
      }),
    };
  }

  return {
    ...settings,
    languages: languages.map((language) => {
      return {
        ...language,
        selected: false,
      };
    }),
  };
}

/**
 * Creates a deterministic smoke reaction output for one intent.
 *
 * @param {ConductorSmokeIntent} intent Smoke controls intent.
 * @param {SmokeControlsSettings} settings Current smoke settings.
 * @returns {ConductorSmokeReaction} Reaction result.
 */
function createSmokeIntentReaction(
  intent: ConductorSmokeIntent,
  settings: SmokeControlsSettings
): ConductorSmokeReaction {
  const stateEvents = [] as ConductorSmokeReaction["stateEvents"];

  if (intent.kind === "setReportEnabled") {
    stateEvents.push({ type: "SMOKE_REPORT_ENABLED_SET", enabled: intent.enabled });
  }

  if (intent.kind === "setMarkdownPath") {
    stateEvents.push({ type: "SMOKE_MARKDOWN_PATH_SET", path: intent.markdownPath });
  }

  if (intent.kind === "setTimeoutSeconds") {
    stateEvents.push({ type: "SMOKE_TIMEOUT_SECONDS_SET", seconds: intent.timeoutSeconds });
  }

  if (intent.kind === "setSlowTimeoutSeconds") {
    stateEvents.push({
      type: "SMOKE_SLOW_TIMEOUT_SECONDS_SET",
      seconds: intent.slowTimeoutSeconds,
    });
  }

  if (intent.kind === "toggleLanguage") {
    const targetedLanguage = settings.languages.find((language) => {
      return language.languageKey === intent.languageKey;
    });

    if (targetedLanguage !== undefined && !targetedLanguage.disabled) {
      stateEvents.push({ type: "SMOKE_LANGUAGE_TOGGLED", languageKey: intent.languageKey });
    }
  }

  if (intent.kind === "selectAllLanguages") {
    stateEvents.push({ type: "SMOKE_ALL_LANGUAGES_SELECTED" });
  }

  if (intent.kind === "deselectAllLanguages") {
    stateEvents.push({ type: "SMOKE_ALL_LANGUAGES_DESELECTED" });
  }

  const projectedSettings = projectSmokeSettings(settings, intent);
  const reportStatus = createSmokeReportStatus(projectedSettings);
  const selectionStatus = createSmokeSelectionStatus(projectedSettings.languages);

  stateEvents.push({
    type: "SMOKE_REPORT_STATUS_SET",
    statusText: reportStatus.text,
    statusClassName: reportStatus.className,
  });
  stateEvents.push({
    type: "SMOKE_SELECTION_STATUS_SET",
    statusText: selectionStatus.text,
    statusClassName: selectionStatus.className,
  });
  stateEvents.push({
    type: "SMOKE_STATUS_LABEL_SET",
    statusLabel: selectionStatus.text,
  });

  if (intent.kind === "setReportEnabled") {
    return {
      stateEvents,
      notification: {
        level: "info",
        message: intent.enabled
          ? "Smoke markdown report enabled"
          : "Smoke markdown report disabled",
      },
      shouldPublishSnapshot: true,
    };
  }

  if (intent.kind === "selectAllLanguages") {
    return {
      stateEvents,
      notification: {
        level: "info",
        message: "All smoke languages selected",
      },
      shouldPublishSnapshot: true,
    };
  }

  if (intent.kind === "deselectAllLanguages") {
    return {
      stateEvents,
      notification: {
        level: "warn",
        message: "All smoke languages deselected",
      },
      shouldPublishSnapshot: true,
    };
  }

  return {
    stateEvents,
    notification: null,
    shouldPublishSnapshot: true,
  };
}

/**
 * Projects the next run-controls settings for one intent.
 *
 * @param {RunControlsSettings} settings Current run controls settings.
 * @param {ConductorRunControlsIntent} intent Incoming run controls intent.
 * @returns {RunControlsSettings} Projected run controls settings.
 */
function projectRunControlsSettings(
  settings: RunControlsSettings,
  intent: ConductorRunControlsIntent
): RunControlsSettings {
  if (intent.kind === "setRunArgsEnabled") {
    return {
      ...settings,
      runArgsEnabled: intent.enabled,
    };
  }

  if (intent.kind === "setRunArgsText") {
    return {
      ...settings,
      runArgsText: intent.text,
    };
  }

  if (intent.kind === "setSourceProfileEnabled") {
    return {
      ...settings,
      sourceProfileEnabled: intent.enabled,
    };
  }

  if (intent.kind === "setSourceProfileText") {
    return {
      ...settings,
      sourceProfileText: intent.text,
    };
  }

  if (intent.kind === "setRunChecksMode") {
    const nextRoute = intent.mode === "check-only" ? settings.runChecksRoute : settings.runChecksRoute;

    return {
      ...settings,
      runChecksMode: intent.mode,
      runChecksRoute: nextRoute,
    };
  }

  if (intent.kind === "setRunChecksRoute") {
    return {
      ...settings,
      runChecksRoute: intent.route,
    };
  }

  if (intent.kind === "setCleanStdlibEnabled") {
    return {
      ...settings,
      cleanStdlibEnabled: intent.enabled,
    };
  }

  return {
    ...settings,
    cleanArchivesEnabled: intent.enabled,
  };
}

/**
 * Creates a deterministic run controls reaction output for one intent.
 *
 * @param {ConductorRunControlsIntent} intent Run controls intent.
 * @param {RunControlsSettings} settings Current run controls settings.
 * @returns {ConductorRunControlsReaction} Reaction result.
 */
function createRunControlsIntentReaction(
  intent: ConductorRunControlsIntent,
  settings: RunControlsSettings
): ConductorRunControlsReaction {
  const stateEvents = [] as ConductorRunControlsReaction["stateEvents"];

  if (intent.kind === "setRunArgsEnabled") {
    stateEvents.push({ type: "RUN_ARGS_ENABLED_SET", enabled: intent.enabled });
  }

  if (intent.kind === "setRunArgsText") {
    stateEvents.push({ type: "RUN_ARGS_TEXT_SET", text: intent.text });
  }

  if (intent.kind === "setSourceProfileEnabled") {
    stateEvents.push({ type: "RUN_SOURCE_PROFILE_ENABLED_SET", enabled: intent.enabled });
  }

  if (intent.kind === "setSourceProfileText") {
    stateEvents.push({ type: "RUN_SOURCE_PROFILE_TEXT_SET", text: intent.text });
  }

  if (intent.kind === "setRunChecksMode") {
    stateEvents.push({ type: "RUN_CHECKS_MODE_SET", mode: intent.mode });
  }

  if (intent.kind === "setRunChecksRoute") {
    stateEvents.push({ type: "RUN_CHECKS_ROUTE_SET", route: intent.route });
  }

  if (intent.kind === "setCleanStdlibEnabled") {
    stateEvents.push({ type: "RUN_CLEAN_STDLIB_ENABLED_SET", enabled: intent.enabled });
  }

  if (intent.kind === "setCleanArchivesEnabled") {
    stateEvents.push({ type: "RUN_CLEAN_ARCHIVES_ENABLED_SET", enabled: intent.enabled });
  }

  const projectedSettings = projectRunControlsSettings(settings, intent);
  const runArgsStatus = createRunArgsStatus(
    projectedSettings.runArgsEnabled,
    projectedSettings.runArgsText
  );
  const sourceProfileStatus = createSourceProfileStatus(
    projectedSettings.sourceProfileEnabled,
    projectedSettings.sourceProfileText
  );
  const runChecksStatus = createRunChecksStatus(
    projectedSettings.runChecksMode,
    projectedSettings.runChecksRoute
  );
  const cleanOptionsStatus = createCleanOptionsStatus(
    projectedSettings.cleanStdlibEnabled,
    projectedSettings.cleanArchivesEnabled
  );

  stateEvents.push({
    type: "RUN_ARGS_STATUS_SET",
    statusText: runArgsStatus.statusText,
    statusClassName: runArgsStatus.statusClassName,
  });
  stateEvents.push({
    type: "RUN_SOURCE_PROFILE_STATUS_SET",
    statusText: sourceProfileStatus.statusText,
    statusClassName: sourceProfileStatus.statusClassName,
  });
  stateEvents.push({
    type: "RUN_CHECKS_STATUS_SET",
    statusText: runChecksStatus.statusText,
    statusClassName: runChecksStatus.statusClassName,
  });
  stateEvents.push({
    type: "RUN_CLEAN_OPTIONS_STATUS_SET",
    statusText: cleanOptionsStatus.statusText,
    statusClassName: cleanOptionsStatus.statusClassName,
  });

  if (intent.kind === "setRunArgsEnabled") {
    return {
      stateEvents,
      notification: {
        level: "info",
        message: intent.enabled ? "Run arguments enabled" : "Run arguments disabled",
      },
      shouldPublishSnapshot: true,
    };
  }

  if (intent.kind === "setSourceProfileEnabled") {
    return {
      stateEvents,
      notification: {
        level: "info",
        message: intent.enabled
          ? "Profile sourcing override enabled"
          : "Profile sourcing override disabled",
      },
      shouldPublishSnapshot: true,
    };
  }

  return {
    stateEvents,
    notification: null,
    shouldPublishSnapshot: true,
  };
}

/**
 * Creates the conductor service bootstrap implementation.
 *
 * This is an interface-stable skeleton that intentionally defers full
 * run-registry and orchestration behavior to later slices.
 *
 * @param {CreateConductorServiceInput} [input] Optional conductor dependencies.
 * @returns {IConductor} Conductor implementation.
 */
export function createConductorService(
  input?: CreateConductorServiceInput
): IConductor {
  const runAdapter = input?.algorithmsTerminalRunAdapter;
  const runStatusRetentionMs = input?.runStatusRetentionMs ?? DEFAULT_RUN_STATUS_RETENTION_MS;
  const runTargetByRunId = new Map<string, string>();
  const runSnapshotsById = new Map<string, ConductorRunSnapshot>();
  const runSnapshotsByTarget = new Map<string, ConductorRunSnapshot>();
  const runStatusClearTimersByTarget = new Map<string, NodeJS.Timeout>();
  const runTargetListeners = new Set<
    (change: ConductorRunTargetStatusChange) => void
  >();

  /**
   * Clears one scheduled run-status timer for one target key.
   *
   * @param {string} targetKey Stable target key.
   * @returns {void}
   */
  function clearRunStatusTimer(targetKey: string): void {
    const existingTimer = runStatusClearTimersByTarget.get(targetKey);
    if (existingTimer === undefined) {
      return;
    }

    clearTimeout(existingTimer);
    runStatusClearTimersByTarget.delete(targetKey);
  }

  /**
   * Emits one target-status change event to subscribers.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {ConductorRunSnapshot} snapshot Updated snapshot.
   * @returns {void}
   */
  function publishRunTargetStatusChange(
    target: ConductorRunTargetRef,
    snapshot: ConductorRunSnapshot
  ): void {
    const change: ConductorRunTargetStatusChange = {
      target,
      snapshot,
    };

    for (const listener of runTargetListeners) {
      listener(change);
    }
  }

  /**
   * Stores one run snapshot by run id and target.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {ConductorRunSnapshot} snapshot Snapshot to store.
   * @returns {ConductorRunSnapshot} Stored snapshot.
   */
  function storeRunSnapshotForTarget(
    target: ConductorRunTargetRef,
    snapshot: ConductorRunSnapshot
  ): ConductorRunSnapshot {
    const targetKey = buildRunTargetKey(target);
    runSnapshotsById.set(snapshot.runId, snapshot);
    runTargetByRunId.set(snapshot.runId, targetKey);
    runSnapshotsByTarget.set(targetKey, snapshot);
    publishRunTargetStatusChange(target, snapshot);

    if (runStatusRetentionMs > 0) {
      clearRunStatusTimer(targetKey);

      const retainedRunId = snapshot.runId;
      const timeoutHandle = setTimeout(() => {
        runStatusClearTimersByTarget.delete(targetKey);

        const latestSnapshot = runSnapshotsByTarget.get(targetKey);
        if (latestSnapshot === undefined || latestSnapshot.runId !== retainedRunId) {
          return;
        }

        runSnapshotsByTarget.delete(targetKey);
        runTargetByRunId.delete(retainedRunId);
        publishRunTargetStatusChange(target, latestSnapshot);
      }, runStatusRetentionMs);

      runStatusClearTimersByTarget.set(targetKey, timeoutHandle);
    }

    return snapshot;
  }

  /**
   * Resolves the run target for one run identifier.
   *
   * @param {string} runId Run identifier.
   * @returns {ConductorRunTargetRef | null} Target reference or null.
   */
  function getRunTargetForRunId(runId: string): ConductorRunTargetRef | null {
    const targetKey = runTargetByRunId.get(runId);
    if (targetKey === undefined) {
      return null;
    }

    const separatorIndex = targetKey.indexOf(":");
    if (separatorIndex < 0) {
      return null;
    }

    const nodeKind = targetKey.slice(0, separatorIndex);
    const filePath = targetKey.slice(separatorIndex + 1);
    if (
      nodeKind !== "file"
      && nodeKind !== "mainFile"
      && nodeKind !== "languageSummary"
    ) {
      return null;
    }

    return {
      nodeKind,
      filePath,
    };
  }

  /**
   * Starts one run snapshot for one target.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string} ownerKey Run owner key.
   * @param {string | null} message Snapshot message.
   * @returns {ConductorRunSnapshot} Started snapshot.
   */
  function startRunForTarget(
    target: ConductorRunTargetRef,
    ownerKey: string,
    message: string | null
  ): ConductorRunSnapshot {
    const started = createBootstrapRunSnapshot({
      ownerKey,
      reason: message,
    });
    return storeRunSnapshotForTarget(target, started);
  }

  /**
   * Marks one target run as running.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string | null} message Optional status message.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null.
   */
  function markTargetRunRunning(
    target: ConductorRunTargetRef,
    message: string | null,
    expectedRunId?: string
  ): ConductorRunSnapshot | null {
    const targetKey = buildRunTargetKey(target);
    const snapshot = runSnapshotsByTarget.get(targetKey);
    if (snapshot === undefined) {
      return null;
    }

    if (expectedRunId !== undefined && snapshot.runId !== expectedRunId) {
      return null;
    }

    const updated: ConductorRunSnapshot = {
      ...snapshot,
      status: "running",
      message,
      updatedAt: Date.now(),
    };
    return storeRunSnapshotForTarget(target, updated);
  }

  /**
   * Marks one target run as failed.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string} errorMessage Failure message.
   * @returns {ConductorRunSnapshot} Updated snapshot.
   */
  function markTargetRunFailed(
    target: ConductorRunTargetRef,
    errorMessage: string,
    expectedRunId?: string
  ): ConductorRunSnapshot {
    const targetKey = buildRunTargetKey(target);
    const existing = runSnapshotsByTarget.get(targetKey);
    if (existing !== undefined && !matchesExpectedRunId(existing, expectedRunId)) {
      return existing;
    }

    const baseSnapshot = existing ?? createBootstrapRunSnapshot({
      ownerKey: `failed:${target.filePath}`,
      reason: null,
    });

    const updated: ConductorRunSnapshot = {
      ...baseSnapshot,
      status: "failed",
      errorMessage,
      message: errorMessage,
      updatedAt: Date.now(),
    };

    return storeRunSnapshotForTarget(target, updated);
  }

  /**
   * Marks one target run as completed.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string | null} message Completion message.
   * @param {string} [expectedRunId] Expected run id for stale-update protection.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null.
   */
  function markTargetRunCompleted(
    target: ConductorRunTargetRef,
    message: string | null,
    expectedRunId?: string
  ): ConductorRunSnapshot | null {
    const targetKey = buildRunTargetKey(target);
    const snapshot = runSnapshotsByTarget.get(targetKey);
    if (snapshot === undefined) {
      return null;
    }

    if (expectedRunId !== undefined && snapshot.runId !== expectedRunId) {
      return null;
    }

    const updated: ConductorRunSnapshot = {
      ...snapshot,
      status: "completed",
      errorMessage: null,
      message,
      updatedAt: Date.now(),
    };

    return storeRunSnapshotForTarget(target, updated);
  }

  const runLifecycle: RunFileStatusLifecycle = {
    start(target, ownerKey, message): ConductorRunSnapshot {
      return startRunForTarget(target, ownerKey, message ?? null);
    },
    markRunning(target, message, expectedRunId): void {
      markTargetRunRunning(target, message ?? null, expectedRunId);
    },
    markCompleted(target, message, expectedRunId): void {
      markTargetRunCompleted(target, message ?? null, expectedRunId);
    },
    markFailed(target, errorMessage, expectedRunId): void {
      markTargetRunFailed(target, errorMessage, expectedRunId);
    },
  };

  return {
    reactToSmokeIntent(input) {
      return createSmokeIntentReaction(input.intent, input.snapshot.smokeControls);
    },

    reactToRunControlsIntent(input) {
      return createRunControlsIntentReaction(input.intent, input.snapshot.runControls);
    },

    async runFile(input: ConductorRunFileInput): Promise<void> {
      await runAlgorithmsFile(input, runAdapter, runLifecycle);
    },

    getRunForTarget(target: ConductorRunTargetRef): ConductorRunSnapshot | null {
      const targetKey = buildRunTargetKey(target);
      const snapshot = runSnapshotsByTarget.get(targetKey);
      return snapshot ?? null;
    },

    subscribeRunTargetStatus(
      listener: (change: ConductorRunTargetStatusChange) => void
    ): ConductorSubscription {
      runTargetListeners.add(listener);
      return {
        dispose(): void {
          runTargetListeners.delete(listener);
        },
      };
    },

    startRun(input: ConductorStartRunInput): ConductorRunSnapshot {
      const snapshot = createBootstrapRunSnapshot(input);
      runSnapshotsById.set(snapshot.runId, snapshot);
      return snapshot;
    },

    markProgress(input: ConductorMarkProgressInput): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(input.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "running",
        message: input.message ?? snapshot.message,
        progressPercent: input.progressPercent ?? snapshot.progressPercent,
        stepKey: input.stepKey ?? snapshot.stepKey,
        updatedAt: Date.now(),
      };
      runSnapshotsById.set(updated.runId, updated);

      const target = getRunTargetForRunId(updated.runId);
      if (target !== null) {
        storeRunSnapshotForTarget(target, updated);
      }

      return updated;
    },

    markCompleted(input: ConductorMarkCompletedInput): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(input.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "completed",
        message: input.message ?? snapshot.message,
        errorMessage: null,
        updatedAt: Date.now(),
      };
      runSnapshotsById.set(updated.runId, updated);

      const target = getRunTargetForRunId(updated.runId);
      if (target !== null) {
        storeRunSnapshotForTarget(target, updated);
      }

      return updated;
    },

    markFailed(input: ConductorMarkFailedInput): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(input.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "failed",
        errorMessage: input.errorMessage,
        message: input.message ?? input.errorMessage,
        updatedAt: Date.now(),
      };
      runSnapshotsById.set(updated.runId, updated);

      const target = getRunTargetForRunId(updated.runId);
      if (target !== null) {
        storeRunSnapshotForTarget(target, updated);
      }

      return updated;
    },

    cancelRun(input: ConductorCancelRunInput): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(input.runId);
      if (snapshot === undefined) {
        return null;
      }

      const updated: ConductorRunSnapshot = {
        ...snapshot,
        status: "cancelled",
        message: input.message ?? snapshot.message,
        updatedAt: Date.now(),
      };
      runSnapshotsById.set(updated.runId, updated);

      const target = getRunTargetForRunId(updated.runId);
      if (target !== null) {
        storeRunSnapshotForTarget(target, updated);
      }

      return updated;
    },

    getRun(runId: string): ConductorRunSnapshot | null {
      const snapshot = runSnapshotsById.get(runId);
      return snapshot ?? null;
    },
  };
}
