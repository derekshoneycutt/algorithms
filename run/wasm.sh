#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output
cp "$fileName" "./output/$fileName"
cd ./output

wat2wasm "$fileName" -o "$fileNameWithoutExt.wasm" &> ./wasm-build-last

if [[ -f "./$fileNameWithoutExt.wasm" ]]; then
  node ../../../../run/runwasm.js "./$fileNameWithoutExt.wasm" $other_params
else
  echo "FAILED TO COMPILE WASM. BUILD OUTPUT:"
  cat "./wasm-build-last"
fi

cd ..
