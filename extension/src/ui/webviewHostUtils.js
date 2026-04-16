const fs = require("fs");

/**
 * Escapes user-provided text for safe HTML interpolation.
 *
 * @param {string} text Raw text value.
 * @returns {string} Escaped HTML-safe text.
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
 * Renders one tokenized HTML template with replacement values.
 *
 * @param {string} template Raw template source.
 * @param {Record<string, string>} replacements Placeholder replacements.
 * @returns {string} Rendered HTML.
 */
function renderTemplate(template, replacements) {
  return String(template || "").replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return String(replacements[key]);
    }

    return "";
  });
}

module.exports = {
  escapeHtml,
  readTextFileSafe,
  renderTemplate,
};
