#! /bin/sh

j_compile() {
  cp "./$fileName" ./output/
  return 0
}
j_run() {
  cd ./output
  jconsole "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
j_archive() {
  default_lang_archive "$@"
}