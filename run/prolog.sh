#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

gplc "$fileName" -o "./output/$fileNameWithoutExt" &> ./output/prolog-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE PROLOG. BUILD OUTPUT:"
  cat "./output/prolog-build-last"
fi
