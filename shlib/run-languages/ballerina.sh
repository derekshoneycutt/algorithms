#! /bin/sh

ballerina_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "bal build \"$fileName\"" > ./ballerina-build-last
  bal build "$fileName" >> ./ballerina-build-last  2>&1
  retValue="$?"
  echo "-- bal returned: $retValue" >> ./ballerina-build-last

  cd ..
  return "$retValue"
}
ballerina_run() {
  java -jar "./output/$fileNameWithoutExt.jar" "$@"
  return "$?"
}
ballerina_archive() {
  default_lang_archive "$@"
}