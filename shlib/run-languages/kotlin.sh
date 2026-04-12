#! /bin/sh

kotlin_compile() {
  echo "kotlinc -verbose \"./$fileName\" -include-runtime -d \"./output/$fileNameWithoutExt.jar\"" > ./output/kotlin-build-last
  kotlinc -verbose "./$fileName" -include-runtime -d "./output/$fileNameWithoutExt.jar" >> ./output/kotlin-build-last 2>&1
  retValue="$?"
  echo "-- kotlinc returned: $retValue" >> ./output/kotlin-build-last
  return "$retValue"
}
kotlin_run() {
  java -jar "./output/$fileNameWithoutExt.jar" "$@"
  return "$?"
}
kotlin_archive() {
  default_lang_archive "$@"
}