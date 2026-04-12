#! /bin/sh

modula3_compile() {
  echo "Making and emptying output/AMD64_LINUX..." > ./output/modula3-build-last
  mkdir -p ./output/AMD64_LINUX
  rm -Rf ./output/AMD64_LINUX/* >> /dev/null
  echo "Copying file to output/AMD64_LINUX..." >> ./output/modula3-build-last
  cp "$fileName" "./output/AMD64_LINUX/$fileName"
  echo "cd ./output" >> ./output/modula3-build-last
  echo "cm3 -verbose \"$fileName\"" >> ./output/modula3-build-last
  cd ./output/
  cm3 -verbose "$fileName" >> ./modula3-build-last 2>&1
  retValue="$?"
  echo "-- cm3 returned: $retValue" >> ./modula3-build-last
  cd ..
  return "$retValue"
}
modula3_run() {
  "./output/AMD64_LINUX/prog" "$@"
  return "$?"
}
modula3_archive() {
  default_lang_archive "$@"
}