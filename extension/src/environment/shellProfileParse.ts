import {
  ALGORITHMS_PROFILE_VARIABLES,
} from "./shellProfileCatalog";
import type {
  AlgorithmsProfileValues,
  ParsedProfileValue,
} from "./shellProfileCatalog";

const PROFILE_BLOCK_START = "# >>> DEREKALGOS INIT >>>";
const PROFILE_BLOCK_END = "# <<< DEREKALGOS INIT <<<";

/**
 * Structured SSH route using one named SSH destination.
 */
export interface SshNamedDestinationRoute {
  kind: "named-destination";
  destination: string;
  codeDirectory: string;
  runScript: string;
}

/**
 * Structured SSH route using one direct host/user/port connection.
 */
export interface SshDirectConnectionRoute {
  kind: "direct-connection";
  address: string;
  user: string;
  port: string;
  codeDirectory: string;
  runScript: string;
}

/**
 * Supported structured SSH route value.
 */
export type ParsedSshRoute = SshNamedDestinationRoute | SshDirectConnectionRoute;

/**
 * Parsed docker routing by language key.
 */
export type DockerRouteMap = Map<string, string>;

/**
 * Parsed SSH routing by language key.
 */
export type SshRouteMap = Map<string, ParsedSshRoute>;

/**
 * Scoped profile parsing result including raw values and parsed route maps.
 */
export interface ParsedAlgorithmsProfile {
  values: AlgorithmsProfileValues;
  routeMaps: {
    docker: DockerRouteMap;
    ssh: SshRouteMap;
  };
}

/**
 * Returns the text within the managed profile block when present.
 *
 * @param {string} profileText Profile file text.
 * @returns {string} Managed block text or full text when markers are absent.
 */
function getManagedProfileScope(profileText: string): string {
  const text = String(profileText || "");
  const blockStartIndex = text.indexOf(PROFILE_BLOCK_START);
  const blockEndIndex = blockStartIndex >= 0
    ? text.indexOf(PROFILE_BLOCK_END, blockStartIndex + PROFILE_BLOCK_START.length)
    : -1;

  if (blockStartIndex >= 0 && blockEndIndex > blockStartIndex) {
    return text.slice(blockStartIndex, blockEndIndex);
  }

  return text;
}

/**
 * Extracts one managed export value from the profile text.
 *
 * @param {string} profileText Profile file text.
 * @param {string} exportName Export variable name.
 * @returns {ParsedProfileValue} Export presence and value.
 */
export function extractManagedExportValue(
  profileText: string,
  exportName: string): ParsedProfileValue {
  const scopedText = getManagedProfileScope(profileText);
  const exportPattern = new RegExp(`^export ${exportName}=(.*)$`, "m");
  const match = scopedText.match(exportPattern);

  if (match === null) {
    return {
      present: false,
      value: "",
    };
  }

  let rawValue = String(match[1] || "").trim();

  if (rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) {
    rawValue = rawValue.slice(1, -1);
  }

  rawValue = rawValue.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

  return {
    present: true,
    value: rawValue,
  };
}

/**
 * Parses one whitespace-delimited docker route map.
 *
 * @param {string} mapText Raw map text.
 * @returns {DockerRouteMap} Parsed docker routes by language key.
 */
export function parseDockerRouteMap(mapText: string): DockerRouteMap {
  const routeMap: DockerRouteMap = new Map();
  const rawText = String(mapText || "").trim();

  if (rawText.length === 0) {
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

    if (languageKey.length === 0 || value.length === 0) {
      continue;
    }

    routeMap.set(languageKey, value);
  }

  return routeMap;
}

/**
 * Parses one SSH route value in one of the supported legacy formats.
 *
 * Supported formats are:
 * 1. `ssh-destination|code-dir|run-script`
 * 2. `ssh-address|ssh-user|ssh-port|code-dir|run-script`
 *
 * @param {string} routeValue Raw SSH route value.
 * @returns {ParsedSshRoute | null} Parsed SSH route or null when malformed.
 */
export function parseSshRouteValue(routeValue: string): ParsedSshRoute | null {
  const rawValue = String(routeValue || "").trim();

  if (rawValue.length === 0) {
    return null;
  }

  const parts = rawValue.split("|").map((part) => {
    return part.trim();
  });

  if (parts.length === 3) {
    const [destination, codeDirectory, runScript] = parts;

    if (
      destination.length === 0
      || codeDirectory.length === 0
      || runScript.length === 0
    ) {
      return null;
    }

    return {
      kind: "named-destination",
      destination,
      codeDirectory,
      runScript,
    };
  }

  if (parts.length === 5) {
    const [address, user, port, codeDirectory, runScript] = parts;

    if (address.length === 0 || user.length === 0 || port.length === 0
      || codeDirectory.length === 0 || runScript.length === 0) {
      return null;
    }

    return {
      kind: "direct-connection",
      address,
      user,
      port,
      codeDirectory,
      runScript,
    };
  }

  return null;
}

/**
 * Parses one whitespace-delimited SSH route map.
 *
 * The outer format is `language=value` tokens. Each value is then parsed using
 * the supported SSH route formats.
 *
 * @param {string} mapText Raw map text.
 * @returns {SshRouteMap} Parsed SSH routes by language key.
 */
export function parseSshRouteMap(mapText: string): SshRouteMap {
  const routeMap: SshRouteMap = new Map();
  const rawText = String(mapText || "").trim();

  if (rawText.length === 0) {
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

    if (languageKey.length === 0 || value.length === 0) {
      continue;
    }

    const parsedRoute = parseSshRouteValue(value);
    if (parsedRoute === null) {
      continue;
    }

    routeMap.set(languageKey, parsedRoute);
  }

  return routeMap;
}

/**
 * Extracts all managed DEREKALGOS profile values from the profile text.
 *
 * @param {string} profileText Profile file text.
 * @returns {AlgorithmsProfileValues} Extracted raw profile values.
 */
export function parseAlgorithmsProfileValues(
  profileText: string): AlgorithmsProfileValues {

  const values = {} as AlgorithmsProfileValues;

  for (const entry of ALGORITHMS_PROFILE_VARIABLES) {
    values[entry.key] = extractManagedExportValue(profileText, entry.exportName);
  }

  return values;
}

/**
 * Parses the managed DEREKALGOS profile block into raw values and route maps.
 *
 * @param {string} profileText Profile file text.
 * @returns {ParsedAlgorithmsProfile} Parsed profile values and route maps.
 */
export function parseAlgorithmsProfile(
  profileText: string): ParsedAlgorithmsProfile {

  const values = parseAlgorithmsProfileValues(profileText);

  return {
    values,
    routeMaps: {
      docker: parseDockerRouteMap(values.dockerMapText.value),
      ssh: parseSshRouteMap(values.sshMapText.value),
    },
  };
}

export {
  PROFILE_BLOCK_END,
  PROFILE_BLOCK_START,
};
