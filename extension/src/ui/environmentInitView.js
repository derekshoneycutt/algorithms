const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const vscode = require("vscode");
const { resolveEligibilityState } = require("../runtime/pathResolver");
const {
  getSupportedLanguageKeys,
} = require("../validation/inputValidation");

// Stable view identifier contributed in package.json.
const ENVIRONMENT_VIEW_ID = "algosWorkspaceEnvironmentView";
// Relative directory containing packaged language icons.
const LANGUAGE_ICON_PATH_SEGMENT = "icons/languages";
// Relative fallback icon path used when a language icon is missing.
const FALLBACK_ICON_PATH_SEGMENT = "icons/play-sidebar.svg";
// init.sh export block marker start.
const PROFILE_BLOCK_START = "# >>> DEREKALGOS INIT >>>";
// init.sh export block marker end.
const PROFILE_BLOCK_END = "# <<< DEREKALGOS INIT <<<";

// Language-to-icon mapping aligned to other extension panels.
const LANGUAGE_ICON_FILE_BY_KEY = {
  ada: "ada.svg",
  arm64asm: "assembly.svg",
  asm: "assembly.svg",
  ballerina: "ballerina.svg",
  c: "c.svg",
  clojure: "clojure.svg",
  cobol: "cobol.svg",
  cpp: "cpp.svg",
  csharp: "csharp.svg",
  d: "d.svg",
  dart: "dart.svg",
  eiffel: "eiffel.svg",
  elixir: "elixir.svg",
  erlang: "erlang.svg",
  factor: "factor.svg",
  forth: "forth.svg",
  fortran: "fortran.svg",
  freebasic: "freebasic.svg",
  fsharp: "fsharp.svg",
  gleam: "gleam.svg",
  go: "go.svg",
  haskell: "haskell.svg",
  haxe: "haxe.svg",
  icon: "icon.svg",
  idris: "idris.svg",
  java: "java.svg",
  javascript: "javascript.svg",
  julia: "julia.svg",
  kit: "kit.svg",
  kotlin: "kotlin.svg",
  llvmir: "llvm.png",
  lua: "lua.svg",
  mercury: "mercury.svg",
  mmixal: "assembly.svg",
  modula3: "modula3.svg",
  mojo: "mojo.svg",
  nasm: "assembly.svg",
  nim: "nim.svg",
  oberon: "oberon.svg",
  objectivec: "objective-c.svg",
  ocaml: "ocaml.svg",
  octave: "octave.svg",
  pascal: "pascal.svg",
  perl: "perl.svg",
  php: "php.svg",
  prolog: "prolog.svg",
  python: "python.svg",
  r: "r.svg",
  racket: "racket.svg",
  ruby: "ruby.svg",
  rust: "rust.svg",
  scala: "scala.svg",
  scheme: "scheme.svg",
  simula: "simula.svg",
  smalltalk: "smalltalk.svg",
  swift: "swift.svg",
  tcl: "tcl.svg",
  typescript: "typescript.svg",
  v: "vlang.svg",
  visualbasic: "visualstudio.svg",
  wat: "webassembly.svg",
  zig: "zig.svg",
};

// Variable save controls displayed in the Environment pane.
const CORE_VARIABLE_DEFINITIONS = [
  {
    key: "timeout",
    label: "Timeout",
    optionName: "use-timeout",
    profileExportName: "DEREKALGOS_TIMEOUT",
  },
  {
    key: "eiffel",
    label: "Eiffel",
    optionName: "use-eiffel",
    profileExportName: "DEREKALGOS_EIFFEL",
  },
  {
    key: "gcc13Directory",
    label: "GCC13 Directory",
    optionName: "use-gcc13",
    profileExportName: "DEREKALGOS_GCC13",
  },
  {
    key: "gcc13Name",
    label: "GCC13 Name",
    optionName: "use-gcc13name",
    profileExportName: "DEREKALGOS_GCC13NAME",
  },
  {
    key: "gxx13Name",
    label: "GXX13 Name",
    optionName: "use-gxx13name",
    profileExportName: "DEREKALGOS_GXX13NAME",
  },
];

/**
 * Escapes text for safe HTML interpolation.
 *
 * @param {string} text Raw text value.
 * @returns {string} HTML-safe text.
 */
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns a nonce for CSP-safe inline scripts.
 *
 * @returns {string} Nonce value.
 */
function createNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";

  for (let index = 0; index < 24; index += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return nonce;
}

/**
 * Serializes JSON for safe inline-script embedding.
 *
 * @param {unknown} value JSON-serializable value.
 * @returns {string} Safe JSON string.
 */
function serializeForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Resolves a canonical path and falls back to absolute normalization if needed.
 *
 * @param {string} targetPath Input path to normalize.
 * @returns {string} Canonical or normalized absolute path.
 */
function realpathSafe(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch (_) {
    return path.resolve(targetPath);
  }
}

/**
 * Expands a leading home marker in a profile path.
 *
 * @param {string} profilePath Candidate profile path.
 * @returns {string} Expanded profile path.
 */
function expandHomePath(profilePath) {
  const rawValue = String(profilePath || "").trim();

  if (!rawValue) {
    return "";
  }

  if (rawValue === "~") {
    return os.homedir();
  }

  if (rawValue.startsWith("~/")) {
    return path.join(os.homedir(), rawValue.slice(2));
  }

  return rawValue;
}

/**
 * Reads a text file safely and returns an empty string on failure.
 *
 * @param {string} filePath Text file path.
 * @returns {string} File contents or empty string.
 */
function readTextFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (_) {
    return "";
  }
}

/**
 * Returns workspace folders from VS Code API.
 *
 * @returns {import("vscode").WorkspaceFolder[]} Open workspace folders.
 */
function getWorkspaceFolders() {
  return vscode.workspace.workspaceFolders || [];
}

/**
 * Resolves the active supported repository root and init.sh path.
 *
 * @returns {{resolvedRootPath: string|null, initScriptPath: string|null}} Root resolution metadata.
 */
function resolveEnvironmentRootInfo() {
  const eligibilityState = resolveEligibilityState(getWorkspaceFolders());
  const resolvedRootPath = eligibilityState?.selected?.resolvedRoot || null;

  if (!resolvedRootPath) {
    return {
      resolvedRootPath: null,
      initScriptPath: null,
    };
  }

  const canonicalRootPath = realpathSafe(resolvedRootPath);
  const initScriptPath = path.join(canonicalRootPath, "init.sh");

  try {
    if (!fs.statSync(initScriptPath).isFile()) {
      return {
        resolvedRootPath: null,
        initScriptPath: null,
      };
    }
  } catch (_) {
    return {
      resolvedRootPath: null,
      initScriptPath: null,
    };
  }

  return {
    resolvedRootPath: canonicalRootPath,
    initScriptPath,
  };
}

/**
 * Returns the platform-specific placeholder profile path.
 *
 * @returns {string} Placeholder profile path.
 */
function getProfilePlaceholderForPlatform() {
  if (process.platform === "freebsd") {
    return "~/.profile";
  }

  if (process.platform === "darwin") {
    return "~/.zprofile";
  }

  return "~/.bash_profile";
}

/**
 * Returns the platform-specific default profile path used for state hydration.
 *
 * @returns {string} Default profile path.
 */
function getDefaultProfilePathForPlatform() {
  return expandHomePath(getProfilePlaceholderForPlatform());
}

/**
 * Extracts one shell assignment value from init.sh.
 *
 * @param {string} scriptText init.sh text.
 * @param {string} variableName Assignment variable name.
 * @returns {string|null} Extracted assignment value or null.
 */
function extractShellAssignment(scriptText, variableName) {
  const assignmentPattern = new RegExp(`^${variableName}=(.*)$`, "m");
  const match = String(scriptText || "").match(assignmentPattern);

  if (!match) {
    return null;
  }

  const rawValue = String(match[1] || "").trim();

  if (
    rawValue.startsWith('"')
    && rawValue.endsWith('"')
    && rawValue.length >= 2
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

/**
 * Extracts one managed export value from a profile file.
 *
 * @param {string} profileText Profile file text.
 * @param {string} exportName Export variable name.
 * @returns {{present: boolean, value: string}} Export presence and value.
 */
function extractManagedExportValue(profileText, exportName) {
  const text = String(profileText || "");
  const blockStartIndex = text.indexOf(PROFILE_BLOCK_START);
  const blockEndIndex = text.indexOf(PROFILE_BLOCK_END);
  const scopedText =
    blockStartIndex >= 0 && blockEndIndex > blockStartIndex
      ? text.slice(blockStartIndex, blockEndIndex)
      : text;
  const exportPattern = new RegExp(`^export ${exportName}=(.*)$`, "m");
  const match = scopedText.match(exportPattern);

  if (!match) {
    return {
      present: false,
      value: "",
    };
  }

  let rawValue = String(match[1] || "").trim();

  if (
    rawValue.startsWith('"')
    && rawValue.endsWith('"')
    && rawValue.length >= 2
  ) {
    rawValue = rawValue.slice(1, -1);
  }

  rawValue = rawValue.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

  return {
    present: true,
    value: rawValue,
  };
}

/**
 * Parses init.sh defaults used by the Environment pane.
 *
 * @param {string} initScriptText init.sh text.
 * @param {string|null} resolvedRootPath Canonical repository root path.
 * @returns {{copyIconsTo: string, timeout: string, eiffel: string, gcc13Directory: string, gcc13Name: string, gxx13Name: string, runOnDocker: string, runOnSsh: string, supportedLanguageKeys: string[]}} Parsed defaults.
 */
function parseInitDefaults(initScriptText, resolvedRootPath) {
  const fallbackLanguageKeys = resolvedRootPath
    ? [...getSupportedLanguageKeys(resolvedRootPath)].sort((left, right) =>
        left.localeCompare(right)
      )
    : [];
  const supportedLanguageKeysText =
    extractShellAssignment(initScriptText, "supportedLanguageKeys") || "";
  const parsedSupportedLanguageKeys = supportedLanguageKeysText
    ? supportedLanguageKeysText
        .split(/\s+/)
        .map((languageKey) => languageKey.trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
    : fallbackLanguageKeys;

  return {
    copyIconsTo:
      extractShellAssignment(initScriptText, "copyIconsTo")
      || "~/.vscode/extensions/icons/",
    timeout: extractShellAssignment(initScriptText, "useTimeout") || "-k 10s 2m",
    eiffel: extractShellAssignment(initScriptText, "useEiffel") || "eiffelstudio",
    gcc13Directory:
      extractShellAssignment(initScriptText, "useGcc13") || "/usr/bin/",
    gcc13Name:
      extractShellAssignment(initScriptText, "useGcc13Name") || "gcc-13",
    gxx13Name:
      extractShellAssignment(initScriptText, "useGxx13Name") || "g++-13",
    runOnDocker: extractShellAssignment(initScriptText, "useRunOnDocker") || "",
    runOnSsh: extractShellAssignment(initScriptText, "useRunOnSsh") || "",
    supportedLanguageKeys: parsedSupportedLanguageKeys,
  };
}

/**
 * Parses a whitespace-delimited init.sh route map into a Map.
 *
 * @param {string} mapText Raw route map text.
 * @returns {Map<string, string>} Parsed route map.
 */
function parseRouteMap(mapText) {
  const routeMap = new Map();
  const rawText = String(mapText || "").trim();

  if (!rawText) {
    return routeMap;
  }

  const tokens = rawText.split(/\s+/);

  for (const token of tokens) {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const languageKey = token.slice(0, separatorIndex).trim().toLowerCase();
    const value = token.slice(separatorIndex + 1).trim();

    if (!languageKey || !value) {
      continue;
    }

    routeMap.set(languageKey, value);
  }

  return routeMap;
}

/**
 * Builds webview-safe icon URIs keyed by language.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {import("vscode").Uri} languageIconBaseUri Base icon directory URI.
 * @param {import("vscode").Uri} fallbackIconUri Fallback icon URI.
 * @returns {{fallbackIconUri: string, iconUriByLanguageKey: Map<string, string>}} Icon URI metadata.
 */
function buildLanguageIconUris(webview, languageIconBaseUri, fallbackIconUri) {
  const iconUriByLanguageKey = new Map();

  for (const [languageKey, iconFileName] of Object.entries(LANGUAGE_ICON_FILE_BY_KEY)) {
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(languageIconBaseUri, iconFileName)
    );
    iconUriByLanguageKey.set(languageKey, iconUri.toString());
  }

  return {
    fallbackIconUri: webview.asWebviewUri(fallbackIconUri).toString(),
    iconUriByLanguageKey,
  };
}

/**
 * Returns a human-friendly label for one language key.
 *
 * @param {string} languageKey Canonical language key.
 * @returns {string} Display label.
 */
function formatLanguageLabel(languageKey) {
  const rawKey = String(languageKey || "");
  const labelOverrides = {
    arm64asm: "ARM64 ASM",
    asm: "ASM",
    cpp: "C++",
    csharp: "C#",
    fsharp: "F#",
    gcc13Directory: "GCC13 Directory",
    gxx13Name: "GXX13 Name",
    llvmir: "LLVM IR",
    mmixal: "MMIXAL",
    modula3: "Modula-3",
    objectivec: "Objective-C",
    visualbasic: "Visual Basic",
  };

  if (labelOverrides[rawKey]) {
    return labelOverrides[rawKey];
  }

  if (rawKey.length <= 3) {
    return rawKey.toUpperCase();
  }

  return rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
}

/**
 * Returns command arguments for an optional profile override.
 *
 * @param {string} profilePath Draft profile path.
 * @returns {string[]} Optional init.sh profile args.
 */
function buildProfileArgs(profilePath) {
  const trimmedPath = String(profilePath || "").trim();

  if (!trimmedPath) {
    return [];
  }

  return [`--update-profile=${trimmedPath}`];
}

/**
 * Filters check-env output down to error-like lines or useful trailing lines.
 *
 * @param {string} combinedOutput Combined stdout/stderr output.
 * @returns {string} Filtered output text.
 */
function filterCheckEnvOutput(combinedOutput) {
  const lines = String(combinedOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const errorLikeLines = lines.filter((line) =>
    /(error|invalid|failed|missing|unsupported)/i.test(line)
  );

  if (errorLikeLines.length > 0) {
    return errorLikeLines.join("\n");
  }

  return lines.slice(-40).join("\n");
}

/**
 * Runs init.sh non-interactively and captures output.
 *
 * @param {string} resolvedRootPath Canonical repository root path.
 * @param {string} initScriptPath Canonical init.sh path.
 * @param {string[]} args init.sh arguments.
 * @returns {Promise<{exitCode: number|null, stdout: string, stderr: string, combinedOutput: string}>} Command result.
 */
function runInitScriptCommand(resolvedRootPath, initScriptPath, args) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn("sh", [initScriptPath, ...args], {
      cwd: resolvedRootPath,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";

    childProcess.stdout.setEncoding("utf8");
    childProcess.stderr.setEncoding("utf8");

    childProcess.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    childProcess.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    childProcess.on("error", (error) => {
      reject(error);
    });

    childProcess.on("close", (exitCode) => {
      resolve({
        exitCode: typeof exitCode === "number" ? exitCode : null,
        stdout,
        stderr,
        combinedOutput: [stdout, stderr].filter(Boolean).join("\n").trim(),
      });
    });
  });
}

/**
 * Builds the merged Environment pane configuration from init defaults and profile exports.
 *
 * @param {string} initScriptText init.sh text.
 * @param {string} profileText Effective profile text.
 * @param {string|null} resolvedRootPath Canonical repository root path.
 * @returns {{defaults: object, values: object, routeMaps: {docker: Map<string, string>, ssh: Map<string, string>}}} Merged config.
 */
function buildMergedEnvironmentConfig(initScriptText, profileText, resolvedRootPath) {
  const defaults = parseInitDefaults(initScriptText, resolvedRootPath);
  const timeoutExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_TIMEOUT"
  );
  const eiffelExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_EIFFEL"
  );
  const gcc13Export = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GCC13"
  );
  const gcc13NameExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GCC13NAME"
  );
  const gxx13NameExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_GXX13NAME"
  );
  const runOnDockerExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_RUNONDOCKER"
  );
  const runOnSshExport = extractManagedExportValue(
    profileText,
    "DEREKALGOS_RUNONSSH"
  );
  const dockerMapText = runOnDockerExport.present
    ? runOnDockerExport.value
    : defaults.runOnDocker;
  const sshMapText = runOnSshExport.present
    ? runOnSshExport.value
    : defaults.runOnSsh;

  return {
    defaults,
    values: {
      timeout: timeoutExport.present ? timeoutExport.value : defaults.timeout,
      eiffel: eiffelExport.present ? eiffelExport.value : defaults.eiffel,
      gcc13Directory: gcc13Export.present
        ? gcc13Export.value
        : defaults.gcc13Directory,
      gcc13Name: gcc13NameExport.present
        ? gcc13NameExport.value
        : defaults.gcc13Name,
      gxx13Name: gxx13NameExport.present
        ? gxx13NameExport.value
        : defaults.gxx13Name,
      dockerMapText,
      sshMapText,
    },
    routeMaps: {
      docker: parseRouteMap(dockerMapText),
      ssh: parseRouteMap(sshMapText),
    },
  };
}

/**
 * Builds the Environment pane snapshot sent to the webview.
 *
 * @param {EnvironmentInitViewProvider} provider Environment pane provider.
 * @param {import("vscode").Webview} webview Webview instance.
 * @returns {{profilePath: string, profilePlaceholder: string, effectiveProfilePath: string, copyIconsPath: string, copyIconsPlaceholder: string, checkEnv: object, copyIconsResult: object, variables: object[], batch: object, languages: object[]}} Current state snapshot.
 */
function buildEnvironmentStateSnapshot(provider, webview) {
  const rootInfo = resolveEnvironmentRootInfo();
  const profilePlaceholder = getProfilePlaceholderForPlatform();
  const draftProfilePath = String(provider._profilePath || "");
  const effectiveProfilePath = draftProfilePath
    ? expandHomePath(draftProfilePath)
    : getDefaultProfilePathForPlatform();
  const initScriptText = rootInfo.initScriptPath
    ? readTextFileSafe(rootInfo.initScriptPath)
    : "";
  const profileText = effectiveProfilePath
    ? readTextFileSafe(effectiveProfilePath)
    : "";
  const mergedConfig = buildMergedEnvironmentConfig(
    initScriptText,
    profileText,
    rootInfo.resolvedRootPath
  );
  const iconMetadata = buildLanguageIconUris(
    webview,
    provider._languageIconBaseUri,
    provider._fallbackIconUri
  );
  const variables = CORE_VARIABLE_DEFINITIONS.map((definition) => {
    const status = provider._variableStatusByKey.get(definition.key) || {
      kind: "idle",
      text: "",
    };

    return {
      key: definition.key,
      label: definition.label,
      value: mergedConfig.values[definition.key] || "",
      statusKind: status.kind,
      statusText: status.text,
    };
  });
  const languages = mergedConfig.defaults.supportedLanguageKeys.map((languageKey) => {
    const dockerValue = mergedConfig.routeMaps.docker.get(languageKey) || "";
    const sshValue = mergedConfig.routeMaps.ssh.get(languageKey) || "";
    const hasDocker = dockerValue.length > 0;
    const hasSsh = sshValue.length > 0;
    const status = provider._routingStatusByLanguageKey.get(languageKey) || {
      kind: "idle",
      text: "",
    };

    return {
      key: languageKey,
      label: formatLanguageLabel(languageKey),
      iconUri:
        iconMetadata.iconUriByLanguageKey.get(languageKey)
        || iconMetadata.fallbackIconUri,
      dockerEnabled: hasDocker,
      dockerValue,
      sshEnabled: hasSsh,
      sshValue,
      isConflict: hasDocker && hasSsh,
      statusKind: status.kind,
      statusText: status.text,
    };
  });

  return {
    profilePath: draftProfilePath,
    profilePlaceholder,
    effectiveProfilePath,
    copyIconsPath: String(provider._copyIconsPath || ""),
    copyIconsPlaceholder: mergedConfig.defaults.copyIconsTo,
    checkEnv: provider._checkEnvResult,
    copyIconsResult: provider._copyIconsResult,
    variables,
    batch: {
      dockerEnabled: provider._batchDockerEnabled,
      dockerValue: provider._batchDockerValue,
      sshEnabled: provider._batchSshEnabled,
      sshValue: provider._batchSshValue,
      isConflict: provider._batchDockerEnabled && provider._batchSshEnabled,
      statusKind: provider._batchRoutingResult.kind,
      statusText: provider._batchRoutingResult.text,
    },
    languages,
  };
}

/**
 * Builds the Environment pane webview HTML.
 *
 * @param {import("vscode").Webview} webview Webview instance.
 * @param {EnvironmentInitViewProvider} provider Environment pane provider.
 * @returns {string} Rendered HTML.
 */
function buildEnvironmentHtml(webview, provider) {
  const stateSnapshot = buildEnvironmentStateSnapshot(provider, webview);
  const nonce = createNonce();
  const cspSource = webview.cspSource;
  const serializedState = serializeForScript(stateSnapshot);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: light dark;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        font-family: var(--vscode-font-family);
        font-size: 12px;
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }

      body {
        padding: 8px;
        box-sizing: border-box;
      }

      .panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .panelDescription {
        margin: 0;
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        line-height: 1.3;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
        border: 1px solid var(--vscode-widget-border);
        border-radius: 6px;
        background: color-mix(in srgb, var(--vscode-sideBar-background) 82%, var(--vscode-editor-background) 18%);
      }

      .sectionHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .sectionTitleGroup {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .sectionIcon {
        width: 13px;
        height: 13px;
        flex: 0 0 auto;
        color: var(--vscode-foreground);
      }

      .sectionTitle {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
      }

      .fieldRow {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
        align-items: center;
      }

      .fieldLabel {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .input,
      .textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        padding: 4px 6px;
        font: inherit;
      }

      .textarea {
        min-height: 88px;
        resize: vertical;
      }

      .buttonRow {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .button {
        border: 1px solid var(--vscode-button-border, transparent);
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-radius: 4px;
        padding: 4px 8px;
        font: inherit;
        cursor: pointer;
      }

      .button.secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .button:disabled {
        opacity: 0.6;
        cursor: default;
      }

      .helperText,
      .effectiveProfile {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        line-height: 1.3;
      }

      .status {
        font-size: 11px;
        line-height: 1.3;
      }

      .status.idle {
        color: var(--vscode-descriptionForeground);
      }

      .status.running {
        color: var(--vscode-charts-blue);
      }

      .status.ok {
        color: var(--vscode-testing-iconPassed);
      }

      .status.error {
        color: var(--vscode-testing-iconFailed);
      }

      .outputBox {
        max-height: 120px;
        overflow: auto;
        white-space: pre-wrap;
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 6px;
        background: var(--vscode-editor-background);
      }

      .formatPre {
        margin: 4px 0;
        padding: 4px 8px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 3px;
        font-size: 10px;
        font-family: monospace;
        white-space: pre;
        display: block;
      }

      .variableGrid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .variableCard {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .variableInputRow {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
        align-items: center;
      }

      .variableCard .status {
        margin-top: -2px;
      }

      .routingTable {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .languageRow {
        border: 1px solid var(--vscode-widget-border);
        border-radius: 6px;
        background: color-mix(in srgb, var(--vscode-editor-background) 86%, transparent 14%);
      }

      .languageRow.conflict {
        border-color: var(--vscode-testing-iconFailed);
        background: color-mix(in srgb, var(--vscode-testing-iconFailed) 10%, var(--vscode-editor-background) 90%);
      }

      .languageSummary {
        list-style: none;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 8px;
        padding: 8px;
        cursor: pointer;
      }

      .languageSummary::-webkit-details-marker {
        display: none;
      }

      .languageMain {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .languageIcon {
        width: 16px;
        height: 16px;
        flex: 0 0 auto;
      }

      .languageName {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .indicatorList {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .indicator {
        border-radius: 999px;
        padding: 1px 6px;
        font-size: 10px;
        color: var(--vscode-badge-foreground);
        background: var(--vscode-badge-background);
      }

      .editorBody {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 0 8px 8px;
      }

      .toggleRow {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .checkboxText {
        font-size: 11px;
      }

      .rawOutput details {
        margin-top: 6px;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script nonce="${nonce}">
      const vscodeApi = acquireVsCodeApi();
      const app = document.getElementById("app");
      let state = ${serializedState};

      function escapeHtmlClient(text) {
        return String(text || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function renderStatus(statusKind, statusText) {
        const resolvedKind = String(statusKind || "idle");
        const resolvedText = String(statusText || "").trim();

        if (!resolvedText) {
          return "";
        }

        return '<div class="status ' + escapeHtmlClient(resolvedKind) + '">' + escapeHtmlClient(resolvedText) + '</div>';
      }

      /**
       * Returns the inline SVG used for one Environment-pane section header.
       *
       * @param {string} iconName Semantic section icon key.
       * @returns {string} Inline SVG markup.
       */
      function getSectionIconSvg(iconName) {
        if (iconName === 'profile') {
          return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
            + '<path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8Z" stroke="currentColor" stroke-width="1.1"/>'
            + '<path d="M3 13C3.55 10.9 5.52 9.5 8 9.5C10.48 9.5 12.45 10.9 13 13" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
            + '</svg>';
        }

        if (iconName === 'check') {
          return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
            + '<path d="M3 3.5C3 2.67 3.67 2 4.5 2H11.5C12.33 2 13 2.67 13 3.5V12.5C13 13.33 12.33 14 11.5 14H4.5C3.67 14 3 13.33 3 12.5V3.5Z" stroke="currentColor" stroke-width="1"/>'
            + '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
            + '</svg>';
        }

        if (iconName === 'copy') {
          return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
            + '<path d="M6 3H11.5C12.33 3 13 3.67 13 4.5V10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
            + '<rect x="3" y="6" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
            + '</svg>';
        }

        if (iconName === 'variables') {
          return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
            + '<path d="M4 4.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
            + '<path d="M4 8H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
            + '<path d="M4 11.5H12" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
            + '<circle cx="6" cy="4.5" r="1.2" fill="currentColor"/>'
            + '<circle cx="10" cy="8" r="1.2" fill="currentColor"/>'
            + '<circle cx="7.5" cy="11.5" r="1.2" fill="currentColor"/>'
            + '</svg>';
        }

        if (iconName === 'routing') {
          return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
            + '<circle cx="4" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
            + '<circle cx="12" cy="4" r="1.5" stroke="currentColor" stroke-width="1"/>'
            + '<circle cx="8" cy="12" r="1.5" stroke="currentColor" stroke-width="1"/>'
            + '<path d="M5.2 4.8L6.9 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
            + '<path d="M10.8 4.8L9.1 10.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
            + '<path d="M5.5 4H10.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
            + '</svg>';
        }

        if (iconName === 'batch') {
          return '<svg class="sectionIcon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
            + '<rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
            + '<rect x="6" y="6" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1"/>'
            + '</svg>';
        }

        return '';
      }

      /**
       * Renders one Environment-pane section header with an icon and optional actions.
       *
       * @param {string} title Section title.
       * @param {string} iconName Semantic section icon key.
       * @param {string} actionsHtml Optional action markup.
       * @returns {string} Header markup.
       */
      function renderSectionHeader(title, iconName, actionsHtml) {
        return '<div class="sectionHeader">'
          + '<div class="sectionTitleGroup">'
          + getSectionIconSvg(iconName)
          + '<div class="sectionTitle">' + escapeHtmlClient(title) + '</div>'
          + '</div>'
          + (actionsHtml || '')
          + '</div>';
      }

      function buildVariableCardsHtml() {
        return state.variables.map((variable) => {
          return '<div class="variableCard">'
            + '<div class="fieldLabel">' + escapeHtmlClient(variable.label) + '</div>'
            + '<div class="variableInputRow">'
            + '<input class="input" data-variable-key="' + escapeHtmlClient(variable.key) + '" data-input-kind="variable" value="' + escapeHtmlClient(variable.value) + '" />'
            + '<button class="button" data-action="save-variable" data-variable-key="' + escapeHtmlClient(variable.key) + '">Save</button>'
            + '</div>'
            + renderStatus(variable.statusKind, variable.statusText)
            + '</div>';
        }).join("");
      }

      function buildIndicatorHtml(label) {
        return '<span class="indicator">' + escapeHtmlClient(label) + '</span>';
      }

      function buildLanguageRowsHtml() {
        return state.languages.map((language) => {
          const conflictClass = language.isConflict ? ' conflict' : '';
          const indicators = [
            language.dockerEnabled ? buildIndicatorHtml('docker') : '',
            language.sshEnabled ? buildIndicatorHtml('ssh') : ''
          ].join('');

          return '<details class="languageRow' + conflictClass + '">' 
            + '<summary class="languageSummary">'
            + '<div class="languageMain">'
            + '<img class="languageIcon" src="' + escapeHtmlClient(language.iconUri) + '" alt="' + escapeHtmlClient(language.label) + '" />'
            + '<span class="languageName">' + escapeHtmlClient(language.label) + '</span>'
            + '</div>'
            + '<div class="indicatorList">' + indicators + '</div>'
            + '<div></div>'
            + '</summary>'
            + '<div class="editorBody">'
            + '<label class="toggleRow">'
            + '<input type="checkbox" data-lang-key="' + escapeHtmlClient(language.key) + '" data-input-kind="language-docker-enabled" ' + (language.dockerEnabled ? 'checked' : '') + ' />'
            + '<span class="checkboxText">Docker</span>'
            + '</label>'
            + '<input class="input" data-lang-key="' + escapeHtmlClient(language.key) + '" data-input-kind="language-docker-value" value="' + escapeHtmlClient(language.dockerValue) + '" placeholder="Docker image" ' + (language.dockerEnabled ? '' : 'disabled') + ' />'
            + '<label class="toggleRow">'
            + '<input type="checkbox" data-lang-key="' + escapeHtmlClient(language.key) + '" data-input-kind="language-ssh-enabled" ' + (language.sshEnabled ? 'checked' : '') + ' />'
            + '<span class="checkboxText">SSH</span>'
            + '</label>'
            + '<input class="input" data-lang-key="' + escapeHtmlClient(language.key) + '" data-input-kind="language-ssh-value" value="' + escapeHtmlClient(language.sshValue) + '" placeholder="SSH route" ' + (language.sshEnabled ? '' : 'disabled') + ' />'
            + '<div class="buttonRow">'
            + '<button class="button" data-action="save-language" data-lang-key="' + escapeHtmlClient(language.key) + '">Save</button>'
            + '</div>'
            + renderStatus(language.statusKind, language.statusText)
            + '</div>'
            + '</details>';
        }).join('');
      }

      function render() {
        app.innerHTML = ''
          + '<div class="panel">'
          + '<p class="panelDescription">Controls environment factors for the algorithms project via init.sh.</p>'
          + '<section class="section">'
          + renderSectionHeader('Profile', 'profile', '<div class="buttonRow"><button class="button secondary" data-action="refresh-state">Refresh</button></div>')
          + '<input id="profilePath" class="input" value="' + escapeHtmlClient(state.profilePath) + '" placeholder="' + escapeHtmlClient(state.profilePlaceholder) + '" />'
          + '<div class="effectiveProfile">Effective profile for reads: ' + escapeHtmlClient(state.effectiveProfilePath || state.profilePlaceholder) + '</div>'
          + '<div class="helperText">Leave blank to let init.sh use its platform default profile path.</div>'
          + '</section>'
          + '<section class="section">'
          + renderSectionHeader('Check Environment', 'check', '<div class="buttonRow"><button class="button" data-action="check-env">Check Environment</button></div>')
          + renderStatus(state.checkEnv.kind, state.checkEnv.text)
          + '<div class="outputBox">' + escapeHtmlClient(state.checkEnv.filteredOutput || 'No check-environment output yet.') + '</div>'
          + '<div class="rawOutput"><details><summary>Raw Output</summary><div class="outputBox">' + escapeHtmlClient(state.checkEnv.rawOutput || 'No raw output yet.') + '</div></details></div>'
          + '</section>'
          + '<section class="section">'
          + renderSectionHeader('Copy Icons', 'copy', '<div class="buttonRow"><button class="button" data-action="copy-icons">Copy Icons</button></div>')
          + '<input id="copyIconsPath" class="input" value="' + escapeHtmlClient(state.copyIconsPath) + '" placeholder="' + escapeHtmlClient(state.copyIconsPlaceholder) + '" />'
          + '<div class="helperText">Skips profile updates.</div>'
          + renderStatus(state.copyIconsResult.kind, state.copyIconsResult.text)
          + '</section>'
          + '<section class="section">'
          + renderSectionHeader('Use Environment Variables', 'variables')
          + '<div class="variableGrid">' + buildVariableCardsHtml() + '</div>'
          + '</section>'
          + '<section class="section">'
          + renderSectionHeader('Language Routing', 'routing')
          + '<div class="helperText">Configure per-language docker or ssh execution targets. SSH route value must use one of two formats:<pre class="formatPre">ssh-destination|code-dir|run-script<br>ssh-address|ssh-user|ssh-port|code-dir|run-script</pre>Each language should have exactly one target configured (docker or ssh) or none.</div>'
          + '<div class="section">'
          + renderSectionHeader('Batch All', 'batch')
          + '<label class="toggleRow"><input id="batchDockerEnabled" type="checkbox" ' + (state.batch.dockerEnabled ? 'checked' : '') + ' /><span class="checkboxText">Docker</span></label>'
          + '<input id="batchDockerValue" class="input" value="' + escapeHtmlClient(state.batch.dockerValue) + '" placeholder="Docker image" ' + (state.batch.dockerEnabled ? '' : 'disabled') + ' />'
          + '<label class="toggleRow"><input id="batchSshEnabled" type="checkbox" ' + (state.batch.sshEnabled ? 'checked' : '') + ' /><span class="checkboxText">SSH</span></label>'
          + '<input id="batchSshValue" class="input" value="' + escapeHtmlClient(state.batch.sshValue) + '" placeholder="SSH route" ' + (state.batch.sshEnabled ? '' : 'disabled') + ' />'
          + '<div class="buttonRow"><button class="button" data-action="save-batch">Save</button></div>'
          + renderStatus(state.batch.statusKind, state.batch.statusText)
          + '</div>'
          + '<div class="routingTable">' + buildLanguageRowsHtml() + '</div>'
          + '</section>'
          + '</div>';
      }

      function getProfilePath() {
        const profileInput = document.getElementById('profilePath');
        return profileInput ? profileInput.value : '';
      }

      function getCopyIconsPath() {
        const copyIconsInput = document.getElementById('copyIconsPath');
        return copyIconsInput ? copyIconsInput.value : '';
      }

      function setLocalStatus(targetKind, targetKey, statusKind, statusText) {
        if (targetKind === 'variable') {
          const variable = state.variables.find((item) => item.key === targetKey);
          if (variable) {
            variable.statusKind = statusKind;
            variable.statusText = statusText;
          }
          render();
          return;
        }

        if (targetKind === 'language') {
          const language = state.languages.find((item) => item.key === targetKey);
          if (language) {
            language.statusKind = statusKind;
            language.statusText = statusText;
          }
          render();
          return;
        }

        if (targetKind === 'batch') {
          state.batch.statusKind = statusKind;
          state.batch.statusText = statusText;
          render();
        }
      }

      function updateLanguageDraft(target) {
        const languageKey = target.getAttribute('data-lang-key');
        const inputKind = target.getAttribute('data-input-kind');
        const language = state.languages.find((item) => item.key === languageKey);

        if (!language) {
          return;
        }

        if (inputKind === 'language-docker-enabled') {
          language.dockerEnabled = target.checked;
        }

        if (inputKind === 'language-docker-value') {
          language.dockerValue = target.value;
        }

        if (inputKind === 'language-ssh-enabled') {
          language.sshEnabled = target.checked;
        }

        if (inputKind === 'language-ssh-value') {
          language.sshValue = target.value;
        }

        language.isConflict = language.dockerEnabled && language.sshEnabled;
      }

      function updateVariableDraft(target) {
        const variableKey = target.getAttribute('data-variable-key');
        const variable = state.variables.find((item) => item.key === variableKey);

        if (variable) {
          variable.value = target.value;
        }
      }

      function updateBatchDraft() {
        const batchDockerEnabled = document.getElementById('batchDockerEnabled');
        const batchDockerValue = document.getElementById('batchDockerValue');
        const batchSshEnabled = document.getElementById('batchSshEnabled');
        const batchSshValue = document.getElementById('batchSshValue');

        state.batch.dockerEnabled = batchDockerEnabled ? batchDockerEnabled.checked : false;
        state.batch.dockerValue = batchDockerValue ? batchDockerValue.value : '';
        state.batch.sshEnabled = batchSshEnabled ? batchSshEnabled.checked : false;
        state.batch.sshValue = batchSshValue ? batchSshValue.value : '';
        state.batch.isConflict = state.batch.dockerEnabled && state.batch.sshEnabled;
      }

      app.addEventListener('input', (event) => {
        const target = event.target;

        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        if (target.getAttribute('data-input-kind') && target.getAttribute('data-lang-key')) {
          updateLanguageDraft(target);
          return;
        }

        if (target.getAttribute('data-input-kind') === 'variable') {
          updateVariableDraft(target);
          return;
        }

        if (
          target.id === 'batchDockerEnabled'
          || target.id === 'batchDockerValue'
          || target.id === 'batchSshEnabled'
          || target.id === 'batchSshValue'
        ) {
          updateBatchDraft();
        }
      });

      app.addEventListener('change', (event) => {
        const target = event.target;

        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        if (target.getAttribute('data-input-kind') && target.getAttribute('data-lang-key')) {
          updateLanguageDraft(target);
          render();
          return;
        }

        if (
          target.id === 'batchDockerEnabled'
          || target.id === 'batchDockerValue'
          || target.id === 'batchSshEnabled'
          || target.id === 'batchSshValue'
        ) {
          updateBatchDraft();
          render();
        }
      });

      app.addEventListener('click', (event) => {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        const action = target.getAttribute('data-action');

        if (!action) {
          return;
        }

        if (action === 'refresh-state') {
          vscodeApi.postMessage({
            type: 'refreshState',
            profilePath: getProfilePath(),
            copyIconsPath: getCopyIconsPath(),
          });
          return;
        }

        if (action === 'check-env') {
          vscodeApi.postMessage({
            type: 'runCheckEnv',
            profilePath: getProfilePath(),
            copyIconsPath: getCopyIconsPath(),
          });
          return;
        }

        if (action === 'copy-icons') {
          vscodeApi.postMessage({
            type: 'runCopyIcons',
            profilePath: getProfilePath(),
            copyIconsPath: getCopyIconsPath(),
          });
          return;
        }

        if (action === 'save-variable') {
          const variableKey = target.getAttribute('data-variable-key');
          const variable = state.variables.find((item) => item.key === variableKey);

          if (!variable) {
            return;
          }

          vscodeApi.postMessage({
            type: 'saveVariable',
            profilePath: getProfilePath(),
            copyIconsPath: getCopyIconsPath(),
            variableKey,
            value: variable.value,
          });
          return;
        }

        if (action === 'save-language') {
          const languageKey = target.getAttribute('data-lang-key');
          const language = state.languages.find((item) => item.key === languageKey);

          if (!language) {
            return;
          }

          if (language.dockerEnabled && language.sshEnabled) {
            setLocalStatus(
              'language',
              languageKey,
              'error',
              'Cannot save with both docker and ssh enabled.'
            );
            return;
          }

          if (language.dockerEnabled && !String(language.dockerValue || '').trim()) {
            setLocalStatus('language', languageKey, 'error', 'Enter a Docker value before saving.');
            return;
          }

          if (language.sshEnabled && !String(language.sshValue || '').trim()) {
            setLocalStatus('language', languageKey, 'error', 'Enter an SSH route before saving.');
            return;
          }

          vscodeApi.postMessage({
            type: 'saveLanguageRouting',
            profilePath: getProfilePath(),
            copyIconsPath: getCopyIconsPath(),
            languageKey,
            dockerEnabled: language.dockerEnabled,
            dockerValue: language.dockerValue,
            sshEnabled: language.sshEnabled,
            sshValue: language.sshValue,
          });
          return;
        }

        if (action === 'save-batch') {
          updateBatchDraft();

          if (state.batch.dockerEnabled && state.batch.sshEnabled) {
            setLocalStatus('batch', '', 'error', 'Cannot save Batch All with both docker and ssh enabled.');
            return;
          }

          if (state.batch.dockerEnabled && !String(state.batch.dockerValue || '').trim()) {
            setLocalStatus('batch', '', 'error', 'Enter a Docker value before saving Batch All.');
            return;
          }

          if (state.batch.sshEnabled && !String(state.batch.sshValue || '').trim()) {
            setLocalStatus('batch', '', 'error', 'Enter an SSH route before saving Batch All.');
            return;
          }

          vscodeApi.postMessage({
            type: 'saveBatchRouting',
            profilePath: getProfilePath(),
            copyIconsPath: getCopyIconsPath(),
            dockerEnabled: state.batch.dockerEnabled,
            dockerValue: state.batch.dockerValue,
            sshEnabled: state.batch.sshEnabled,
            sshValue: state.batch.sshValue,
          });
        }
      });

      window.addEventListener('message', (event) => {
        const message = event.data;

        if (message?.type !== 'environmentState') {
          return;
        }

        state = message.state;
        render();
      });

      render();
    </script>
  </body>
</html>`;
}

/**
 * Provides the webview UI for init.sh-backed environment controls.
 */
class EnvironmentInitViewProvider {
  /**
   * Creates an Environment pane provider.
   *
   * @param {import("vscode").Uri} extensionUri Extension installation URI.
   * @returns {void}
   */
  constructor(extensionUri) {
    this._view = null;
    this._profilePath = "";
    this._copyIconsPath = "";
    this._batchDockerEnabled = false;
    this._batchDockerValue = "";
    this._batchSshEnabled = false;
    this._batchSshValue = "";
    this._checkEnvResult = {
      kind: "idle",
      text: "",
      filteredOutput: "",
      rawOutput: "",
    };
    this._copyIconsResult = {
      kind: "idle",
      text: "",
    };
    this._batchRoutingResult = {
      kind: "idle",
      text: "",
    };
    this._variableStatusByKey = new Map();
    this._routingStatusByLanguageKey = new Map();
    this._languageIconBaseUri = vscode.Uri.joinPath(
      extensionUri,
      ...LANGUAGE_ICON_PATH_SEGMENT.split("/")
    );
    this._iconRootUri = vscode.Uri.joinPath(extensionUri, "icons");
    this._fallbackIconUri = vscode.Uri.joinPath(
      extensionUri,
      ...FALLBACK_ICON_PATH_SEGMENT.split("/")
    );
  }

  /**
   * Updates draft profile/copy/batch fields from an incoming webview message.
   *
   * @param {{profilePath?: string, copyIconsPath?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}|undefined} message Incoming webview message.
   * @returns {void}
   */
  applyDraftFields(message) {
    if (typeof message?.profilePath === "string") {
      this._profilePath = message.profilePath;
    }

    if (typeof message?.copyIconsPath === "string") {
      this._copyIconsPath = message.copyIconsPath;
    }

    if (typeof message?.dockerEnabled === "boolean") {
      this._batchDockerEnabled = message.dockerEnabled;
    }

    if (typeof message?.dockerValue === "string") {
      this._batchDockerValue = message.dockerValue;
    }

    if (typeof message?.sshEnabled === "boolean") {
      this._batchSshEnabled = message.sshEnabled;
    }

    if (typeof message?.sshValue === "string") {
      this._batchSshValue = message.sshValue;
    }
  }

  /**
   * Posts the latest Environment pane state to the active webview.
   *
   * @returns {void}
   */
  postStateUpdate() {
    if (!this._view) {
      return;
    }

    void this._view.webview.postMessage({
      type: "environmentState",
      state: buildEnvironmentStateSnapshot(this, this._view.webview),
    });
  }

  /**
   * Runs check-env and stores filtered/raw output in pane state.
   *
   * @returns {Promise<void>} Completion result.
   */
  async runCheckEnv() {
    const rootInfo = resolveEnvironmentRootInfo();

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this._checkEnvResult = {
        kind: "error",
        text: "Unable to resolve repository root or init.sh.",
        filteredOutput: "",
        rawOutput: "",
      };
      this.postStateUpdate();
      return;
    }

    this._checkEnvResult = {
      kind: "running",
      text: "Running check-env...",
      filteredOutput: "",
      rawOutput: "",
    };
    this.postStateUpdate();

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        [
          "--no-prompt",
          "--no-icons",
          ...buildProfileArgs(this._profilePath),
          "--check-env",
        ]
      );
      const filteredOutput = filterCheckEnvOutput(result.combinedOutput);

      this._checkEnvResult = {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? "Environment check succeeded."
            : "Environment check found issues.",
        filteredOutput,
        rawOutput: result.combinedOutput,
      };
    } catch (error) {
      this._checkEnvResult = {
        kind: "error",
        text: `Environment check failed: ${error.message}`,
        filteredOutput: error.message,
        rawOutput: error.message,
      };
    }

    this.postStateUpdate();
  }

  /**
   * Runs icon copy through init.sh with profile updates skipped.
   *
   * @returns {Promise<void>} Completion result.
   */
  async runCopyIcons() {
    const rootInfo = resolveEnvironmentRootInfo();

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this._copyIconsResult = {
        kind: "error",
        text: "Unable to resolve repository root or init.sh.",
      };
      this.postStateUpdate();
      return;
    }

    this._copyIconsResult = {
      kind: "running",
      text: "Copying icons...",
    };
    this.postStateUpdate();

    const args = [
      "--no-prompt",
      "--copy-icons",
      "--skip-environment",
      ...buildProfileArgs(this._profilePath),
    ];
    const trimmedCopyIconsPath = String(this._copyIconsPath || "").trim();

    if (trimmedCopyIconsPath) {
      args.push(`--icons-to=${trimmedCopyIconsPath}`);
    }

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        args
      );

      this._copyIconsResult = {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? "Icons copied successfully."
            : filterCheckEnvOutput(result.combinedOutput) || "Icon copy failed.",
      };
    } catch (error) {
      this._copyIconsResult = {
        kind: "error",
        text: `Icon copy failed: ${error.message}`,
      };
    }

    this.postStateUpdate();
  }

  /**
   * Saves one core environment variable through init.sh.
   *
   * @param {string} variableKey Core variable key.
   * @param {string} value Variable value.
   * @returns {Promise<void>} Completion result.
   */
  async saveVariable(variableKey, value) {
    const rootInfo = resolveEnvironmentRootInfo();
    const definition = CORE_VARIABLE_DEFINITIONS.find(
      (item) => item.key === variableKey
    );

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath || !definition) {
      this._variableStatusByKey.set(variableKey, {
        kind: "error",
        text: "Unable to resolve init.sh variable save context.",
      });
      this.postStateUpdate();
      return;
    }

    this._variableStatusByKey.set(variableKey, {
      kind: "running",
      text: `Saving ${definition.label}...`,
    });
    this.postStateUpdate();

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        [
          "--no-prompt",
          "--no-icons",
          ...buildProfileArgs(this._profilePath),
          "--set-use-only",
          `--${definition.optionName}=${value}`,
        ]
      );

      this._variableStatusByKey.set(variableKey, {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? `${definition.label} saved.`
            : filterCheckEnvOutput(result.combinedOutput) || `${definition.label} save failed.`,
      });
    } catch (error) {
      this._variableStatusByKey.set(variableKey, {
        kind: "error",
        text: `${definition.label} save failed: ${error.message}`,
      });
    }

    this.postStateUpdate();
  }

  /**
   * Saves one language routing row after conflict validation.
   *
   * @param {{languageKey?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}|undefined} message Language save payload.
   * @returns {Promise<void>} Completion result.
   */
  async saveLanguageRouting(message) {
    const rootInfo = resolveEnvironmentRootInfo();
    const languageKey = String(message?.languageKey || "").trim().toLowerCase();
    const dockerEnabled = Boolean(message?.dockerEnabled);
    const dockerValue = String(message?.dockerValue || "").trim();
    const sshEnabled = Boolean(message?.sshEnabled);
    const sshValue = String(message?.sshValue || "").trim();

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath || !languageKey) {
      this._routingStatusByLanguageKey.set(languageKey, {
        kind: "error",
        text: "Unable to resolve routing save context.",
      });
      this.postStateUpdate();
      return;
    }

    if (dockerEnabled && sshEnabled) {
      this._routingStatusByLanguageKey.set(languageKey, {
        kind: "error",
        text: "Cannot save with both docker and ssh enabled.",
      });
      this.postStateUpdate();
      return;
    }

    this._routingStatusByLanguageKey.set(languageKey, {
      kind: "running",
      text: `Saving ${formatLanguageLabel(languageKey)} routing...`,
    });
    this.postStateUpdate();

    const args = [
      "--no-prompt",
      "--no-icons",
      ...buildProfileArgs(this._profilePath),
      dockerEnabled
        ? `--runondocker-set=${languageKey}=${dockerValue}`
        : `--runondocker-remove=${languageKey}`,
      sshEnabled
        ? `--runonssh-set=${languageKey}=${sshValue}`
        : `--runonssh-remove=${languageKey}`,
    ];

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        args
      );

      this._routingStatusByLanguageKey.set(languageKey, {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? `${formatLanguageLabel(languageKey)} routing saved.`
            : filterCheckEnvOutput(result.combinedOutput) || `${formatLanguageLabel(languageKey)} routing save failed.`,
      });
    } catch (error) {
      this._routingStatusByLanguageKey.set(languageKey, {
        kind: "error",
        text: `${formatLanguageLabel(languageKey)} routing save failed: ${error.message}`,
      });
    }

    this.postStateUpdate();
  }

  /**
   * Saves one Batch All routing operation for every supported language.
   *
   * @returns {Promise<void>} Completion result.
   */
  async saveBatchRouting() {
    const rootInfo = resolveEnvironmentRootInfo();
    const initScriptText = rootInfo.initScriptPath
      ? readTextFileSafe(rootInfo.initScriptPath)
      : "";
    const defaults = parseInitDefaults(initScriptText, rootInfo.resolvedRootPath);

    if (!rootInfo.resolvedRootPath || !rootInfo.initScriptPath) {
      this._batchRoutingResult = {
        kind: "error",
        text: "Unable to resolve batch routing save context.",
      };
      this.postStateUpdate();
      return;
    }

    if (this._batchDockerEnabled && this._batchSshEnabled) {
      this._batchRoutingResult = {
        kind: "error",
        text: "Cannot save Batch All with both docker and ssh enabled.",
      };
      this.postStateUpdate();
      return;
    }

    this._batchRoutingResult = {
      kind: "running",
      text: "Applying Batch All routing...",
    };
    this.postStateUpdate();

    const args = [
      "--no-prompt",
      "--no-icons",
      ...buildProfileArgs(this._profilePath),
    ];

    for (const languageKey of defaults.supportedLanguageKeys) {
      args.push(
        this._batchDockerEnabled
          ? `--runondocker-set=${languageKey}=${this._batchDockerValue}`
          : `--runondocker-remove=${languageKey}`
      );
      args.push(
        this._batchSshEnabled
          ? `--runonssh-set=${languageKey}=${this._batchSshValue}`
          : `--runonssh-remove=${languageKey}`
      );
    }

    try {
      const result = await runInitScriptCommand(
        rootInfo.resolvedRootPath,
        rootInfo.initScriptPath,
        args
      );

      this._batchRoutingResult = {
        kind: result.exitCode === 0 ? "ok" : "error",
        text:
          result.exitCode === 0
            ? "Batch All routing saved."
            : filterCheckEnvOutput(result.combinedOutput) || "Batch All routing save failed.",
      };
    } catch (error) {
      this._batchRoutingResult = {
        kind: "error",
        text: `Batch All routing save failed: ${error.message}`,
      };
    }

    this.postStateUpdate();
  }

  /**
   * Returns message handlers keyed by message type.
   *
   * @returns {Object.<string, (message: {variableKey?: string, value?: string, languageKey?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}) => void>} Message handlers.
   */
  getMessageHandlers() {
    return {
      refreshState: () => {
        this.postStateUpdate();
      },
      runCheckEnv: () => {
        void this.runCheckEnv();
      },
      runCopyIcons: () => {
        void this.runCopyIcons();
      },
      saveVariable: (message) => {
        void this.saveVariable(
          String(message.variableKey || ""),
          String(message.value || "")
        );
      },
      saveLanguageRouting: (message) => {
        void this.saveLanguageRouting(message);
      },
      saveBatchRouting: () => {
        void this.saveBatchRouting();
      },
    };
  }

  /**
   * Handles one webview message from the Environment pane UI.
   *
   * @param {{type?: string, profilePath?: string, copyIconsPath?: string, variableKey?: string, value?: string, languageKey?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}|undefined} message Incoming webview message.
   * @returns {void}
   */
  handleMessage(message) {
    this.applyDraftFields(message);
    const messageType = String(message?.type || "");
    const messageHandler = this.getMessageHandlers()[messageType];

    if (messageHandler) {
      messageHandler(message || {});
    }
  }

  /**
   * Resolves one Environment pane webview instance.
   *
   * @param {import("vscode").WebviewView} webviewView Webview view instance.
   * @returns {void}
   */
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._languageIconBaseUri, this._iconRootUri],
    };
    webviewView.webview.html = buildEnvironmentHtml(webviewView.webview, this);

    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });

    webviewView.onDidDispose(() => {
      if (this._view === webviewView) {
        this._view = null;
      }
    });
  }

  /**
   * Refreshes the current Environment pane webview document.
   *
   * @returns {void}
   */
  refresh() {
    if (!this._view) {
      return;
    }

    this._view.webview.html = buildEnvironmentHtml(this._view.webview, this);
  }
}

/**
 * Registers the Environment pane webview provider.
 *
 * @param {import("vscode").Uri} extensionUri Extension installation URI.
 * @returns {{refresh: () => void, disposables: import("vscode").Disposable[]}} Registration result.
 */
function registerEnvironmentInitView(extensionUri) {
  const provider = new EnvironmentInitViewProvider(extensionUri);
  const registration = vscode.window.registerWebviewViewProvider(
    ENVIRONMENT_VIEW_ID,
    provider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }
  );

  return {
    refresh: () => {
      provider.refresh();
    },
    disposables: [registration],
  };
}

// Public API for the Environment init pane.
module.exports = {
  registerEnvironmentInitView,
};