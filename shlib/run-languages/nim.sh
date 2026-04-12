#! /bin/sh

nim_compile() {
  echo "nim compile --verbosity:3 --out:\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/nim-build-last
  nim compile --verbosity:3 --out:"./output/$fileNameWithoutExt" "./$fileName" >> ./output/nim-build-last 2>&1
  retValue="$?"
  echo "-- nim returned: $retValue" >> ./output/nim-build-last
  return "$retValue"
}
nim_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
nim_archive() {
  default_lang_archive "$@"
}