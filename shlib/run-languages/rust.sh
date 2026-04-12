#! /bin/sh

rust_compile() {
  echo "rustc --verbose \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/rust-build-last
  rustc --verbose "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/rust-build-last 2>&1
  retValue="$?"
  echo "-- rustc returned: $retValue" >> ./output/rust-build-last
  return "$retValue"
}
rust_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
rust_archive() {
  default_lang_archive "$@"
}