#! /bin/sh

icon_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "icont \"./$fileName\"" > ./icon-build-last
  icont "./$fileName" >> ./icon-build-last 2>&1
  retValue="$?"
  echo "-- icont returned: $retValue" >> ./icon-build-last
  cd ..
  return "$retValue"
}

icon_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

icon_archive() {
  default_lang_archive "$@"
}