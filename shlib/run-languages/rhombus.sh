#! /bin/sh

rhombus_compile() {
  echo "raco exe -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/rhombus-build-last
  raco exe -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/rhombus-build-last 2>&1
  retValue="$?"
  echo "-- raco exe returned: $retValue" >> ./output/rhombus-build-last
  return "$retValue"
}
rhombus_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
rhombus_archive() {
  default_lang_archive "$@"
}