const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  buildWebviewErrorHtmlDocument,
  createSidebarWebviewLifecycle,
  escapeHtml,
  getEscapeHtmlSource,
  getRenderTemplateSource,
  makeTemplateLoader,
  renderWebviewHtmlWithFallback,
  renderSectionHeader,
  renderTemplate,
  resolveSidebarWebviewView,
  serializeForScript,
} = require("../../src/ui/templateModule");
const {
  createTemporaryDirectory,
} = require("../__helpers/temporaryFixtures");

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
 * Verifies helper source accessors return callable function source text.
 *
 * @returns {void}
 */
function testTemplateHelperSourceAccessors() {
  const escapeSource = getEscapeHtmlSource();
  const renderSource = getRenderTemplateSource();

  assert.ok(escapeSource.includes("function escapeHtml"));
  assert.ok(renderSource.includes("function renderTemplate"));
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
  const tempDirectory = createTemporaryDirectory("algos-webview-utils-");
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
  const tempDirectory = createTemporaryDirectory("algos-webview-utils-");
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
 * Verifies shared lifecycle controller manages resolve, refresh, and dispose.
 *
 * @returns {void}
 */
function testCreateSidebarWebviewLifecycle() {
  let receivedMessage = null;
  let disposedView = null;
  let onDidReceiveMessageHandler = null;
  let onDidDisposeHandler = null;
  let renderCount = 0;
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
  const lifecycle = createSidebarWebviewLifecycle({
    localResourceRoots: ["root-a"],
    buildHtml: () => {
      renderCount += 1;
      return `<main>${renderCount}</main>`;
    },
    handleMessage: (message) => {
      receivedMessage = message;
    },
    handleDispose: (view) => {
      disposedView = view;
    },
  });

  assert.strictEqual(lifecycle.refresh(), false);
  assert.strictEqual(lifecycle.getActiveWebviewView(), null);

  lifecycle.resolveWebviewView(mockWebviewView);
  assert.strictEqual(mockWebview.html, "<main>1</main>");
  assert.strictEqual(lifecycle.getActiveWebviewView(), mockWebviewView);

  assert.strictEqual(lifecycle.refresh(), true);
  assert.strictEqual(mockWebview.html, "<main>2</main>");

  onDidReceiveMessageHandler({ type: "message" });
  assert.deepStrictEqual(receivedMessage, { type: "message" });

  onDidDisposeHandler();
  assert.strictEqual(disposedView, mockWebviewView);
  assert.strictEqual(lifecycle.getActiveWebviewView(), null);
  assert.strictEqual(lifecycle.refresh(), false);
}

/**
 * Verifies separate lifecycle controllers keep independent active views.
 *
 * @returns {void}
 */
function testCreateSidebarWebviewLifecycleSupportsMultipleInstances() {
  let firstDisposeHandler = null;
  let secondDisposeHandler = null;
  const firstWebview = {
    html: "",
    options: {},
    onDidReceiveMessage() {
      // No-op in test.
    },
  };
  const secondWebview = {
    html: "",
    options: {},
    onDidReceiveMessage() {
      // No-op in test.
    },
  };
  const firstView = {
    webview: firstWebview,
    onDidDispose(handler) {
      firstDisposeHandler = handler;
    },
  };
  const secondView = {
    webview: secondWebview,
    onDidDispose(handler) {
      secondDisposeHandler = handler;
    },
  };
  const firstLifecycle = createSidebarWebviewLifecycle({
    localResourceRoots: [],
    buildHtml: () => "<main>first</main>",
  });
  const secondLifecycle = createSidebarWebviewLifecycle({
    localResourceRoots: [],
    buildHtml: () => "<main>second</main>",
  });

  firstLifecycle.resolveWebviewView(firstView);
  secondLifecycle.resolveWebviewView(secondView);

  assert.strictEqual(firstLifecycle.getActiveWebviewView(), firstView);
  assert.strictEqual(secondLifecycle.getActiveWebviewView(), secondView);
  assert.strictEqual(firstLifecycle.refresh(), true);
  assert.strictEqual(secondLifecycle.refresh(), true);
  assert.strictEqual(firstWebview.html, "<main>first</main>");
  assert.strictEqual(secondWebview.html, "<main>second</main>");

  firstDisposeHandler();
  assert.strictEqual(firstLifecycle.getActiveWebviewView(), null);
  assert.strictEqual(secondLifecycle.getActiveWebviewView(), secondView);

  secondDisposeHandler();
  assert.strictEqual(secondLifecycle.getActiveWebviewView(), null);
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
 * Verifies script serialization handles edge JSON inputs and escaping safely.
 *
 * @returns {void}
 */
function testSerializeForScript() {
  assert.strictEqual(serializeForScript(undefined), "null");
  assert.strictEqual(serializeForScript(null), "null");
  assert.strictEqual(serializeForScript(123), "123");
  assert.strictEqual(serializeForScript(true), "true");
  assert.strictEqual(
    serializeForScript("a < b && c > d"),
    '"a \\u003c b \\u0026\\u0026 c \\u003e d"'
  );
}

/**
 * Runs all templateModule tests.
 *
 * @returns {void}
 */
function runTests() {
  testEscapeHtml();
  testRenderTemplate();
  testTemplateHelperSourceAccessors();
  testRenderSectionHeader();
  testMakeTemplateLoaderCachesText();
  testMakeTemplateLoaderThrowsForMissingTemplate();
  testRenderWebviewHtmlWithFallbackSuccess();
  testRenderWebviewHtmlWithFallbackError();
  testRenderWebviewHtmlWithFallbackThrowsWithoutFallback();
  testResolveSidebarWebviewView();
  testResolveSidebarWebviewViewUsesFallbackHtml();
  testCreateSidebarWebviewLifecycle();
  testCreateSidebarWebviewLifecycleSupportsMultipleInstances();
  testBuildWebviewErrorHtmlDocument();
  testSerializeForScript();
}

// Public test entrypoint for the shared test runner.
module.exports = {
  runTests,
};