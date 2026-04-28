/**
 * Parses raw init.sh check-environment output for error lines and fallback display.
 *
 * Extracts lines matching error patterns, or returns last 40 lines if no errors found.
 *
 * @param {string} rawOutput Raw combined stdout/stderr from check-env.
 * @returns {object} Errors array, filtered output for display, and raw output.
 */
export function parseCheckEnvOutput(rawOutput: string): {
  errors: string[];
  filteredOutput: string;
  rawOutput: string;
} {
  const rawText = String(rawOutput || "");
  const lines = rawText.split("\n");
  const errorLines = lines.filter((line) => {
    return /(error|invalid|failed|missing|unsupported)/i.test(line);
  });

  let filteredOutput = rawText;

  if (errorLines.length > 0) {
    filteredOutput = errorLines.join("\n");
  } else if (lines.length > 40) {
    filteredOutput = lines.slice(-40).join("\n");
  }

  return {
    errors: errorLines,
    filteredOutput,
    rawOutput: rawText,
  };
}

/**
 * Builds the shell command for check-environment diagnostics.
 *
 * @param {string} repositoryRoot Repository root directory.
 * @param {string} [profilePath] Optional profile path override.
 * @returns {string} Shell command to execute.
 */
export function buildCheckEnvCommand(
  repositoryRoot: string,
  profilePath?: string
): string {
  const baseDir = String(repositoryRoot || "");
  const args = ["--no-prompt", "--no-icons"];

  if (profilePath) {
    const trimmedPath = String(profilePath).trim();
    if (trimmedPath.length > 0) {
      args.push(`--update-profile=${trimmedPath}`);
    }
  }

  args.push("--check-env");

  const escapedBaseDir = baseDir.replace(/'/g, "'\"'\"'");

  return `sh '${escapedBaseDir}/init.sh' ${args
    .map((arg) => `'${arg.replace(/'/g, "'\"'\"'")}'`)
    .join(" ")}`;
}

/**
 * Builds the shell command for copy-icons operation.
 *
 * @param {string} repositoryRoot Repository root directory.
 * @param {string} [profilePath] Optional profile path override.
 * @param {string} [copyIconsPath] Optional destination path for icons.
 * @returns {string} Shell command to execute.
 */
export function buildCopyIconsCommand(
  repositoryRoot: string,
  profilePath?: string,
  copyIconsPath?: string
): string {
  const baseDir = String(repositoryRoot || "");
  const args = ["--no-prompt", "--copy-icons", "--skip-environment"];

  if (profilePath) {
    const trimmedPath = String(profilePath).trim();
    if (trimmedPath.length > 0) {
      args.push(`--update-profile=${trimmedPath}`);
    }
  }

  if (copyIconsPath) {
    const trimmedPath = String(copyIconsPath).trim();
    if (trimmedPath.length > 0) {
      args.push(`--icons-to=${trimmedPath}`);
    }
  }

  const escapedBaseDir = baseDir.replace(/'/g, "'\"'\"'");

  return `sh '${escapedBaseDir}/init.sh' ${args
    .map((arg) => `'${arg.replace(/'/g, "'\"'\"'")}'`)
    .join(" ")}`;
}
