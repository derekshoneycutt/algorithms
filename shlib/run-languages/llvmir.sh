#! /bin/sh

llvmir_compile() {
  echo "clang -v \"./$fileName\" -O2 -Wall -Wextra -o \"./output/$fileNameWithoutExt\"" > ./output/llvmir-build-last
  clang -v "./$fileName" -O2 -Wall -Wextra -o "./output/$fileNameWithoutExt" >> ./output/llvmir-build-last 2>&1
  retValue="$?"
  echo "-- clang returned: $retValue" >> ./output/llvmir-build-last
  return "$retValue"
}
llvmir_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
llvmir_archive() {
  default_lang_archive "$@"
}