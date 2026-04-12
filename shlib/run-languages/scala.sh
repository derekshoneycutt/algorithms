#! /bin/sh

scala_compile() {
  echo "cp \"./$fileName\" ./output/" > ./output/scala-build-last
  echo "cd ./output" >> ./output/scala-build-last
  echo "scala compile \"./$fileName\"" >> ./output/scala-build-last
  echo "cd .." >> ./output/scala-build-last
  cp "./$fileName" ./output/
  cd ./output
  scala compile "./$fileName" >> ./scala-build-last 2>&1
  retValue="$?"
  echo "-- scala returned: $retValue" >> ./scala-build-last
  cd ..
  return "$retValue"
}
scala_run() {
  if [ "$#" -eq 0 ]; then
      set -- 15 10
  fi

  cd ./output
  scala run "$fileName" -- "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
scala_archive() {
  default_lang_archive "$@"
}