#! /bin/sh

fortran_compile() {
  echo "gfortran -v -Wall -Wextra \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/fortran-build-last
  gfortran -v -Wall -Wextra "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/fortran-build-last 2>&1
  retValue="$?"
  echo "-- gfortran returned: $retValue" >> ./output/fortran-build-last
  return "$retValue"
}
fortran_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
fortran_archive() {
  default_lang_archive "$@"
}