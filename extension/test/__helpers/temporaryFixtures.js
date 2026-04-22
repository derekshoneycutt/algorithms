const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * Creates one temporary directory with a deterministic prefix.
 *
 * @param {string} prefix Directory name prefix.
 * @returns {string} Temporary directory path.
 */
function createTemporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), String(prefix || "algos-test-")));
}

module.exports = {
  createTemporaryDirectory,
};