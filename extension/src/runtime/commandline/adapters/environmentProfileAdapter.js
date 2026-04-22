"use strict";

const {
  buildMergedEnvironmentConfig,
} = require("../core/shellProfileParseCore");
const {
  actionCreators,
  extensionStateStore,
  selectEnvironmentDraftValues,
} = require("../../state/extensionStateStore");
const {
  expandHomeFilesystemPath,
  getDefaultProfilePathForPlatform,
  getProfilePlaceholderForPlatform,
  resolveEnvironmentRootInfoForWorkspace,
} = require("../../filesystem/platformProfile");
const {
  readTextFilePath,
} = require("../../filesystem/workspaceFilesystem");

/**
 * Creates one default parsed environment config shape.
 *
 * @returns {{defaults: {copyIconsTo: string, timeout: string, eiffel: string, gcc13Directory: string, gcc13Name: string, gxx13Name: string, runOnDocker: string, runOnSsh: string, supportedLanguageKeys: string[]}, values: {timeout: string, eiffel: string, gcc13Directory: string, gcc13Name: string, gxx13Name: string, dockerMapText: string, sshMapText: string}, routeMaps: {docker: Map<string, string>, ssh: Map<string, string>}}} Empty parsed config.
 */
function createEmptyParsedEnvironmentConfig() {
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
      supportedLanguageKeys: [],
    },
    values: {
      timeout: "-k 10s 2m",
      eiffel: "eiffelstudio",
      gcc13Directory: "/usr/bin/",
      gcc13Name: "gcc-13",
      gxx13Name: "g++-13",
      dockerMapText: "",
      sshMapText: "",
    },
    routeMaps: {
      docker: new Map(),
      ssh: new Map(),
    },
  };
}

/**
 * Creates one environment profile adapter.
 *
 * @param {{resolveEnvironmentRootInfoFn?: Function, readTextFilePathFn?: Function, buildMergedEnvironmentConfigFn?: Function}} [deps] Optional dependency overrides for tests.
 * @returns {{applyDraftFields: (message: object|undefined) => void, hydrateParsedConfig: (vscodeApi: import("vscode")) => {rootInfo: {resolvedRootPath: string|null, initScriptPath: string|null}, profilePlaceholder: string, effectiveProfilePath: string, parsedConfig: object}, createEmptyParsedEnvironmentConfig: () => object}} Adapter API.
 */
function createEnvironmentProfileAdapter(deps = {}) {
  const resolveEnvironmentRootInfoFn =
    typeof deps.resolveEnvironmentRootInfoFn === "function"
      ? deps.resolveEnvironmentRootInfoFn
      : resolveEnvironmentRootInfoForWorkspace;
  const readTextFilePathFn =
    typeof deps.readTextFilePathFn === "function"
      ? deps.readTextFilePathFn
      : readTextFilePath;
  const buildMergedEnvironmentConfigFn =
    typeof deps.buildMergedEnvironmentConfigFn === "function"
      ? deps.buildMergedEnvironmentConfigFn
      : buildMergedEnvironmentConfig;

  /**
   * Applies incoming draft values into store-backed environment draft state.
   *
   * @param {{profilePath?: string, copyIconsPath?: string, dockerEnabled?: boolean, dockerValue?: string, sshEnabled?: boolean, sshValue?: string}|undefined} message Incoming draft payload.
   * @returns {void}
   */
  function applyDraftFields(message) {
    if (typeof message?.profilePath === "string") {
      extensionStateStore.dispatch(
        actionCreators.setEnvironmentDraftProfilePath(message.profilePath)
      );
    }

    if (typeof message?.copyIconsPath === "string") {
      extensionStateStore.dispatch(
        actionCreators.setEnvironmentDraftCopyIconsPath(message.copyIconsPath)
      );
    }

    const nextBatchDraft = {
      dockerEnabled:
        typeof message?.dockerEnabled === "boolean"
          ? message.dockerEnabled
          : undefined,
      dockerValue:
        typeof message?.dockerValue === "string"
          ? message.dockerValue
          : undefined,
      sshEnabled:
        typeof message?.sshEnabled === "boolean"
          ? message.sshEnabled
          : undefined,
      sshValue:
        typeof message?.sshValue === "string"
          ? message.sshValue
          : undefined,
    };

    if (
      nextBatchDraft.dockerEnabled !== undefined
      || nextBatchDraft.dockerValue !== undefined
      || nextBatchDraft.sshEnabled !== undefined
      || nextBatchDraft.sshValue !== undefined
    ) {
      extensionStateStore.dispatch(
        actionCreators.setEnvironmentDraftBatchRouting(nextBatchDraft)
      );
    }
  }

  /**
   * Hydrates parsed environment config from filesystem content and writes it to store.
   *
   * @param {import("vscode")} vscodeApi VS Code API object.
   * @returns {{rootInfo: {resolvedRootPath: string|null, initScriptPath: string|null}, profilePlaceholder: string, effectiveProfilePath: string, parsedConfig: object}} Hydrated snapshot.
   */
  function hydrateParsedConfig(vscodeApi) {
    const draftValues = selectEnvironmentDraftValues();
    const profilePlaceholder = getProfilePlaceholderForPlatform();
    const effectiveProfilePath = draftValues.profilePath
      ? expandHomeFilesystemPath(draftValues.profilePath)
      : getDefaultProfilePathForPlatform();
    const rootInfo = resolveEnvironmentRootInfoFn(vscodeApi);
    const initScriptText = rootInfo.initScriptPath
      ? readTextFilePathFn(rootInfo.initScriptPath)
      : "";
    const profileText = effectiveProfilePath
      ? readTextFilePathFn(effectiveProfilePath)
      : "";
    const mergedConfig = buildMergedEnvironmentConfigFn(
      String(initScriptText || ""),
      String(profileText || ""),
      rootInfo.resolvedRootPath
    );

    const parsedConfig = {
      profilePlaceholder,
      effectiveProfilePath,
      defaults: mergedConfig.defaults,
      values: mergedConfig.values,
      routeMaps: {
        docker: new Map(mergedConfig.routeMaps.docker),
        ssh: new Map(mergedConfig.routeMaps.ssh),
      },
    };

    extensionStateStore.dispatch(actionCreators.setEnvironmentParsedConfig(parsedConfig));

    return {
      rootInfo,
      profilePlaceholder,
      effectiveProfilePath,
      parsedConfig,
    };
  }

  return {
    applyDraftFields,
    hydrateParsedConfig,
    createEmptyParsedEnvironmentConfig,
  };
}

module.exports = {
  createEnvironmentProfileAdapter,
  createEmptyParsedEnvironmentConfig,
};