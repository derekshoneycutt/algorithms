import type { SmokeLanguageRunStatus } from "../../state";

const SMOKE_STATUS_LINE_REGEX =
  /SMOKE\s+\[\d+\/\d+\].*?lang=([a-zA-Z0-9_+\-]+).*?(?:\[(RUNNING|PASS|FAIL|TIMEOUT)\]|\b(RUNNING|PASS|FAIL|TIMEOUT)\b)/;

/**
 * Removes ANSI control sequences from one terminal output line.
 *
 * @param {string} value Raw terminal output line.
 * @returns {string} Line without ANSI escape/control sequences.
 */
function stripAnsiControlSequences(value: string): string {
  return value.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

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
export function parseSmokeStatusLine(
  line: string
): { languageKey: string; status: SmokeLanguageRunStatus } | null {
  const normalizedLine = stripAnsiControlSequences(line);
  const match = SMOKE_STATUS_LINE_REGEX.exec(normalizedLine);
  if (match === null) {
    return null;
  }

  const languageKey = match[1].trim().toLowerCase();
  const statusToken = match[2] ?? match[3] ?? "";
  const status = mapSmokeTokenToRuntimeStatus(statusToken);
  if (languageKey.length === 0 || status === null) {
    return null;
  }

  return {
    languageKey,
    status,
  };
}
