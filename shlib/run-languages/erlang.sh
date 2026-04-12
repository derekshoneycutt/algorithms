#! /bin/sh

erlang_compile() {
  echo "erlc +verbose +report -o ./output/ \"./$fileName\"" > ./output/erlang-build-last
  erlc +verbose +report -o ./output/ "./$fileName" >> ./output/erlang-build-last 2>&1
  retValue="$?"
  echo "-- erlc returned: $retValue" >> ./output/erlang-build-last
  return "$retValue"
}
erlang_run() {
  cd ./output
  erl -noshell -s "$fileNameWithoutExt" main -s init stop -- "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
erlang_archive() {
  default_lang_archive "$@"
}