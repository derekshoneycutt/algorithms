#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

gcc "$fileName" -o "./output/$fileNameWithoutExt" &> ./output/c-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE C. BUILD OUTPUT:"
  cat "./output/c-build-last"
fi
