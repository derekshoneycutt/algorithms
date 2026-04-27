import { joinHomePath } from "../../filesystem";

/**
 * Returns the platform-specific profile filename.
 *
 * @param {string} [platformOverride] Optional platform override for tests.
 * @returns {string} Default profile filename.
 */
function getProfileFileNameForPlatform(platformOverride?: string): string {
  const platform = platformOverride !== undefined ? platformOverride : process.platform;

  if (platform === "freebsd") {
    return ".profile";
  }

  if (platform === "darwin") {
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
export function getProfilePlaceholderForPlatform(platformOverride?: string): string {
  return `~/${getProfileFileNameForPlatform(platformOverride)}`;
}

/**
 * Returns the default expanded profile path for the current platform.
 *
 * @param {string} [platformOverride] Optional platform override for tests.
 * @returns {string} Expanded default profile path.
 */
export function getDefaultProfilePathForPlatform(platformOverride?: string): string {
  return joinHomePath(getProfileFileNameForPlatform(platformOverride));
}
