import * as os from "node:os";
import * as path from "node:path";
import type {
  EnvironmentControlsState,
  EnvironmentRoutingLanguageState,
  EnvironmentVariableKey,
  EnvironmentVariableState,
} from ".";

/**
 * Structured representation of one parsed export value.
 */
export interface ParsedProfileValue {
  present: boolean;
  value: string;
}

/**
 * One writable DEREKALGOS profile value set managed by the extension.
 */
export interface AlgorithmsProfileWritableValues {
  timeout?: string | null;
  eiffel?: string | null;
  gcc13Directory?: string | null;
  gcc13Name?: string | null;
  gxx13Name?: string | null;
  dockerMapText?: string | null;
  sshMapText?: string | null;
}

/**
 * One parsed DEREKALGOS profile value set read from the managed profile block.
 */
export interface AlgorithmsProfileValues {
  timeout: ParsedProfileValue;
  eiffel: ParsedProfileValue;
  gcc13Directory: ParsedProfileValue;
  gcc13Name: ParsedProfileValue;
  gxx13Name: ParsedProfileValue;
  dockerMapText: ParsedProfileValue;
  sshMapText: ParsedProfileValue;
}

/**
 * One shared catalog entry for a managed DEREKALGOS profile variable.
 */
export interface AlgorithmsProfileCatalogEntry {
  key: keyof AlgorithmsProfileWritableValues;
  exportName: string;
}

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
 * Render options for one managed profile block.
 */
export interface RenderAlgorithmsProfileBlockOptions {
  lineEnding?: string;
}

/**
 * Construction options for one profile handler.
 */
export interface ProfileHandlerOptions {
  platform?: string;
  homeDirectory?: string;
}

/**
 * Canonical managed block start marker.
 */
export const PROFILE_BLOCK_START = "# >>> DEREKALGOS INIT >>>";

/**
 * Canonical managed block end marker.
 */
export const PROFILE_BLOCK_END = "# <<< DEREKALGOS INIT <<<";

/**
 * Canonical managed DEREKALGOS profile variable catalog.
 */
export const ALGORITHMS_PROFILE_VARIABLES: AlgorithmsProfileCatalogEntry[] = [
  {
    key: "timeout",
    exportName: "DEREKALGOS_TIMEOUT",
  },
  {
    key: "eiffel",
    exportName: "DEREKALGOS_EIFFEL",
  },
  {
    key: "gcc13Directory",
    exportName: "DEREKALGOS_GCC13",
  },
  {
    key: "gcc13Name",
    exportName: "DEREKALGOS_GCC13NAME",
  },
  {
    key: "gxx13Name",
    exportName: "DEREKALGOS_GXX13NAME",
  },
  {
    key: "dockerMapText",
    exportName: "DEREKALGOS_RUNONDOCKER",
  },
  {
    key: "sshMapText",
    exportName: "DEREKALGOS_RUNONSSH",
  },
];

/**
 * Variable labels keyed by environment variable key.
 */
const environmentVariableLabelsByKey: Record<EnvironmentVariableKey, string> = {
  timeout: "TIMEOUT",
  eiffel: "EIFFEL",
  gcc13Directory: "GCC13_DIRECTORY",
  gcc13Name: "GCC13_NAME",
  gxx13Name: "GXX13_NAME",
};

/**
 * Maps profile variable keys to environment variable keys.
 */
const profileVariableKeyByEnvironmentKey: Record<EnvironmentVariableKey, keyof AlgorithmsProfileValues> = {
  timeout: "timeout",
  eiffel: "eiffel",
  gcc13Directory: "gcc13Directory",
  gcc13Name: "gcc13Name",
  gxx13Name: "gxx13Name",
};

/**
 * Consolidated profile catalog, parser, and writer for managed shell profile values.
 */
export class ProfileHandler {

  private readonly platform: string;
  private readonly homeDirectory: string;

  /**
   * Creates one profile handler.
   *
   * @param {ProfileHandlerOptions} [options] Optional platform and home-directory overrides.
   */
  public constructor(options?: ProfileHandlerOptions) {
    this.platform = options?.platform ?? process.platform;
    this.homeDirectory = options?.homeDirectory ?? os.homedir();
  }

  /**
   * Returns the platform-specific profile filename.
   *
   * @param {string} [platformOverride] Optional platform override for tests.
   * @returns {string} Default profile filename.
   */
  public getProfileFileNameForPlatform(platformOverride?: string): string {
    const resolvedPlatform = platformOverride ?? this.platform;

    if (resolvedPlatform === "freebsd") {
      return ".profile";
    }

    if (resolvedPlatform === "darwin") {
      return ".zprofile";
    }

    return ".bash_profile";
  }

  /**
   * Returns the platform-specific placeholder profile path.
   *
   * @param {string} [platformOverride] Optional platform override for tests.
   * @returns {string} Placeholder profile path.
   */
  public getProfilePlaceholderForPlatform(platformOverride?: string): string {
    return `~/${this.getProfileFileNameForPlatform(platformOverride)}`;
  }

  /**
   * Returns the default expanded profile path for the current platform.
   *
   * @param {string} [platformOverride] Optional platform override for tests.
   * @returns {string} Expanded default profile path.
   */
  public getDefaultProfilePathForPlatform(platformOverride?: string): string {
    return path.join(this.homeDirectory, this.getProfileFileNameForPlatform(platformOverride));
  }

  /**
   * Derives one effective profile path from a possibly-empty profile path override.
   *
   * @param {string} profilePath Requested profile path override.
   * @returns {string} Effective profile path used for file reads and writes.
   */
  public resolveEffectiveProfilePath(profilePath: string): string {
    const trimmedProfilePath = String(profilePath || "").trim();
    if (trimmedProfilePath.length > 0) {
      return trimmedProfilePath;
    }

    return this.getDefaultProfilePathForPlatform();
  }

  /**
   * Extracts all managed DEREKALGOS profile values from profile text.
   *
   * @param {string} profileText Profile file text.
   * @returns {AlgorithmsProfileValues} Extracted raw profile values.
   */
  public parseAlgorithmsProfileValues(profileText: string): AlgorithmsProfileValues {
    const values = {} as AlgorithmsProfileValues;

    for (const entry of ALGORITHMS_PROFILE_VARIABLES) {
      values[entry.key] = this.extractManagedExportValue(profileText, entry.exportName);
    }

    return values;
  }

  /**
   * Parses the managed DEREKALGOS profile block into raw values and route maps.
   *
   * @param {string} profileText Profile file text.
   * @returns {ParsedAlgorithmsProfile} Parsed profile values and route maps.
   */
  public parseAlgorithmsProfile(profileText: string): ParsedAlgorithmsProfile {
    const values = this.parseAlgorithmsProfileValues(profileText);

    return {
      values,
      routeMaps: {
        docker: this.parseDockerRouteMap(values.dockerMapText.value),
        ssh: this.parseSshRouteMap(values.sshMapText.value),
      },
    };
  }

  /**
   * Extracts one managed export value from profile text.
   *
   * @param {string} profileText Profile file text.
   * @param {string} exportName Export variable name.
   * @returns {ParsedProfileValue} Export presence and value.
   */
  public extractManagedExportValue(profileText: string, exportName: string): ParsedProfileValue {
    const scopedText = this.getManagedProfileScope(profileText);
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
  public parseDockerRouteMap(mapText: string): DockerRouteMap {
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
   * @param {string} routeValue Raw SSH route value.
   * @returns {ParsedSshRoute | null} Parsed SSH route or null when malformed.
   */
  public parseSshRouteValue(routeValue: string): ParsedSshRoute | null {
    const rawValue = String(routeValue || "").trim();

    if (rawValue.length === 0) {
      return null;
    }

    const parts = rawValue.split("|").map((part) => {
      return part.trim();
    });

    if (parts.length === 3) {
      const [destination, codeDirectory, runScript] = parts;

      if (destination.length === 0 || codeDirectory.length === 0 || runScript.length === 0) {
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
   * @param {string} mapText Raw map text.
   * @returns {SshRouteMap} Parsed SSH routes by language key.
   */
  public parseSshRouteMap(mapText: string): SshRouteMap {
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

      const parsedRoute = this.parseSshRouteValue(value);
      if (parsedRoute === null) {
        continue;
      }

      routeMap.set(languageKey, parsedRoute);
    }

    return routeMap;
  }

  /**
   * Serializes one parsed SSH route back to route-map value format.
   *
   * @param {ParsedSshRoute | undefined} route Parsed SSH route value.
   * @returns {string} Serialized SSH route text, or empty string when undefined.
   */
  public serializeParsedSshRoute(route: ParsedSshRoute | undefined): string {
    if (!route) {
      return "";
    }

    if (route.kind === "named-destination") {
      return [route.destination, route.codeDirectory, route.runScript].join("|");
    }

    return [route.address, route.user, route.port, route.codeDirectory, route.runScript].join("|");
  }

  /**
   * Builds one docker route-map export value from routing entries.
   *
   * @param {EnvironmentRoutingLanguageState[]} routingEntries Current routing entries.
   * @returns {string} Docker route-map text in language-token format.
   */
  public createDockerMapTextFromRoutingEntries(
    routingEntries: EnvironmentRoutingLanguageState[]): string {

    return routingEntries
      .map((entry) => {
        const languageKey = entry.languageKey.trim().toLowerCase();
        const dockerValue = entry.dockerValue.trim();

        if (!entry.dockerEnabled || languageKey.length === 0 || dockerValue.length === 0) {
          return "";
        }

        return `${languageKey}=${dockerValue}`;
      })
      .filter((token) => token.length > 0)
      .join(" ");
  }

  /**
   * Builds one SSH route-map export value from routing entries.
   *
   * @param {EnvironmentRoutingLanguageState[]} routingEntries Current routing entries.
   * @returns {string} SSH route-map text in language-token format.
   */
  public createSshMapTextFromRoutingEntries(
    routingEntries: EnvironmentRoutingLanguageState[]): string {

    return routingEntries
      .map((entry) => {
        const languageKey = entry.languageKey.trim().toLowerCase();
        const sshValue = entry.sshValue.trim();

        if (!entry.sshEnabled || languageKey.length === 0 || sshValue.length === 0) {
          return "";
        }

        return `${languageKey}=${sshValue}`;
      })
      .filter((token) => token.length > 0)
      .join(" ");
  }

  /**
   * Applies parsed profile values onto current environment variable state.
   *
   * @param {EnvironmentVariableState[]} variables Current variable entries.
   * @param {AlgorithmsProfileValues} parsedValues Parsed profile values.
   * @returns {EnvironmentVariableState[]} Updated variable entries.
   */
  public applyProfileValuesToVariables(
    variables: EnvironmentVariableState[],
    parsedValues: AlgorithmsProfileValues,
  ): EnvironmentVariableState[] {
    const valueByKey = new Map<EnvironmentVariableKey, string>();

    for (const variable of variables) {
      valueByKey.set(variable.key, variable.value);
    }

    const keys = Object.keys(profileVariableKeyByEnvironmentKey) as EnvironmentVariableKey[];
    for (const key of keys) {
      const parsedValue = parsedValues[profileVariableKeyByEnvironmentKey[key]].value;
      valueByKey.set(key, parsedValue);
    }

    return variables.map((variable) => {
      return {
        ...variable,
        value: valueByKey.get(variable.key) ?? "",
      };
    });
  }

  /**
   * Builds profile-write values from environment state.
   *
   * @param {EnvironmentControlsState} state Current environment controls state.
   * @returns {AlgorithmsProfileWritableValues} Profile block writable values.
   */
  public createProfileWritableValues(state: EnvironmentControlsState): AlgorithmsProfileWritableValues {
    const variableValueByKey = new Map<EnvironmentVariableKey, string>();
    for (const variable of state.variables) {
      variableValueByKey.set(variable.key, variable.value);
    }

    return {
      timeout: variableValueByKey.get("timeout") ?? "",
      eiffel: variableValueByKey.get("eiffel") ?? "",
      gcc13Directory: variableValueByKey.get("gcc13Directory") ?? "",
      gcc13Name: variableValueByKey.get("gcc13Name") ?? "",
      gxx13Name: variableValueByKey.get("gxx13Name") ?? "",
      dockerMapText: this.createDockerMapTextFromRoutingEntries(state.routingEntries),
      sshMapText: this.createSshMapTextFromRoutingEntries(state.routingEntries),
    };
  }

  /**
   * Builds default environment variable rows.
   *
   * @returns {EnvironmentVariableState[]} Default environment variable rows.
   */
  public createDefaultVariableState(): EnvironmentVariableState[] {
    const orderedKeys: EnvironmentVariableKey[] = [
      "timeout",
      "eiffel",
      "gcc13Directory",
      "gcc13Name",
      "gxx13Name",
    ];

    return orderedKeys.map((key) => {
      return {
        key,
        label: environmentVariableLabelsByKey[key],
        value: "",
      };
    });
  }

  /**
   * Renders one managed DEREKALGOS shell-profile block.
   *
   * @param {AlgorithmsProfileWritableValues} values Managed raw values.
   * @param {RenderAlgorithmsProfileBlockOptions} [options] Rendering options.
   * @returns {string} Rendered managed block text.
   */
  public renderAlgorithmsProfileBlock(
    values: AlgorithmsProfileWritableValues,
    options?: RenderAlgorithmsProfileBlockOptions): string {

    const lineEnding = options?.lineEnding ?? "\n";
    const lines = [PROFILE_BLOCK_START];

    for (const entry of ALGORITHMS_PROFILE_VARIABLES) {
      const rawValue = values[entry.key];

      if (rawValue === undefined || rawValue === null) {
        continue;
      }

      lines.push(`export ${entry.exportName}="${this.escapeProfileValue(String(rawValue))}"`);
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
  public upsertAlgorithmsProfileBlock(
    profileText: string,
    values: AlgorithmsProfileWritableValues): string {

    const rawProfileText = String(profileText || "");
    const lineEnding = this.detectLineEnding(rawProfileText);
    const renderedBlock = this.renderAlgorithmsProfileBlock(values, { lineEnding });
    const blockStartIndex = rawProfileText.indexOf(PROFILE_BLOCK_START);
    const blockEndIndex = blockStartIndex >= 0
      ? rawProfileText.indexOf(PROFILE_BLOCK_END, blockStartIndex + PROFILE_BLOCK_START.length)
      : -1;

    if (blockStartIndex >= 0 && blockEndIndex > blockStartIndex) {
      const blockEndExclusive = blockEndIndex + PROFILE_BLOCK_END.length;
      const prefix = rawProfileText.slice(0, blockStartIndex);
      const suffix = rawProfileText.slice(blockEndExclusive);

      return `${prefix}${renderedBlock}${suffix}`;
    }

    const prefix = this.ensureTrailingLineBoundary(rawProfileText, lineEnding);
    return `${prefix}${renderedBlock}`;
  }

  /**
   * Returns text within the managed profile block when present.
   *
   * @param {string} profileText Profile file text.
   * @returns {string} Managed block text or full text when markers are absent.
   */
  private getManagedProfileScope(profileText: string): string {

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
   * Escapes one shell-profile export value for double-quoted output.
   *
   * @param {string} value Raw export value.
   * @returns {string} Escaped export value.
   */
  private escapeProfileValue(value: string): string {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  /**
   * Detects the preferred line ending for one profile text body.
   *
   * @param {string} profileText Existing profile text.
   * @returns {string} Preferred line ending sequence.
   */
  private detectLineEnding(profileText: string): string {
    if (String(profileText).includes("\r\n")) {
      return "\r\n";
    }

    return "\n";
  }

  /**
   * Ensures one text prefix ends on a line boundary before inserting a block.
   *
   * @param {string} prefix Text before the managed block.
   * @param {string} lineEnding Preferred line ending sequence.
   * @returns {string} Prefix ready for block insertion.
   */
  private ensureTrailingLineBoundary(prefix: string, lineEnding: string): string {
    const rawPrefix = String(prefix || "");

    if (rawPrefix.length === 0) {
      return rawPrefix;
    }

    if (rawPrefix.endsWith("\n") || rawPrefix.endsWith("\r")) {
      return rawPrefix;
    }

    return `${rawPrefix}${lineEnding}`;
  }
}