import type { IFilesystem } from "../../filesystem";
import {
  getDefaultProfilePathForPlatform,
  getProfilePlaceholderForPlatform,
} from "../internal/platformProfile";
import type { ParsedAlgorithmsProfile } from "../internal/shellProfileParse";
import { parseAlgorithmsProfile } from "../internal/shellProfileParse";
import type { AlgorithmsProfileWritableValues } from "../internal/shellProfileCatalog";
import { upsertAlgorithmsProfileBlock } from "../internal/shellProfileWrite";

/**
 * Input required to write one managed shell profile block.
 */
export interface ShellProfileWriterInput {
  filesystem: IFilesystem;
  values: AlgorithmsProfileWritableValues;
  profilePath?: string;
}

/**
 * Result returned after writing one managed shell profile block.
 */
export interface ShellProfileWriteResult extends ParsedAlgorithmsProfile {
  profilePlaceholder: string;
  effectiveProfilePath: string;
  profileText: string;
}

/**
 * Writes the managed DEREKALGOS block into one shell profile.
 *
 * @param {ShellProfileWriterInput} input Shell profile writing input.
 * @returns {Promise<ShellProfileWriteResult>} Written profile path, text, and parsed values.
 */
export async function writeShellProfile(
  input: ShellProfileWriterInput
): Promise<ShellProfileWriteResult> {
  const profilePlaceholder = getProfilePlaceholderForPlatform();
  const requestedProfilePath = String(input.profilePath || "").trim();
  const effectiveProfilePath = requestedProfilePath.length > 0
    ? requestedProfilePath
    : getDefaultProfilePathForPlatform();
  const existingProfileText = await input.filesystem.readText(effectiveProfilePath);
  const profileText = upsertAlgorithmsProfileBlock(
    existingProfileText ?? "",
    input.values
  );

  await input.filesystem.writeText(effectiveProfilePath, profileText);

  return {
    profilePlaceholder,
    effectiveProfilePath,
    profileText,
    ...parseAlgorithmsProfile(profileText),
  };
}