#! /bin/sh

racket_compile() {
  echo "raco exe -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/racket-build-last
  raco exe -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/racket-build-last 2>&1
  retValue="$?"
  echo "-- raco exe returned: $retValue" >> ./output/racket-build-last
  return "$retValue"
}
racket_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
racket_archive() {
  default_lang_archive "$@"
}