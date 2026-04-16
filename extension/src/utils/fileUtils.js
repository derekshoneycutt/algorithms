const fs = require("fs");
const path = require("path");

/**
 * Resolves the real absolute path of a file or directory, following symlinks.
 * Returns the resolved absolute path of the input on failure.
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

module.exports = { realpathSafe };
