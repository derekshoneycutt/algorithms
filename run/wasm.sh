#! /bin/bash

lang="wasm"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt.wasm"
mkdir -p output
cp "$fileName" "./output/$fileName"
cd ./output

wat2wasm "$fileName" -o "$fileNameWithoutExt.wasm" &> ./wasm-build-last

if [[ -f "./$fileNameWithoutExt.wasm" ]]; then
  node ../../../../run/wasm.js "./$fileNameWithoutExt.wasm" $other_params
else
  echo "FAILED TO COMPILE WASM. BUILD OUTPUT:"
  cat "./wasm-build-last"
fi

cd ..
echo "$lang" > ./output/last-lang
