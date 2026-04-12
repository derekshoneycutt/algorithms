#! /bin/sh

freebasic_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "fbc -v \"./$fileName\"" > ./freebasic-build-last
  fbc -v "./$fileName" >> ./freebasic-build-last  2>&1
  retValue="$?"
  echo "-- fbc returned: $retValue" >> ./freebasic-build-last

  cd ..
  return "$retValue"
}
freebasic_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
freebasic_archive() {
  default_lang_archive "$@"
}