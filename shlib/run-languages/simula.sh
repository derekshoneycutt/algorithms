#! /bin/sh

simula_compile() {
  echo "Copying $fileName to output..." > ./output/simula-build-last
  cp "./$fileName" ./output/
  echo "cd ./output" >> ./output/simula-build-last
  echo "rm -f ./gcc ./g++" >> ./output/simula-build-last
  echo "ln -s \"${DEREKALGOS_GCC13}${DEREKALGOS_GCC13NAME}\" ./gcc" >> ./output/simula-build-last
  echo "ln -s \"${DEREKALGOS_GCC13}${DEREKALGOS_GXX13NAME}\" ./g++" >> ./output/simula-build-last
  echo "PATH=\"$PWD:\$PATH\" cim -v \"./$fileName\"" >> ./output/simula-build-last
  echo "cd .." >> ./output/simula-build-last
  cd ./output/
  rm -f ./gcc ./g++
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GCC13NAME}" ./gcc
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GXX13NAME}" ./g++
  PATH="$PWD:$PATH" cim -v "./$fileName" >> ./simula-build-last 2>&1
  retValue="$?"
  echo "-- cim returned: $retValue" >> ./simula-build-last
  cd ..
  return "$retValue"
}
simula_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
simula_archive() {
  default_lang_archive "$@"
}