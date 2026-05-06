#! /bin/sh

io_compile() {
  cp "./$fileName" ./output/
  return 0
}

io_run() {
  cd ./output/
  ~/.wasmtime/bin/wasmtime --dir=. /opt/io/bin/io_static "$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}

io_archive() {
  default_lang_archive "$@"
}