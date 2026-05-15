#! /bin/sh

qnial_compile() {
  cp "./$fileName" ./output/
  return 0
}
qnial_run() {
  cd ./output
  cat "$fileName" | nial64 -i | tail -n +4
  retValue="$?"
  cd ..
  return "$retValue"
}
qnial_archive() {
  default_lang_archive "$@"
}