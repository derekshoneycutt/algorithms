const Module = require("module");

/**
 * Runs one callback while temporarily patching Node's module loader.
 *
 * @param {(request: string, parent: Module, isMain: boolean, originalModuleLoad: typeof Module._load) => unknown} patchHandler Module-load patch handler.
 * @param {() => unknown} callback Callback executed while the patch is active.
 * @returns {unknown} Callback result.
 */
function withPatchedModuleLoad(patchHandler, callback) {
  const originalModuleLoad = Module._load;

  Module._load = function patchedModuleLoad(request, parent, isMain) {
    return patchHandler(request, parent, isMain, originalModuleLoad);
  };

  try {
    return callback();
  } finally {
    Module._load = originalModuleLoad;
  }
}

module.exports = {
  withPatchedModuleLoad,
};