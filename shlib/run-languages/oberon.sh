#! /bin/sh

oberon_compile() {
  includeDir="./oberon_include"
  includeModules=""

  echo "Copying $fileName to output..." > ./output/oberon-build-last
  cp "./$fileName" ./output/

  if [ -d "$includeDir" ]; then
    echo "Copying Oberon include modules from $includeDir..." >> ./output/oberon-build-last
    for includeFile in "$includeDir"/*.Mod "$includeDir"/*.mod; do
      [ -f "$includeFile" ] || continue
      includeBaseName=$(basename "$includeFile")
      cp "$includeFile" ./output/ >> ./output/oberon-build-last 2>&1
      includeModules="$includeModules $includeBaseName"
    done
  fi

  echo "cd ./output" >> ./output/oberon-build-last
  echo "cd .." >> ./output/oberon-build-last
  cd ./output
  retValue=0

  for includeModule in $includeModules; do
    echo "voc -e \"$includeModule\"" >> ./oberon-build-last
    voc -e "$includeModule" >> ./oberon-build-last 2>&1
    retValue="$?"
    echo "-- voc returned: $retValue" >> ./oberon-build-last
    if [ "$retValue" -ne 0 ]; then
      cd ..
      return "$retValue"
    fi
  done

  echo "voc -m \"$fileName\"" >> ./oberon-build-last
  voc -m "$fileName" >> ./oberon-build-last 2>&1
  retValue="$?"
  echo "-- voc returned: $retValue" >> ./oberon-build-last
  cd ..
  return "$retValue"
}
oberon_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
oberon_archive() {
  default_lang_archive "$@"
}