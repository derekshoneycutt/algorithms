import * as path from "node:path";

import type {
  ConductorCancelRunInput,
  ConductorClearRunResultsInput,
  ConductorClearSmokeResultsInput,
  ConductorMarkCompletedInput,
  ConductorMarkFailedInput,
  ConductorMarkProgressInput,
  ConductorNotificationEffect,
  ConductorRunControlsIntent,
  ConductorRunControlsReaction,
  ConductorRunActionKind,
  ConductorRunFileInput,
  ConductorRunTargetRef,
  ConductorRunTargetStatusChange,
  ConductorSmokeReaction,
  ConductorRunSnapshot,
  ConductorSmokeIntent,
  ConductorStartRunInput,
  ConductorStopSmokeTestInput,
  ConductorSubscription,
  IConductor,
} from "./IConductor";
import type { ViewToHostMessage } from "../comms/shared/messageTypes";
import type {
  CommandLineResult,
  IAlgorithmsTerminalRunAdapter,
  ICommandLine,
  ICommandLineProcessHandle,
} from "../commandline";
import { resolveAlgorithmsRootPath } from "../algorithms";
import type {
  IStateMachine,
  RunControlsSettings,
  SmokeLanguageRunStatus,
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
const COMPILE_ONLY_COMMAND_ID = "algorithms.compile-only";
const CHECK_ONLY_COMMAND_ID = "algorithms.check-only";
const CLEAN_COMMAND_ID = "algorithms.clean";
const LOCAL_CLEAN_COMMAND_ID = "algorithms.localclean";
const SMOKE_TEST_COMMAND_ID = "algorithms.smoke-test";
const DEFAULT_RUN_STATUS_RETENTION_MS = 120_000;
const SMOKE_STATUS_LINE_REGEX =
  /SMOKE\s+\[\d+\/\d+\].*?lang=([a-zA-Z0-9_+\-]+).*?\[(RUNNING|PASS|FAIL|TIMEOUT)\]/;

/**
 * Maps one smoke terminal token to a runtime smoke status.
 *
 * @param {string} token Smoke status token parsed from terminal output.
 * @returns {SmokeLanguageRunStatus | null} Runtime smoke status.
 */
function mapSmokeTokenToRuntimeStatus(token: string): SmokeLanguageRunStatus | null {
  const normalizedToken = token.trim().toUpperCase();

  if (normalizedToken === "RUNNING") {
    return "running";
  }

  if (normalizedToken === "PASS") {
    return "passed";
  }

  if (normalizedToken === "FAIL" || normalizedToken === "TIMEOUT") {
    return "failed";
  }

  return null;
}

/**
 * Parses one smoke status output line.
 *
 * @param {string} line One terminal output line.
 * @returns {{languageKey: string, status: SmokeLanguageRunStatus} | null} Parsed status payload.
 */
function parseSmokeStatusLine(
  line: string
): { languageKey: string; status: SmokeLanguageRunStatus } | null {
  const match = SMOKE_STATUS_LINE_REGEX.exec(line);
  if (match === null) {
    return null;
  }

  const languageKey = match[1].trim().toLowerCase();
  const status = mapSmokeTokenToRuntimeStatus(match[2]);
  if (languageKey.length === 0 || status === null) {
    return null;
  }

  return {
    languageKey,
    status,
  };
}

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
  markCancelled(
    target: ConductorRunTargetRef,
    message?: string | null,
    expectedRunId?: string
  ): void;
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
 * Deferred smoke status retention operations.
 */
interface SmokeStatusRetentionLifecycle {
  clearNow(
    algorithmPath: string,
    hostState: IStateMachine,
    refreshAlgorithmsTree: () => void
  ): boolean;
  markStarted(algorithmPath: string, runId: string): void;
  markFinished(
    algorithmPath: string,
    runId: string,
    hostState: IStateMachine,
    refreshAlgorithmsTree: () => void
  ): void;
}

/**
 * One active smoke execution tracked for stop support.
 */
interface ActiveSmokeExecution {
  algorithmPath: string;
  handle: ICommandLineProcessHandle;
  result: Promise<CommandLineResult>;
  runId: string;
  stopRequested: boolean;
  target: ConductorRunTargetRef;
}

/**
 * Dependencies required to create the conductor service.
 */
export interface CreateConductorServiceInput {
  algorithmsTerminalRunAdapter?: IAlgorithmsTerminalRunAdapter;
  commandLine?: ICommandLine;
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
  kind: "file" | "mainFile" | "languageSummary" | "algorithmDir";
  languageKey?: string;
  parentAlgorithmPath?: string;
};

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
 * @param {NonNullable<ConductorRunFileInput["treeNode"]>} treeNode Source node.
 * @returns {string} Algorithm directory path.
 */
function resolveAlgorithmDirectoryPath(
  treeNode: RunnableTreeNode
): string {
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
 * Returns the effective action kind for one run-file input.
 *
 * @param {ConductorRunFileInput} input Run input.
 * @returns {ConductorRunActionKind} Effective action kind.
 */
function resolveRunActionKind(input: ConductorRunFileInput): ConductorRunActionKind {
  return input.actionKind ?? "run-file";
}

/**
 * Returns true when action requires one concrete source-file target.
 *
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {boolean} True when file existence must be validated.
 */
function actionRequiresConcreteTargetFile(actionKind: ConductorRunActionKind): boolean {
  return actionKind !== "clean" && actionKind !== "localclean" && actionKind !== "smoke-test";
}

/**
 * Returns true when action supports passthrough run arguments.
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
 * @param {IAlgorithmsTerminalRunAdapter | undefined} runAdapter Terminal run adapter.
 * @param {ICommandLine | undefined} commandLine Commandline process adapter.
 * @returns {Promise<void>} Resolves after orchestration completes.
 */
async function runAlgorithmsFile(
  input: ConductorRunFileInput,
  runAdapter: IAlgorithmsTerminalRunAdapter | undefined,
  commandLine: ICommandLine | undefined,
  runLifecycle: RunFileStatusLifecycle,
  smokeStatusRetentionLifecycle: SmokeStatusRetentionLifecycle,
  activeSmokeExecutionByAlgorithm: Map<string, ActiveSmokeExecution>
): Promise<void> {
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
        .filter((languageKey) => {
          return languageKey.length > 0;
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
  const commandLine = input?.commandLine;
  const runStatusRetentionMs = input?.runStatusRetentionMs ?? DEFAULT_RUN_STATUS_RETENTION_MS;
  const smokeStatusRetentionMs = runStatusRetentionMs;
  const runTargetByRunId = new Map<string, string>();
  const runSnapshotsById = new Map<string, ConductorRunSnapshot>();
  const runSnapshotsByTarget = new Map<string, ConductorRunSnapshot>();
  const runStatusClearTimersByTarget = new Map<string, NodeJS.Timeout>();
  const smokeStatusClearTimersByAlgorithm = new Map<string, NodeJS.Timeout>();
  const latestSmokeRunIdByAlgorithm = new Map<string, string>();
  const activeSmokeExecutionByAlgorithm = new Map<string, ActiveSmokeExecution>();
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
      && nodeKind !== "algorithmDir"
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

  /**
   * Marks one target run as cancelled.
   *
   * @param {ConductorRunTargetRef} target Run target reference.
   * @param {string | null} message Cancellation message.
   * @param {string} [expectedRunId] Expected run id for stale-update protection.
   * @returns {ConductorRunSnapshot | null} Updated snapshot or null.
   */
  function markTargetRunCancelled(
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
      status: "cancelled",
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
    markCancelled(target, message, expectedRunId): void {
      markTargetRunCancelled(target, message ?? null, expectedRunId);
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

  const smokeStatusRetentionLifecycle: SmokeStatusRetentionLifecycle = {
    clearNow(
      algorithmPath,
      hostState,
      refreshAlgorithmsTree
    ): boolean {
      const existingTimer = smokeStatusClearTimersByAlgorithm.get(algorithmPath);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
        smokeStatusClearTimersByAlgorithm.delete(algorithmPath);
      }

      const runId = latestSmokeRunIdByAlgorithm.get(algorithmPath);
      if (runId === undefined) {
        return false;
      }

      latestSmokeRunIdByAlgorithm.delete(algorithmPath);
      hostState.send({
        type: "SMOKE_RUN_STATUS_CLEARED",
        algorithmPath,
        runId,
      });
      refreshAlgorithmsTree();
      return true;
    },

    markStarted(algorithmPath, runId): void {
      latestSmokeRunIdByAlgorithm.set(algorithmPath, runId);

      const existingTimer = smokeStatusClearTimersByAlgorithm.get(algorithmPath);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
        smokeStatusClearTimersByAlgorithm.delete(algorithmPath);
      }
    },

    markFinished(
      algorithmPath,
      runId,
      hostState,
      refreshAlgorithmsTree
    ): void {
      if (smokeStatusRetentionMs <= 0) {
        hostState.send({
          type: "SMOKE_RUN_STATUS_CLEARED",
          algorithmPath,
          runId,
        });
        refreshAlgorithmsTree();
        return;
      }

      const existingTimer = smokeStatusClearTimersByAlgorithm.get(algorithmPath);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
      }

      const timeoutHandle = setTimeout(() => {
        smokeStatusClearTimersByAlgorithm.delete(algorithmPath);

        const latestRunId = latestSmokeRunIdByAlgorithm.get(algorithmPath);
        if (latestRunId !== runId) {
          return;
        }

        latestSmokeRunIdByAlgorithm.delete(algorithmPath);
        hostState.send({
          type: "SMOKE_RUN_STATUS_CLEARED",
          algorithmPath,
          runId,
        });
        refreshAlgorithmsTree();
      }, smokeStatusRetentionMs);

      smokeStatusClearTimersByAlgorithm.set(algorithmPath, timeoutHandle);
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
      await runAlgorithmsFile(
        input,
        runAdapter,
        commandLine,
        runLifecycle,
        smokeStatusRetentionLifecycle,
        activeSmokeExecutionByAlgorithm
      );
    },

    async stopSmokeTest(input: ConductorStopSmokeTestInput): Promise<boolean> {
      const activeSmokeExecution = activeSmokeExecutionByAlgorithm.get(input.algorithmPath);
      if (activeSmokeExecution === undefined) {
        return false;
      }

      activeSmokeExecution.stopRequested = true;
      const killResult = activeSmokeExecution.handle.kill("SIGTERM");
      if (!killResult.ok && killResult.reason !== "not-running") {
        return false;
      }

      await activeSmokeExecution.result;
      return true;
    },

    clearSmokeResults(input: ConductorClearSmokeResultsInput): boolean {
      if (activeSmokeExecutionByAlgorithm.has(input.algorithmPath)) {
        return false;
      }

      return smokeStatusRetentionLifecycle.clearNow(
        input.algorithmPath,
        input.hostState,
        input.refreshAlgorithmsTree
      );
    },

    clearRunResults(input: ConductorClearRunResultsInput): boolean {
      const targetKey = buildRunTargetKey(input.target);
      const snapshot = runSnapshotsByTarget.get(targetKey);
      if (snapshot === undefined) {
        return false;
      }

      if (snapshot.status === "starting" || snapshot.status === "running") {
        return false;
      }

      clearRunStatusTimer(targetKey);
      runSnapshotsByTarget.delete(targetKey);
      runTargetByRunId.delete(snapshot.runId);
      publishRunTargetStatusChange(input.target, snapshot);
      input.refreshAlgorithmsTree();
      return true;
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
