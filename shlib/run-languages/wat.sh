#! /bin/sh

wat_compile() {
  echo "cp \"$fileName\" \"./output/$fileName\"" > ./output/wat-build-last
  echo "cd ./output" >> ./output/wat-build-last
  echo "wat2wasm -v \"$fileName\" -o \"$fileNameWithoutExt.wasm\"" >> ./output/wat-build-last
  echo "cd .." >> ./output/wat-build-last
  cp "$fileName" "./output/$fileName"
  cd ./output
  wat2wasm -v "$fileName" -o "$fileNameWithoutExt.wasm" >> ./wat-build-last 2>&1
  retValue="$?"
  echo "-- wat2wasm returned: $retValue" >> ./wat-build-last
  cd ..
  return "$retValue"
}
wat_run() {
  node ../../../run-wasm.js "./output/$fileNameWithoutExt.wasm" "$@"
  return "$?"
}
wat_archive() {
  default_lang_archive "$@"
}