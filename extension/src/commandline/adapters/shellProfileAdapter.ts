import type { IFilesystem } from "../../filesystem";
import {
  getDefaultProfilePathForPlatform,
  getProfilePlaceholderForPlatform,
} from "../internal/platformProfile";
import type { ParsedAlgorithmsProfile } from "../internal/shellProfileParse";
import { parseAlgorithmsProfile } from "../internal/shellProfileParse";

/**
 * Input required to load and parse one shell profile.
 */
export interface ShellProfileAdapterInput {
  filesystem: IFilesystem;
  profilePath?: string;
}

/**
 * Loaded shell profile parsing result.
 */
export interface ShellProfileLoadResult extends ParsedAlgorithmsProfile {
  profilePlaceholder: string;
  effectiveProfilePath: string;
}

/**
 * Loads and parses one shell profile file.
 *
 * @param {ShellProfileAdapterInput} input Shell profile loading input.
 * @returns {Promise<ShellProfileLoadResult>} Parsed shell profile result.
 */
export async function loadShellProfile(
  input: ShellProfileAdapterInput
): Promise<ShellProfileLoadResult> {
  const profilePlaceholder = getProfilePlaceholderForPlatform();
  const requestedProfilePath = String(input.profilePath || "").trim();
  const effectiveProfilePath = requestedProfilePath.length > 0
    ? requestedProfilePath
    : getDefaultProfilePathForPlatform();
  const profileText = await input.filesystem.readText(effectiveProfilePath);
  const parsedProfile = parseAlgorithmsProfile(profileText ?? "");

  return {
    profilePlaceholder,
    effectiveProfilePath,
    ...parsedProfile,
  };
}
