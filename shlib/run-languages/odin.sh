#! /bin/sh

odin_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "odin build . -out:$fileNameWithoutExt" > ./odin-build-last
  odin build . -out:"$fileNameWithoutExt">> ./odin-build-last 2>&1
  retValue="$?"
  echo "-- odin returned: $retValue" >> ./odin-build-last
  cd ..
  return "$retValue"
}
odin_run() {
  cd ./output
  "./$fileNameWithoutExt" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
odin_archive() {
  default_lang_archive "$@"
}