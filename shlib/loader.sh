#! /bin/sh

# Load required shlib modules in a deterministic order.
# Args:
#   $1: caller label (for diagnostics)
#   $2: absolute/normalized script directory
#   $3..$: module filenames under shlib/
load_required_shlib_modules() {
  loaderCaller="$1"
  loaderScriptDir="$2"
  shift 2

  if [ -z "$loaderCaller" ] || [ -z "$loaderScriptDir" ]; then
    echo "ERROR: load_required_shlib_modules requires caller and script directory." >&2
    return 1
  fi

  for loaderModuleName in "$@"; do
    loaderModulePath="$loaderScriptDir/shlib/$loaderModuleName"
    if [ ! -r "$loaderModulePath" ]; then
      echo "ERROR: required shlib module missing or unreadable: $loaderModulePath (required by $loaderCaller)" >&2
      return 1
    fi
    . "$loaderModulePath" || {
      echo "ERROR: failed to source shlib module: $loaderModulePath (required by $loaderCaller)" >&2
      return 1
    }
  done

  return 0
}
