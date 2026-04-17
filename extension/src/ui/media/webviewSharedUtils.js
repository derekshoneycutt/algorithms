"use strict";

/**
 * Canonical browser-side HTML escaping function.
 * This is the single source of truth — webviewHostUtils.js delegates to this file's
 * source rather than maintaining its own copy.
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
 * Renders one tokenized HTML template with replacement values.
 * This is the single source of truth — webviewHostUtils.js delegates to this file's
 * source rather than maintaining its own copy.
 *
 * @param {string} template Raw template source containing {{key}} placeholders.
 * @param {Record<string, string>} replacements Placeholder replacement values.
 * @returns {string} Rendered HTML with all known placeholders substituted.
 */
function renderTemplate(template, replacements) {
  return String(template || "").replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return String(replacements[key]);
    }

    return "";
  });
}
