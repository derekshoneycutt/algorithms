#! /bin/sh

ocaml_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ocamlopt -verbose -o \"./$fileNameWithoutExt\" \"./$fileName\"" > ./ocaml-build-last
  ocamlopt -verbose -o "./$fileNameWithoutExt" "./$fileName" >> ./ocaml-build-last 2>&1
  retValue="$?"
  echo "-- ocamlopt returned: $retValue" >> ./ocaml-build-last
  cd ..
  return "$retValue"
}
ocaml_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
ocaml_archive() {
  default_lang_archive "$@"
}