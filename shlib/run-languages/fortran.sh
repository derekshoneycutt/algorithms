#! /bin/sh

fortran_compile() {
  echo "Copying into ./output/ and building" >> ./output/fortran-build-last
  cp "./$fileName" "./output/$fileName"
  cd ./output/
  echo "gfortran -v -Wall -Wextra \"./$fileName\" -o \"./$fileNameWithoutExt\"" > ./fortran-build-last
  gfortran -v -Wall -Wextra "./$fileName" -o "./$fileNameWithoutExt" >> ./fortran-build-last 2>&1
  retValue="$?"
  cd ..
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