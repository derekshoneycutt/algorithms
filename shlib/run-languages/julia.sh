#! /bin/sh

julia_compile() {
  return 0
}
julia_run() {
  julia "./$fileName" "$@"
  return "$?"
}
julia_archive() {
  default_lang_archive "$@"
}