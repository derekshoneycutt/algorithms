#! /bin/sh

javascript_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "node --check \"./$fileName\"" > ./javascript-build-last
  node --check "./$fileName" >> ./javascript-build-last 2>&1
  retValue="$?"
  echo "-- node returned: $retValue" >> ./javascript-build-last
  cd ..
  return "$retValue"
}
javascript_run() {
  cd ./output
  node "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
javascript_archive() {
  default_lang_archive "$@"
}