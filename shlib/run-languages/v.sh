#! /bin/sh

v_compile() {
  echo "v \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/v-build-last
  v "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/v-build-last 2>&1
  retValue="$?"
  echo "-- v returned: $retValue" >> ./output/v-build-last
  return "$retValue"
}
v_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
v_archive() {
  default_lang_archive "$@"
}