#! /bin/sh

cobol_compile() {
  echo "cobc -v -x -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/cobol-build-last
  cobc -v -x -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/cobol-build-last 2>&1
  retValue="$?"
  echo "-- cobc returned: $retValue" >> ./output/cobol-build-last
  return "$retValue"
}
cobol_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
cobol_archive() {
  default_lang_archive "$@"
}