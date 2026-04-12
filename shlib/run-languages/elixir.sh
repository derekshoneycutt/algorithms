#! /bin/sh

elixir_compile() {
  echo "elixirc --verbose -o ./output/ \"./$fileName\"" > ./output/elixir-build-last
  elixirc --verbose -o ./output/ "./$fileName" >> ./output/elixir-build-last 2>&1
  retValue="$?"
  echo "-- elixirc returned: $retValue" >> ./output/elixir-build-last
  return "$retValue"
}
elixir_run() {
  elixir --erl "-pa ./output/" -e "$moduleName.main(System.argv())" -- "$@"
  return "$?"
}
elixir_archive() {
  default_lang_archive "$@"
}