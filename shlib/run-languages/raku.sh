#! /bin/sh

raku_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "perl6 -c \"./$fileName\"" > ./raku-build-last
  raku -c "./$fileName" >> ./raku-build-last 2>&1
  retValue="$?"
  echo "-- perl6 returned: $retValue" >> ./perl6-build-last
  cd ..
  return "$retValue"
}
raku_run() {
  cd ./output
  perl6 "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
raku_archive() {
  default_lang_archive "$@"
}