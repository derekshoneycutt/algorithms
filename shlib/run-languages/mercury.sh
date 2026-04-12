#! /bin/sh

mercury_compile() {
  echo "Copying $fileName to output as .m..." > ./output/mercury-build-last
  cp "$fileName" "./output/$fileNameWithoutExt.m"
  cd ./output

  echo "cd ./output" >> ./mercury-build-last
  echo "mmc --verbose \"./$fileNameWithoutExt.m\"" >> ./mercury-build-last
  echo "cd .." >> ./mercury-build-last
  mmc --verbose "./$fileNameWithoutExt.m" >> ./mercury-build-last 2>&1
  retValue="$?"
  echo "-- mmc returned: $retValue" >> ./mercury-build-last

  cd ..
  return "$retValue"
}
mercury_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
mercury_archive() {
  default_lang_archive "$@"
}