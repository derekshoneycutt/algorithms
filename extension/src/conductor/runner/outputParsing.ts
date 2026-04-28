import type { SmokeLanguageRunStatus } from "../../state";

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
export function parseSmokeStatusLine(
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
