#! /bin/sh

kit_compile() {
  return 0
}
kit_run() {
  kit run "./$fileName" "$@"
  return "$?"
}
kit_archive() {
  default_lang_archive "$@"
}