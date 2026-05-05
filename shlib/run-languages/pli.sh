#! /bin/sh

pli_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "plic -C \"$fileName\"" > ./pli-build-last
  plic -C "$fileName" >> ./pli-build-last 2>&1
  retValue="$?"
  echo "-- pli returned: $retValue" >> ./pli-build-last
  if [ "$retValue" -ne 0 ]; then
    cd ..
    return "$retValue"
  fi
  echo "gcc -o \"$fileNameWithoutExt\" \"${fileNameWithoutExt}.o\" -lprf -m32 -Wl,-z,muldefs" >> ./pli-build-last
  gcc -o "$fileNameWithoutExt" "${fileNameWithoutExt}.o" -lprf -m32 -Wl,-z,muldefs >> ./pli-build-last 2>&1
  retValue="$?"
  echo "-- gcc returned: $retValue" >> ./pli-build-last
  cd ..
  return "$retValue"
}
pli_run() {
  cd ./output
  "./$fileNameWithoutExt" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
pli_archive() {
  default_lang_archive "$@"
}