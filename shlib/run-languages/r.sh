#! /bin/sh

r_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "Rscript --verbose --vanilla -e \"parse(file='$fileName')\"" > ./r-build-last
  Rscript --verbose --vanilla -e "parse(file='$fileName')" >> ./r-build-last 2>&1
  retValue="$?"
  echo "-- Rscript returned: $retValue" >> ./r-build-last
  cd ..
  return "$retValue"
}
r_run() {
  cd ./output
  Rscript "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
r_archive() {
  default_lang_archive "$@"
}