#! /bin/sh

perl_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "perl -w -c \"./$fileName\"" > ./perl-build-last
  perl -w -c "./$fileName" >> ./perl-build-last 2>&1
  retValue="$?"
  echo "-- perl returned: $retValue" >> ./perl-build-last
  cd ..
  return "$retValue"
}
perl_run() {
  cd ./output
  perl "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
perl_archive() {
  default_lang_archive "$@"
}