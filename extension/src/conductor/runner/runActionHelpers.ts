import * as path from "node:path";

import type { ConductorRunActionKind, ConductorRunFileInput } from "../IConductor";
import type { RunControlsSettings, SmokeControlsSettings } from "../../state";
import { parseRunArgumentsText } from "../../state";

export const RUN_FILE_COMMAND_ID = "algorithms.run-file";
export const COMPILE_ONLY_COMMAND_ID = "algorithms.compile-only";
export const CHECK_ONLY_COMMAND_ID = "algorithms.check-only";
export const CLEAN_COMMAND_ID = "algorithms.clean";
export const LOCAL_CLEAN_COMMAND_ID = "algorithms.localclean";
export const SMOKE_TEST_COMMAND_ID = "algorithms.smoke-test";

/**
 * Returns the effective action kind for one run-file input.
 *
 * @param {ConductorRunFileInput} input Run input.
 * @returns {ConductorRunActionKind} Effective action kind.
 */
export function resolveRunActionKind(input: ConductorRunFileInput): ConductorRunActionKind {
  return input.actionKind ?? "run-file";
}

/**
 * Returns true when the action requires one concrete source-file target.
 *
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {boolean} True when file existence must be validated.
 */
export function actionRequiresConcreteTargetFile(actionKind: ConductorRunActionKind): boolean {
  return actionKind !== "clean" && actionKind !== "localclean" && actionKind !== "smoke-test";
}

/**
 * Returns true when the action supports passthrough run arguments.
 *
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {boolean} True when passthrough args should be parsed and forwarded.
 */
export function actionSupportsPassthroughArguments(actionKind: ConductorRunActionKind): boolean {
  return actionKind === "run-file" || actionKind === "compile-only" || actionKind === "check-only";
}

/**
 * Returns one state-machine command id for one action kind.
 *
 * @param {ConductorRunActionKind} actionKind Execution action.
 * @returns {string} Command identifier.
 */
export function getCommandIdForAction(actionKind: ConductorRunActionKind): string {
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
export function getActionLabel(actionKind: ConductorRunActionKind): string {
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
 * @param {"native" | "docker" | "ssh" | undefined} checkOnlyRouteOverride Optional check-only route override.
 * @returns {string[]} run.sh option tokens.
 */
export function buildRunControlOptionTokens(
  runControls: RunControlsSettings,
  actionKind: ConductorRunActionKind,
  checkOnlyRouteOverride?: "native" | "docker" | "ssh"
): string[] {
  const optionTokens: string[] = [];

  if (runControls.sourceProfileEnabled) {
    optionTokens.push(`--source-profile=${runControls.sourceProfileText}`);
  }

  if (actionKind === "compile-only") {
    optionTokens.push("--compile-only");
  } else if (actionKind === "check-only") {
    optionTokens.push(`--check-only=${checkOnlyRouteOverride ?? runControls.runChecksRoute}`);
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
export function buildSmokeTestOptionTokens(
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
export function buildRunControlPassthroughTokens(
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
 * Builds one stop confirmation message for one algorithm path.
 *
 * @param {string} algorithmDirectoryPath Algorithm directory path.
 * @returns {string} Human-readable stop message.
 */
export function buildSmokeStoppedMessage(algorithmDirectoryPath: string): string {
  return `Smoke Test stopped for ${path.basename(algorithmDirectoryPath)}.`;
}
