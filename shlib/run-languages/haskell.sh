#! /bin/sh

haskell_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ghc -v2 \"./$fileName\"" > ./haskell-build-last
  ghc -v2 "./$fileName" >> ./haskell-build-last 2>&1
  retValue="$?"
  echo "-- ghc returned: $retValue" >> ./haskell-build-last
  cd ..
  return "$retValue"
}
haskell_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
haskell_archive() {
  default_lang_archive "$@"
}