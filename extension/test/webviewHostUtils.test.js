const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  escapeHtml,
  makeTemplateLoader,
  renderSectionHeader,
  renderTemplate,
} = require("../src/ui/webviewHostUtils");

/**
 * Creates one temporary directory for test files.
 *
 * @returns {string} Temporary directory path.
 */
function createTempDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "algos-webview-utils-"));
}

/**
 * Executes a callback while capturing console.error output.
 *
 * @param {() => void} callback Callback under test.
 * @returns {string[]} Captured error lines.
 */
function captureConsoleErrors(callback) {
  const originalConsoleError = console.error;
  const capturedErrors = [];

  console.error = (message) => {
    capturedErrors.push(String(message));
  };

  try {
    callback();
  } finally {
    console.error = originalConsoleError;
  }

  return capturedErrors;
}

/**
 * Verifies HTML escaping handles the standard unsafe characters.
 *
 * @returns {void}
 */
function testEscapeHtml() {
  assert.strictEqual(
    escapeHtml(`<&>"'`),
    "&lt;&amp;&gt;&quot;&#39;"
  );
}

/**
 * Verifies token replacement substitutes known keys and blanks unknown keys.
 *
 * @returns {void}
 */
function testRenderTemplate() {
  const rendered = renderTemplate("Hello {{name}} {{missing}}", {
    name: "world",
  });

  assert.strictEqual(rendered, "Hello world ");
}

/**
 * Verifies section headers escape the title and keep trusted action HTML intact.
 *
 * @returns {void}
 */
function testRenderSectionHeader() {
  const rendered = renderSectionHeader(
    "Profile <unsafe>",
    "profile",
    '<button data-action="refreshState">Refresh</button>',
    {
      profile: '<svg class="sectionIcon"></svg>',
    }
  );

  assert.ok(rendered.includes("Profile &lt;unsafe&gt;"));
  assert.ok(rendered.includes('data-action="refreshState"'));
  assert.ok(rendered.includes('<svg class="sectionIcon"></svg>'));
}

/**
 * Verifies the shared template loader caches file contents by path.
 *
 * @returns {void}
 */
function testMakeTemplateLoaderCachesText() {
  const tempDirectory = createTempDirectory();
  const templateFilePath = path.join(tempDirectory, "template.html");
  const loadTemplate = makeTemplateLoader(tempDirectory);

  fs.writeFileSync(templateFilePath, "first", "utf8");
  assert.strictEqual(loadTemplate("template.html", "Test"), "first");

  fs.writeFileSync(templateFilePath, "second", "utf8");
  assert.strictEqual(loadTemplate("template.html", "Test"), "first");
}

/**
 * Verifies missing template loads throw with a descriptive error.
 *
 * @returns {void}
 */
function testMakeTemplateLoaderThrowsForMissingTemplate() {
  const tempDirectory = createTempDirectory();
  const loadTemplate = makeTemplateLoader(tempDirectory);
  let thrownError = null;
  const capturedErrors = captureConsoleErrors(() => {
    try {
      loadTemplate("missing.html", "Smoke Controls");
    } catch (error) {
      thrownError = error;
    }
  });

  assert.ok(thrownError instanceof Error);
  assert.ok(String(thrownError.message).includes("Smoke Controls template load failed: missing.html"));
  assert.strictEqual(capturedErrors.length >= 1, true);
}

/**
 * Runs all webviewHostUtils tests.
 *
 * @returns {void}
 */
function runTests() {
  testEscapeHtml();
  testRenderTemplate();
  testRenderSectionHeader();
  testMakeTemplateLoaderCachesText();
  testMakeTemplateLoaderThrowsForMissingTemplate();
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests,
};