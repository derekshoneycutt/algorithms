#! /bin/sh

apl_compile() {
  cp "$fileName" ./output/
  return 0
}
apl_run() {
  cd ./output
  dyalog -script "$fileName"
  retValue="$?"
  cd ..
  return "$retValue"
}
apl_archive() {
  default_lang_archive "$@"
}