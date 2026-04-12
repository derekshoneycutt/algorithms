#! /bin/sh

swift_compile() {
  echo "swiftc -v \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/swift-build-last
  swiftc -v "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/swift-build-last 2>&1
  retValue="$?"
  echo "-- swiftc returned: $retValue" >> ./output/swift-build-last
  return "$retValue"
}
swift_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
swift_archive() {
  default_lang_archive "$@"
}