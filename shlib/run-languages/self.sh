#! /bin/sh

self_compile() {
  cp "./$fileName" ./output/
  return 0
}
self_run() {
  cd ./output
  /opt/self/run-self.sh "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
self_archive() {
  default_lang_archive "$@"
}