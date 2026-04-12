#! /bin/sh

pascal_compile() {
  echo "Copying $fileName to output..." > ./output/pascal-build-last
  cp "./$fileName" ./output

  echo "cd ./output" >> ./output/pascal-build-last
  echo "fpc -va \"$fileName\"" >> ./output/pascal-build-last
  echo "cd .." >> ./output/pascal-build-last
  cd ./output
  fpc -va "$fileName" >> ./pascal-build-last 2>&1
  retValue="$?"
  echo "-- fpc returned: $retValue" >> ./pascal-build-last
  cd ..
  return "$retValue"
}
pascal_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
pascal_archive() {
  default_lang_archive "$@"
}