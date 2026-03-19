#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

tsc "$fileName" --outDir output --target esnext --skipLibCheck true &> ./output/ts-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  node ./output/$fileNameWithoutExt.js $other_params
else
  echo "FAILED TO COMPILE TypeScript. BUILD OUTPUT:"
  cat "./output/ts-build-last"
fi
