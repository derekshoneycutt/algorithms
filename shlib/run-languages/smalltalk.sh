#! /bin/sh

smalltalk_compile() {
  return 0
}
smalltalk_run() {
  gst "./$fileName" -a "$@"
  return "$?"
}
smalltalk_archive() {
  default_lang_archive "$@"
}