#! /bin/sh

pony_compile() {
  retValue=0
  cp "$fileName" ./output/
  cd ./output/
  echo "ponyc --bin-name \"$fileNameWithoutExt\"" > ./pony-build-last
  ponyc --bin-name "$fileNameWithoutExt" >> ./pony-build-last 2>&1
  retValue="$?"
  echo "-- ponyc returned: $retValue" >> ./pony-build-last
  cd ..
  return "$retValue"
}
pony_run() {
  cd ./output
  "./$fileNameWithoutExt" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
pony_archive() {
  default_lang_archive "$@"
}
