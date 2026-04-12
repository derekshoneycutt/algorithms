#! /bin/sh

forth_compile() {
  return 0
}
forth_run() {
  gforth "./$fileName" -- "$@"
  return "$?"
}
forth_archive() {
  default_lang_archive "$@"
}