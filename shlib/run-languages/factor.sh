#! /bin/sh

factor_compile() {
  return 0
}
factor_run() {
  factor -run "./$fileName" "$@"
  return "$?"
}
factor_archive() {
  default_lang_archive "$@"
}