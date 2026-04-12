#! /bin/sh

# Build one stdlib submodule by module name and target.
moduleName="$1"
target="$2"

if [ -z "$moduleName" ] || [ -z "$target" ]; then
  echo "Usage: $0 <module-name> <target>" >&2
  exit 2
fi

scriptDir=$(CDPATH= cd -- "$(dirname "$0")" && pwd -P)

if [ ! -r "$scriptDir/target-metadata.sh" ]; then
  echo "Required file missing or unreadable: $scriptDir/target-metadata.sh" >&2
  exit 78
fi
. "$scriptDir/target-metadata.sh" || exit 78

if ! resolve_stdlib_module_dispatch_metadata "$moduleName" "$target"; then
  buildTarget=$(printf '%s' "$target" | tr '[:lower:]' '[:upper:]')
  echo "Unknown target specified '$buildTarget'" >&2
  exit 2
fi

if [ "$stdlibModuleDispatchTarget" = "clean" ]; then
  sh "$scriptDir/build-local.sh" clean
else
  sh "$scriptDir/build-local.sh" "$stdlibModuleDispatchTarget" "$stdlibModuleOutputFile"
fi