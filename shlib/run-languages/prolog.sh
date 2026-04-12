#! /bin/sh

prolog_compile() {
  echo "gplc -v \"$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/prolog-build-last
  gplc -v "$fileName" -o "./output/$fileNameWithoutExt" >> ./output/prolog-build-last 2>&1
  retValue="$?"
  echo "-- gplc returned: $retValue" >> ./output/prolog-build-last
  return "$retValue"
}
prolog_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
prolog_archive() {
  default_lang_archive "$@"
}