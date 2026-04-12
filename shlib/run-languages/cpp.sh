#! /bin/sh

cpp_compile() {
  echo "g++ -v -Wall -Wextra \"./$fileName\" -o \"./output/$fileNameWithoutExt\" --std=c++23 -lstdc++exp" > ./output/cpp-build-last
  g++ -v -Wall -Wextra "./$fileName" -o "./output/$fileNameWithoutExt" --std=c++23 -lstdc++exp >> ./output/cpp-build-last 2>&1
  retValue="$?"
  echo "-- G++ returned: $retValue" >> ./output/cpp-build-last
  return "$retValue"
}
cpp_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

cpp_archive() {
  default_lang_archive "$@"
}