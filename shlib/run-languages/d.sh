#! /bin/sh

d_compile() {
  echo "dmd -v -od=./output -of=\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/d-build-last
  dmd -v -od=./output -of="./output/$fileNameWithoutExt" "./$fileName" >> ./output/d-build-last 2>&1
  retValue="$?"
  echo "-- dmd returned: $retValue" >> ./output/d-build-last
  return "$retValue"
}
d_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
d_archive() {
  default_lang_archive "$@"
}