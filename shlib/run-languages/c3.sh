#! /bin/sh

c3_compile() {
  echo "c3c -vv -o \"./output/$fileNameWithoutExt\" compile \"./$fileName\"" > ./output/c3-build-last
  c3c -vv -o "./output/$fileNameWithoutExt" compile "./$fileName" >> ./output/c3-build-last 2>&1
  retValue="$?"
  echo "-- C3C returned: $retValue" >> ./output/c3-build-last
  return "$retValue"
}
c3_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
c3_archive() {
  default_lang_archive "$@"
}