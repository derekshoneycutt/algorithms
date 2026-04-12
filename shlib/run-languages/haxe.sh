#! /bin/sh

haxe_compile() {
  # Nothing to do for haxe compile
  return 0
}
haxe_run() {
  haxe --run "$fileName" "$@"
  return "$?"
}
haxe_archive() {
  default_lang_archive "$@"
}