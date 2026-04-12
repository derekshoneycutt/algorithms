#! /bin/sh

idris_compile() {
  cp "./$fileName" ./output/
  cd ./output

  echo "idris2 --verbose \"$fileName\" -o \"$fileNameWithoutExt\"" > ./idris-build-last
  idris2 --verbose "$fileName" -o "$fileNameWithoutExt" >> ./idris-build-last 2>&1
  retValue="$?"
  echo "-- idris2 returned: $retValue" >> ./idris-build-last

  cd ..
  return "$retValue"
}
idris_run() {
  "./output/build/exec/$fileNameWithoutExt" "$@"
  return "$?"
}
idris_archive() {
  default_lang_archive "$@"
}