#! /bin/sh

tcl_compile() {
  return 0
}
tcl_run() {
  tclsh "$fileName" "$@"
  return "$?"
}
tcl_archive() {
  default_lang_archive "$@"
}