#! /bin/sh

modula3_compile() {
  mainModuleFile="Main.m3"
  includeDir="./modula3_include"
  set --

  echo "Making and emptying output/AMD64_LINUX..." > ./output/modula3-build-last
  mkdir -p ./output/AMD64_LINUX
  rm -Rf ./output/AMD64_LINUX/* >> /dev/null
  echo "Copying main module to output/AMD64_LINUX/$mainModuleFile..." >> ./output/modula3-build-last
  cp "$fileName" "./output/AMD64_LINUX/$mainModuleFile"

  if [ -d "$includeDir" ]; then
    echo "Copying Modula-3 include modules from $includeDir..." >> ./output/modula3-build-last
    for includeFile in "$includeDir"/*.ig "$includeDir"/*.mg "$includeDir"/*.i3 "$includeDir"/*.m3; do
      [ -f "$includeFile" ] || continue
      cp "$includeFile" ./output/AMD64_LINUX/ >> ./output/modula3-build-last 2>&1
    done

    for stagedIncludeFile in ./output/AMD64_LINUX/*.ig ./output/AMD64_LINUX/*.mg ./output/AMD64_LINUX/*.i3 ./output/AMD64_LINUX/*.m3; do
      [ -f "$stagedIncludeFile" ] || continue
      stagedIncludeBaseName=$(basename "$stagedIncludeFile")
      [ "$stagedIncludeBaseName" = "$mainModuleFile" ] && continue
      set -- "$@" "$stagedIncludeBaseName"
    done
  fi

  set -- "$@" "$mainModuleFile"

  echo "cd ./output" >> ./output/modula3-build-last
  printf 'cm3 -verbose' >> ./output/modula3-build-last
  for compileUnit in "$@"; do
    printf ' "%s"' "$compileUnit" >> ./output/modula3-build-last
  done
  printf '\n' >> ./output/modula3-build-last
  cd ./output/
  cm3 -verbose "$@" >> ./modula3-build-last 2>&1
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