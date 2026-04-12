#! /bin/sh

objectivec_compile() {
  echo "clang -v -lobjc -lgnustep-base \$(gnustep-config --objc-flags) \$(gnustep-config --objc-libs) -L/usr/local/lib  \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/objectivec-build-last
  clang -v -lobjc -lgnustep-base $(gnustep-config --objc-flags) $(gnustep-config --objc-libs) -L/usr/local/lib  "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/objectivec-build-last 2>&1
  retValue="$?"
  echo "-- clang returned: $retValue" >> ./output/objectivec-build-last
  return "$retValue"
}
objectivec_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
objectivec_archive() {
  default_lang_archive "$@"
}