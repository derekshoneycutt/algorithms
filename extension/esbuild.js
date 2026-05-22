const esbuild = require("esbuild");

const isWatchMode = process.argv.includes("--watch");
const runWebviewUiEntryPoint = "./src/views/run/ui/runWebviewApp.mts";
const runWebviewUiOutfile = "./dist/views/run/ui/runWebviewApp.js";
const smokeWebviewUiEntryPoint = "./src/views/smoke/ui/smokeWebviewApp.mts";
const smokeWebviewUiOutfile = "./dist/views/smoke/ui/smokeWebviewApp.js";
const environmentWebviewUiEntryPoint = "./src/views/environment/ui/environmentWebviewApp.mts";
const environmentWebviewUiOutfile = "./dist/views/environment/ui/environmentWebviewApp.js";

/**
 * Returns the esbuild configuration for the extension host bundle.
 *
 * @returns {import("esbuild").BuildOptions} Extension build configuration.
 */
function createExtensionBuildOptions() {
  return {
    bundle: true,
    entryPoints: ["./src/extension.ts"],
    external: ["vscode"],
    format: "cjs",
    outfile: "./dist/extension.js",
    platform: "node",
    sourcemap: true,
    target: "node20",
  };
}

/**
 * Returns the esbuild configuration for the run webview UI bundle.
 *
 * @returns {import("esbuild").BuildOptions} Run webview UI build configuration.
 */
function createRunWebviewUiBuildOptions() {
  return {
    bundle: true,
    entryPoints: [runWebviewUiEntryPoint],
    format: "iife",
    outfile: runWebviewUiOutfile,
    platform: "browser",
    sourcemap: true,
    target: "es2022",
  };
}

/**
 * Returns the esbuild configuration for the smoke webview UI bundle.
 *
 * @returns {import("esbuild").BuildOptions} Smoke webview UI build configuration.
 */
function createSmokeWebviewUiBuildOptions() {
  return {
    bundle: true,
    entryPoints: [smokeWebviewUiEntryPoint],
    format: "iife",
    outfile: smokeWebviewUiOutfile,
    platform: "browser",
    sourcemap: true,
    target: "es2022",
  };
}

/**
 * Returns the esbuild configuration for the environment webview UI bundle.
 *
 * @returns {import("esbuild").BuildOptions} Environment webview UI build configuration.
 */
function createEnvironmentWebviewUiBuildOptions() {
  return {
    bundle: true,
    entryPoints: [environmentWebviewUiEntryPoint],
    format: "iife",
    outfile: environmentWebviewUiOutfile,
    platform: "browser",
    sourcemap: true,
    target: "es2022",
  };
}

/**
 * Runs the extension build once or in watch mode.
 *
 * @returns {Promise<void>} Resolves when setup is complete.
 */
async function main() {
  const buildOptions = createExtensionBuildOptions();
  const runWebviewUiBuildOptions = createRunWebviewUiBuildOptions();
  const smokeWebviewUiBuildOptions = createSmokeWebviewUiBuildOptions();
  const environmentWebviewUiBuildOptions = createEnvironmentWebviewUiBuildOptions();

  if (isWatchMode) {
    const extensionContext = await esbuild.context(buildOptions);
    const runWebviewUiContext = await esbuild.context(runWebviewUiBuildOptions);
    const smokeWebviewUiContext = await esbuild.context(smokeWebviewUiBuildOptions);
    const environmentWebviewUiContext = await esbuild.context(environmentWebviewUiBuildOptions);
    await extensionContext.watch();
    await runWebviewUiContext.watch();
    await smokeWebviewUiContext.watch();
    await environmentWebviewUiContext.watch();
    console.log("[vscextension] watching extension and webview bundles");
    return;
  }

  await Promise.all([
    esbuild.build(buildOptions),
    esbuild.build(runWebviewUiBuildOptions),
    esbuild.build(smokeWebviewUiBuildOptions),
    esbuild.build(environmentWebviewUiBuildOptions),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});