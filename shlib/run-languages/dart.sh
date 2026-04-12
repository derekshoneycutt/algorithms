#! /bin/sh

dart_compile() {
  echo "dart --verbose compile exe \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/dart-build-last
  dart --verbose compile exe "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/dart-build-last 2>&1
  retValue="$?"
  echo "-- dart returned: $retValue" >> ./output/dart-build-last
  return "$retValue"
}
dart_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
dart_archive() {
  default_lang_archive "$@"
}