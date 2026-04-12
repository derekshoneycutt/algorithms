#! /bin/sh

c_compile() {
  echo "gcc -v -Wall -Wextra \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/c-build-last
  gcc -v -Wall -Wextra "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/c-build-last 2>&1
  retValue="$?"
  echo "-- GCC returned: $retValue" >> ./output/c-build-last
  return "$retValue"
}
c_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
c_archive() {
  default_lang_archive "$@"
}