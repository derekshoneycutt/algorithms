#! /bin/sh

typescript_compile() {
  echo "tsc \"$fileName\" --outDir output --target esnext --skipLibCheck true --types node --listFiles --extendedDiagnostics" > ./output/typescript-build-last
  tsc "$fileName" --outDir output --target esnext --skipLibCheck true --types node --listFiles --extendedDiagnostics >> ./output/typescript-build-last 2>&1
  retValue="$?"
  echo "-- tsc returned: $retValue" >> ./output/typescript-build-last
  return "$retValue"
}
typescript_run() {
  node "./output/$fileNameWithoutExt.js" "$@"
  return "$?"
}
typescript_archive() {
  default_lang_archive "$@"
}