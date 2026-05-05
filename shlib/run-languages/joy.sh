#! /bin/sh

joy_compile() {
  cp "./$fileName" ./output/
  return 0
}
joy_run() {
  cd ./output
  joy "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
joy_archive() {
  default_lang_archive "$@"
}