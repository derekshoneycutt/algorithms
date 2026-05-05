#! /bin/sh

acton_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "actonc \"$fileName\"" > ./acton-build-last
  actonc "$fileName" >> ./acton-build-last  2>&1
  retValue="$?"
  echo "-- actonc returned: $retValue" >> ./acton-build-last
  cd ..
  return "$retValue"
}
acton_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
acton_archive() {
  default_lang_archive "$@"
}