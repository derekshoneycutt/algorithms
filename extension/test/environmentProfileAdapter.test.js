"use strict";

const assert = require("assert");
const {
  actionCreators,
  extensionStateStore,
  selectEnvironmentDraftValues,
  selectEnvironmentParsedConfig,
} = require("../src/runtime/extensionStateStore");
const {
  createEnvironmentProfileAdapter,
} = require("../src/runtime/commandline/adapters/environmentProfileAdapter");

/**
 * Resets environment store fields used by environment profile adapter tests.
 *
 * @returns {void}
 */
function resetEnvironmentState() {
  extensionStateStore.dispatch(actionCreators.resetEnvironmentStatus());
  extensionStateStore.dispatch(actionCreators.resetEnvironmentDraftValues());
  extensionStateStore.dispatch(actionCreators.setEnvironmentParsedConfig(null));
}

/**
 * Verifies draft field updates are written into store-backed environment draft state.
 *
 * @returns {void}
 */
function testApplyDraftFields() {
  resetEnvironmentState();

  const adapter = createEnvironmentProfileAdapter();

  adapter.applyDraftFields({
    profilePath: "~/.zshrc",
    copyIconsPath: "/tmp/icons",
    dockerEnabled: true,
    dockerValue: "docker-host",
    sshEnabled: false,
    sshValue: "",
  });

  const draftValues = selectEnvironmentDraftValues();

  assert.strictEqual(draftValues.profilePath, "~/.zshrc");
  assert.strictEqual(draftValues.copyIconsPath, "/tmp/icons");
  assert.strictEqual(draftValues.batchDockerEnabled, true);
  assert.strictEqual(draftValues.batchDockerValue, "docker-host");
  assert.strictEqual(draftValues.batchSshEnabled, false);
  assert.strictEqual(draftValues.batchSshValue, "");
}

/**
 * Verifies hydration runs filesystem/discovery + parse bridge and stores parsed config.
 *
 * @returns {void}
 */
function testHydrateParsedConfig() {
  resetEnvironmentState();

  extensionStateStore.dispatch(
    actionCreators.setEnvironmentDraftProfilePath("/tmp/custom-profile")
  );

  const adapter = createEnvironmentProfileAdapter({
    resolveEnvironmentRootInfoFn() {
      return {
        resolvedRootPath: "/repo",
        initScriptPath: "/repo/init.sh",
      };
    },
    readTextFilePathFn(filePath) {
      if (filePath === "/repo/init.sh") {
        return "init-content";
      }

      if (filePath === "/tmp/custom-profile") {
        return "profile-content";
      }

      return "";
    },
    buildMergedEnvironmentConfigFn(initScriptText, profileText, resolvedRootPath) {
      assert.strictEqual(initScriptText, "init-content");
      assert.strictEqual(profileText, "profile-content");
      assert.strictEqual(resolvedRootPath, "/repo");

      return {
        defaults: {
          copyIconsTo: "~/.vscode/extensions/icons/",
          timeout: "-k 10s 2m",
          eiffel: "eiffelstudio",
          gcc13Directory: "/usr/bin/",
          gcc13Name: "gcc-13",
          gxx13Name: "g++-13",
          runOnDocker: "",
          runOnSsh: "",
          supportedLanguageKeys: ["python"],
        },
        values: {
          timeout: "-k 5s 1m",
          eiffel: "eiffelstudio",
          gcc13Directory: "/usr/bin/",
          gcc13Name: "gcc-13",
          gxx13Name: "g++-13",
          dockerMapText: "python=docker-host",
          sshMapText: "",
        },
        routeMaps: {
          docker: new Map([["python", "docker-host"]]),
          ssh: new Map(),
        },
      };
    },
  });

  const hydrated = adapter.hydrateParsedConfig({});

  assert.strictEqual(hydrated.rootInfo.resolvedRootPath, "/repo");
  assert.strictEqual(hydrated.effectiveProfilePath, "/tmp/custom-profile");
  assert.strictEqual(hydrated.parsedConfig.values.timeout, "-k 5s 1m");

  const parsedConfig = selectEnvironmentParsedConfig();
  assert.strictEqual(parsedConfig.values.timeout, "-k 5s 1m");
  assert.strictEqual(parsedConfig.routeMaps.docker.get("python"), "docker-host");
}

/**
 * Runs environmentProfileAdapter tests.
 *
 * @returns {void}
 */
function runTests() {
  testApplyDraftFields();
  testHydrateParsedConfig();
}

module.exports = {
  runTests,
};
