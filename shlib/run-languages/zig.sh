#! /bin/sh

zig_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "zig build-exe \"./$fileName\"" > ./zig-build-last
  zig build-exe "./$fileName" >> ./zig-build-last 2>&1
  retValue="$?"
  echo "-- zig returned: $retValue" >> ./zig-build-last
  cd ..
  return "$retValue"
}
zig_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
zig_archive() {
  default_lang_archive "$@"
}