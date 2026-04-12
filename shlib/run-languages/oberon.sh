#! /bin/sh

oberon_compile() {
  echo "Copying $fileName to output..." > ./output/oberon-build-last
  cp "./$fileName" ./output/
  echo "cd ./output" >> ./output/oberon-build-last
  echo "voc -v -m \"./$fileName\"" >> ./output/oberon-build-last
  echo "cd .." >> ./output/oberon-build-last
  cd ./output
  voc -v -m "$fileName" >> ./oberon-build-last 2>&1
  retValue="$?"
  echo "-- voc returned: $retValue" >> ./oberon-build-last
  cd ..
  return "$retValue"
}
oberon_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
oberon_archive() {
  default_lang_archive "$@"
}