import {
  ALGORITHMS_PROFILE_VARIABLES,
} from "./shellProfileCatalog";
import type { AlgorithmsProfileWritableValues } from "./shellProfileCatalog";
import {
  PROFILE_BLOCK_END,
  PROFILE_BLOCK_START,
} from "./shellProfileParse";

/**
 * Render options for one managed profile block.
 */
export interface RenderAlgorithmsProfileBlockOptions {
  lineEnding?: string;
}

/**
 * Escapes one shell-profile export value for double-quoted output.
 *
 * @param {string} value Raw export value.
 * @returns {string} Escaped export value.
 */
function escapeProfileValue(value: string): string {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Detects the preferred line ending for one profile text body.
 *
 * @param {string} profileText Existing profile text.
 * @returns {string} Preferred line ending sequence.
 */
function detectLineEnding(profileText: string): string {
  if (String(profileText).includes("\r\n")) {
    return "\r\n";
  }

  return "\n";
}

/**
 * Removes one immediate trailing newline sequence from a block suffix.
 *
 * @param {string} text Text following the managed block.
 * @returns {string} Suffix without the first trailing newline sequence.
 */
function trimLeadingLineEnding(text: string): string {
  const rawText = String(text || "");

  if (rawText.startsWith("\r\n")) {
    return rawText.slice(2);
  }

  if (rawText.startsWith("\n") || rawText.startsWith("\r")) {
    return rawText.slice(1);
  }

  return rawText;
}

/**
 * Ensures one text prefix ends on a line boundary before inserting a block.
 *
 * @param {string} prefix Text before the managed block.
 * @param {string} lineEnding Preferred line ending sequence.
 * @returns {string} Prefix ready for block insertion.
 */
function ensureTrailingLineBoundary(prefix: string, lineEnding: string): string {
  const rawPrefix = String(prefix || "");

  if (rawPrefix.length === 0) {
    return rawPrefix;
  }

  if (rawPrefix.endsWith("\n") || rawPrefix.endsWith("\r")) {
    return rawPrefix;
  }

  return `${rawPrefix}${lineEnding}`;
}

/**
 * Ensures one text suffix starts on a new line after a block.
 *
 * @param {string} suffix Text after the managed block.
 * @param {string} lineEnding Preferred line ending sequence.
 * @returns {string} Suffix ready for block insertion.
 */
function ensureLeadingLineBoundary(suffix: string, lineEnding: string): string {
  const rawSuffix = String(suffix || "");

  if (rawSuffix.length === 0) {
    return rawSuffix;
  }

  if (rawSuffix.startsWith("\n") || rawSuffix.startsWith("\r")) {
    return rawSuffix;
  }

  return `${lineEnding}${rawSuffix}`;
}

/**
 * Renders one managed DEREKALGOS shell-profile block.
 *
 * Undefined and null values are omitted. Empty strings are emitted as empty
 * quoted exports so callers can explicitly clear a managed value.
 *
 * @param {AlgorithmsProfileWritableValues} values Managed raw values.
 * @param {RenderAlgorithmsProfileBlockOptions} [options] Rendering options.
 * @returns {string} Rendered managed block text.
 */
export function renderAlgorithmsProfileBlock(
  values: AlgorithmsProfileWritableValues,
  options?: RenderAlgorithmsProfileBlockOptions): string {

  const lineEnding = options?.lineEnding ?? "\n";
  const lines = [PROFILE_BLOCK_START];

  for (const entry of ALGORITHMS_PROFILE_VARIABLES) {
    const rawValue = values[entry.key];

    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    lines.push(
      `export ${entry.exportName}="${escapeProfileValue(String(rawValue))}"`
    );
  }

  lines.push(PROFILE_BLOCK_END);

  return lines.join(lineEnding);
}

/**
 * Replaces or appends the managed DEREKALGOS block in one shell profile.
 *
 * @param {string} profileText Existing profile file text.
 * @param {AlgorithmsProfileWritableValues} values Managed raw values.
 * @returns {string} Updated profile file text.
 */
export function upsertAlgorithmsProfileBlock(
  profileText: string,
  values: AlgorithmsProfileWritableValues): string {

  const rawProfileText = String(profileText || "");
  const lineEnding = detectLineEnding(rawProfileText);
  const renderedBlock = renderAlgorithmsProfileBlock(values, { lineEnding });
  const blockStartIndex = rawProfileText.indexOf(PROFILE_BLOCK_START);
  const blockEndIndex = blockStartIndex >= 0
    ? rawProfileText.indexOf(PROFILE_BLOCK_END, blockStartIndex + PROFILE_BLOCK_START.length)
    : -1;

  if (blockStartIndex >= 0 && blockEndIndex > blockStartIndex) {
    const blockEndExclusive = blockEndIndex + PROFILE_BLOCK_END.length;
    const prefix = ensureTrailingLineBoundary(
      rawProfileText.slice(0, blockStartIndex),
      lineEnding
    );
    const suffix = ensureLeadingLineBoundary(
      trimLeadingLineEnding(rawProfileText.slice(blockEndExclusive)),
      lineEnding
    );

    return `${prefix}${renderedBlock}${suffix}`;
  }

  const prefix = ensureTrailingLineBoundary(rawProfileText, lineEnding);
  return `${prefix}${renderedBlock}`;
}
