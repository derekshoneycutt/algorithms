#! /bin/sh

scheme_compile() {
  scheme_compiler_name="guild"
  if command -v guild > /dev/null 2>&1; then
    echo "guild compile --verbose -o \"./output/$fileNameWithoutExt.go\" \"./$fileName\"" > ./output/scheme-build-last
    guild compile --verbose -o "./output/$fileNameWithoutExt.go" "./$fileName" >> ./output/scheme-build-last 2>&1
    retValue="$?"
  else
    scheme_compiler_name="guile"
    echo "GUILE_DEBUG_LOAD=1 guile -c \"(compile-file \\\"./$fileName\\\" #:output-file \\\"./output/$fileNameWithoutExt.go\\\")\"" > ./output/scheme-build-last
    GUILE_DEBUG_LOAD=1 guile -c "(compile-file \"./$fileName\" #:output-file \"./output/$fileNameWithoutExt.go\")" >> ./output/scheme-build-last 2>&1
    retValue="$?"
  fi
  echo "-- $scheme_compiler_name returned: $retValue" >> ./output/scheme-build-last
  return "$retValue"
}
scheme_run() {
  guile -c "(load-compiled \"./output/$fileNameWithoutExt.go\")" "$@"
  return "$?"
}
scheme_archive() {
  default_lang_archive "$@"
}