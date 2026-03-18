#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

gnatmake -q -D output -o "./output/$fileNameWithoutExt" "$fileName" &> ./output/ada-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  ./output/$fileNameWithoutExt $other_params
else
  echo "FAILED TO COMPILE ADAA. BUILD OUTPUT:"
  cat "./output/ada-build-last"
fi
