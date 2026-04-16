const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildWebviewErrorHtmlDocument,
  escapeHtml,
  makeTemplateLoader,
  renderWebviewHtmlWithFallback,
  renderSectionHeader,
  renderTemplate,
  resolveSidebarWebviewView,
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
 * Verifies webview render helper writes HTML and reports success.
 *
 * @returns {void}
 */
function testRenderWebviewHtmlWithFallbackSuccess() {
  const mockWebview = {
    html: "",
  };
  const didRender = renderWebviewHtmlWithFallback({
    webview: mockWebview,
    buildHtml: () => "<div>ok</div>",
  });

  assert.strictEqual(didRender, true);
  assert.strictEqual(mockWebview.html, "<div>ok</div>");
}

/**
 * Verifies webview render helper uses fallback when primary rendering fails.
 *
 * @returns {void}
 */
function testRenderWebviewHtmlWithFallbackError() {
  const mockWebview = {
    html: "",
  };
  const didRender = renderWebviewHtmlWithFallback({
    webview: mockWebview,
    buildHtml: () => {
      throw new Error("render failed");
    },
    buildErrorHtml: (_webview, error) => {
      return `<div>${String(error.message)}</div>`;
    },
  });

  assert.strictEqual(didRender, false);
  assert.strictEqual(mockWebview.html, "<div>render failed</div>");
}

/**
 * Verifies shared resolve helper applies options, rendering, and lifecycle handlers.
 *
 * @returns {void}
 */
function testResolveSidebarWebviewView() {
  let receivedMessage = null;
  let disposedView = null;
  let onDidReceiveMessageHandler = null;
  let onDidDisposeHandler = null;
  const expectedRoots = ["root-a", "root-b"];
  const mockWebview = {
    html: "",
    options: {},
    onDidReceiveMessage(handler) {
      onDidReceiveMessageHandler = handler;
    },
  };
  const mockWebviewView = {
    webview: mockWebview,
    onDidDispose(handler) {
      onDidDisposeHandler = handler;
    },
  };

  resolveSidebarWebviewView({
    webviewView: mockWebviewView,
    localResourceRoots: expectedRoots,
    buildHtml: () => "<main>rendered</main>",
    handleMessage: (message) => {
      receivedMessage = message;
    },
    handleDispose: (view) => {
      disposedView = view;
    },
  });

  assert.strictEqual(mockWebview.html, "<main>rendered</main>");
  assert.deepStrictEqual(mockWebview.options, {
    enableScripts: true,
    localResourceRoots: expectedRoots,
  });
  assert.strictEqual(typeof onDidReceiveMessageHandler, "function");
  assert.strictEqual(typeof onDidDisposeHandler, "function");

  onDidReceiveMessageHandler({ type: "message" });
  onDidDisposeHandler();

  assert.deepStrictEqual(receivedMessage, { type: "message" });
  assert.strictEqual(disposedView, mockWebviewView);
}

/**
 * Verifies shared resolve helper uses fallback HTML when primary render throws.
 *
 * @returns {void}
 */
function testResolveSidebarWebviewViewUsesFallbackHtml() {
  let onDidReceiveMessageHandler = null;
  let onDidDisposeHandler = null;
  const mockWebview = {
    html: "",
    options: {},
    onDidReceiveMessage(handler) {
      onDidReceiveMessageHandler = handler;
    },
  };
  const mockWebviewView = {
    webview: mockWebview,
    onDidDispose(handler) {
      onDidDisposeHandler = handler;
    },
  };

  resolveSidebarWebviewView({
    webviewView: mockWebviewView,
    localResourceRoots: [],
    buildHtml: () => {
      throw new Error("primary render failed");
    },
    buildErrorHtml: (_webview, error) => {
      return `<main>${String(error.message)}</main>`;
    },
  });

  assert.strictEqual(mockWebview.html, "<main>primary render failed</main>");
  assert.strictEqual(typeof onDidReceiveMessageHandler, "function");
  assert.strictEqual(typeof onDidDisposeHandler, "function");
}

/**
 * Verifies render helper rethrows when no fallback renderer is supplied.
 *
 * @returns {void}
 */
function testRenderWebviewHtmlWithFallbackThrowsWithoutFallback() {
  const mockWebview = {
    html: "",
  };

  assert.throws(() => {
    renderWebviewHtmlWithFallback({
      webview: mockWebview,
      buildHtml: () => {
        throw new Error("no fallback configured");
      },
    });
  }, /no fallback configured/);
}

/**
 * Verifies shared error document builder avoids inline styles and escapes text.
 *
 * @returns {void}
 */
function testBuildWebviewErrorHtmlDocument() {
  const html = buildWebviewErrorHtmlDocument(
    {
      cspSource: "vscode-resource:",
    },
    'bad <message> & "quotes"'
  );

  assert.ok(html.includes("style-src vscode-resource:"));
  assert.ok(html.includes("&lt;message&gt;"));
  assert.ok(html.includes("&amp;"));
  assert.ok(!html.includes("<style>"));
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
  testRenderWebviewHtmlWithFallbackSuccess();
  testRenderWebviewHtmlWithFallbackError();
  testRenderWebviewHtmlWithFallbackThrowsWithoutFallback();
  testResolveSidebarWebviewView();
  testResolveSidebarWebviewViewUsesFallbackHtml();
  testBuildWebviewErrorHtmlDocument();
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests,
};