#! /bin/sh

go_compile() {
  echo "go build -v -x -work -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/go-build-last
  go build -v -x -work -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/go-build-last 2>&1
  retValue="$?"
  echo "-- go returned: $retValue" >> ./output/go-build-last
  return "$retValue"
}
go_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
go_archive() {
  default_lang_archive "$@"
}