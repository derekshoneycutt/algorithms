const esbuild = require("esbuild");

const isWatchMode = process.argv.includes("--watch");

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
    target: "node18",
  };
}

/**
 * Returns the esbuild configuration for the smoke controls webview frontend bundle.
 *
 * @returns {import("esbuild").BuildOptions} Webview build configuration.
 */
function createSmokeControlsWebviewBuildOptions() {
  return {
    bundle: true,
    entryPoints: ["./src/views/media/smokeControls/smokeControlsView.ts"],
    format: "iife",
    outfile: "./dist/views/smokeControls/smokeControlsView.js",
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
  const buildOptions = [
    createExtensionBuildOptions(),
    createSmokeControlsWebviewBuildOptions(),
  ];

  if (isWatchMode) {
    const contexts = await Promise.all(
      buildOptions.map((options) => {
        return esbuild.context(options);
      })
    );

    await Promise.all(
      contexts.map((context) => {
        return context.watch();
      })
    );

    console.log("[vscextension] watching extension and webview bundles");
    return;
  }

  await Promise.all(
    buildOptions.map((options) => {
      return esbuild.build(options);
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});