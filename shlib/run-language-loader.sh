#! /bin/sh

# Load extracted per-language implementation files in a deterministic order.
load_run_language_modules() {
  runLanguageLoaderScriptDir="$1"
  if [ -z "$runLanguageLoaderScriptDir" ]; then
    echo "ERROR: load_run_language_modules requires the script directory." >&2
    return 1
  fi

  runLanguageModuleDir="$runLanguageLoaderScriptDir/shlib/run-languages"
  for runLanguageModulePath in "$runLanguageModuleDir"/*.sh; do
    if [ ! -e "$runLanguageModulePath" ]; then
      continue
    fi
    if [ ! -r "$runLanguageModulePath" ]; then
      echo "ERROR: required run language module missing or unreadable: $runLanguageModulePath" >&2
      return 1
    fi
    . "$runLanguageModulePath" || {
      echo "ERROR: failed to source run language module: $runLanguageModulePath" >&2
      return 1
    }
  done

  return 0
}