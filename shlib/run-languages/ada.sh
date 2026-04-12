#! /bin/sh

ada_compile() {
  echo "gnatmake -v -D output -o \"./output/$fileNameWithoutExt\" \"$fileName\"" > ./output/ada-build-last
  gnatmake -v -D output -o "./output/$fileNameWithoutExt" "$fileName" >> ./output/ada-build-last  2>&1
  retValue="$?"
  echo "-- GNAT returned: $retValue" >> ./output/ada-build-last
  return "$retValue"
}
ada_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
ada_archive() {
  default_lang_archive "$@"
}