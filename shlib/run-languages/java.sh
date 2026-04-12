#! /bin/sh

java_compile() {
  echo "javac -verbose -Xlint:all \"./$fileName\" -d ./output" > ./output/java-build-last
  javac -verbose -Xlint:all "./$fileName" -d ./output >> ./output/java-build-last 2>&1
  retValue="$?"
  echo "-- javac returned: $retValue" >> ./output/java-build-last
  if [ "$retValue" -ne 0 ]; then
    return $retValue
  fi
  cd ./output
  echo "jar cvfe \"$fileNameWithoutExt.jar\" \"$packName.$algoName.$fileNameWithoutExt\" \"$packName/$algoName/$fileNameWithoutExt.class\"" >> ./java-build-last
  jar cvfe "$fileNameWithoutExt.jar" "$packName.$algoName.$fileNameWithoutExt" "$packName/$algoName/$fileNameWithoutExt.class" >> ./java-build-last 2>&1
  retValue="$?"
  echo "-- jar cvfe returned: $retValue" >> ./java-build-last
  cd ..
  return "$retValue"
}
java_run() {
  cd ./output
  java -jar "$fileNameWithoutExt.jar" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
java_archive() {
  default_lang_archive "$@"
}